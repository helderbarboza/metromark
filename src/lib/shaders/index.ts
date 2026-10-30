import type { ShaderDefinition } from './types'
import { balatro } from './balatro'
import { flow } from './flow'

export type { ShaderDefinition } from './types'
export const shaders = {
  balatro,
  flow,
} as const satisfies Record<string, ShaderDefinition>
export type ShaderId = keyof typeof shaders
export const defaultShader: ShaderDefinition = shaders.balatro
export function getShader(id: string): ShaderDefinition {
  const registry: Record<string, ShaderDefinition> = shaders
  return registry[id] ?? defaultShader
}
