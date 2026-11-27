<script lang='ts'>
  import type { IconName } from '$lib/icons'
  import SettingsCard from '$lib/components/molecules/SettingsCard.svelte'
  import { Switch } from '$lib/components/ui/switch'

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
    <span class='flex cursor-pointer items-center gap-2.5'>
      <span class='text-sm text-(--foreground)'>{enabled ? 'On' : 'Off'}</span>
      <Switch
        id={controlId}
        aria-labelledby={`${controlId}-title`}
        aria-describedby={helpText
          ? `${controlId}-help`
          : undefined}
        bind:checked={enabled}
      />
    </span>
  </SettingsCard>
</div>
