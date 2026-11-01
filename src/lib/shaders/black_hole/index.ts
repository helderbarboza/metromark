import type { ShaderDefinition } from '../types'
import { VERTEX_SHADER } from '../vertex'
import { PRELUDE, EPILOGUE } from './adapter'
import { BUFFER_A } from './buffer-a'
import { BUFFER_B } from './buffer-b'
import { BUFFER_C } from './buffer-c'
import { BUFFER_D } from './buffer-d'
import { IMAGE } from './image'

const pass = (body: string) => `${PRELUDE}\n${body}\n${EPILOGUE}`

export const blackHole: ShaderDefinition = {
  id: 'black-hole',
  name: 'Black Hole with various disks',
  vertexShader: VERTEX_SHADER,
  fragmentShader: pass(IMAGE),
  glslVersion: 300,
  renderScale: 0.5,
  passes: [
    {
      id: 'a',
      fragmentShader: pass(BUFFER_A),
      channels: [null, null, null, { buffer: 'a' }],
    },
    {
      id: 'b',
      fragmentShader: pass(BUFFER_B),
      channels: [{ buffer: 'a' }],
    },
    {
      id: 'c',
      fragmentShader: pass(BUFFER_C),
      channels: [{ buffer: 'b' }],
    },
    {
      id: 'd',
      fragmentShader: pass(BUFFER_D),
      channels: [{ buffer: 'c' }],
    },
    {
      id: 'image',
      fragmentShader: pass(IMAGE),
      channels: [{ buffer: 'a' }, { buffer: 'b' }, { buffer: 'c' }, { buffer: 'd' }],
    },
  ],
}
