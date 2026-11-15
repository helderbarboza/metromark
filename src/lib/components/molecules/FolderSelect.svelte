<script lang='ts'>
  import type { GroupView } from '$lib/types'

  let {
    folders,
    value = $bindable(''),
    label,
    hint = 'Browser roots are kept separate. There are no virtual groups.',
    initialFocus = false,
    disabled = false,
  }: {
    folders: GroupView[]
    value?: string
    label: string
    hint?: string
    initialFocus?: boolean
    disabled?: boolean
  } = $props()

  const uid = $props.id()
</script>

<label class='mb-5.25 flex flex-col gap-2.25'>
  <span class='text-xs font-medium text-(--foreground)' id={`${uid}-label`}>
    {label}
  </span>
  <select
    aria-labelledby={`${uid}-label`}
    aria-describedby={`${uid}-hint`}
    bind:value
    required
    disabled={disabled}
    data-initial-focus={initialFocus ? '' : undefined}
    class='
      h-11.25 w-full rounded-sm border border-(--border) bg-(--background) px-3.25 pr-7
      text-xs text-(--foreground) outline-offset-1
    '
  >
    {#each folders as folder (folder.id)}
      <option value={folder.id}>{folder.path.join(' / ') || 'Unnamed group'}</option>
    {/each}
  </select>
  <span class='m-0 text-xs/relaxed text-(--muted-foreground)' id={`${uid}-hint`}>
    {hint}
  </span>
</label>
