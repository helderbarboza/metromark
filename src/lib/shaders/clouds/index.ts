import type { ShaderDefinition } from '../types'
import { VERTEX_SHADER } from '../vertex'
import { FRAGMENT_SHADER } from './fragment'

export const clouds: ShaderDefinition = {
  id: 'clouds',
  name: 'Clouds',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
  channels: ['noise'],
}
