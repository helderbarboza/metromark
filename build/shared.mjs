import process from 'node:process'
import { fileURLToPath } from 'node:url'

/** Absolute path of `src/lib`, shared by every build that aliases `$lib`. */
export const libDir = fileURLToPath(new URL('../src/lib', import.meta.url))

/** `resolve.alias` entry shared by vite, vitest and the wxt extension build. */
export const libAlias = { $lib: libDir }

/** Build-time wiring of the `METROMARK_*` environment variables, shared by the preview and extension builds. */
export const metromarkDefines = {
  'import.meta.env.METROMARK_DENSITY': JSON.stringify(process.env.METROMARK_DENSITY),
  'import.meta.env.METROMARK_SHOW_DOMAINS': JSON.stringify(process.env.METROMARK_SHOW_DOMAINS),
  'import.meta.env.METROMARK_ORIGINAL_FAVICONS': JSON.stringify(process.env.METROMARK_ORIGINAL_FAVICONS),
  'import.meta.env.METROMARK_REDUCED_MOTION': JSON.stringify(process.env.METROMARK_REDUCED_MOTION),
  'import.meta.env.METROMARK_SHADER_ID': JSON.stringify(process.env.METROMARK_SHADER_ID),
}
