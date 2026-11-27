<script lang='ts'>
  // One canvas that paints a wallpaper slice behind every visible tile. The DOM
  // keeps ownership of layout, text and input; scrolling stays native in the
  // board's ScrollArea.Viewport. This layer only reads geometry and writes pixels.
  import type { Settings } from '$lib/config'
  import type { WallpaperSource } from '$lib/cutout-source'
  import type { WallpaperPlacement } from '$lib/cutouts'

  import { isMediaKey } from '$lib/background-image'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import {
    createCanvasSource,
    createColorSource,
    createImageSource,
    createThemeColorSource,
  } from '$lib/cutout-source'
  import {
    clampCutoutZoom,
    createPlacement,
    cutoutFallbackColor,
    drawCutouts,
    positionWallpaper,
  } from '$lib/cutouts'
  import { loadBackgroundMedia } from '$lib/media-store'

  interface Props {
    /** The board's scroll viewport; the only scrolling element. */
    scroller: HTMLElement | null
    /** Tile elements to sample, supplied by the container that owns the board. */
    getTargets: () => HTMLElement[]
    background: Settings['background']
    cutoutZoom?: number
    reducedMotion?: boolean
    /** Keep drawing while idle when the source is an animating shader. */
    animated?: boolean
    /** ShaderBackground's WebGL canvas, exposed while cutouts are active. */
    shaderCanvas?: HTMLCanvasElement | null
  }

  const {
    scroller,
    getTargets,
    background,
    cutoutZoom,
    reducedMotion = false,
    animated = false,
    shaderCanvas = null,
  }: Props = $props()

  const zoom = $derived(clampCutoutZoom(cutoutZoom))
  const sourceKey = $derived(background.type === 'image'
    ? background.url
    : '')
  const fit = $derived(
    background.type === 'image'
      ? background.fit ?? BACKGROUND_DEFAULTS.image.fit
      : 'cover',
  )
  const opacity = $derived(
    background.type === 'image'
      ? background.opacity ?? BACKGROUND_DEFAULTS.image.opacity
      : 1,
  )
  const fallbackColor = $derived(cutoutFallbackColor(background))

  let canvas = $state<HTMLCanvasElement | null>(null)
  let image = $state<HTMLImageElement | null>(null)
  let failed = $state(false)
  let mediaUrl = $state<string | null>(null)

  // Decode http(s)/data sources directly; `idb:` references resolve through the
  // shared media store into an object URL that is revoked on change/unmount.
  $effect(() => {
    const key = sourceKey
    if (!isMediaKey(key)) {
      mediaUrl = null
      return
    }
    let revoked = false
    let objectUrl: string | null = null
    loadBackgroundMedia(key)
      .then((blob) => {
        if (revoked)
          return
        if (!blob) {
          failed = true
          return
        }
        objectUrl = URL.createObjectURL(blob)
        mediaUrl = objectUrl
      })
      .catch(() => {
        if (!revoked)
          failed = true
      })
    return () => {
      revoked = true
      if (objectUrl)
        URL.revokeObjectURL(objectUrl)
      mediaUrl = null
    }
  })

  $effect(() => {
    const key = sourceKey
    if (key !== '')
      failed = false
    const url = isMediaKey(key)
      ? mediaUrl
      : (key || null)
    if (!url) {
      image = null
      return
    }
    const next = new Image()
    next.decoding = 'sync'
    next.onload = () => {
      image = next
      schedule()
    }
    next.onerror = () => {
      failed = true
      schedule()
    }
    next.src = url
    return () => {
      next.onload = null
      next.onerror = null
    }
  })

  const source = $derived.by<WallpaperSource>(() => {
    if (background.type === 'image' && !failed && image)
      return createImageSource(image, fit, opacity)
    if (background.type === 'shader' && shaderCanvas && !failed)
      return createCanvasSource(shaderCanvas)
    if (fallbackColor)
      return createColorSource(fallbackColor)
    return createThemeColorSource()
  })

  // Mutable render state stays outside Svelte's reactivity: the frame loop must
  // not allocate per tile or re-run component effects while scrolling.
  let ctx: CanvasRenderingContext2D | null = null
  let wallpaper: HTMLCanvasElement | null = null
  let wallpaperCtx: CanvasRenderingContext2D | null = null
  const placement: WallpaperPlacement = createPlacement()
  let viewportW = 0
  let viewportH = 0
  let dpr = 1
  let originX = 0
  let originY = 0
  let rects = new Float32Array(0)
  let count = 0
  let needsMeasure = true
  let frameId = 0

  function resize() {
    const element = canvas
    if (!element)
      return
    viewportW = element.clientWidth || window.innerWidth
    viewportH = element.clientHeight || window.innerHeight
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    element.width = Math.round(viewportW * dpr)
    element.height = Math.round(viewportH * dpr)
    ctx = element.getContext('2d')
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    needsMeasure = true
  }

  /** Samples tile geometry once and stores it in content space. */
  function measure() {
    const element = canvas
    const board = scroller
    if (!element || !board)
      return
    const canvasBox = element.getBoundingClientRect()
    const boardBox = board.getBoundingClientRect()
    originX = boardBox.left - canvasBox.left
    originY = boardBox.top - canvasBox.top
    const targets = getTargets()
    if (rects.length < targets.length * 4)
      rects = new Float32Array(targets.length * 4)
    let index = 0
    for (const target of targets) {
      const box = target.getBoundingClientRect()
      rects[index] = box.left - boardBox.left + board.scrollLeft
      rects[index + 1] = box.top - boardBox.top + board.scrollTop
      rects[index + 2] = box.width
      rects[index + 3] = box.height
      index += 4
    }
    count = targets.length
  }

  function draw() {
    const board = scroller
    if (!ctx || !board)
      return
    if (needsMeasure) {
      measure()
      needsMeasure = false
    }
    const maxScroll = board.scrollWidth - board.clientWidth
    positionWallpaper(
      placement,
      viewportW,
      viewportH,
      zoom,
      maxScroll > 0
        ? board.scrollLeft / maxScroll
        : 0,
      reducedMotion,
    )
    if (!wallpaper) {
      wallpaper = document.createElement('canvas')
      wallpaperCtx = wallpaper.getContext('2d')
    }
    const frameW = Math.max(1, Math.ceil(placement.width * dpr))
    const frameH = Math.max(1, Math.ceil(placement.height * dpr))
    if (wallpaper.width !== frameW || wallpaper.height !== frameH) {
      wallpaper.width = frameW
      wallpaper.height = frameH
    }
    if (!wallpaperCtx)
      return
    source.paint(wallpaperCtx, placement, dpr)
    drawCutouts(ctx, rects, count, {
      source: wallpaper,
      placement,
      scrollX: board.scrollLeft,
      scrollY: board.scrollTop,
      originX,
      originY,
      viewportW,
      viewportH,
      dpr,
    })
  }

  /** One rAF chain for both on-demand and continuous animated redraws. */
  function tick() {
    frameId = 0
    draw()
    if (animated)
      frameId = requestAnimationFrame(tick)
  }

  function schedule() {
    if (frameId !== 0 || !canvas)
      return
    frameId = requestAnimationFrame(tick)
  }

  function stopLoop() {
    if (frameId !== 0) {
      cancelAnimationFrame(frameId)
      frameId = 0
    }
  }

  $effect(() => {
    const element = canvas
    const board = scroller
    if (!element || !board)
      return
    resize()
    measure()
    draw()
  })

  // Tiles are absolutely positioned by Snapgrid and can be re-laid out by drag,
  // resize, search filtering or view changes. Observe those mutations instead of
  // guessing which prop changed; the rAF queue coalesces the bursts.
  $effect(() => {
    const board = scroller
    if (!board)
      return
    const observer = new MutationObserver(() => {
      needsMeasure = true
      schedule()
    })
    observer.observe(board, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-offscreen'],
    })
    return () => observer.disconnect()
  })

  $effect(() => {
    const board = scroller
    if (!board)
      return
    const onScroll = () => {
      schedule()
    }
    board.addEventListener('scroll', onScroll, { passive: true })
    return () => board.removeEventListener('scroll', onScroll)
  })

  $effect(() => {
    // Zoom, motion and background changes all need one fresh frame.
    void zoom
    void reducedMotion
    void background
    void source
    schedule()
  })

  // Shader frames advance without any scroll; keep sampling them while idle.
  $effect(() => {
    const element = canvas
    if (!element)
      return
    void animated
    schedule()
    return stopLoop
  })
</script>

<svelte:window
  onresize={() => {
    resize()
    schedule()
  }}
/>

<canvas
  bind:this={canvas}
  data-testid='cutout-canvas'
  class='pointer-events-none absolute inset-0 -z-1 size-full'
  aria-hidden='true'
></canvas>
