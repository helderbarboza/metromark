import { loadRootFilter, resetRootFilter, saveRootFilter } from '$lib/root-filter'
import { afterEach, describe, expect, it, vi } from 'vitest'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [
      ...map.keys(),
    ][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadRootFilter', () => {
  it('returns all when storage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadRootFilter()).toBe('all')
  })

  it('returns all when nothing is stored', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    expect(loadRootFilter()).toBe('all')
  })

  it('returns a stored root id', () => {
    const store = memoryStorage()
    store.setItem('root-filter', '1')
    vi.stubGlobal('localStorage', store)
    expect(loadRootFilter()).toBe('1')
  })

  it('returns all when the stored value is empty', () => {
    const store = memoryStorage()
    store.setItem('root-filter', '')
    vi.stubGlobal('localStorage', store)
    expect(loadRootFilter()).toBe('all')
  })

  it('returns all when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
    })
    expect(loadRootFilter()).toBe('all')
  })
})

describe('saveRootFilter', () => {
  it('round-trips a value', () => {
    const store = memoryStorage()
    vi.stubGlobal('localStorage', store)
    saveRootFilter('42')
    expect(store.getItem('root-filter')).toBe('42')
    expect(loadRootFilter()).toBe('42')
  })

  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => saveRootFilter('42')).not.toThrow()
  })

  it('does not throw when storage throws', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('full')
      },
    })
    expect(() => saveRootFilter('42')).not.toThrow()
  })
})

describe('resetRootFilter', () => {
  it('removes the stored value', () => {
    const store = memoryStorage()
    store.setItem('root-filter', '42')
    vi.stubGlobal('localStorage', store)
    resetRootFilter()
    expect(store.getItem('root-filter')).toBeNull()
    expect(loadRootFilter()).toBe('all')
  })

  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => resetRootFilter()).not.toThrow()
  })
})
