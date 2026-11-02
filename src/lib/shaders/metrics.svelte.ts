/**
 * Shared, reactive snapshot of the animated background's performance.
 */

export interface ShaderMetrics {
  shader: string
  fps: number
  frameMs: number
  worstMs: number
  nominalMs: number
  scale: number
  quality: 'motion' | 'detail'
  level: 'full' | 'reduced' | 'frozen'
  targetFps: number
}

let current = $state<ShaderMetrics | null>(null)

export const shaderMetrics = {
  get current(): ShaderMetrics | null {
    return current
  },
}

export function publishMetrics(value: ShaderMetrics | null): void {
  current = value
}
