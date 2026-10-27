<!-- Bundled SVG only. No bookmark HTML or user-uploaded SVG is accepted. -->
<!--
  Live-tile faces. Face 0 is the tile icon; the rest come from `faces`.
  Each new face slides up from the bottom and pushes the old one out.
-->
<script lang='ts'>
  import type { MetroFace } from '../types'
  import FaviconIcon from './FaviconIcon.svelte'

  interface Props {
    faces: MetroFace[]
    period?: number
    faviconPageUrl?: string
    tint?: string
    iconClass?: string
  }

  const {
    faces,
    period = 6000,
    faviconPageUrl,
    tint = '#ffffff',
    iconClass = '',
  }: Props = $props()

  // index -1 = the icon face
  const count = $derived(faces.length + 1)
  let idx = $state(0)
  let prev = $state<number | null>(null)
  let tick = $state(0) // unique key per transition so the animation restarts

  $effect(() => {
    const n = count
    const ms = period
    let iv: ReturnType<typeof setInterval> | undefined
    const step = () => {
      prev = idx
      idx = (idx + 1) % n
      tick++
    }
    // stagger tiles so they don't all flip together
    const t = setTimeout(() => {
      step()
      iv = setInterval(step, ms)
    }, 1500 + Math.random() * 3000)
    return () => {
      clearTimeout(t)
      clearInterval(iv)
    }
  })
</script>

{#snippet face(i: number)}
  {#if i === 0}
    <div
      class={`
        metro-tile-icon
        ${iconClass}
      `}
    >
      <FaviconIcon
        pageUrl={faviconPageUrl ?? ''}
        tint={tint}
      />
    </div>
  {:else}
    {@const f = faces[i - 1]}
    {#if f?.background}
      <div
        class='photo'
        style:background={f.background}
      ></div>
    {:else if f}
      <div class='text'>
        {#if f.big !== undefined}<div class='big'>{f.big}</div>{/if}
        {#if f.title}<div class='title'>{f.title}</div>{/if}
        {#each f.lines ?? [] as line, lineIndex (lineIndex)}<div class='line'>{line}</div>{/each}
      </div>
    {/if}
  {/if}
{/snippet}

<div class='faces'>
  {#key tick}
    {#if prev !== null}
      <div class='face out'>{@render face(prev)}</div>
    {/if}
    <div
      class='face'
      class:in={prev !== null}
    >{@render face(idx)}</div>
  {/key}
</div>

<style>
  .faces,
  .face,
  .photo {
    position: absolute;
    inset: 0;
  }
  .in {
    animation: metro-face-in 700ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
  }
  .out {
    animation: metro-face-out 700ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
  }
  @keyframes metro-face-in {
    from { transform: translateY(100%); }
    to { transform: none; }
  }
  @keyframes metro-face-out {
    from { transform: none; }
    to { transform: translateY(-100%); }
  }
  .text {
    padding: 10px 12px 0;
    height: calc(100% - 26px);
    overflow: hidden;
  }
  .big {
    font-size: 40px;
    font-weight: 200;
    line-height: 1.05;
  }
  .title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .line {
    font-size: 13px;
    opacity: 0.9;
    line-height: 1.35;
  }
</style>
