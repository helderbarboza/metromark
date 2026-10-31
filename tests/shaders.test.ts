import { defaultShader, getShader, shaders } from '$lib/shaders'
import { describe, expect, it, vi } from 'vitest'

describe('shader registry', () => {
  it('keys every definition by its own id', () => {
    for (const [key, definition] of Object.entries(shaders))
      expect(key).toBe(definition.id)
  })

  it('resolves every definition by its id', () => {
    for (const definition of Object.values(shaders))
      expect(getShader(definition.id)).toBe(definition)
  })

  it('resolves the swiss alps id', () => {
    expect(getShader('swiss-alps')).toBe(shaders.swissAlps)
  })

  it('falls back to the default shader for an unknown id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(getShader('not-a-shader')).toBe(defaultShader)
    warn.mockRestore()
  })
})
