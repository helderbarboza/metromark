/**
 * Shared WebGL pipeline for the animated shaders.
 *
 * The live background (`ShaderBackground.svelte`) and the offscreen benchmark
 * (`benchmark.ts`) build the same programs, buffers and textures through
 * `createPipeline`. The pipeline owns everything GL-related; callers own
 * scheduling (the animation frame loop, or the benchmark's timed loop).
 */
import type { PassChannel, ShaderDefinition, ShaderPass, TextureSource } from './types'

const MAX_CHANNELS = 4
/**
 * Edge length of the generated noise texture, in texels. Shaders that sample
 * it hard-code the matching size (e.g. `clouds` divides by 256.0).
 */
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

export interface GlContext {
  gl: WebGLRenderingContext
  /** True for a WebGL2 context, which is what GLSL ES 3.00 shaders require. */
  webgl2: boolean
}

export function getContext(element: HTMLCanvasElement): GlContext | null {
  if (PREFER_WEBGL2) {
    const webgl2 = element.getContext('webgl2', CONTEXT_ATTRIBUTES)
    // WebGL2 is a superset for everything used here, and its type is assignable
    // to `WebGLRenderingContext`, so both contexts share a single code path.
    // Do not gate this on `instanceof WebGLRenderingContext`: the WebGL2 context
    // is a sibling interface, not a subclass, so that check always fails and the
    // canvas is already bound, leaving the WebGL1 fallback with a null context.
    if (webgl2)
      return { gl: webgl2, webgl2: true }
  }
  const gl = element.getContext('webgl', CONTEXT_ATTRIBUTES)
  return gl
    ? { gl, webgl2: false }
    : null
}

/**
 * Extra detail for GL calls that fail without a useful info log — typically
 * an empty string when the GPU process is gone, not a GLSL source problem.
 * `getError` is destructive, so it only runs on the failure path.
 */
function glDiagnostics(gl: WebGLRenderingContext): string {
  const error = gl.getError()
  const lost = gl.isContextLost()
  return `empty info log (glError=0x${error.toString(16).padStart(4, '0')}, contextLost=${lost})`
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (shader === null || shader === undefined)
    throw new Error(`Unable to create the background ${label} shader.`)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS) === true
  if (!compiled) {
    const info = gl.getShaderInfoLog(shader)?.trim() ?? ''
    gl.deleteShader(shader)
    const detail = info.length > 0
      ? info
      : glDiagnostics(gl)
    throw new Error(`Unable to compile the ${label} shader: ${detail}`)
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
    if (program === null || program === undefined)
      throw new Error('Unable to create the background shader program.')
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS) === true
    if (!linked) {
      const info = gl.getProgramInfoLog(program)?.trim() ?? ''
      gl.deleteProgram(program)
      const detail = info.length > 0
        ? info
        : glDiagnostics(gl)
      throw new Error(`Unable to link the ${label} shader: ${detail}`)
    }
    return program
  }
  finally {
    // The shader objects only have to outlive the link; deleting them here
    // releases the compiled code instead of leaking one pair per rebuild.
    gl.deleteShader(vertexShader)
    if (fragmentShader !== null)
      gl.deleteShader(fragmentShader)
  }
}

/**
 * Deterministic RGBA noise, standing in for Shadertoy's "RGBA Noise Medium"
 * texture. Each channel is independent, which is what `clouds` relies on when
 * it reads `.yx` to get two decorrelated noise fields.
 */
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
  if (texture === null || texture === undefined)
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

/**
 * 32-bit float needs OES_texture_float_linear to stay filterable, which the
 * reprojection blends require, so half-float is tried first.
 */
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
  const wrapMode = wrap === 'repeat'
    ? gl.REPEAT
    : gl.CLAMP_TO_EDGE
  const texture = gl.createTexture()
  if (texture === null || texture === undefined)
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
  if (framebuffer === null || framebuffer === undefined)
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
  return [
    {
      id: 'image',
      fragmentShader: definition.fragmentShader,
      channels: (definition.channels ?? []).map<PassChannel>(texture => ({ texture })),
    },
  ]
}

/**
 * The viewer's local wall-clock time as a fraction of a day in [0, 1): midnight
 * is 0, noon is 0.5. Read from the calendar fields rather than from epoch
 * arithmetic so daylight-saving shifts and odd time zones are handled by the
 * platform, and so the value the shader sees always matches the clock on screen.
 */
function localTimeOfDay(): number {
  const now = new Date()
  const seconds = now.getHours()
    * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000
  return seconds / 86400
}

export interface PipelineOptions {
  gl: WebGLRenderingContext
  webgl2: boolean
  canvas: HTMLCanvasElement
  definition: ShaderDefinition
  /** Pixel size for a given render scale. The benchmark ignores the scale. */
  renderSize: (renderScale: number) => { width: number, height: number }
  initialScale: number
  /**
   * Static flag for pages that cannot see themselves render (reduced motion,
   * or a non-animating background): after those, intermediate renders use time 0.
   */
  paused: boolean
  /** Redraw once after an image texture uploads (for static pages). */
  redrawOnImage: boolean
  /**
   * Shared mirror of the pointer-interaction setting. Read every frame; the
   * caller updates `enabled` in place so flipping the toggle never rebuilds
   * the pipeline. The benchmark passes a static `{ enabled: false }`.
   */
  mouseState: { enabled: boolean }
}

interface ShaderPipelinePointer {
  /** Recompute the pointer position in framebuffer pixels from a pointer event. */
  update: (event: PointerEvent) => void
  /** Update position and track button state / press origin. */
  move: (event: PointerEvent) => void
  /** Update position and mark the press origin. */
  down: (event: PointerEvent) => void
  /** Clear the button state. */
  up: () => void
}

export interface ShaderPipeline {
  /** Render one frame at `time` seconds. */
  renderFrame: (time: number) => void
  /** Recompute the canvas size; reallocates screen-sized buffers and redraws. */
  resize: () => void
  /** Change the render scale; reallocates the canvas and targets when the pixel size changes. */
  setScale: (scale: number) => void
  /** The runtime render scale, after adaptive quality adjustments. */
  currentScale: () => number
  /** True once every image channel has uploaded (or failed). Procedural sources never block. */
  imagesSettled: () => boolean
  /** True when at least one pass samples `iMouse`. */
  readonly hasMouse: boolean
  /** Pointer tracking in framebuffer pixels; wire these to window listeners. */
  readonly pointer: ShaderPipelinePointer
  /** Release every GL resource created by this pipeline. */
  dispose: () => void
}

/**
 * Build the GL state for `definition`. Returns the pipeline handle; if anything
 * throws mid-setup, whatever was created so far is released before the error
 * escapes.
 */
export function createPipeline(options: PipelineOptions): ShaderPipeline {
  const {
    gl,
    webgl2,
    canvas: element,
    definition,
    renderSize,
    initialScale,
    paused,
    redrawOnImage,
    mouseState,
  } = options

  const disposers: Array<() => void> = []
  const dispose = () => {
    while (disposers.length > 0)
      disposers.pop()?.()
  }

  try {
    if ((definition.glslVersion ?? 100) >= 300 && !webgl2) {
      throw new Error([
        `The "${definition.id}" shader is written in GLSL ES 3.00, which needs a `,
        'WebGL2 context; this browser fell back to WebGL1.',
      ].join(''))
    }

    const passDefinitions = resolvePasses(definition)
    const multiPass = passDefinitions.length > 1
    const format = multiPass
      ? probeTargetFormat(gl)
      : null
    if (multiPass && !format) {
      throw new Error([
        'Multipass shaders need a filterable float colour attachment; this context ',
        'offers neither RGBA16F nor RGBA32F (WebGL2 with EXT_color_buffer_float).',
      ].join(''))
    }

    const quadBuffer = gl.createBuffer()
    if (quadBuffer === null || quadBuffer === undefined)
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
    let runtimeScale = initialScale
    const currentRenderSize = () => renderSize(runtimeScale)

    const allocateBuffer = (
      id: string,
      pass: ShaderPass,
      size: { width: number, height: number },
      screenSized: boolean,
    ) => {
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
    const canvasSize = currentRenderSize()
    element.width = canvasSize.width
    element.height = canvasSize.height

    passDefinitions.forEach((passDefinition, index) => {
      const label = multiPass
        ? `"${passDefinition.id}" pass`
        : 'fragment'
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
        allocateBuffer(
          passDefinition.id,
          passDefinition,
          passDefinition.size ?? canvasSize,
          !passDefinition.size,
        )
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
    const imageEntries = new Map<string, ImageEntry>()
    const getNoiseTexture = (size: number = NOISE_SIZE) => {
      let texture = noiseTextures.get(size)
      if (!texture) {
        texture = createNoiseTexture(gl, size)
        noiseTextures.set(size, texture)
      }
      return texture
    }

    let disposed = false
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

    // Tracked before the first render; updated by the render loop every frame.
    let renderedTime = 0

    const loadImage = (url: string, wrap: 'clamp' | 'repeat', flipY: boolean): ImageEntry => {
      // Wrap mode and flip are upload-time properties, so they are part of the
      // identity: the same file bound two ways needs two textures.
      const key = `${url}|${wrap}|${flipY ? 'flip' : 'noflip'}`
      const cached = imageEntries.get(key)
      if (cached !== undefined)
        return cached

      const entry: ImageEntry = {
        texture: null,
        width: 0,
        height: 0,
        failed: false,
      }
      imageEntries.set(key, entry)
      const image = new Image()
      image.onload = () => {
        if (disposed)
          return
        try {
          const texture = gl.createTexture()
          if (texture === null || texture === undefined)
            throw new Error('Unable to create the texture.')
          gl.bindTexture(gl.TEXTURE_2D, texture)
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
          // Shadertoy channels declare `vflip` per texture; the default is false,
          // which is also GL's default.
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
          const wrapMode = wrap === 'repeat'
            ? gl.REPEAT
            : gl.CLAMP_TO_EDGE
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
          // Animated pipelines redraw on the next frame; paused ones have no
          // next frame coming.
          if (redrawOnImage)
            renderFrame(renderedTime)
        }
        catch (error) {
          entry.failed = true
          console.error('[shader-background] Unable to upload a shader texture.', error)
        }
      }
      image.onerror = () => {
        entry.failed = true
        console.error(
          `[shader-background] Unable to load the shader texture "${url}"; using the generated noise.`,
        )
      }
      image.src = url
      return entry
    }

    const resolveTextureSource = (source: TextureSource): ResolvedChannel => {
      if (source === 'noise') {
        return {
          texture: getNoiseTexture(),
          width: NOISE_SIZE,
          height: NOISE_SIZE,
        }
      }
      if ('noise' in source) {
        const size = source.noise
        return {
          texture: getNoiseTexture(size),
          width: size,
          height: size,
        }
      }
      const entry = loadImage(source.image, source.wrap ?? 'clamp', source.flipY ?? false)
      if (entry.texture)
        return { texture: entry.texture, width: entry.width, height: entry.height }
      // Until the decode lands, hold the fallback at the same texel count so
      // `iChannelResolution` — and any `& mask` in the shader — stays coherent.
      const fallback = source.noiseFallback ?? NOISE_SIZE
      return {
        texture: getNoiseTexture(fallback),
        width: fallback,
        height: fallback,
      }
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
    let frameCount = 0
    let pointerX = 0
    let pointerY = 0
    let pressX = 0
    let pressY = 0
    let pointerDown = false

    // Sampled once per frame so every pass in a frame agrees on the time of day,
    // even if the clock ticks halfway through the pipeline.
    let timeOfDay = localTimeOfDay()
    const channelResolution = new Float32Array(MAX_CHANNELS * 3)
    const warnedChannels = new Set<string>()

    const drawPass = (pass: PassRuntime, time: number) => {
      const target = pass.buffer
        ? pass.buffer.targets[pass.buffer.latest === 0
          ? 1
          : 0]
        : null
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
            console.warn([
              `[shader-background] The "${definition.id}" shader samples iChannel${i}, `,
              'but no texture is bound to it. ',
              'The GPU reads an incomplete texture, which samples as black; ',
              'declare a channel source in the shader definition.',
            ].join(''))
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
          live && pointerDown
            ? pressX
            : 0,
          live && pointerDown
            ? pressY
            : 0,
        )
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      if (pass.buffer) {
        pass.buffer.latest = pass.buffer.latest === 0
          ? 1
          : 0
        pass.dirty = false
      }
    }

    function renderFrame(time: number) {
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
      const next = currentRenderSize()
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

    const setScale = (scale: number) => {
      runtimeScale = scale
      const next = currentRenderSize()
      if (next.width === element.width && next.height === element.height)
        return
      element.width = next.width
      element.height = next.height
      for (const [id, buffer] of buffers) {
        if (!buffer.screenSized)
          continue
        const passDefinition = passDefinitions.find(candidate => candidate.id === id)
        if (passDefinition)
          allocateBuffer(id, passDefinition, next, true)
      }
      for (const pass of passes) {
        if (!pass.buffer || pass.buffer.screenSized)
          pass.dirty = true
      }
      renderFrame(paused ? 0 : renderedTime)
    }

    const imagesSettled = () => {
      for (const entry of imageEntries.values()) {
        if (!entry.texture && !entry.failed)
          return false
      }
      return true
    }

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
    const pointer: ShaderPipelinePointer = {
      update: updatePointer,
      move: (event: PointerEvent) => {
        updatePointer(event)
        const down = event.buttons > 0
        if (down && !pointerDown) {
          pressX = pointerX
          pressY = pointerY
        }
        pointerDown = down
      },
      down: (event: PointerEvent) => {
        updatePointer(event)
        pressX = pointerX
        pressY = pointerY
        pointerDown = true
      },
      up: () => {
        pointerDown = false
      },
    }

    const hasMouse = passes.some(pass => pass.uniform.mouse !== null)

    return {
      renderFrame,
      resize,
      setScale,
      currentScale: () => runtimeScale,
      imagesSettled,
      hasMouse,
      pointer,
      dispose,
    }
  }
  catch (error) {
    dispose()
    throw error
  }
}
