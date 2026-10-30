import type { ShaderDefinition } from '../types'
import { VERTEX_SHADER } from '../vertex'
import { FRAGMENT_SHADER } from './fragment'

export const flow: ShaderDefinition = {
  id: 'flow',
  name: 'Flow',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
}
