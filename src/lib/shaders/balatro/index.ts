import type { ShaderDefinition } from '../types'
import { VERTEX_SHADER } from '../vertex'
import { FRAGMENT_SHADER } from './fragment'

export const balatro: ShaderDefinition = {
  id: 'balatro',
  name: 'Balatro',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
}
