import type { ShaderDefinition } from './types'
import { clouds } from './clouds'
import { flow } from './flow'
import { incense } from './incense'
import { monterey } from './monterey'
import { swissAlps } from './swiss_alps'

export type { PassChannel, ShaderDefinition, ShaderPass, TextureSource } from './types'
export const shaders = {
  clouds,
  flow,
  incense,
  monterey,
  'swiss-alps': swissAlps,
} as const satisfies Record<string, ShaderDefinition>
export type ShaderId = keyof typeof shaders
const list: readonly ShaderDefinition[] = Object.values(shaders)
/**
 * Lookup by each definition's own `id`, not by the property name above. The two
 * are free to differ (`swissAlps` is `swiss-alps`), and selection and persistence
 * use `id`, so keying off the property name silently resolves to the default.
 */
const byId = new Map(list.map(definition => [definition.id, definition]))

/**
 * Selection id for "no shader background" (base color only). Stored and
 * persisted like a shader id, but it has no definition and renders nothing.
 * It is the default selection so the new-tab page and the shader benchmark
 * are not competing with a shader that was never asked for.
 */
export const NONE_SHADER_ID = 'none'

export function getShader(id: string): ShaderDefinition | undefined {
  return byId.get(id)
}
