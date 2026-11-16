import { provisionalLanguageSetting, resolveLocale } from '$lib/locale'
import { describe, expect, it } from 'vitest'

describe('resolveLocale', () => {
  it('keeps an explicit locale setting', () => {
    expect(resolveLocale('de')).toBe('de')
    expect(resolveLocale('fr')).toBe('fr')
    expect(resolveLocale('es')).toBe('es')
    expect(resolveLocale('pt')).toBe('pt')
    expect(resolveLocale('en')).toBe('en')
  })

  it('prefers an explicit setting over the environment', () => {
    expect(resolveLocale('de', ['fr-FR'])).toBe('de')
    expect(resolveLocale('pt', ['en-US'])).toBe('pt')
  })

  it('infers an exact match from candidates', () => {
    expect(resolveLocale('auto', ['de'])).toBe('de')
    expect(resolveLocale('auto', ['en-US', 'de'])).toBe('en')
  })

  it('matches the base language subtag of regional candidates', () => {
    expect(resolveLocale('auto', ['de-AT'])).toBe('de')
    expect(resolveLocale('auto', ['fr-CA'])).toBe('fr')
    expect(resolveLocale('auto', ['pt-BR'])).toBe('pt')
    expect(resolveLocale('auto', ['es-MX'])).toBe('es')
  })

  it('is case-insensitive', () => {
    expect(resolveLocale('auto', ['DE-de'])).toBe('de')
    expect(resolveLocale('auto', ['EN-us'])).toBe('en')
  })

  it('tries candidates in order and skips blanks', () => {
    expect(resolveLocale('auto', ['', '  ', 'fr-FR', 'de'])).toBe('fr')
    expect(resolveLocale('auto', ['xx-YY', 'es-ES'])).toBe('es')
  })

  it('falls back to English when nothing matches or the list is empty', () => {
    expect(resolveLocale('auto', ['xx-YY'])).toBe('en')
    expect(resolveLocale('auto', [])).toBe('en')
    expect(resolveLocale('auto', undefined)).toBe('en')
  })

  it('treats unknown stored values as auto', () => {
    expect(resolveLocale('klingon', ['de-AT'])).toBe('de')
    expect(resolveLocale('klingon', [])).toBe('en')
    expect(resolveLocale(undefined, ['fr'])).toBe('fr')
  })
})

describe('provisionalLanguageSetting', () => {
  it('defaults to auto in an environment without storage', () => {
    expect(provisionalLanguageSetting()).toBe('auto')
  })
})
