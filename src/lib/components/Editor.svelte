<script lang='ts'>
  import type { Command, Snapshot } from '../types'
  import type { DialogSpec } from './editor/dialog-spec'
  import { indexTree } from '../tree'
  import AppearanceDialog from './editor/AppearanceDialog.svelte'
  import BookmarkDialog from './editor/BookmarkDialog.svelte'
  import CopyDialog from './editor/CopyDialog.svelte'
  import DeleteDialog from './editor/DeleteDialog.svelte'
  import DestinationDialog from './editor/DestinationDialog.svelte'
  import { dialogEyebrow, dialogTitle } from './editor/dialog-spec'
  import FolderDialog from './editor/FolderDialog.svelte'
  import SettingsDialog from './editor/SettingsDialog.svelte'
  import Modal from './Modal.svelte'

  interface Props {
    spec: DialogSpec
    snapshot: Snapshot
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
    onresetpreview?: () => Promise<void>
  }

  const { spec, snapshot, oncommand, onclose, onresetpreview }: Props = $props()

  const nodes = $derived(indexTree(snapshot.tree))
  const node = $derived(spec.id ? nodes.get(spec.id) : undefined)
  const title = $derived(dialogTitle(spec, node))
  const eyebrow = $derived(dialogEyebrow(spec))
  const drawer = $derived(spec.kind === 'settings')

</script>
<Modal
  {title}
  {eyebrow}
  {drawer}
  {onclose}
>
  {#if spec.kind === 'settings'}
    <SettingsDialog
      settings={snapshot.settings}
      {oncommand}
      {onclose}
      {onresetpreview}
    />
  {:else if spec.kind === 'delete'}
    {#if node}
      <DeleteDialog
        {node}
        mode={snapshot.mode}
        {oncommand}
        {onclose}
      />
    {:else}
      <p class='mb-[26px] text-[13px] leading-[1.8] text-(--muted)'>
        This folder is no longer available.
      </p>
      <div class='mt-7 flex justify-end gap-[9px]'>
        <button
          class='
            h-[42px] rounded-sm border border-(--line) bg-(--surface) px-[17px]
            text-[12px] font-[550] text-(--text)
          '
          onclick={onclose}
        >
          Close
        </button>
      </div>
    {/if}
  {:else if spec.kind === 'copy'}
    <CopyDialog url={node?.url ?? ''} {onclose} />
  {:else if spec.kind === 'bookmark'}
    <BookmarkDialog
      {spec}
      {snapshot}
      {node}
      {oncommand}
      {onclose}
    />
  {:else if spec.kind === 'folder' || spec.kind === 'rename'}
    <FolderDialog
      {spec}
      {snapshot}
      {node}
      {oncommand}
      {onclose}
    />
  {:else if spec.kind === 'move' || spec.kind === 'restore'}
    <DestinationDialog
      {spec}
      {snapshot}
      {node}
      {oncommand}
      {onclose}
    />
  {:else if spec.kind === 'appearance'}
    <AppearanceDialog
      {snapshot}
      {node}
      {oncommand}
      {onclose}
    />
  {/if}
</Modal>
