import type { ShaderDefinition } from '../types'
import { VERTEX_SHADER } from '../vertex'
import { FRAGMENT_SHADER } from './fragment'

export const monterey: ShaderDefinition = {
  id: 'monterey',
  name: 'Monterey wannabe',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
}
