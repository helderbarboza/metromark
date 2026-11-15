<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import SettingsCard from '$lib/components/molecules/SettingsCard.svelte'

  interface Props {
    icon: IconName
    title: string
    helpText?: string
    controlId: string
  }

  const { icon, title, helpText, controlId }: Props = $props()
  let enabled = $state(true)
</script>

<div class='w-180 max-w-full'>
  <SettingsCard
    {icon}
    {title}
    {helpText}
    {controlId}
  >
    <label for={controlId} class='flex cursor-pointer items-center gap-2.5'>
      <span class='text-sm text-(--foreground)'>{enabled ? 'On' : 'Off'}</span>
      <input
        id={controlId}
        type='checkbox'
        role='switch'
        aria-labelledby={`${controlId}-title`}
        aria-describedby={helpText ? `${controlId}-help` : undefined}
        bind:checked={enabled}
        class='
          h-5.5 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-(--border)
          p-0.75
          before:block before:size-4 before:rounded-full before:bg-(--muted-foreground)
          before:transition-transform before:duration-130
          checked:bg-(--primary)
          checked:before:translate-x-5.5 checked:before:bg-(--primary-foreground)
        '
      />
    </label>
  </SettingsCard>
</div>
