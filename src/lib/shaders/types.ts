/**
 * Uniform contract, as seen by every pass (Shadertoy names throughout):
 *
 * - `iResolution` is the pass's own render size in pixels.
 * - `iTime` is elapsed animation time in seconds, scaled by the renderer's
 *   `speed`; it drives motion such as wind.
 * - `iTimeOfDay` is the viewer's *local* time of day as a fraction of a day in
 *   [0, 1): midnight is 0, noon is 0.5. It is sampled once per frame from the
 *   system clock, so a shader that derives its sun angle from it shows real
 *   day/night. Unlike `iTime` it is absolute — pausing, speeding up or hiding the
 *   shader does not move it.
 * - `iMouse` is `(x, y, pressX, pressY)` in pixels from the bottom-left, with the
 *   sign of `zw` carrying the button state. It stays zero when the renderer's
 *   `mouseInteraction` setting is off, which is how a shader can tell that no
 *   pointer is driving it.
 * - `iChannelResolution[4]` holds the size of each bound channel, and `iFrame`
 *   counts rendered frames.
 *
 * A texture the renderer can bind to `iChannel0`, `iChannel1`, … Its size is
 * published to the shader through `iChannelResolution`, so a shader never has to
 * assume the resolution of its inputs.
 *
 * - `'noise'` is the built-in 256x256 RGBA noise the renderer generates, and
 *   `{ noise }` is the same generator at another edge length.
 * - `{ image }` is a decoded image, given as a URL or data URI. Loading is
 *   asynchronous, so the generated noise is bound until it decodes (and stays if
 *   it fails to load).
 */
export type TextureSource
  = | 'noise'
    | {
    /** Edge length of a generated RGBA noise texture, in texels. */
      readonly noise: number
    }
    | {
      readonly image: string
      /** Wrap mode, default `clamp`. Noise-like inputs need `repeat`. */
      readonly wrap?: 'clamp' | 'repeat'
      /** Upload flipped vertically. Shadertoy channels declare `vflip` explicitly. */
      readonly flipY?: boolean
      /**
       * Edge length of the procedural noise bound until the image decodes, default
       * 256. Set it to the image's real size so a shader that samples by texel
       * (`texelFetch(… & 1023)`) stays in range on the first frames.
       */
      readonly noiseFallback?: number
    }

/**
 * One input of a pass: either a procedural texture the renderer generates, or
 * another pass's output buffer.
 */
export type PassChannel
  = | { readonly texture: TextureSource }
    | { readonly buffer: string }

export interface ShaderPass {
  /** Unique within its definition. Other passes reference buffers by this id. */
  id: string
  /** Fragment source; the shared vertex shader comes from the definition. */
  fragmentShader: string
  /** `iChannel0` … `iChannel3`, in order. Omitted entries are left unbound. */
  channels?: readonly (PassChannel | null)[]
  /**
   * Fixed output size in pixels, for look-up tables. Passes without it render at
   * the canvas render size and are reallocated whenever that changes.
   */
  size?: { readonly width: number, readonly height: number }
  /**
   * Render once at startup instead of every frame. For generated look-up tables.
   * Still re-renders when the pipeline is rebuilt.
   */
  once?: boolean
  /**
   * Wrap mode for this pass's output, default `clamp`. `repeat` needs a
   * power-of-two size on WebGL1 and always works on WebGL2.
   */
  wrap?: 'clamp' | 'repeat'
}

export interface ShaderDefinition {
  /** Stable identifier used for selection and persistence */
  id: string
  /** Human-readable name */
  name: string
  /** GLSL vertex shader source */
  vertexShader: string
  /**
   * Fragment shader source. For a multipass definition this is the final pass,
   * i.e. the source you would have if the buffers did not exist.
   */
  fragmentShader: string
  /**
   * Textures bound before the first draw, in `iChannel<N>` order, for single-pass
   * shaders. Ignored when `passes` is set.
   *
   * This is a real binding contract, not documentation. A fragment shader that
   * samples `iChannel0` without listing a source here gets an *incomplete*
   * texture, which every driver we care about samples as black — the shader
   * links, draws, and produces a flat frame with no GL error to point at.
   */
  channels?: readonly TextureSource[]
  /**
   * GLSL version the sources are written in, default 100.
   *
   * 300 means GLSL ES 3.00 (`#version 300 es`, `in`/`out`, `texelFetch`, `uint`,
   * array constructors, bitwise operators), which is what Shadertoy's newer
   * exports use. It requires WebGL2 — which multipass pipelines already do — and
   * lets those shaders run verbatim instead of being rewritten into ES 1.00.
   */
  glslVersion?: 100 | 300
  /**
   * Multipass pipeline, evaluated in order; each pass may read earlier passes'
   * buffers (and its own, from the previous frame), and the last pass draws to
   * the canvas.
   *
   * Buffers are float render targets, so a multipass shader needs WebGL2 with
   * float colour attachments. Shaders that store depth or camera data in a buffer
   * channel (Himalayas does both) cannot be approximated with 8-bit targets.
   */
  passes?: readonly ShaderPass[]
  /** Fraction of the canvas backing store to render at, default 1. */
  renderScale?: number
}
