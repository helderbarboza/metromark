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
  url: v.string(),
  fit: v.optional(BackgroundFitSchema),
  opacity: v.optional(v.number()),
  parallax: v.optional(v.boolean()),
})

/** User-facing settings schema with per-key defaults and docs */
export const SettingsSchema = v.object({
  /** Tile density: 'comfortable' (68px) or 'compact' (54px) */
  density: v.union([v.literal('comfortable'), v.literal('compact')]),
  /** Show domain names on tiles */
  showDomains: v.boolean(),
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

/** Default values (used when config sources omit a key) */
export const SETTINGS_DEFAULTS: Settings = {
  density: 'comfortable',
  showDomains: true,
  reducedMotion: false,
  background: { type: 'color', auto: true, color: undefined },
} as const

export const BACKGROUND_DEFAULTS = {
  color: { type: 'color', auto: true, color: undefined },
  image: { type: 'image', url: '' },
  shader: {
    type: 'shader',
    shaderId: 'balatro',
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
const ENV_PREFIX = 'METRO_'

/**
 * Load settings from hierarchical sources:
 * 1. Environment variables (METRO_DENSITY, METRO_SHOW_DOMAINS, METRO_REDUCED_MOTION, METRO_SHADER_ID)
 * 2. Fallback to defaults
 * Throws on validation failure (fail-fast)
 */
export function loadSettings(env: Record<string, string | undefined> = import.meta.env): Settings {
  const fromEnv: Partial<Settings> = {}
  if (env[`${ENV_PREFIX}DENSITY`] !== undefined) {
    const density = env[`${ENV_PREFIX}DENSITY`]
    if (density === 'comfortable' || density === 'compact') {
      fromEnv.density = density
    }
  }
  if (env[`${ENV_PREFIX}SHOW_DOMAINS`] !== undefined) {
    fromEnv.showDomains = env[`${ENV_PREFIX}SHOW_DOMAINS`] === 'true'
  }
  if (env[`${ENV_PREFIX}REDUCED_MOTION`] !== undefined) {
    fromEnv.reducedMotion = env[`${ENV_PREFIX}REDUCED_MOTION`] === 'true'
  }
  if (env[`${ENV_PREFIX}SHADER_ID`] !== undefined) {
    fromEnv.background = { type: 'shader', shaderId: env[`${ENV_PREFIX}SHADER_ID`], quality: 'motion' }
  }

  const merged = { ...SETTINGS_DEFAULTS, ...fromEnv }
  const result = v.safeParse(SettingsSchema, merged)
  if (!result.success) {
    const issues = v.flatten(result.issues).nested
    throw new Error(`Invalid Metro settings: ${JSON.stringify(issues)}`)
  }
  return result.output
}
