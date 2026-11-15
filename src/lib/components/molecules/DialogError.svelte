<script lang='ts'>
  const { error }: { error: string } = $props()
</script>

{#if error}
  <p
    class='
      mb-5 rounded-sm border
      border-[color-mix(in_srgb,var(--destructive)_20%,transparent)]
      bg-[color-mix(in_srgb,var(--destructive)_3%,transparent)] px-3.25 py-2.75
      text-[12px] leading-[1.6] text-(--destructive)
    '
    role='alert'
  >
    {error}
  </p>
{/if}
