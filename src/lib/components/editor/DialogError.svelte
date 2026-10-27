<script lang='ts'>
  const { error }: { error: string } = $props()
</script>

{#if error}
  <p
    class='
      mb-5 rounded-sm border border-[#ef979133] bg-[#ef979108] px-[13px]
      py-[11px] text-[12px] leading-[1.6] text-(--danger)
    '
    role='alert'
  >
    {error}
  </p>
{/if}
