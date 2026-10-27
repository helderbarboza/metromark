<script lang='ts'>
  import type { Snippet } from 'svelte'

  const { children }: { children: Snippet } = $props()
</script>

<div class='mt-7 flex justify-end gap-[9px]'>
  {@render children()}
</div>
