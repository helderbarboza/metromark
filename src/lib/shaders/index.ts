import type { ShaderDefinition } from './types'
import { balatro } from './balatro'
import { clouds } from './clouds'
import { flow } from './flow'
import { incense } from './incense'

export type { PassChannel, ShaderDefinition, ShaderPass, TextureSource } from './types'
export const shaders = {
  balatro,
  clouds,
  flow,
  incense,
} as const satisfies Record<string, ShaderDefinition>
export type ShaderId = keyof typeof shaders
export const defaultShader: ShaderDefinition = shaders.balatro
export function getShader(id: string): ShaderDefinition {
  const registry: Record<string, ShaderDefinition> = shaders
  return registry[id] ?? defaultShader
}
