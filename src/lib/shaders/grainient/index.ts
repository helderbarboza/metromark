import type { ShaderDefinition } from '../types'
import { VERTEX_SHADER } from '../vertex'
import { FRAGMENT_SHADER } from './fragment'

export const grainient: ShaderDefinition = {
  id: 'grainient',
  name: 'Grainient',
  vertexShader: VERTEX_SHADER,
  fragmentShader: FRAGMENT_SHADER,
  // Four simplex evaluations per pixel is the most expensive pass in the set.
  renderScale: 0.6,
}
