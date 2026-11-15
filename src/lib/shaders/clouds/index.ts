import type { ShaderDefinition } from '$lib/shaders/types'
import { VERTEX_SHADER } from '$lib/shaders/vertex'
import { FRAGMENT_SHADER } from './fragment'

export const clouds: ShaderDefinition = {
  id: 'clouds',
  name: 'Clouds',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
  channels: ['noise'],
}
