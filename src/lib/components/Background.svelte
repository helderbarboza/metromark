<script lang='ts'>
  import type { PassChannel, ShaderDefinition, ShaderPass, TextureSource } from '$lib/shaders'
  import type { ShaderMetrics } from '$lib/shaders/metrics.svelte'
  import { defaultShader } from '$lib/shaders'
  import { FrameHealth } from '$lib/shaders/health'
  import { publishMetrics } from '$lib/shaders/metrics.svelte'
  import {
    isFrozen,
    loadFloor,
    nextLoad,
    solveQuality,
  } from '$lib/shaders/quality'
  import { untrack } from 'svelte'

  interface Props {
    reducedMotion?: boolean
    shader?: ShaderDefinition
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
    shader = defaultShader,
    color,
    speed = 1,
    targetFps = 60,
    opacity = 1,
    renderScale,
    quality = 'motion',
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

  /**
   * The viewer's local wall-clock time as a fraction of a day in [0, 1): midnight
   * is 0, noon is 0.5. Read from the calendar fields rather than from epoch
   * arithmetic so daylight-saving shifts and odd time zones are handled by the
   * platform, and so the value the shader sees always matches the clock on screen.
   */
  function localTimeOfDay(): number {
    const now = new Date()
    const seconds
      = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000
    return seconds / 86400
  }

  /** Shaders declare `iChannelResolution[4]`, so four bindings is the ceiling. */
  const MAX_CHANNELS = 4
  /** Edge length of the generated noise texture, in texels. Shaders that sample
   * it hard-code the matching size (e.g. `clouds` divides by 256.0). */
  const NOISE_SIZE = 256

  // Half-float colour attachments: filterable everywhere WebGL2 exists, and wide
  // enough for the depth and camera values multipass shaders stash in a buffer.
  const GL_RGBA16F = 0x881A
  const GL_RGBA32F = 0x8814
  const GL_HALF_FLOAT = 0x140B
  const GL_FLOAT = 0x1406

  const CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    // This is a decorative background, so prefer the integrated GPU over waking
    // a discrete one.
    powerPreference: 'low-power',
  }

  /**
   * Every shader source here is GLSL ES 1.00, which a WebGL2 context still accepts
   * (a source with no `#version` directive defaults to 100), so ask for WebGL2
   * first and fall back to WebGL1 where it is unavailable. Nothing below uses
   * WebGL2-only entry points, so both paths share the same code.
   */
  const PREFER_WEBGL2 = true

  let canvas = $state<HTMLCanvasElement | null>(null)
  // The parent passes props as getters over its snapshot. Track a derived boolean
  // so snapshot updates that do not change this setting keep the WebGL context
  // and the animation time.
  const motion = $derived(reducedMotion)
  // Same reason: reading `renderScale` straight from the props inside the effect
  // subscribes it to the whole snapshot, so every bookmark refresh (including the
  // focus refresh when returning to the tab) rebuilt the pipeline and restarted
  // the shader. Resolve the scale once and only rebuild when it really changes.
  const effectiveScale = $derived(renderScale ?? shader.renderScale ?? 1)

  interface Context {
    gl: WebGLRenderingContext
    /** True for a WebGL2 context, which is what GLSL ES 3.00 shaders require. */
    webgl2: boolean
  }

  function getContext(element: HTMLCanvasElement): Context | null {
    if (PREFER_WEBGL2) {
      const webgl2 = element.getContext('webgl2', CONTEXT_ATTRIBUTES)
      // WebGL2 is a superset for everything used here; the cast keeps a single
      // code path instead of an overload-checked union at every call site.
      if (webgl2)
        return { gl: webgl2 as unknown as WebGLRenderingContext, webgl2: true }
    }
    const gl = element.getContext('webgl', CONTEXT_ATTRIBUTES)
    return gl ? { gl, webgl2: false } : null
  }

  function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string,
    label: string,
  ): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader)
      throw new Error(`Unable to create the background ${label} shader.`)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Unable to compile the background ${label} shader: ${info ?? 'unknown error'}`)
    }
    return shader
  }

  /**
   * Shaders written for ES 3.00 need `#version 300 es` on the very first line and
   * `in`/`out` instead of `attribute`/`varying`. Both are mechanical, so the shared
   * vertex source is translated rather than duplicated.
   */
  function prepareSource(definition: ShaderDefinition, source: string, isVertex: boolean): string {
    if ((definition.glslVersion ?? 100) < 300)
      return source
    if (!isVertex) {
      // ES 3.00 has no `gl_FragColor`; each pass declares its own `out` variable,
      // as the Shadertoy export does.
      return `#version 300 es\n${source}`
    }
    const translated = source
      .replace(/\battribute\b/g, 'in')
      .replace(/\bvarying\b/g, 'out')
    return `#version 300 es\n${translated}`
  }

  function createProgram(
    gl: WebGLRenderingContext,
    definition: ShaderDefinition,
    fragmentSource: string,
    label: string,
  ): WebGLProgram {
    const vertexShader = compileShader(
      gl,
      gl.VERTEX_SHADER,
      prepareSource(definition, definition.vertexShader, true),
      'vertex',
    )
    let fragmentShader: WebGLShader | null = null
    try {
      fragmentShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        prepareSource(definition, fragmentSource, false),
        label,
      )
      const program = gl.createProgram()
      if (!program)
        throw new Error('Unable to create the background shader program.')
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        throw new Error(`Unable to link the ${label} shader: ${info ?? 'unknown error'}`)
      }
      return program
    }
    finally {
      // The shader objects only have to outlive the link; deleting them here
      // releases the compiled code instead of leaking one pair per rebuild.
      gl.deleteShader(vertexShader)
      if (fragmentShader)
        gl.deleteShader(fragmentShader)
    }
  }

  /** Deterministic RGBA noise, standing in for Shadertoy's "RGBA Noise Medium"
   * texture. Each channel is independent, which is what `clouds` relies on when
   * it reads `.yx` to get two decorrelated noise fields. */
  function createNoiseTexture(gl: WebGLRenderingContext, size: number = NOISE_SIZE): WebGLTexture {
    const texels = size * size * 4
    const data = new Uint8Array(texels)
    // mulberry32: tiny, deterministic, and plenty for a noise source.
    let seed = 0x9E3779B9
    for (let i = 0; i < texels; i++) {
      seed = (seed + 0x6D2B79F5) | 0
      let t = seed
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      data[i] = ((t ^ (t >>> 14)) >>> 0) & 0xFF
    }

    const texture = gl.createTexture()
    if (!texture)
      throw new Error('Unable to create the background noise texture.')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
    // REPEAT is required: the shaders wrap sample coordinates outside 0..1.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return texture
  }

  /** 32-bit float needs OES_texture_float_linear to stay filterable, which the
   * reprojection blends require, so half-float is tried first. */
  function probeTargetFormat(gl: WebGLRenderingContext): 'half' | 'float' | null {
    // Extensions have to be requested before the formats become renderable, and a
    // filterable one is mandatory: the reprojection blends sample these buffers with
    // LINEAR. Ask for all of them, then still probe instead of trusting the list.
    gl.getExtension('EXT_color_buffer_float')
    gl.getExtension('EXT_color_buffer_half_float')
    gl.getExtension('OES_texture_float_linear')
    gl.getExtension('OES_texture_half_float_linear')
    for (const format of ['half', 'float'] as const) {
      try {
        // Extension availability does not guarantee a complete attachment (WebGL1
        // with EXT_color_buffer_half_float can still fail), so probe for real.
        const probe = createTarget(gl, 1, 1, 'clamp', format)
        destroyTarget(gl, probe)
        return format
      }
      catch {
      // Try the next format.
      }
    }
    return null
  }

  interface RenderTarget {
    texture: WebGLTexture
    framebuffer: WebGLFramebuffer
    width: number
    height: number
  }

  function createTarget(
    gl: WebGLRenderingContext,
    width: number,
    height: number,
    wrap: 'clamp' | 'repeat',
    format: 'half' | 'float',
  ): RenderTarget {
    const wrapMode = wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE
    const texture = gl.createTexture()
    if (!texture)
      throw new Error('Unable to create a background buffer texture.')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (format === 'half')
      gl.texImage2D(gl.TEXTURE_2D, 0, GL_RGBA16F, width, height, 0, gl.RGBA, GL_HALF_FLOAT, null)
    else
      gl.texImage2D(gl.TEXTURE_2D, 0, GL_RGBA32F, width, height, 0, gl.RGBA, GL_FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.bindTexture(gl.TEXTURE_2D, null)

    const framebuffer = gl.createFramebuffer()
    if (!framebuffer)
      throw new Error('Unable to create a background framebuffer.')
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer)
      gl.deleteTexture(texture)
      throw new Error(`Incomplete background framebuffer (0x${status.toString(16)}).`)
    }

    // A fresh target starts empty; the temporal passes rely on reading zeros.
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return { texture, framebuffer, width, height }
  }

  function destroyTarget(gl: WebGLRenderingContext, target: RenderTarget) {
    gl.deleteFramebuffer(target.framebuffer)
    gl.deleteTexture(target.texture)
  }

  /** A pass output that reads back its own previous frame needs two targets. */
  interface BufferTargets {
    targets: [RenderTarget, RenderTarget]
    /** Index of the most recently completed render. */
    latest: 0 | 1
    /** True when the size follows the canvas and must be reallocated on resize. */
    screenSized: boolean
  }

  interface PassRuntime {
    definition: ShaderPass
    program: WebGLProgram
    positionLocation: number
    uniform: {
      resolution: WebGLUniformLocation | null
      time: WebGLUniformLocation | null
      mouse: WebGLUniformLocation | null
      frame: WebGLUniformLocation | null
      /** Local wall-clock time of day, as a fraction of a day in [0, 1). */
      timeOfDay: WebGLUniformLocation | null
      channelResolution: WebGLUniformLocation | null
      samplers: Array<WebGLUniformLocation | null>
    }
    buffer: BufferTargets | null
    dirty: boolean
  }

  /** A single-pass definition is a one-pass pipeline; keeps one code path. */
  function resolvePasses(definition: ShaderDefinition): ShaderPass[] {
    if (definition.passes && definition.passes.length > 0)
      return definition.passes.map(pass => ({ ...pass }))
    return [{
      id: 'image',
      fragmentShader: definition.fragmentShader,
      channels: (definition.channels ?? []).map<PassChannel>(texture => ({ texture })),
    }]
  }

  /**
   * Build the GL state for `definition` and start drawing. Returns a single
   * teardown function; if anything throws mid-setup, whatever was created so far
   * is released before the error escapes.
   */
  function startShader(
    gl: WebGLRenderingContext,
    webgl2: boolean,
    element: HTMLCanvasElement,
    definition: ShaderDefinition,
    paused: boolean,
    scale: number,
    quality: 'motion' | 'detail',
    mouseState: { enabled: boolean },
    onstruggle?: () => void,
  ): () => void {
    const disposers: Array<() => void> = []
    const dispose = () => {
      while (disposers.length > 0)
        disposers.pop()?.()
    }

    try {
      if ((definition.glslVersion ?? 100) >= 300 && !webgl2) {
        throw new Error(
          `The "${definition.id}" shader is written in GLSL ES 3.00, which needs a `
          + 'WebGL2 context; this browser fell back to WebGL1.',
        )
      }

      const passDefinitions = resolvePasses(definition)
      const multiPass = passDefinitions.length > 1
      const format = multiPass ? probeTargetFormat(gl) : null
      if (multiPass && !format) {
        throw new Error(
          'Multipass shaders need a filterable float colour attachment; this context '
          + 'offers neither RGBA16F nor RGBA32F (WebGL2 with EXT_color_buffer_float).',
        )
      }

      const quadBuffer = gl.createBuffer()
      if (!quadBuffer)
        throw new Error('Unable to create the background shader buffer.')
      disposers.push(() => gl.deleteBuffer(quadBuffer))
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

      const passes: PassRuntime[] = []
      const buffers = new Map<string, BufferTargets>()
      const disposeBuffers = () => {
        for (const buffer of buffers.values()) {
          destroyTarget(gl, buffer.targets[0])
          destroyTarget(gl, buffer.targets[1])
        }
        buffers.clear()
      }
      disposers.push(disposeBuffers)

      // --- canvas sizing -----------------------------------------------------
      let runtimeScale = scale
      const renderSize = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * runtimeScale
        return {
          width: Math.max(1, Math.round(element.clientWidth * pixelRatio)),
          height: Math.max(1, Math.round(element.clientHeight * pixelRatio)),
        }
      }

      const allocateBuffer = (id: string, pass: ShaderPass, size: { width: number, height: number }, screenSized: boolean) => {
        const wrap = pass.wrap ?? 'clamp'
        const targets: [RenderTarget, RenderTarget] = [
          createTarget(gl, size.width, size.height, wrap, format ?? 'half'),
          createTarget(gl, size.width, size.height, wrap, format ?? 'half'),
        ]
        const existing = buffers.get(id)
        if (existing) {
          // Mutate in place: passes hold a reference to this object, and swapping in
          // a new one leaves them binding the framebuffers we just deleted.
          destroyTarget(gl, existing.targets[0])
          destroyTarget(gl, existing.targets[1])
          existing.targets = targets
          existing.latest = 0
          existing.screenSized = screenSized
          return
        }
        buffers.set(id, { targets, latest: 0, screenSized })
      }

      // --- build programs ----------------------------------------------------
      const canvasSize = renderSize()
      element.width = canvasSize.width
      element.height = canvasSize.height

      passDefinitions.forEach((passDefinition, index) => {
        const label = multiPass ? `"${passDefinition.id}" pass` : 'fragment'
        const program = createProgram(gl, definition, passDefinition.fragmentShader, label)
        disposers.push(() => gl.deleteProgram(program))

        const positionLocation = gl.getAttribLocation(program, 'aPosition')
        if (positionLocation === -1)
          throw new Error(`The ${label} has no position attribute.`)

        const samplers: Array<WebGLUniformLocation | null> = []
        for (let i = 0; i < MAX_CHANNELS; i++)
          samplers.push(gl.getUniformLocation(program, `iChannel${i}`))

        const isFinal = index === passDefinitions.length - 1
        let buffer: BufferTargets | null = null
        if (!isFinal) {
          allocateBuffer(passDefinition.id, passDefinition, passDefinition.size ?? canvasSize, !passDefinition.size)
          buffer = buffers.get(passDefinition.id) ?? null
        }

        passes.push({
          definition: passDefinition,
          program,
          positionLocation,
          uniform: {
            resolution: gl.getUniformLocation(program, 'iResolution'),
            time: gl.getUniformLocation(program, 'iTime'),
            mouse: gl.getUniformLocation(program, 'iMouse'),
            frame: gl.getUniformLocation(program, 'iFrame'),
            timeOfDay: gl.getUniformLocation(program, 'iTimeOfDay'),
            channelResolution: gl.getUniformLocation(program, 'iChannelResolution[0]'),
            samplers,
          },
          buffer,
          dirty: true,
        })
      })

      // --- procedural textures ----------------------------------------------
      // Keyed by edge length: a shader may hard-code the texel count it samples
      // (Swiss Alps' blue noise is 1024 square), so one shared 256 texture is not
      // always the right fallback.
      const noiseTextures = new Map<number, WebGLTexture>()
      const getNoiseTexture = (size: number = NOISE_SIZE) => {
        let texture = noiseTextures.get(size)
        if (!texture) {
          texture = createNoiseTexture(gl, size)
          noiseTextures.set(size, texture)
        }
        return texture
      }
      disposers.push(() => {
        disposed = true
        for (const texture of noiseTextures.values())
          gl.deleteTexture(texture)
        noiseTextures.clear()
        for (const entry of imageEntries.values()) {
          if (entry.texture)
            gl.deleteTexture(entry.texture)
        }
        imageEntries.clear()
      })

      interface ResolvedChannel {
        texture: WebGLTexture | null
        width: number
        height: number
      }

      // Image sources decode asynchronously. Until one arrives the generated noise
      // is bound, which has the same statistics, so the first frames look right
      // instead of black.
      interface ImageEntry {
        texture: WebGLTexture | null
        width: number
        height: number
        failed: boolean
      }
      let disposed = false
      const imageEntries = new Map<string, ImageEntry>()

      const loadImage = (url: string, wrap: 'clamp' | 'repeat', flipY: boolean): ImageEntry => {
        // Wrap mode and flip are upload-time properties, so they are part of the
        // identity: the same file bound two ways needs two textures.
        const key = `${url}|${wrap}|${flipY ? 'flip' : 'noflip'}`
        const cached = imageEntries.get(key)
        if (cached)
          return cached

        const entry: ImageEntry = { texture: null, width: 0, height: 0, failed: false }
        imageEntries.set(key, entry)
        const image = new Image()
        image.onload = () => {
          if (disposed)
            return
          try {
            const texture = gl.createTexture()
            if (!texture)
              throw new Error('Unable to create the texture.')
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
            // Shadertoy channels declare `vflip` per texture; the default is false,
            // which is also GL's default.
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
            const wrapMode = wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.bindTexture(gl.TEXTURE_2D, null)
            entry.texture = texture
            entry.width = image.width
            entry.height = image.height
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            // The bound texture and its iChannelResolution just changed.
            for (const pass of passes) {
              if (pass.definition.once)
                pass.dirty = true
            }
            // Animated pipelines redraw on the next frame; paused ones and static
            // (targetFps < 0) ones have no next frame coming.
            if (paused || targetFps < 0)
              renderFrame(renderedTime)
          }
          catch (error) {
            entry.failed = true
            console.error('[Background] Unable to upload a shader texture.', error)
          }
        }
        image.onerror = () => {
          entry.failed = true
          console.error(`[Background] Unable to load the shader texture "${url}"; using the generated noise.`)
        }
        image.src = url
        return entry
      }

      const resolveTextureSource = (source: TextureSource): ResolvedChannel => {
        if (source === 'noise')
          return { texture: getNoiseTexture(), width: NOISE_SIZE, height: NOISE_SIZE }
        if ('noise' in source) {
          const size = source.noise
          return { texture: getNoiseTexture(size), width: size, height: size }
        }
        const entry = loadImage(source.image, source.wrap ?? 'clamp', source.flipY ?? false)
        if (entry.texture)
          return { texture: entry.texture, width: entry.width, height: entry.height }
        // Until the decode lands, hold the fallback at the same texel count so
        // `iChannelResolution` — and any `& mask` in the shader — stays coherent.
        const fallback = source.noiseFallback ?? NOISE_SIZE
        return { texture: getNoiseTexture(fallback), width: fallback, height: fallback }
      }

      const resolveChannel = (channel: PassChannel | null | undefined): ResolvedChannel => {
        if (!channel)
          return { texture: null, width: 0, height: 0 }
        if ('texture' in channel)
          return resolveTextureSource(channel.texture)
        const buffer = buffers.get(channel.buffer)
        if (!buffer)
          return { texture: null, width: 0, height: 0 }
        // Always read the most recently *completed* render, so a pass that samples
        // its own buffer sees the previous frame while it writes the other target.
        const target = buffer.targets[buffer.latest]
        return { texture: target.texture, width: target.width, height: target.height }
      }

      // --- per-frame state ---------------------------------------------------
      let animationFrame = 0
      let elapsed = 0
      let lastTime = 0
      let lastRender = 0
      let staticRendered = false
      let renderedTime = 0
      let frameCount = 0
      let pointerX = 0
      let pointerY = 0
      let pressX = 0
      let pressY = 0
      let pointerDown = false

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
      // Sampled once per frame so every pass in a frame agrees on the time of day,
      // even if the clock ticks halfway through the pipeline.
      let timeOfDay = localTimeOfDay()
      const channelResolution = new Float32Array(MAX_CHANNELS * 3)
      const warnedChannels = new Set<string>()

      const drawPass = (pass: PassRuntime, time: number) => {
        const target = pass.buffer ? pass.buffer.targets[pass.buffer.latest === 0 ? 1 : 0] : null
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null)
        const width = target ? target.width : element.width
        const height = target ? target.height : element.height
        gl.viewport(0, 0, width, height)

        gl.useProgram(pass.program)
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
        gl.enableVertexAttribArray(pass.positionLocation)
        gl.vertexAttribPointer(pass.positionLocation, 2, gl.FLOAT, false, 0, 0)

        channelResolution.fill(0)
        for (let i = 0; i < MAX_CHANNELS; i++) {
          const resolved = resolveChannel(pass.definition.channels?.[i] ?? null)
          // A sampler the compiler kept (so the shader really reads it) paired with no
          // texture is an *incomplete* texture: every fetch returns black with no GL
          // error to point at. That silently guts shaders whose detail comes from a
          // texture, so say it once per channel instead of leaving it to guesswork.
          if (!resolved.texture && pass.uniform.samplers[i]) {
            const key = `${definition.id}/${pass.definition.id}/${i}`
            if (!warnedChannels.has(key)) {
              warnedChannels.add(key)
              console.warn(
                `[Background] The "${definition.id}" shader samples iChannel${i}, but no texture is bound to it. `
                + 'The GPU reads an incomplete texture, which samples as black; declare a channel source in the shader definition.',
              )
            }
          }
          gl.activeTexture(gl.TEXTURE0 + i)
          gl.bindTexture(gl.TEXTURE_2D, resolved.texture)
          const sampler = pass.uniform.samplers[i]
          if (sampler)
            gl.uniform1i(sampler, i)
          if (resolved.texture) {
            channelResolution[i * 3] = resolved.width
            channelResolution[i * 3 + 1] = resolved.height
            channelResolution[i * 3 + 2] = 1
          }
        }
        if (pass.uniform.channelResolution)
          gl.uniform3fv(pass.uniform.channelResolution, channelResolution)

        if (pass.uniform.resolution)
          gl.uniform3f(pass.uniform.resolution, width, height, 1)
        if (pass.uniform.time)
          gl.uniform1f(pass.uniform.time, time)
        if (pass.uniform.frame)
          gl.uniform1i(pass.uniform.frame, frameCount)
        if (pass.uniform.timeOfDay)
          gl.uniform1f(pass.uniform.timeOfDay, timeOfDay)
        if (pass.uniform.mouse) {
          // Shadertoy semantics: xy is the pointer in framebuffer pixels measured
          // from the bottom-left, zw is the press position with the sign carrying
          // the button state.
          // With the setting off the pointer is reported as absent, which is the
          // state shaders test for to begin with (no drag in progress).
          const live = mouseState.enabled
          gl.uniform4f(
            pass.uniform.mouse,
            live ? pointerX : 0,
            live ? pointerY : 0,
            live && pointerDown ? pressX : 0,
            live && pointerDown ? pressY : 0,
          )
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        if (pass.buffer) {
          pass.buffer.latest = pass.buffer.latest === 0 ? 1 : 0
          pass.dirty = false
        }
      }

      const renderFrame = (time: number) => {
        renderedTime = time
        timeOfDay = localTimeOfDay()
        frameCount++
        for (const pass of passes) {
          if (pass.definition.once && !pass.dirty)
            continue
          drawPass(pass, time)
        }
      }

      const resize = () => {
        const next = renderSize()
        if (next.width === element.width && next.height === element.height)
          return
        element.width = next.width
        element.height = next.height
        // Setting the canvas size clears the drawing buffer, and new targets start
        // empty, so redraw in the same task rather than letting a blank frame
        // reach the compositor.
        for (const [id, buffer] of buffers) {
          if (!buffer.screenSized)
            continue
          const passDefinition = passDefinitions.find(candidate => candidate.id === id)
          if (passDefinition)
            allocateBuffer(id, passDefinition, next, true)
        }
        for (const pass of passes) {
          // Fixed-size look-up tables survive a resize; screen-sized buffers were
          // just reallocated (and cleared), and the final pass draws to the canvas.
          if (!pass.buffer || pass.buffer.screenSized)
            pass.dirty = true
        }
        renderFrame(paused ? 0 : renderedTime)
      }

      let appliedMouseEnabled = mouseState.enabled
      const frame = (now: number) => {
        animationFrame = requestAnimationFrame(frame)
        const delta = lastTime === 0 ? 0 : (now - lastTime) / 1000
        lastTime = now
        elapsed += delta * speed
        health.push(now, !frozen)
        const verdict = health.verdict()
        if (!frozen && verdict === 'struggling' && now >= cooldownUntil) {
          const floor = loadFloor(preference, scale0, fps0)
          load = nextLoad(load, 'decrease', floor)
          const solution = solveQuality(preference, load, scale0, fps0, health.displayHz() || 60)
          runtimeScale = solution.scale
          // apply scale change
          const next = renderSize()
          if (next.width !== element.width || next.height !== element.height) {
            element.width = next.width
            element.height = next.height
            for (const [id, buffer] of buffers) {
              if (!buffer.screenSized)
                continue
              const passDefinition = passDefinitions.find(c => c.id === id)
              if (passDefinition)
                allocateBuffer(id, passDefinition, next, true)
            }
            for (const pass of passes) {
              if (!pass.buffer || pass.buffer.screenSized)
                pass.dirty = true
            }
            renderFrame(paused ? 0 : renderedTime)
          }
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
            runtimeScale = solution.scale
            healthySince = now
          }
        }
        // Publish metrics every 500 ms.
        if (now - lastPublish >= 500) {
          lastPublish = now
          const stats = health.stats()
          const metrics: ShaderMetrics = {
            shader: definition.id,
            fps: stats?.fps ?? 0,
            frameMs: stats?.frameMs ?? 0,
            worstMs: stats?.worstMs ?? 0,
            nominalMs: health.displayHz() > 0 ? 1000 / health.displayHz() : 16.67,
            scale: runtimeScale,
            quality: preference,
            level: frozen ? 'frozen' : load < 0.99 ? 'reduced' : 'full',
            targetFps: fps0,
          }
          publishMetrics(metrics)
        }
        if (frozen) {
          if (!staticRendered) {
            renderFrame(paused ? 0 : renderedTime)
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
            renderFrame(elapsed)
        }
        if (targetFps < 0) {
          if (!staticRendered) {
            renderFrame(elapsed)
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
        renderFrame(elapsed)
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

      // Only listen for the pointer when a pass actually samples it; the setting
      // gates what `iMouse` reports rather than whether these listeners exist.
      // `getUniformLocation` drops uniforms the compiler optimized away. With the
      // setting off `iMouse` stays at the origin, which is exactly the "no pointer"
      // state shaders test for (Swiss Alps starts its own day/night cycle when the
      // pointer is not dragging the sun).
      if (passes.some(pass => pass.uniform.mouse !== null)) {
        const updatePointer = (event: PointerEvent) => {
          // Still tracked while disabled, so turning the setting back on does not
          // need a fresh pointer move to pick up where the cursor is.
          const rect = element.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0)
            return
          // The canvas backing store can differ from its CSS box (DPR, zoom, render
          // scale), so scale instead of assuming they match.
          pointerX = ((event.clientX - rect.left) / rect.width) * element.width
          // GL fragment rows start at the bottom.
          pointerY = ((rect.bottom - event.clientY) / rect.height) * element.height
        }
        const handlePointerMove = (event: PointerEvent) => {
          updatePointer(event)
          const down = event.buttons > 0
          if (down && !pointerDown) {
            pressX = pointerX
            pressY = pointerY
          }
          pointerDown = down
        }
        const handlePointerDown = (event: PointerEvent) => {
          updatePointer(event)
          pressX = pointerX
          pressY = pointerY
          pointerDown = true
        }
        const handlePointerUp = () => {
          pointerDown = false
        }
        window.addEventListener('pointermove', handlePointerMove, { passive: true })
        window.addEventListener('pointerdown', handlePointerDown, { passive: true })
        window.addEventListener('pointerup', handlePointerUp, { passive: true })
        disposers.push(() => {
          window.removeEventListener('pointermove', handlePointerMove)
          window.removeEventListener('pointerdown', handlePointerDown)
          window.removeEventListener('pointerup', handlePointerUp)
        })
      }

      const observer = new ResizeObserver(() => resize())
      observer.observe(element)
      disposers.push(() => observer.disconnect())

      const handleVisibility = () => {
        if (document.hidden)
          return
        lastTime = 0
        lastRender = 0
        health.reset()
        health.deferWarmup(performance.now(), 500)
      }
      document.addEventListener('visibilitychange', handleVisibility)
      disposers.push(() => document.removeEventListener('visibilitychange', handleVisibility))

      const handleContextLost = (event: Event) => {
        event.preventDefault()
        contextLosses++
        if (contextLosses >= 2)
          onstruggle?.()
      }
      element.addEventListener('webglcontextlost', handleContextLost)
      disposers.push(() => element.removeEventListener('webglcontextlost', handleContextLost))

      if (paused) {
        stopAnimation()
        renderFrame(0)
      }
      else {
        startAnimation()
      }
      disposers.push(stopAnimation)
    }
    catch (error) {
      dispose()
      throw error
    }

    return dispose
  }

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
      console.error('[Background] WebGL is unavailable; showing the base color only.')
      return
    }

    try {
      const dispose = startShader(context.gl, context.webgl2, element, definition, paused, scale, quality, mouseState, onstruggle)
      return () => {
        dispose()
        publishMetrics(null)
      }
    }
    catch (error) {
      // A broken shader should not take the page down with it.
      console.error(`[Background] Unable to render the "${definition.id}" shader.`, error)
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
    style:opacity={opacity}
    aria-hidden='true'
  ></canvas>
</div>
