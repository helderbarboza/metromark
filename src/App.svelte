<script lang="ts">
  import { onMount } from 'svelte';
  import { SnapGridGroup } from '@snapgridjs/svelte';
  import type { Client, Command, Layout, Notice, Snapshot, TileSize } from './lib/types';
  import { flatten, indexTree, isBookmark, projectGroups, countBookmarks } from './lib/tree';
  import { reconcileLayout, ROWS, GAP, cellsToPx } from './lib/layout';
  import Icon from './lib/components/Icon.svelte';
  import MetroGroup from './lib/components/MetroGroup.svelte';
  import ContextMenu from './lib/components/ContextMenu.svelte';
  import type { MenuItem } from './lib/components/ContextMenu.svelte';
  import Editor from './lib/components/Editor.svelte';
  import type { DialogSpec } from './lib/components/Editor.svelte';
  import UndoToast from './lib/components/UndoToast.svelte';
  import MetroAppBar from './lib/components/MetroAppBar.svelte';

  let { client }: { client: Client } = $props();
  let snapshot = $state.raw<Snapshot | null>(null);
  let loadError = $state('');
  let query = $state('');
  let rootFilter = $state('all');
  let arranging = $state(false);
  let dragging = $state(false);
  let selectedId = $state<string | null>(null);
  let busy = $state(false);
  let now = $state(Date.now());
  let viewportHeight = $state(800);
  let scroller = $state<HTMLElement | null>(null);
  let searchInput: HTMLInputElement;
  let scrollProgress = $state(0);
  let canScroll = $state(false);
  let activeGroup = $state(0);
  let draftLayouts = $state.raw<Record<string, Layout>>({});
  let layoutTimer: ReturnType<typeof setTimeout> | undefined;
  let gestureTimer: ReturnType<typeof setTimeout> | undefined;
  let dialog = $state<DialogSpec | null>(null);
  let context = $state<{ target: 'tile' | 'group' | 'canvas'; id: string; x: number; y: number } | null>(null);
  let contextOrigin: HTMLElement | null = null;
  let notice = $state<Notice | null>(null);
  let noticeUntil = $state(0);

  const groups = $derived(snapshot ? projectGroups(snapshot) : []);
  const allTiles = $derived(Object.fromEntries(groups.flatMap((group) => Object.entries(group.tiles))));
  const selectedTile = $derived(selectedId ? allTiles[selectedId] : undefined);
  const contextTile = $derived(context?.target === 'tile' ? allTiles[context.id] : undefined);
  const nodes = $derived(indexTree(snapshot?.tree ?? []));
  const roots = $derived((snapshot?.tree ?? []).flatMap((root) => root.children ?? []).filter((node) => !isBookmark(node) && node.type !== 'separator'));
  const bookmarkCount = $derived(flatten(snapshot?.tree ?? []).filter(isBookmark).length);
  const folderCount = $derived(groups.filter((group) => !group.isSystem).length);
  const cell = $derived(Math.max(34, Math.min(snapshot?.settings.density === 'compact' ? 54 : 68, Math.floor((viewportHeight - 279 - (ROWS - 1) * GAP) / ROWS))));
  const normalizedQuery = $derived(query.trim().toLowerCase());
  const visibleGroups = $derived.by(() => {
    const filtered = groups.filter((group) => rootFilter === 'all' || group.rootId === rootFilter);
    if (!normalizedQuery || !snapshot) return filtered;
    return filtered.map((group) => {
      const matchesPath = group.path.join(' / ').toLowerCase().includes(normalizedQuery);
      const matching = Object.values(group.tiles).filter((tile) => matchesPath || `${tile.title} ${tile.url}`.toLowerCase().includes(normalizedQuery));
      const sizes = Object.fromEntries(matching.map((tile) => [tile.id, { ...snapshot!.appearance[tile.id], size: tile.size }]));
      return { ...group, layout: reconcileLayout(matching.map((tile) => ({ id: tile.id, title: tile.title, url: tile.url })), [], sizes) };
    }).filter((group) => group.layout.length);
  });
  const resultCount = $derived(visibleGroups.reduce((count, group) => count + group.layout.length, 0));
  const undo = $derived(notice?.undoId ? snapshot?.undos.find((entry) => entry.id === notice?.undoId && entry.expiresAt > now) : undefined);
  const today = $derived(new Date(now).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }));

  function applySnapshot(value: Snapshot) {
    snapshot = value;
    if (selectedId && !flatten(value.tree).some((node) => node.id === selectedId)) selectedId = null;
    if (rootFilter !== 'all' && !flatten(value.tree).some((node) => node.id === rootFilter)) rootFilter = 'all';
  }
  function showNotice(value: Notice, expiration?: number) { notice = value; noticeUntil = expiration ?? Date.now() + (value.tone === 'error' ? 9000 : 4500); }
  async function execute(command: Command): Promise<boolean> {
    busy = true;
    try {
      const result = await client.execute(command);
      applySnapshot(result.snapshot);
      if (result.notice) showNotice(result.notice, result.notice.undoId ? result.snapshot.undos.find((entry) => entry.id === result.notice?.undoId)?.expiresAt : undefined);
      return true;
    } catch (error) {
      showNotice({ message: error instanceof Error ? error.message : 'The operation failed.', tone: 'error' });
      try { applySnapshot(await client.snapshot()); } catch { /* The existing view remains visible while disconnected. */ }
      return false;
    } finally { busy = false; }
  }
  onMount(() => {
    const unsubscribe = client.subscribe(applySnapshot);
    void client.snapshot().then((value) => {
      applySnapshot(value);
      const pending = value.undos.filter((entry) => entry.expiresAt > Date.now()).at(-1);
      if (pending) showNotice({ message: pending.label, undoId: pending.id }, pending.expiresAt);
    }).catch((error: unknown) => { loadError = error instanceof Error ? error.message : 'Unable to load bookmarks.'; });
    const resize = () => { viewportHeight = window.innerHeight; updateScroll(); };
    resize();
    window.addEventListener('resize', resize);
    const clock = setInterval(() => { now = Date.now(); }, 300);
    return () => { unsubscribe(); client.dispose(); window.removeEventListener('resize', resize); clearInterval(clock); clearTimeout(layoutTimer); clearTimeout(gestureTimer); };
  });
  $effect(() => { if (notice && now >= noticeUntil) notice = null; });
  $effect(() => { void visibleGroups; void cell; requestAnimationFrame(updateScroll); });

  function defaultFolder() { return groups.find((group) => group.id === rootFilter && group.writable)?.id ?? groups.find((group) => group.writable)?.id ?? ''; }
  function edit(spec: DialogSpec) { dialog = spec; selectedId = spec.id ?? selectedId; }
  function closeContext() { context = null; contextOrigin?.focus({ preventScroll: true }); }
  function showContext(event: MouseEvent, target: 'tile' | 'group' | 'canvas', id: string) {
    event.preventDefault(); event.stopPropagation();
    contextOrigin = (event.target as HTMLElement).closest<HTMLElement>('a, button') ?? null;
    const rect = contextOrigin?.getBoundingClientRect();
    const keyboardOrButton = event.type === 'click' || (event.clientX === 0 && event.clientY === 0);
    context = { target, id, x: keyboardOrButton && rect ? rect.left : event.clientX, y: keyboardOrButton && rect ? rect.bottom + 7 : event.clientY };
  }
  async function open(url: string, disposition: 'tab' | 'window') {
    try { await client.open(url, disposition); } catch (error) { showNotice({ message: error instanceof Error ? error.message : 'Unable to open this address.', tone: 'error' }); }
  }
  async function copy(id: string) {
    const url = allTiles[id]?.url;
    if (!url) return;
    try { await navigator.clipboard.writeText(url); showNotice({ message: 'Website address copied.' }); }
    catch { edit({ kind: 'copy', id }); }
  }
  const menuItems = $derived.by((): MenuItem[] => {
    if (!context) return [];
    const node = nodes.get(context.id);
    const tile = contextTile;
    if (context.target === 'tile' && tile) return [
      { label: 'Open in new tab', icon: 'external', action: () => { void open(tile.url, 'tab'); } },
      { label: 'Open in new window', icon: 'desktop', action: () => { void open(tile.url, 'window'); } },
      { label: 'Edit bookmark', icon: 'edit', separator: true, disabled: !tile.writable, action: () => edit({ kind: 'bookmark', id: tile.id }) },
      { label: 'Move to folder', icon: 'folder', disabled: !tile.writable, action: () => edit({ kind: 'move', id: tile.id }) },
      { label: 'Customize tile', icon: 'arrange', action: () => edit({ kind: 'appearance', id: tile.id }) },
      { label: 'Copy website address', icon: 'copy', action: () => { void copy(tile.id); } },
      { label: 'Delete bookmark', icon: 'trash', separator: true, danger: true, disabled: !tile.writable, action: () => { void execute({ type: 'node.remove', id: tile.id }); } },
    ];
    if (context.target === 'group' && node) {
      const group = groups.find((group) => group.id === node.id);
      return [
        { label: 'Add bookmark here', icon: 'plus', disabled: !group?.writable, action: () => edit({ kind: 'bookmark', parentId: node.id }) },
        { label: 'Create child folder', icon: 'folder', disabled: !group?.writable, action: () => edit({ kind: 'folder', parentId: node.id }) },
        { label: 'Rename folder', icon: 'edit', separator: true, disabled: !group?.mutable, action: () => edit({ kind: 'rename', id: node.id }) },
        { label: 'Move folder', icon: 'folder', disabled: !group?.mutable, action: () => edit({ kind: 'move', id: node.id }) },
        { label: 'Delete folder', icon: 'trash', separator: true, danger: true, disabled: !group?.mutable, action: () => edit({ kind: 'delete', id: node.id }) },
      ];
    }
    const parentId = groups.find((group) => group.id === context?.id && group.writable)?.id ?? defaultFolder();
    return [
      { label: 'Add bookmark', icon: 'plus', disabled: !parentId, action: () => edit({ kind: 'bookmark', parentId }) },
      { label: 'Create folder / group', icon: 'folder', disabled: !parentId, action: () => edit({ kind: 'folder', parentId }) },
      { label: arranging ? 'Finish arranging' : 'Arrange tiles', icon: 'arrange', separator: true, action: () => { arranging = !arranging; selectedId = null; } },
      { label: 'Search bookmarks', icon: 'search', action: () => searchInput.focus() },
      { label: 'Appearance & settings', icon: 'settings', separator: true, action: () => edit({ kind: 'settings' }) },
    ];
  });
  function resizeTile(id: string, size: TileSize) { void execute({ type: 'tile.appearance', id, patch: { size } }); }
  function stageLayout(id: string, layout: Layout) {
    draftLayouts = { ...draftLayouts, [id]: layout };
    clearTimeout(layoutTimer);
    // Source and destination callbacks belong to one gesture. Never treat source removal as deletion.
    layoutTimer = setTimeout(() => {
      const committed = structuredClone(draftLayouts);
      void execute({ type: 'layout.commit', layouts: committed }).finally(() => { draftLayouts = {}; });
    }, 35);
  }
  function dragStop() { clearTimeout(gestureTimer); gestureTimer = setTimeout(() => { dragging = false; }, 180); }
  function updateScroll() {
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    canScroll = max > 3;
    scrollProgress = max > 0 ? scroller.scrollLeft / max : 0;
    const elements = [...scroller.querySelectorAll<HTMLElement>('.metro-group')];
    const left = scroller.scrollLeft + 80;
    activeGroup = Math.max(0, elements.findLastIndex((element) => element.offsetLeft <= left));
  }
  function wheel(event: WheelEvent) {
    if (!scroller || event.ctrlKey || !canScroll || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    // In very short windows, preserve vertical access to the bottom of the canvas.
    if (scroller.scrollHeight > scroller.clientHeight + 4 && !event.shiftKey) return;
    event.preventDefault();
    scroller.scrollLeft += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientWidth : 1);
  }
  function scroll(direction: -1 | 1) { scroller?.scrollBy({ left: direction * Math.max(250, scroller.clientWidth * .65), behavior: snapshot?.settings.reducedMotion ? 'instant' : 'smooth' }); }
  function jump(index: number) {
    const element = scroller?.querySelectorAll<HTMLElement>('.metro-group')[index];
    if (element && scroller) scroller.scrollTo({ left: Math.max(0, element.offsetLeft - 68), behavior: snapshot?.settings.reducedMotion ? 'instant' : 'smooth' });
  }
  function key(event: KeyboardEvent) {
    const input = event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
    if (dialog || context) return;
    if (!input && (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'))) { event.preventDefault(); searchInput.focus(); }
    if (!input && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      const recent = snapshot?.undos.filter((entry) => entry.expiresAt > now).at(-1);
      if (recent) { event.preventDefault(); performUndo(recent.id); }
    }
    if (event.key === 'Escape' && !dragging) { selectedId = null; if (query) query = ''; else arranging = false; }
  }
  function performUndo(id: string) {
    if (snapshot?.undos.find((entry) => entry.id === id)?.needsDestination) edit({ kind: 'restore', undoId: id });
    else void execute({ type: 'undo', id });
  }
</script>

<svelte:window onkeydown={key} />
<div class="metro-app theme-{snapshot?.settings.theme ?? 'midnight'}" class:reduced={snapshot?.settings.reducedMotion}>
  <a href="#canvas" class="skip-link">Skip to bookmarks</a>
  <header class="page-header">
    <div class="brand-row"><a class="brand" href="#canvas" aria-label="metro/bookmarks home" onclick={(event) => { event.preventDefault(); rootFilter = 'all'; query = ''; scroller?.scrollTo({ left: 0 }); }}><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>metro<span class="brand-divider">/</span><span class="brand-product">bookmarks</span></span></a><span class="header-date">{today}</span></div>
    <div class="heading-row"><div class="headline"><div class="eyebrow">A FAMILIAR PLACE. ALL YOUR OWN.</div><h1>Start<span class="heading-period">.</span></h1><p>Your favorites. A little more you.</p></div>
      <div class="header-actions"><label class="search-box"><Icon name="search" size={17} /><input bind:this={searchInput} bind:value={query} type="search" aria-label="Search bookmarks" placeholder="Find a bookmark…" autocomplete="off" spellcheck="false" />{#if query}<button aria-label="Clear search" onclick={() => { query = ''; searchInput.focus(); }}><Icon name="close" size={13} /></button>{:else}<kbd>/</kbd>{/if}</label><button class="button primary add-button" disabled={!snapshot || !defaultFolder()} onclick={() => edit({ kind: 'bookmark', parentId: defaultFolder() })}><Icon name="plus" size={16} /><span>Add bookmark</span></button><button class="icon-button settings-button" aria-label="Open settings" disabled={!snapshot} onclick={() => edit({ kind: 'settings' })}><Icon name="settings" size={20} /></button></div>
    </div>
    <div class="filter-row"><nav class="root-filters" aria-label="Bookmark roots"><button class:active={rootFilter === 'all'} aria-pressed={rootFilter === 'all'} onclick={() => { rootFilter = 'all'; scroller?.scrollTo({ left: 0 }); }}>All bookmarks <span>{bookmarkCount}</span></button>{#each roots as root (root.id)}<button class:active={rootFilter === root.id} aria-pressed={rootFilter === root.id} onclick={() => { rootFilter = root.id; scroller?.scrollTo({ left: 0 }); }}>{root.title}<span>{countBookmarks(root)}</span></button>{/each}</nav><button class="arrange-button" class:active={arranging} disabled={!snapshot || Boolean(normalizedQuery) || busy} aria-pressed={arranging} onclick={() => { arranging = !arranging; selectedId = null; }}><Icon name={arranging ? 'check' : 'arrange'} size={14} /><span>{arranging ? 'Done arranging' : 'Arrange tiles'}</span></button></div>
  </header>

  <!-- Canvas right-click has a matching visible Add button and keyboard-accessible settings. -->
  <main id="canvas" class="canvas" bind:this={scroller} onscroll={updateScroll} onwheel={wheel} oncontextmenu={(event) => showContext(event, 'canvas', defaultFolder())} aria-label="Bookmark tile canvas" tabindex="-1">
    {#if !snapshot}
      <div class="loading-state">{#if loadError}<Icon name="lock" size={28} /><h2>Let's reconnect.</h2><p>{loadError}</p><button class="button" onclick={() => window.location.reload()}>Reload page</button>{:else}<span class="loading-mark"></span><p>Finding your favorites…</p>{/if}</div>
    {:else if normalizedQuery && !visibleGroups.length}
      <div class="no-results"><Icon name="search" size={33} /><h2>No favorites found.</h2><p>Nothing matches “{query}”. Try a title, website, or folder.</p><button class="button" onclick={() => query = ''}>Clear search</button></div>
    {:else}
      <SnapGridGroup>
        <div class="groups" class:arranging>
          {#each visibleGroups as group (group.id)}
            <MetroGroup {group} layout={draftLayouts[group.id] ?? group.layout} tiles={allTiles} {cell} arranging={arranging && !normalizedQuery} {dragging} {selectedId} showDomains={snapshot.settings.showDomains} preview={client.mode === 'preview'}
              onLayoutChange={stageLayout} onDragStart={() => { dragging = true; selectedId = null; }} onDragStop={dragStop} onSelect={(id) => selectedId = id} onContext={showContext} onAdd={(parentId) => edit({ kind: 'bookmark', parentId })} onBlocked={(message) => showNotice({ message, tone: 'error' })} />
          {/each}
          {#if !normalizedQuery && defaultFolder()}<div class="new-group"><div class="new-group-heading">A LITTLE MORE SPACE</div><button style:height="{cellsToPx(ROWS, cell)}px" onclick={() => edit({ kind: 'folder', parentId: defaultFolder() })}><span class="new-group-plus"><Icon name="plus" size={23} /></span><strong>New group</strong><span>Create a bookmark folder</span><span class="new-group-arrow"><Icon name="arrow" size={16} /></span></button></div>{/if}
          {#if !visibleGroups.length && !normalizedQuery}<div class="no-results"><h2>No bookmark folders available.</h2><p>Create a writable browser bookmark folder to get started.</p></div>{/if}
        </div>
      </SnapGridGroup>
    {/if}
  </main>

  <footer class="page-footer"><div class="save-state"><span class="status-dot" class:saving={busy}></span><span>{busy ? 'Saving changes…' : client.mode === 'preview' ? 'Demo workspace' : 'Browser connected'}</span>{#if client.mode === 'preview'}<span class="footer-divider">·</span><span class="local-label">saved locally, not your real bookmarks</span>{:else}<span class="footer-divider">·</span><span class="local-label">{bookmarkCount} bookmarks, {folderCount} folders</span>{/if}</div>
    <nav class="group-pagination" aria-label="Jump to bookmark group">{#each visibleGroups as group, index (group.id)}<button class:active={activeGroup === index} aria-label="Jump to {group.path.join(' / ')}" aria-current={activeGroup === index ? 'true' : undefined} onclick={() => jump(index)}></button>{/each}</nav>
    <div class="footer-hints"><span class="context-hint"><Icon name="mouse" size={13} />Right-click to make it yours</span><div class="scroll-control"><span>{normalizedQuery ? `${resultCount} found` : canScroll ? 'SCROLL TO EXPLORE' : 'ALL IN VIEW'}</span><button class="icon-button" aria-label="Scroll groups left" disabled={!canScroll || scrollProgress < .01} onclick={() => scroll(-1)}><Icon name="back" size={17} /></button><button class="icon-button" aria-label="Scroll groups right" disabled={!canScroll || scrollProgress > .99} onclick={() => scroll(1)}><Icon name="chevron" size={17} /></button></div></div>
  </footer>
  {#if arranging && selectedTile}<MetroAppBar title={selectedTile.title} size={selectedTile.size} writable={selectedTile.writable} onresize={(size) => resizeTile(selectedTile.id, size)} onedit={() => edit({ kind: 'bookmark', id: selectedTile.id })} ondelete={() => { void execute({ type: 'node.remove', id: selectedTile.id }); }} onclear={() => selectedId = null} />{/if}
  {#if context}<ContextMenu x={context.x} y={context.y} title={contextTile?.title ?? (context.target === 'group' ? nodes.get(context.id)?.title : 'Your canvas')} subtitle={contextTile?.domain} items={menuItems} onclose={closeContext} size={contextTile?.size} onresize={contextTile ? (size) => { if (contextTile) resizeTile(contextTile.id, size); } : undefined} />{/if}
  {#if dialog && snapshot}{#key JSON.stringify(dialog)}<Editor spec={dialog} {snapshot} oncommand={execute} onclose={() => dialog = null} onresetpreview={client.resetPreview ? async () => { applySnapshot(await client.resetPreview!()); showNotice({ message: 'Sample bookmarks restored.' }); } : undefined} />{/key}{/if}
  {#if notice}<UndoToast {notice} onundo={undo ? () => performUndo(undo.id) : undefined} onclose={() => notice = null} />{/if}
</div>

<style>
  .metro-app { width: 100%; height: 100dvh; display: flex; flex-direction: column; color: var(--text); background: var(--bg); overflow: hidden; position: relative; }
  .theme-dusk { --bg: #201b2b; --surface: #292332; --surface-hover: #372f41; --line: #3a3048; --accent: #d1b6ea; --muted: #998da7; }
  .theme-forest { --bg: #14201c; --surface: #1d2c25; --surface-hover: #2a3a30; --line: #314137; --accent: #c3d0a3; --accent-ink: #1b281c; --muted: #89998c; }
  .theme-paper { color-scheme: light; --bg: #eeece8; --surface: #f8f7f4; --surface-hover: #e1ded7; --line: #d4d0c8; --text: #292a2b; --muted: #62655f; --accent: #5c566f; --accent-ink: #fff; --danger: #b94038; --shadow: 0 24px 70px #2a2a2526; }
  .page-header { flex-shrink: 0; padding: 31px 68px 0; }
  .brand-row { display: flex; justify-content: space-between; align-items: center; height: 21px; }
  .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); font-size: 13px; font-weight: 650; letter-spacing: -.35px; }
  .brand-mark { display: grid; grid-template-columns: repeat(2, 6px); grid-template-rows: repeat(2, 6px); gap: 2px; }
  .brand-mark i { background: var(--accent); }
  .brand-mark i:last-child { background: #899675; }
  .brand-divider { font-weight: 300; color: var(--muted); opacity: .45; margin: 0 10px; }
  .brand-product { color: var(--muted); font-weight: 400; font-size: 11px; letter-spacing: 0; }
  .header-date { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.4px; }
  .heading-row { display: flex; justify-content: space-between; align-items: center; gap: 30px; padding: 33px 0 28px; }
  .eyebrow { font-size: 8px; color: var(--muted); letter-spacing: 1.6px; margin-bottom: 8px; }
  h1 { font-size: 67px; font-weight: 340; letter-spacing: -4.5px; line-height: 1.1; margin: 0; }
  .heading-period { color: var(--accent); }
  .headline p { margin: 10px 0 0; font-size: 11px; color: var(--muted); letter-spacing: .05px; }
  .header-actions { display: flex; align-items: center; gap: 11px; padding-top: 14px; }
  .search-box { height: 42px; width: 249px; background: var(--surface); border: 1px solid var(--line); display: flex; align-items: center; gap: 10px; padding: 0 13px; border-radius: 5px; color: var(--muted); }
  .search-box:focus-within { border-color: var(--accent); }
  .search-box input { background: transparent; outline: none; border: none; width: 100%; min-width: 0; font-size: 11px; color: var(--text); padding: 0; }
  .search-box input::placeholder { color: var(--muted); }
  .search-box input::-webkit-search-cancel-button { display: none; }
  .search-box kbd { width: 17px; height: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line); border-radius: 3px; font-size: 10px; font-family: inherit; }
  .search-box button { background: transparent; color: var(--muted); padding: 3px; }
  .add-button { font-size: 11px; padding: 0 15px; }
  .settings-button { margin-right: -8px; }
  .filter-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid var(--line); padding-bottom: 14px; }
  .root-filters { display: flex; gap: 6px; min-width: 0; overflow-x: auto; scrollbar-width: none; padding: 2px; margin-left: -10px; }
  .root-filters button { height: 29px; padding: 0 9px; background: transparent; border-radius: 3px; color: var(--muted); font-size: 10px; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
  .root-filters button.active { background: var(--surface-hover); color: var(--text); }
  .root-filters button:hover { color: var(--text); }
  .root-filters button span { font-size: 8px; color: var(--muted); }
  .root-filters button.active span { color: var(--accent); }
  .arrange-button { display: inline-flex; gap: 8px; align-items: center; padding: 7px 0 7px 10px; background: transparent; color: var(--muted); font-size: 10px; white-space: nowrap; }
  .arrange-button:hover, .arrange-button.active { color: var(--accent); }
  .arrange-button:disabled { opacity: .4; }
  .canvas { flex: 1; min-height: 0; overflow: auto; scrollbar-width: none; outline: none; position: relative; padding-top: 16px; }
  .canvas::-webkit-scrollbar { display: none; }
  .groups { display: flex; gap: 36px; width: max-content; padding: 0 68px 28px; align-items: flex-start; }
  .new-group { width: 192px; flex-shrink: 0; }
  .new-group-heading { height: 60px; padding-top: 11px; display: flex; align-items: center; color: var(--muted); font-size: 8px; letter-spacing: 1.1px; }
  .new-group button { width: 100%; border: 1px dashed var(--line); background: transparent; color: var(--muted); position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: background 160ms, border 160ms; }
  .new-group button:hover { border-color: var(--muted); background: var(--surface); color: var(--text); }
  .new-group-plus { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border: 1px solid var(--line); border-radius: 50%; margin-bottom: 20px; }
  .new-group button strong { font-size: 13px; font-weight: 450; color: var(--text); }
  .new-group button > span:not(.new-group-plus, .new-group-arrow) { font-size: 9px; margin-top: 8px; }
  .new-group-arrow { position: absolute; right: 17px; top: 17px; opacity: .6; }
  .page-footer { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; min-height: 65px; padding: 0 68px 6px; gap: 20px; }
  .save-state { display: flex; align-items: center; gap: 7px; font-size: 9px; color: var(--muted); white-space: nowrap; }
  .status-dot { width: 4px; height: 4px; background: #95a980; border-radius: 50%; margin-right: 1px; }
  .status-dot.saving { background: var(--accent); animation: pulse 700ms infinite alternate; }
  .footer-divider { opacity: .5; }
  .local-label { font-size: 8px; }
  .group-pagination { display: flex; gap: 6px; padding: 10px; position: absolute; left: 50%; transform: translateX(-50%); }
  .group-pagination button { width: 5px; height: 5px; border-radius: 50%; background: var(--line); padding: 0; transition: width 150ms; }
  .group-pagination button.active { width: 17px; border-radius: 5px; background: var(--accent); }
  .footer-hints { display: flex; align-items: center; gap: 31px; color: var(--muted); }
  .context-hint { display: flex; align-items: center; gap: 8px; font-size: 8px; }
  .scroll-control { display: flex; align-items: center; gap: 2px; }
  .scroll-control > span { font-size: 7px; letter-spacing: 1.2px; margin-right: 11px; }
  .scroll-control .icon-button { width: 24px; height: 30px; border-radius: 3px; }
  .scroll-control button:disabled { opacity: .25; }
  .no-results, .loading-state { height: 100%; width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--muted); min-height: 240px; }
  .no-results h2, .loading-state h2 { color: var(--text); font-size: 23px; font-weight: 400; letter-spacing: -.7px; margin: 22px 0 10px; }
  .no-results p, .loading-state p { font-size: 12px; margin: 0 0 25px; padding: 0 20px; text-align: center; line-height: 1.7; }
  .loading-mark { width: 26px; height: 26px; border: 1px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: turn 900ms linear infinite; margin-bottom: 20px; }
  .skip-link { position: absolute; left: 16px; top: -60px; z-index: 130; background: var(--accent); color: var(--accent-ink); padding: 12px 16px; border-radius: 5px; font-size: 12px; }
  .skip-link:focus { top: 12px; }
  .reduced :global(*) { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
  @keyframes pulse { to { opacity: .35; } }
  @keyframes turn { to { transform: rotate(360deg); } }
  @media (min-width: 1600px) { .page-header { padding-top: 40px; } .heading-row { padding-top: 43px; padding-bottom: 36px; } .canvas { padding-top: 26px; } h1 { font-size: 78px; } }
  @media (max-width: 1100px) { .page-header { padding-left: 38px; padding-right: 38px; } .groups { padding-left: 38px; padding-right: 38px; gap: 28px; } .page-footer { padding-left: 38px; padding-right: 38px; } .context-hint { display: none; } .local-label { max-width: 170px; overflow: hidden; text-overflow: ellipsis; } .search-box { width: 220px; } }
  @media (max-width: 760px) { .page-header { padding: 24px 24px 0; } .heading-row { padding: 27px 0 23px; gap: 16px; align-items: flex-end; } h1 { font-size: 55px; } .eyebrow { font-size: 7px; letter-spacing: 1px; } .header-actions { padding: 0; flex-wrap: wrap; justify-content: flex-end; gap: 7px; max-width: 270px; } .search-box { width: 184px; height: 36px; } .add-button { height: 36px; width: 36px; padding: 0; } .add-button > span { display: none; } .settings-button { width: 30px; height: 33px; } .headline p { font-size: 9px; } .groups { padding-left: 24px; padding-right: 24px; } .header-date { font-size: 7px; letter-spacing: .9px; } .arrange-button span { display: none; } .page-footer { padding-left: 24px; padding-right: 24px; } .group-pagination { display: none; } .local-label, .footer-divider { display: none; } }
  @media (max-width: 480px) { .heading-row { display: block; padding-top: 26px; padding-bottom: 20px; } .header-actions { flex-wrap: nowrap; justify-content: flex-start; max-width: none; margin-top: 24px; } .search-box { flex: 1; } .header-date { display: none; } .settings-button { margin-left: 3px; margin-right: -5px; } .scroll-control > span { display: none; } .filter-row { padding-bottom: 11px; } }
</style>
