<!-- Bundled SVG only. No bookmark HTML or user-uploaded SVG is accepted. -->
<!--
  Full-bleed "app launch" screen in the tile's colour. Click (or Esc, handled by
  MetroStart) to close.
-->
<script lang='ts'>
  import type { MetroTileDef } from '../types'

  interface Props {
    tile: MetroTileDef
    hint?: string
    onClose?: () => void
  }

  const { tile, hint = 'Click or press Esc to return to Start', onClose }: Props = $props()
</script>

<div
  class='metro-splash'
  style:background={tile.color}
  role='button'
  tabindex='0'
  onclick={() => onClose?.()}
  onkeydown={e => (e.key === 'Enter' || e.key === ' ') && onClose?.()}
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class='icon'>{@html tile.icon ?? ''}</div>
  <div class='title'>{tile.title}</div>
  {#if hint}<div class='hint'>{hint}</div>{/if}
</div>

<style>
  .metro-splash {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    outline: none;
    animation: metro-splash-in 380ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
  }
  .icon :global(svg) {
    width: 140px;
    height: 140px;
  }
  .title {
    margin-top: 18px;
    font-size: 42px;
    font-weight: 200;
  }
  .hint {
    position: absolute;
    bottom: 40px;
    font-size: 13px;
    opacity: 0.7;
  }
  @keyframes metro-splash-in {
    from { transform: scale(0.6); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
</style>
