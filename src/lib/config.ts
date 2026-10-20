import * as v from 'valibot'

/** User-facing settings schema with per-key defaults and docs */
export const SettingsSchema = v.object({
  /** Tile density: 'comfortable' (68px) or 'compact' (54px) */
  density: v.union([v.literal('comfortable'), v.literal('compact')]),
  /** Show domain names on tiles */
  showDomains: v.boolean(),
  /** Honor prefers-reduced-motion */
  reducedMotion: v.boolean(),
})

export type Settings = v.InferOutput<typeof SettingsSchema>

/** Default values (used when config sources omit a key) */
export const SETTINGS_DEFAULTS: Settings = {
  density: 'comfortable',
  showDomains: true,
  reducedMotion: false,
} as const

/** Environment variable prefix for override */
const ENV_PREFIX = 'METRO_'

/**
 * Load settings from hierarchical sources:
 * 1. Environment variables (METRO_DENSITY, METRO_SHOW_DOMAINS, METRO_REDUCED_MOTION)
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

  const merged = { ...SETTINGS_DEFAULTS, ...fromEnv }
  const result = v.safeParse(SettingsSchema, merged)
  if (!result.success) {
    const issues = v.flatten(result.issues).nested
    throw new Error(`Invalid Metro settings: ${JSON.stringify(issues)}`)
  }
  return result.output
}
