<script lang='ts'>
  import type { GroupView } from '$lib/types'
  import LL from '$i18n/i18n-svelte'
  import * as Field from '$lib/components/ui/field'

  let {
    folders,
    value = $bindable(''),
    label,
    hint,
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

<Field.Field class='mb-5.25 gap-2.25'>
  <Field.Label for={`${uid}-select`} class='text-xs font-medium text-(--foreground)'>
    {label}
  </Field.Label>
  <select
    id={`${uid}-select`}
    aria-describedby={hint
      ? `${uid}-hint`
      : undefined}
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
      <option value={folder.id}>{folder.path.join(' / ') || $LL.app.unnamedGroup()}</option>
    {/each}
  </select>
  {#if hint}
    <Field.Description
      id={`${uid}-hint`}
      class='text-xs/relaxed text-(--muted-foreground)'
    >
      {hint}
    </Field.Description>
  {/if}
</Field.Field>
