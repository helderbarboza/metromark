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

<label class='mb-[21px] flex flex-col gap-[9px]'>
  <span class='text-[12px] font-medium text-(--text)' id={`${uid}-label`}>
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
      h-[45px] w-full rounded-sm border border-(--line) bg-(--bg) px-[13px] pr-7
      text-[13px] text-(--text) outline-offset-1
    '
  >
    {#each folders as folder (folder.id)}
      <option value={folder.id}>{folder.path.join(' / ') || 'Unnamed group'}</option>
    {/each}
  </select>
  <span class='m-0 text-[11px] leading-[1.65] text-(--muted)' id={`${uid}-hint`}>
    {hint}
  </span>
</label>
