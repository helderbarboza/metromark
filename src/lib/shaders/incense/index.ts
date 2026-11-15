import type { ShaderDefinition } from '$lib/shaders/types'
import { VERTEX_SHADER } from '$lib/shaders/vertex'
import { FRAGMENT_SHADER } from './fragment'

export const incense: ShaderDefinition = {
  id: 'incense',
  name: 'Incense',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
}
