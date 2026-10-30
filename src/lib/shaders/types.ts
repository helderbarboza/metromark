/**
 * Procedural textures the background renderer knows how to generate.
 *
 * Each entry in a shader's `channels` list is bound, in order, to `iChannel0`,
 * `iChannel1`, … and its size is published through `iChannelResolution`.
 */
export type TextureSource = 'noise'

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
   * Multipass pipeline, evaluated in order; each pass may read earlier passes'
   * buffers (and its own, from the previous frame), and the last pass draws to
   * the canvas.
   *
   * Buffers are float render targets, so a multipass shader needs WebGL2 with
   * float colour attachments. Shaders that store depth or camera data in a buffer
   * channel cannot be approximated with 8-bit targets.
   */
  passes?: readonly ShaderPass[]
  /** Fraction of the canvas backing store to render at, default 1. */
  renderScale?: number
}
