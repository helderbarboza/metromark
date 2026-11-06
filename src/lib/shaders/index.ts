import type { ShaderDefinition } from './types'
import { balatro } from './balatro'
import { blackHole } from './black_hole'
import { clouds } from './clouds'
import { flow } from './flow'
import { grainient } from './grainient'
import { incense } from './incense'
import { monterey } from './monterey'
import { swissAlps } from './swiss_alps'

export type { PassChannel, ShaderDefinition, ShaderPass, TextureSource } from './types'
export const shaders = {
  balatro,
  blackHole,
  clouds,
  flow,
  grainient,
  incense,
  monterey,
  swissAlps,
} as const satisfies Record<string, ShaderDefinition>
export type ShaderId = keyof typeof shaders
const list: readonly ShaderDefinition[] = Object.values(shaders)
/**
 * Lookup by each definition's own `id`, not by the property name above. The two
 * are free to differ (`swissAlps` is `swiss-alps`), and selection and persistence
 * use `id`, so keying off the property name silently resolves to the default.
 */
const byId = new Map(list.map(definition => [definition.id, definition]))
export const defaultShader: ShaderDefinition = balatro
export function getShader(id: string): ShaderDefinition {
  const match = byId.get(id)
  if (!match && import.meta.env.DEV)
    console.warn(`[shaders] Unknown shader id "${id}"; using "${defaultShader.id}".`)
  return match ?? defaultShader
}
