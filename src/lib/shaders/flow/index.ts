import type { ShaderDefinition } from '$lib/shaders/types'
import { VERTEX_SHADER } from '$lib/shaders/vertex'
import { FRAGMENT_SHADER } from './fragment'

export const flow: ShaderDefinition = {
  id: 'flow',
  name: 'Flow',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
}
