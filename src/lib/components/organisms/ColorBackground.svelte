<script lang='ts'>
  interface Props {
    /** Custom page background color. */
    color: string
  }

  const { color }: Props = $props()
</script>

<div
  class='pointer-events-none absolute inset-0 -z-1'
  style:background={color}
  aria-hidden='true'
></div>
