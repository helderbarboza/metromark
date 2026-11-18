<script lang='ts'>
  import type { DialogSpec } from '$lib/components/organisms/editor/dialog-spec'
  import type { Command, Snapshot } from '$lib/types'
  import LL, { locale } from '$i18n/i18n-svelte'
  import Modal from '$lib/components/molecules/Modal.svelte'
  import AppearanceDialog from '$lib/components/organisms/editor/AppearanceDialog.svelte'
  import BookmarkDialog from '$lib/components/organisms/editor/BookmarkDialog.svelte'
  import CopyDialog from '$lib/components/organisms/editor/CopyDialog.svelte'
  import DeleteDialog from '$lib/components/organisms/editor/DeleteDialog.svelte'
  import DestinationDialog from '$lib/components/organisms/editor/DestinationDialog.svelte'
  import { dialogEyebrow, dialogTitle } from '$lib/components/organisms/editor/dialog-spec'
  import FolderDialog from '$lib/components/organisms/editor/FolderDialog.svelte'
  import { indexTree } from '$lib/tree'

  interface Props {
    spec: DialogSpec
    snapshot: Snapshot
    oncommand: (command: Command) => Promise<boolean>
    onclose: () => void
  }

  const { spec, snapshot, oncommand, onclose }: Props = $props()

  const nodes = $derived(indexTree(snapshot.tree))
  const node = $derived(spec.id
    ? nodes.get(spec.id)
    : undefined)
  // Dialog title/eyebrow are translated, so track the locale.
  const title = $derived.by(() => {
    void $locale
    return dialogTitle(spec, node)
  })
  const eyebrow = $derived.by(() => {
    void $locale
    return dialogEyebrow(spec)
  })

</script>
<Modal
  {title}
  {eyebrow}
  {onclose}
>
  {#if spec.kind === 'delete'}
    {#if node}
      <DeleteDialog
        {node}
        mode={snapshot.mode}
        {oncommand}
        {onclose}
      />
    {:else}
      <p class='mb-6.5 text-sm/relaxed text-(--muted-foreground)'>
        {$LL.dialogs.folderUnavailable()}
      </p>
      <div class='mt-7 flex justify-end gap-2.25'>
        <button
          class='
            h-10.5 rounded-sm border border-(--border) bg-(--card) px-4.25 text-xs
            font-medium text-(--foreground)
          '
          onclick={onclose}
        >
          {$LL.dialogs.close()}
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
