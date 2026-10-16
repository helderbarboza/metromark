<script module lang="ts">
  export interface DialogSpec {
    kind: 'bookmark' | 'folder' | 'rename' | 'move' | 'delete' | 'appearance' | 'settings' | 'restore' | 'copy';
    id?: string; parentId?: string; undoId?: string;
  }
</script>
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Command, Settings, Snapshot, TileSize } from '../types';
  import { indexTree, projectGroups, flatten, isFolder, countBookmarks, PALETTE, tileFor } from '../tree';
  import { iconChoices } from '../icons';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  let { spec, snapshot, oncommand, onclose, onresetpreview }: {
    spec: DialogSpec; snapshot: Snapshot; oncommand: (command: Command) => Promise<boolean>;
    onclose: () => void; onresetpreview?: () => Promise<void>;
  } = $props();
  const uid = $props.id();
  const nodes = $derived(indexTree(snapshot.tree));
  const node = $derived(spec.id ? nodes.get(spec.id) : undefined);
  const groups = $derived(projectGroups(snapshot));
  const folders = $derived(groups.filter((group) => group.writable && !(spec.kind === 'move' && node && isFolder(node) && flatten([node]).some((child) => child.id === group.id))));
  const tile = $derived(node ? tileFor(node, snapshot.appearance[node.id]) : undefined);
  let name = $state('');
  let url = $state('');
  let parentId = $state('');
  let size = $state<TileSize>('medium');
  let color = $state(PALETTE[0]);
  let icon = $state('auto');
  let busy = $state(false);
  let error = $state('');
  let confirmReset = $state(false);
  let confirmPreview = $state(false);
  onMount(() => {
    name = node?.title ?? '';
    url = node?.url ?? '';
    parentId = spec.parentId ?? node?.parentId ?? folders[0]?.id ?? '';
    size = tile?.size ?? 'medium';
    color = tile?.color ?? PALETTE[0];
    icon = snapshot.appearance[spec.id ?? '']?.icon ?? 'auto';
  });
  const title = $derived(spec.kind === 'bookmark' ? node ? 'Edit bookmark' : 'A new favorite'
    : spec.kind === 'folder' ? 'Make a little room'
    : spec.kind === 'rename' ? 'Rename folder'
    : spec.kind === 'move' ? 'Find a new home'
    : spec.kind === 'delete' ? 'Delete this folder?'
    : spec.kind === 'appearance' ? 'Make it your own'
    : spec.kind === 'settings' ? 'Your kind of Start'
    : spec.kind === 'restore' ? 'Restore to a folder' : 'Copy website address');
  async function send(command: Command, close = true) {
    busy = true; error = '';
    try {
      const ok = await oncommand(command);
      if (ok && close) onclose();
      else if (!ok) error = 'The operation could not be completed. See the notification for details.';
    } catch (failure) { error = failure instanceof Error ? failure.message : 'Something went wrong.'; }
    finally { busy = false; }
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    switch (spec.kind) {
      case 'bookmark':
        return send(node ? { type: 'node.update', id: node.id, title: name, url }
          : { type: 'bookmark.create', parentId, title: name, url });
      case 'folder': return send({ type: 'folder.create', parentId, title: name });
      case 'rename': if (node) return send({ type: 'node.update', id: node.id, title: name }); break;
      case 'move': if (node) return send({ type: 'node.move', id: node.id, parentId }); break;
      case 'appearance': if (node) return send({ type: 'tile.appearance', id: node.id, patch: { size, color, icon } }); break;
      case 'restore': if (spec.undoId) return send({ type: 'undo', id: spec.undoId, parentId }); break;
    }
  }
  async function setting(patch: Partial<Settings>) { await send({ type: 'settings.update', patch }, false); }
</script>
<Modal {title} eyebrow={spec.kind === 'settings' ? 'MAKE YOURSELF AT HOME' : spec.kind === 'delete' ? 'DESTRUCTIVE ACTION' : 'YOUR BOOKMARKS'} drawer={spec.kind === 'settings'} {onclose}>
  {#if spec.kind === 'settings'}
    <p class="dialog-description">A familiar feeling. A space that's entirely yours.</p>
    <div class="setting-section"><h3>Canvas</h3><div class="themes">{#each [
      { id: 'midnight', name: 'Midnight', bg: '#101216', tile: '#af572f' },
      { id: 'dusk', name: 'Dusk', bg: '#201b2b', tile: '#856bb1' },
      { id: 'forest', name: 'Forest', bg: '#15211e', tile: '#53774f' },
      { id: 'paper', name: 'Paper', bg: '#eeece8', tile: '#af572f' },
    ] as theme (theme.id)}<button class="theme-option" class:chosen={snapshot.settings.theme === theme.id} aria-pressed={snapshot.settings.theme === theme.id} disabled={busy} onclick={() => setting({ theme: theme.id as Settings['theme'] })}><span class="theme-preview" style:background={theme.bg}><span style:background={theme.tile}></span><span></span><span></span><span></span></span><span class="theme-name">{theme.name}{#if snapshot.settings.theme === theme.id}<Icon name="check" size={12} />{/if}</span></button>{/each}</div></div>
    <div class="setting-section"><h3>Tile density</h3><div class="segmented">{#each ['default', 'compact', 'small', 'half'] as density (density)}<button class:chosen={snapshot.settings.density === density} aria-pressed={snapshot.settings.density === density} disabled={busy} onclick={() => setting({ density: density as Settings['density'] })}>{density}</button>{/each}</div><p class="field-hint">Coordinates stay the same. Just a little more breathing room.</p></div>
    <div class="setting-section switches"><label><span>Show website addresses<small>A little context below each title.</small></span><input type="checkbox" role="switch" checked={snapshot.settings.showDomains} disabled={busy} onchange={(event) => setting({ showDomains: event.currentTarget.checked })} /></label><label><span>Reduce motion<small>A quieter, more instant experience.</small></span><input type="checkbox" role="switch" checked={snapshot.settings.reducedMotion} disabled={busy} onchange={(event) => setting({ reducedMotion: event.currentTarget.checked })} /></label></div>
    <div class="setting-section"><h3>A fresh arrangement</h3><p class="field-hint">Reset positions to browser bookmark order. Your colors, sizes, and bookmarks stay intact.</p>{#if confirmReset}<div class="reset-confirm"><p>Reset layouts for every group?</p><button class="button primary" disabled={busy} onclick={() => send({ type: 'layout.reset' })}>Reset with Undo</button><button class="button" onclick={() => confirmReset = false}>Cancel</button></div>{:else}<button class="button reset-button" onclick={() => confirmReset = true}><Icon name="reset" size={15} />Reset tile layouts</button>{/if}</div>
    <div class="privacy-note"><Icon name="lock" size={17} /><div><strong>Local by design.</strong><p>No accounts. No analytics. No remote icon requests. Your bookmarks stay in your browser.</p></div></div>
    {#if onresetpreview}<div class="preview-tools"><span>DEMO WORKSPACE</span><p>This preview uses sample bookmarks, not your real browser data.</p>{#if confirmPreview}<button class="button" disabled={busy} onclick={async () => { busy = true; await onresetpreview?.(); onclose(); }}>Confirm demo reset</button>{:else}<button onclick={() => confirmPreview = true}>Restore sample bookmarks</button>{/if}</div>{/if}
  {:else if spec.kind === 'delete' && node}
    <p class="dialog-description">Delete <strong class="text-[var(--text)]">{node.title}</strong> and everything inside it? This removes the folder from {snapshot.mode === 'preview' ? 'this demo workspace' : 'your browser bookmarks'} too.</p>
    <div class="delete-summary"><Icon name="folder" size={24} /><div><strong>{countBookmarks(node)} bookmarks</strong><span>{flatten([node]).filter(isFolder).length - 1} nested folders</span></div></div>
    <p class="field-hint">You can Undo for 30 seconds. Restored bookmarks receive new browser IDs.</p>
    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    <div class="dialog-actions"><button class="button" onclick={onclose}>Keep folder</button><button class="button danger" disabled={busy} onclick={() => send({ type: 'node.remove', id: node.id })}><Icon name="trash" size={15} />{busy ? 'Deleting…' : 'Delete folder'}</button></div>
  {:else if spec.kind === 'copy'}
    <p class="dialog-description">Clipboard access isn't available here. Select the address and press Ctrl/Cmd+C.</p><input class="copy-input" data-initial-focus readonly value={node?.url ?? ''} aria-label="Website address to copy" onfocus={(event) => event.currentTarget.select()} /><div class="dialog-actions"><button class="button primary" onclick={onclose}>Done</button></div>
  {:else}
    <form onsubmit={submit}>
      {#if spec.kind === 'bookmark' || spec.kind === 'folder' || spec.kind === 'rename'}
        <p class="dialog-description">{spec.kind === 'folder' ? 'A bookmark folder becomes a tile group. Nested folders get their own group, too.' : spec.kind === 'rename' ? 'Only this folder’s name changes. Descendant group paths update automatically.' : node ? 'Edit the real bookmark. Your tile arrangement stays right where it is.' : 'Save something worth coming back to.'}</p>
        <label class="field"><span class="field-label">{spec.kind === 'bookmark' ? 'Title' : 'Folder name'}</span><input data-initial-focus bind:value={name} required maxlength="2048" placeholder={spec.kind === 'bookmark' ? 'A name you’ll recognize' : 'e.g. Weekend reading'} autocomplete="off" /></label>
        {#if spec.kind === 'bookmark'}<label class="field"><span class="field-label">Website address</span><input bind:value={url} required placeholder="https://example.com" autocomplete="url" spellcheck="false" /></label>{/if}
      {/if}
      {#if spec.kind === 'move'}<p class="dialog-description">Move <strong class="text-[var(--text)]">{node?.title}</strong> to another folder. This changes its location in your browser bookmarks.</p>{/if}
      {#if spec.kind === 'restore'}<p class="dialog-description">The original folder is no longer available. Choose a writable destination to restore this item.</p>{/if}
      {#if (spec.kind === 'bookmark' && !node) || spec.kind === 'folder' || spec.kind === 'move' || spec.kind === 'restore'}
        <label class="field"><span class="field-label" id={uid + '-folder-label'}>{spec.kind === 'folder' ? 'Create inside' : 'Folder'}</span><select aria-labelledby={uid + '-folder-label'} aria-describedby={uid + '-folder-hint'} bind:value={parentId} required data-initial-focus={spec.kind === 'move' || spec.kind === 'restore' ? '' : undefined}>{#each folders as folder (folder.id)}<option value={folder.id}>{folder.path.join(' / ') || 'Unnamed group'}</option>{/each}</select><span class="field-hint" id={uid + '-folder-hint'}>Browser roots are kept separate. There are no virtual groups.</span></label>
      {/if}
      {#if spec.kind === 'bookmark' && node}<div class="current-folder"><Icon name="folder" size={14} /><span>{groups.find((group) => group.id === node?.parentId)?.path.join(' / ')}</span></div>{/if}
      {#if spec.kind === 'appearance' && tile}
        <p class="dialog-description">A little personality for <strong class="text-[var(--text)]">{tile.title}</strong>. Appearance changes are local; the bookmark itself stays untouched.</p>
        <label class="field"><span class="field-label" id={uid + '-size-label'}>Tile size</span><select aria-labelledby={uid + '-size-label'} bind:value={size} data-initial-focus>{#each ['small', 'medium', 'wide', 'large'] as preset (preset)}<option value={preset}>{preset[0].toUpperCase() + preset.slice(1)}</option>{/each}</select></label>
        <div class="field"><span class="field-label" id="tile-color-label">Color</span><div class="color-swatches" role="group" aria-labelledby="tile-color-label">{#each PALETTE as swatch (swatch)}<button type="button" style:background={swatch} class:chosen={color.toLowerCase() === swatch} aria-label="Use color {swatch}" aria-pressed={color.toLowerCase() === swatch} onclick={() => color = swatch}>{#if color.toLowerCase() === swatch}<Icon name="check" size={16} />{/if}</button>{/each}<input type="color" bind:value={color} aria-label="Custom tile color" title="Custom color" /></div></div>
        <label class="field"><span class="field-label" id={uid + '-icon-label'}>Icon</span><select aria-labelledby={uid + '-icon-label'} aria-describedby={uid + '-icon-hint'} bind:value={icon}><option value="auto">Website icon (automatic)</option>{#each iconChoices as choice (choice)}<option value={choice}>{choice[0].toUpperCase() + choice.slice(1)}</option>{/each}</select><span class="field-hint" id={uid + '-icon-hint'}>Automatic uses the site's icon from your browser's local favicon cache, styled Metro-white, or the default icon when unavailable. No website requests.</span></label>
      {/if}
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
      <div class="dialog-actions"><button class="button" type="button" onclick={onclose}>Cancel</button><button class="button primary" type="submit" disabled={busy || ((spec.kind === 'move' || spec.kind === 'restore' || spec.kind === 'folder' || (spec.kind === 'bookmark' && !node)) && !parentId)}>{busy ? 'Saving…' : spec.kind === 'move' ? 'Move here' : spec.kind === 'restore' ? 'Restore here' : spec.kind === 'folder' ? 'Create group' : spec.kind === 'bookmark' && !node ? 'Add bookmark' : 'Save changes'}</button></div>
    </form>
  {/if}
</Modal>
<style>
  .setting-section { margin: 0 0 29px; }
  .setting-section h3 { font-size: 11px; font-weight: 550; margin: 0 0 13px; }
  .themes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .theme-option { padding: 0; background: transparent; text-align: left; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
  .theme-option.chosen { border-color: var(--accent); }
  .theme-preview { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; height: 63px; padding: 12px 19px; }
  .theme-preview span { background: #748171; opacity: .8; }
  .theme-preview span:nth-child(3) { background: #6e63a8; }
  .theme-preview span:nth-child(4) { background: #486e85; }
  .theme-name { display: flex; justify-content: space-between; padding: 9px 11px; font-size: 10px; }
  .theme-name :global(.icon) { color: var(--accent); }
  .segmented { display: flex; border: 1px solid var(--line); border-radius: 4px; padding: 3px; margin-bottom: 9px; }
  .segmented button { flex: 1; padding: 9px; background: transparent; font-size: 10px; text-transform: capitalize; border-radius: 3px; color: var(--muted); }
  .segmented button.chosen { background: var(--surface-hover); color: var(--text); }
  .switches label { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 23px; font-size: 11px; }
  .switches small { display: block; color: var(--muted); font-size: 10px; margin-top: 7px; }
  .switches input { appearance: none; width: 31px; height: 18px; border-radius: 20px; background: var(--line); padding: 3px; flex-shrink: 0; cursor: pointer; }
  .switches input::before { content: ''; display: block; width: 12px; height: 12px; border-radius: 50%; background: var(--muted); transition: transform 130ms; }
  .switches input:checked { background: var(--accent); }
  .switches input:checked::before { background: var(--accent-ink); transform: translateX(13px); }
  .reset-button { width: 100%; margin-top: 15px; height: 37px; font-size: 10px; }
  .reset-confirm { margin-top: 14px; }
  .reset-confirm p { font-size: 11px; margin: 0 0 12px; }
  .reset-confirm .button { height: 36px; font-size: 10px; margin-right: 5px; }
  .privacy-note { display: flex; gap: 12px; border-top: 1px solid var(--line); padding-top: 22px; color: var(--muted); }
  .privacy-note strong { font-size: 11px; font-weight: 500; color: var(--text); }
  .privacy-note p { margin: 7px 0 0; font-size: 10px; line-height: 1.8; }
  .preview-tools { margin-top: 28px; padding: 17px; background: var(--bg); border: 1px solid var(--line); border-radius: 4px; }
  .preview-tools > span { color: var(--muted); font-size: 8px; letter-spacing: 1.1px; }
  .preview-tools p { font-size: 10px; color: var(--muted); line-height: 1.7; margin: 9px 0 13px; }
  .preview-tools > button:not(.button) { font-size: 10px; color: var(--accent); background: transparent; padding: 0; }
  .color-swatches { display: flex; gap: 7px; flex-wrap: wrap; }
  .color-swatches button { width: 31px; height: 31px; display: flex; align-items: center; justify-content: center; color: #fff; border-radius: 3px; }
  .color-swatches button.chosen { outline: 2px solid var(--text); outline-offset: 2px; }
  .color-swatches input { width: 32px; height: 32px; border: 1px solid var(--line); padding: 2px; background: transparent; border-radius: 3px; cursor: pointer; }
  .current-folder { display: flex; gap: 8px; color: var(--muted); font-size: 10px; line-height: 1.7; }
  .delete-summary { display: flex; gap: 15px; align-items: center; background: var(--bg); border: 1px solid var(--line); border-radius: 4px; padding: 20px; margin-bottom: 21px; }
  .delete-summary :global(.icon) { color: var(--danger); }
  .delete-summary strong { display: block; font-size: 13px; margin-bottom: 5px; font-weight: 500; }
  .delete-summary span { font-size: 11px; color: var(--muted); }
</style>
