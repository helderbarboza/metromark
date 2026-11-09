import { getShader, NONE_SHADER_ID, shaders } from '$lib/shaders'
import { describe, expect, it } from 'vitest'

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
    expect(getShader('swiss-alps')).toBe(shaders['swiss-alps'])
  })

  it('returns undefined for an unknown id (no implicit default shader)', () => {
    expect(getShader('not-a-shader')).toBeUndefined()
  })

  it('has no definition for the none selection', () => {
    expect(getShader(NONE_SHADER_ID)).toBeUndefined()
  })
})
