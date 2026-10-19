<script lang='ts'>
  import { getIcon } from '../icons'

  interface Props {
    name: string
    size?: number
  }

  const { name, size = 18 }: Props = $props()
</script>

<!-- Only compile-time bundled glyphs are accepted by getIcon; no bookmark HTML is injected. -->
<!-- eslint-disable svelte/no-at-html-tags -->
<span
  class='icon'
  aria-hidden='true'
  style:width='{size}px'
  style:height='{size}px'
>{@html getIcon(name)}</span>

<style>
  .icon {
    display: inline-flex;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  }
  .icon :global(svg) {
    width: 100%;
    height: 100%;
  }
</style>
