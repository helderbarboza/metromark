<script lang='ts'>
  import type { ShaderDefinition } from '$lib/shaders'
  import type { ShaderMetrics } from '$lib/shaders/metrics.svelte'
  import { FrameHealth } from '$lib/shaders/health'
  import { publishMetrics } from '$lib/shaders/metrics.svelte'
  import { createPipeline, getContext } from '$lib/shaders/pipeline'
  import {
    isFrozen,
    loadFloor,
    nextLoad,
    solveQuality,
  } from '$lib/shaders/quality'
  import { untrack } from 'svelte'

  interface Props {
    reducedMotion?: boolean
    shader: ShaderDefinition
    /** Base color under the shader layer */
    color?: string
    /** Shader animation speed factor */
    speed?: number
    /** Maximum shader frames per second */
    targetFps?: number
    /** Shader layer opacity over the base color */
    opacity?: number
    /** Overrides the shader's own render scale */
    renderScale?: number
    /** Quality preference: motion or detail */
    quality?: 'motion' | 'detail'
    /** Whether the frame loop may advance the simulation. When false the last
     * frame stays on the canvas; nothing rebuilds. Default true. */
    animated?: boolean
    /** Publish frame metrics through the shared metrics panel. Thumbnails pass
     * false so they do not overwrite the main page's numbers. Default true. */
    metrics?: boolean
    /** Called when the renderer freezes due to sustained struggle */
    onstruggle?: () => void
    /** Whether the pointer drives the shaders. When false `iMouse` stays at the
     * origin, so a shader never reacts to a cursor that is just passing over the
     * page. The pointer is still tracked, so turning the setting back on does not
     * need a fresh pointer move. */
    mouseInteraction?: boolean
  }

  const {
    reducedMotion = false,
    shader,
    color,
    speed = 1,
    targetFps = 60,
    opacity = 1,
    renderScale,
    quality = 'motion',
    animated = true,
    metrics = true,
    onstruggle,
    mouseInteraction = true,
  }: Props = $props()

  // A live mirror of the setting, read by the render loop every frame. Deliberately
  // a plain object: a `$state` proxy here makes the renderer's own effect depend on
  // the setting, so flipping the toggle would tear the pipeline down and throw away
  // the buffer contents that shaders like the multipass ones accumulate.
  // `untrack` seeds it from the current prop value without making the read a
  // dependency of whatever happens to run here.
  const mouseState = { enabled: untrack(() => mouseInteraction) }
  $effect(() => {
    mouseState.enabled = mouseInteraction
  })

  // Same pattern for `animated`: a plain mirror the render loop reads every frame.
  // Toggling it must not rebuild the pipeline, or every hover on a thumbnail would
  // recompile the shaders.
  const animState = { enabled: untrack(() => animated) }
  $effect(() => {
    animState.enabled = animated
  })

  let canvas = $state<HTMLCanvasElement | null>(null)
  // Set when the pipeline cannot start; hides the canvas so the base color
  // layer shows instead of an opaque black rectangle.
  let failed = $state(false)
  // The parent passes props as getters over its snapshot. Track a derived boolean
  // so snapshot updates that do not change this setting keep the WebGL context
  // and the animation time.
  const motion = $derived(reducedMotion)
  // Same reason: reading `renderScale` straight from the props inside the effect
  // subscribes it to the whole snapshot, so every bookmark refresh (including the
  // focus refresh when returning to the tab) rebuilt the pipeline and restarted
  // the shader. Resolve the scale once and only rebuild when it really changes.
  const effectiveScale = $derived(renderScale ?? shader.renderScale ?? 1)

  $effect(() => {
    const element = canvas
    // Tracked reads: the context and programs are rebuilt when either changes.
    const paused = motion
    const definition = shader
    const scale = effectiveScale
    if (!element)
      return

    const context = getContext(element)
    if (!context) {
      // Decorative layer: degrade to the base color instead of throwing.
      console.error('[shader-background] WebGL is unavailable; showing the base color only.')
      failed = true
      return
    }
    if (context.gl.isContextLost()) {
      // A fresh context can already be dead (GPU process crash, context
      // loss limit). Compiling against it fails with empty info logs.
      console.error('[shader-background] The WebGL context is lost; showing the base color only.')
      failed = true
      return
    }

    failed = false

    // LIFO: stopAnimation runs before the pipeline is disposed.
    const cleanups: Array<() => void> = []
    try {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const pipeline = createPipeline({
        gl: context.gl,
        webgl2: context.webgl2,
        canvas: element,
        definition,
        renderSize: currentScale => ({
          width: Math.max(1, Math.round(element.clientWidth * pixelRatio * currentScale)),
          height: Math.max(1, Math.round(element.clientHeight * pixelRatio * currentScale)),
        }),
        initialScale: scale,
        paused,
        // Static pages (reduced motion, non-animating background) redraw once
        // after an image texture uploads; animated ones pick it up next frame.
        redrawOnImage: paused || targetFps < 0,
        mouseState,
      })
      cleanups.push(() => pipeline.dispose())

      const health = new FrameHealth()
      const scale0 = scale
      const fps0 = Math.min(targetFps > 0 ? targetFps : 60, 60)
      const preference = quality
      let load = 1
      let frozen = false
      let cooldownUntil = 0
      let healthySince = 0
      let lastPublish = 0
      let contextLosses = 0
      // --- per-frame state -------------------------------------------------
      let animationFrame = 0
      let elapsed = 0
      let lastTime = 0
      let lastRender = 0
      let staticRendered = false
      let appliedMouseEnabled = mouseState.enabled

      const frame = (now: number) => {
        animationFrame = requestAnimationFrame(frame)
        const delta = lastTime === 0 ? 0 : (now - lastTime) / 1000
        lastTime = now
        if (!animState.enabled) {
          // Frozen: keep the last presented frame. `lastTime` still tracks the wall
          // clock so resuming produces no time jump.
          if (!staticRendered) {
            pipeline.renderFrame(paused ? 0 : elapsed)
            staticRendered = true
          }
          return
        }
        elapsed += delta * speed
        health.push(now, !frozen)
        const verdict = health.verdict()
        if (!frozen && verdict === 'struggling' && now >= cooldownUntil) {
          const floor = loadFloor(preference, scale0, fps0)
          load = nextLoad(load, 'decrease', floor)
          const solution = solveQuality(preference, load, scale0, fps0, health.displayHz() || 60)
          pipeline.setScale(solution.scale)
          cooldownUntil = now + 10000
          healthySince = 0
          if (isFrozen(load, preference, scale0, fps0)) {
            frozen = true
            onstruggle?.()
          }
        }
        if (!frozen && verdict === 'ok' && cooldownUntil > 0 && now >= cooldownUntil) {
          if (healthySince === 0)
            healthySince = now
          if (now - healthySince >= 10000) {
            const floor = loadFloor(preference, scale0, fps0)
            load = nextLoad(load, 'increase', floor)
            const solution = solveQuality(preference, load, scale0, fps0, health.displayHz() || 60)
            pipeline.setScale(solution.scale)
            healthySince = now
          }
        }
        // Publish metrics every 500 ms.
        if (metrics && now - lastPublish >= 500) {
          lastPublish = now
          const stats = health.stats()
          const snapshot: ShaderMetrics = {
            shader: definition.id,
            fps: stats?.fps ?? 0,
            frameMs: stats?.frameMs ?? 0,
            worstMs: stats?.worstMs ?? 0,
            nominalMs: health.displayHz() > 0 ? 1000 / health.displayHz() : 16.67,
            scale: pipeline.currentScale(),
            quality: preference,
            level: frozen ? 'frozen' : load < 0.99 ? 'reduced' : 'full',
            targetFps: fps0,
          }
          publishMetrics(snapshot)
        }
        if (frozen) {
          if (!staticRendered) {
            pipeline.renderFrame(paused ? 0 : elapsed)
            staticRendered = true
          }
          return
        }
        staticRendered = false
        // Toggling the setting changes what the shader sees, so redraw straight
        // away when the pipeline is not otherwise producing frames.
        if (appliedMouseEnabled !== mouseState.enabled) {
          appliedMouseEnabled = mouseState.enabled
          if (targetFps < 0)
            pipeline.renderFrame(elapsed)
        }
        if (targetFps < 0) {
          if (!staticRendered) {
            pipeline.renderFrame(elapsed)
            staticRendered = true
          }
          return
        }
        staticRendered = false
        if (targetFps > 0) {
          // Allow a small margin so a 60 FPS cap does not halve the frame rate.
          if (now - lastRender < 1000 / targetFps - 1)
            return
          lastRender = now
        }
        pipeline.renderFrame(elapsed)
      }

      const startAnimation = () => {
        if (animationFrame !== 0)
          return
        lastTime = 0
        lastRender = 0
        animationFrame = requestAnimationFrame(frame)
      }

      const stopAnimation = () => {
        if (animationFrame === 0)
          return
        cancelAnimationFrame(animationFrame)
        animationFrame = 0
      }
      cleanups.push(stopAnimation)

      // Only listen for the pointer when a pass actually samples it; the setting
      // gates what `iMouse` reports rather than whether these listeners exist.
      // `getUniformLocation` drops uniforms the compiler optimized away. With the
      // setting off `iMouse` stays at the origin, which is exactly the "no pointer"
      // state shaders test for (Swiss Alps starts its own day/night cycle when the
      // pointer is not dragging the sun).
      if (pipeline.hasMouse) {
        const handlePointerMove = (event: PointerEvent) => pipeline.pointer.move(event)
        const handlePointerDown = (event: PointerEvent) => pipeline.pointer.down(event)
        const handlePointerUp = () => pipeline.pointer.up()
        window.addEventListener('pointermove', handlePointerMove, { passive: true })
        window.addEventListener('pointerdown', handlePointerDown, { passive: true })
        window.addEventListener('pointerup', handlePointerUp, { passive: true })
        cleanups.push(() => {
          window.removeEventListener('pointermove', handlePointerMove)
          window.removeEventListener('pointerdown', handlePointerDown)
          window.removeEventListener('pointerup', handlePointerUp)
        })
      }

      const observer = new ResizeObserver(() => pipeline.resize())
      observer.observe(element)
      cleanups.push(() => observer.disconnect())

      const handleVisibility = () => {
        if (document.hidden)
          return
        lastTime = 0
        lastRender = 0
        health.reset()
        health.deferWarmup(performance.now(), 500)
      }
      document.addEventListener('visibilitychange', handleVisibility)
      cleanups.push(() => document.removeEventListener('visibilitychange', handleVisibility))

      const handleContextLost = (event: Event) => {
        event.preventDefault()
        contextLosses++
        if (contextLosses >= 2)
          onstruggle?.()
      }
      element.addEventListener('webglcontextlost', handleContextLost)
      cleanups.push(() => element.removeEventListener('webglcontextlost', handleContextLost))

      if (paused) {
        stopAnimation()
        pipeline.renderFrame(0)
      }
      else {
        // A frozen multipass pipeline starts on empty buffers, so its first frame
        // is black. When the animation starts disabled (e.g. a thumbnail that only
        // moves on hover), pre-roll it a little so the static frame is representative.
        // One-off cost at mount, not motion; reduced motion keeps the single frame.
        if (!animState.enabled && (definition.passes?.length ?? 0) > 0) {
          const warmFrames = 24
          for (let i = 1; i <= warmFrames; i++)
            pipeline.renderFrame(i / 30)
          elapsed = warmFrames / 30
        }
        startAnimation()
      }

      return () => {
        while (cleanups.length > 0)
          cleanups.pop()?.()
        if (metrics)
          publishMetrics(null)
      }
    }
    catch (error) {
      while (cleanups.length > 0)
        cleanups.pop()?.()
      // A broken shader should not take the page down with it.
      failed = true
      console.error(`[shader-background] Unable to render the "${definition.id}" shader.`, error)
    }
  })
</script>

<div
  class='pointer-events-none absolute inset-0 -z-1'
  style:background={color}
  aria-hidden='true'
>
  <canvas
    bind:this={canvas}
    class='absolute inset-0 size-full'
    style:opacity={failed ? 0 : opacity}
    aria-hidden='true'
  ></canvas>
</div>
