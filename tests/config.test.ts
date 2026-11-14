import { loadSettings, SETTINGS_DEFAULTS } from '$lib/config'
import { describe, expect, it } from 'vitest'

describe('loadSettings', () => {
  it('returns the defaults when no METROMARK_* variables are set', () => {
    expect(loadSettings({})).toEqual(SETTINGS_DEFAULTS)
  })

  it('applies valid METROMARK_* values from the environment', () => {
    const settings = loadSettings({
      METROMARK_DENSITY: 'compact',
      METROMARK_SHOW_DOMAINS: 'false',
      METROMARK_ORIGINAL_FAVICONS: 'true',
      METROMARK_REDUCED_MOTION: 'true',
    })
    expect(settings.density).toBe('compact')
    expect(settings.showDomains).toBe(false)
    expect(settings.originalFavicons).toBe(true)
    expect(settings.reducedMotion).toBe(true)
  })

  it('applies a wired METROMARK_SHADER_ID as the background shader', () => {
    const settings = loadSettings({ METROMARK_SHADER_ID: 'plasma' })
    expect(settings.background).toEqual({ type: 'shader', shaderId: 'plasma', quality: 'motion' })
  })

  it('throws and names the key when METROMARK_DENSITY is invalid', () => {
    expect(() => loadSettings({ METROMARK_DENSITY: 'spacious' })).toThrowError(/METROMARK_DENSITY/)
    expect(() => loadSettings({ METROMARK_DENSITY: 'spacious' })).toThrowError(/spacious/)
  })

  it('throws and names the key when a boolean METROMARK_* value is not true or false', () => {
    expect(() => loadSettings({ METROMARK_SHOW_DOMAINS: 'yes' })).toThrowError(/METROMARK_SHOW_DOMAINS/)
    expect(() => loadSettings({ METROMARK_SHOW_DOMAINS: 'yes' })).toThrowError(/yes/)
    expect(() => loadSettings({ METROMARK_ORIGINAL_FAVICONS: '1' })).toThrowError(/METROMARK_ORIGINAL_FAVICONS/)
    expect(() => loadSettings({ METROMARK_REDUCED_MOTION: 'TRUE' })).toThrowError(/METROMARK_REDUCED_MOTION/)
  })

  it('accepts false as a valid boolean METROMARK_* value', () => {
    const settings = loadSettings({
      METROMARK_SHOW_DOMAINS: 'false',
      METROMARK_ORIGINAL_FAVICONS: 'false',
      METROMARK_REDUCED_MOTION: 'false',
    })
    expect(settings.showDomains).toBe(false)
    expect(settings.originalFavicons).toBe(false)
    expect(settings.reducedMotion).toBe(false)
  })

  it('throws and names the key when METROMARK_SHADER_ID is empty', () => {
    expect(() => loadSettings({ METROMARK_SHADER_ID: '' })).toThrowError(/METROMARK_SHADER_ID/)
  })
})
