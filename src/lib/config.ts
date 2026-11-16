import * as v from 'valibot'

const BackgroundFitSchema = v.picklist(['cover', 'contain', 'fill', 'none'])

const ColorBackgroundSchema = v.object({
  type: v.literal('color'),
  /** Use the theme background instead of a custom color */
  auto: v.optional(v.boolean()),
  color: v.optional(v.string()),
})

const ShaderBackgroundSchema = v.object({
  type: v.literal('shader'),
  shaderId: v.optional(v.string()),
  /** Shader animation speed factor */
  speed: v.optional(v.number()),
  /** Maximum shader frames per second */
  targetFps: v.optional(v.number()),
  /** Shader layer opacity over the base color */
  opacity: v.optional(v.number()),
  /** Whether the pointer drives the shader's iMouse uniform */
  mouseInteraction: v.optional(v.boolean()),
  /** Render resolution as a fraction of the canvas backing store */
  renderScale: v.optional(v.number()),
  /** Prefer smooth motion or sharp detail when the renderer is under load */
  quality: v.optional(v.picklist(['motion', 'detail'])),
  /** Use the theme background instead of a custom base color */
  auto: v.optional(v.boolean()),
  /** Base color under the shader layer */
  color: v.optional(v.string()),
})

const ImageBackgroundSchema = v.object({
  type: v.literal('image'),
  /** Remote http(s) URL, or a base64 data:image/… URI produced by an upload */
  url: v.string(),
  fit: v.optional(BackgroundFitSchema),
  opacity: v.optional(v.number()),
  /** Subtle horizontal offset while the canvas scrolls; forced off by reduced motion */
  parallax: v.optional(v.boolean()),
  /** Layer scale as a multiple of the canvas size, from 1 to 4; bigger means wider layer and more travel */
  parallaxZoom: v.optional(v.number()),
  /** Use the theme background instead of a custom base color */
  auto: v.optional(v.boolean()),
  /** Base color under the image layer */
  color: v.optional(v.string()),
})

/** User-facing settings schema with per-key defaults and docs */
export const SettingsSchema = v.object({
  /** Tile density: 'comfortable' (68px) or 'compact' (54px) */
  density: v.union([v.literal('comfortable'), v.literal('compact')]),
  /** Show domain names on tiles */
  showDomains: v.boolean(),
  /** Show the site's full-color favicon instead of a single-color Metro glyph */
  originalFavicons: v.boolean(),
  /** Honor prefers-reduced-motion */
  reducedMotion: v.boolean(),
  /** Selected background shader id */
  background: v.variant('type', [
    ShaderBackgroundSchema,
    ImageBackgroundSchema,
    ColorBackgroundSchema,
  ]),
})

export type Settings = v.InferOutput<typeof SettingsSchema>

export type ColorBackgroundSettings = Extract<Settings['background'], { type: 'color' }>
export type ShaderBackgroundSettings = Extract<Settings['background'], { type: 'shader' }>
export type ImageBackgroundSettings = Extract<Settings['background'], { type: 'image' }>

/** Default values (used when config sources omit a key) */
export const SETTINGS_DEFAULTS: Settings = {
  density: 'comfortable',
  showDomains: true,
  originalFavicons: false,
  reducedMotion: false,
  background: {
    type: 'color',
    auto: true,
  },
} as const

export const BACKGROUND_DEFAULTS = {
  color: { type: 'color', auto: true, color: undefined },
  image: { type: 'image', url: '', auto: true, color: undefined, parallaxZoom: 1.5 },
  shader: {
    // No shader runs by default: pick one in the background editor. This also
    // keeps a first benchmark run free of contention from a default background.
    type: 'shader',
    shaderId: 'none',
    speed: 1,
    targetFps: 60,
    opacity: 1,
    mouseInteraction: false,
    renderScale: 0.5,
    quality: 'motion',
    auto: true,
    color: undefined,
  },
} satisfies Record<Settings['background']['type'], Settings['background']>

/** Environment variable prefix for override */
const ENV_PREFIX = 'METROMARK_'

function invalidEnv(key: string, value: string, expected: string): Error {
  return new Error(`Invalid ${key}: ${JSON.stringify(value)} (expected ${expected})`)
}

function parseBooleanEnv(key: string, value: string): boolean {
  if (value === 'true')
    return true
  if (value === 'false')
    return false
  throw invalidEnv(key, value, '"true" or "false"')
}

/**
 * Load settings from hierarchical sources:
 * 1. Environment variables (METROMARK_DENSITY, METROMARK_SHOW_DOMAINS, METROMARK_ORIGINAL_FAVICONS, METROMARK_REDUCED_MOTION, METROMARK_SHADER_ID)
 * 2. Fallback to defaults
 * Throws on validation failure (fail-fast). Throws if a recognized METROMARK_*
 * variable holds an invalid value; the error names the key and the value.
 */
export function loadSettings(env: Record<string, string | undefined> = import.meta.env): Settings {
  const fromEnv: Partial<Settings> = {}
  const densityEnv = env[`${ENV_PREFIX}DENSITY`]
  if (densityEnv !== undefined) {
    if (densityEnv !== 'comfortable' && densityEnv !== 'compact')
      throw invalidEnv(`${ENV_PREFIX}DENSITY`, densityEnv, '"comfortable" or "compact"')
    fromEnv.density = densityEnv
  }
  const showDomainsEnv = env[`${ENV_PREFIX}SHOW_DOMAINS`]
  if (showDomainsEnv !== undefined) {
    fromEnv.showDomains = parseBooleanEnv(`${ENV_PREFIX}SHOW_DOMAINS`, showDomainsEnv)
  }
  const originalFaviconsEnv = env[`${ENV_PREFIX}ORIGINAL_FAVICONS`]
  if (originalFaviconsEnv !== undefined) {
    fromEnv.originalFavicons = parseBooleanEnv(`${ENV_PREFIX}ORIGINAL_FAVICONS`, originalFaviconsEnv)
  }
  const reducedMotionEnv = env[`${ENV_PREFIX}REDUCED_MOTION`]
  if (reducedMotionEnv !== undefined) {
    fromEnv.reducedMotion = parseBooleanEnv(`${ENV_PREFIX}REDUCED_MOTION`, reducedMotionEnv)
  }
  const shaderIdEnv = env[`${ENV_PREFIX}SHADER_ID`]
  if (shaderIdEnv !== undefined) {
    if (shaderIdEnv.length === 0)
      throw invalidEnv(`${ENV_PREFIX}SHADER_ID`, shaderIdEnv, 'a non-empty shader id')
    fromEnv.background = { type: 'shader', shaderId: shaderIdEnv, quality: 'motion' }
  }

  const merged = { ...SETTINGS_DEFAULTS, ...fromEnv }
  const result = v.safeParse(SettingsSchema, merged)
  if (!result.success) {
    const issues = v.flatten(result.issues).nested
    throw new Error(`Invalid MetroMark settings: ${JSON.stringify(issues)}`)
  }
  return result.output
}
