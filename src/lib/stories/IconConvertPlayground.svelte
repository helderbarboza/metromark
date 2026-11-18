<script lang='ts'>
  import type { IconShape } from '$lib/icon-convert'
  import { cssColorToArgb, processIconImage } from '$lib/icon-convert'

  interface Props {
    previewSize?: number
    tint?: string
    filled?: boolean
    bg?: string
    iconShape?: IconShape
    preserveTransparency?: boolean
    clipGlyphToShape?: boolean
    src?: string
  }

  const {
    previewSize = 64,
    tint = '#ff0000',
    filled = true,
    bg = '#ffffff',
    iconShape = -1,
    preserveTransparency = false,
    clipGlyphToShape = false,
    src = '/icons/128.png',
  }: Props = $props()

  let img = $state<HTMLImageElement>()
  let convertedSrc = $state<string>()
  let errorMessage = $state<string>()
  let converting = $state(true)
  let runId = 0

  async function runConversion() {
    if (!img || !img.complete || img.naturalWidth === 0)
      return
    const current = ++runId
    converting = true
    errorMessage = undefined
    try {
      const result = await processIconImage(img, {
        tintArgb: cssColorToArgb(tint),
        bgArgb: cssColorToArgb(bg),
        filled,
        iconShapeId: iconShape,
        clipGlyphToShape,
        preserveTransparency,
        output: 'dataURL',
      })
      if (current !== runId)
        return
      convertedSrc = result
    }
    catch (error) {
      if (current !== runId)
        return
      convertedSrc = undefined
      errorMessage = error instanceof Error
        ? error.message
        : String(error)
    }
    finally {
      if (current === runId)
        converting = false
    }
  }

  function handleLoad() {
    void runConversion()
  }

  function handleError() {
    converting = false
    convertedSrc = undefined
    errorMessage = 'The image could not be loaded.'
  }

  // Reconvert when Storybook controls change and the image is already ready.
  $effect(() => {
    const signature = [
      tint,
      filled,
      bg,
      iconShape,
      preserveTransparency,
      clipGlyphToShape,
      src,
    ].join('|')

    if (!signature)
      return
    if (img?.complete && img.naturalWidth > 0) {
      void runConversion()
    }
  })
</script>

<div class='flex items-start gap-4'>
  <figure class='m-0'>
    <img
      bind:this={img}
      {src}
      alt='Original icon'
      onload={handleLoad}
      onerror={handleError}
      class='size-16'
    />
    <figcaption class='text-xs'>Original</figcaption>
  </figure>

  {#if converting}
    <p
      class='text-sm'
      aria-live='polite'
    >Converting…</p>
  {:else if convertedSrc}
    <figure class='m-0'>
      <img
        src={convertedSrc}
        alt='Converted icon'
        style='width: {previewSize}px; height: {previewSize}px;'
      />
      <figcaption class='text-xs'>Converted</figcaption>
    </figure>
  {/if}
</div>

{#if errorMessage}
  <p
    role='alert'
    class='text-sm'
  >Conversion failed: {errorMessage}</p>
{/if}
