<script lang='ts'>
  import type { Snippet } from 'svelte'

  const { children }: { children: Snippet } = $props()
</script>

<div class='mt-7 flex justify-end gap-2.25'>
  {@render children()}
</div>
