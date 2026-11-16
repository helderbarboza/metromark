import type { SettingsUpdate } from '$lib/settings-debounce'
import { SettingsDebouncer } from '$lib/settings-debounce'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function patch(value: number): SettingsUpdate {
  return { type: 'settings.update', patch: { reducedMotion: value % 2 === 0 } }
}

describe('settingsDebouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesces rapid settings commands into one trailing call', async () => {
    const run = vi.fn(async () => true)
    const debouncer = new SettingsDebouncer(200, run)
    const a = debouncer.enqueue(patch(1))
    const b = debouncer.enqueue(patch(2))
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(run).toHaveBeenCalledTimes(1)
    await expect(a).resolves.toBe(true)
    await expect(b).resolves.toBe(true)
  })

  it('merges top-level patch keys, last write wins', async () => {
    const run = vi.fn(async () => true)
    const debouncer = new SettingsDebouncer(200, run)
    void debouncer.enqueue({ type: 'settings.update', patch: { density: 'compact', showDomains: true } })
    void debouncer.enqueue({ type: 'settings.update', patch: { density: 'comfortable' } })
    await vi.advanceTimersByTimeAsync(200)
    expect(run).toHaveBeenCalledWith({
      type: 'settings.update',
      patch: { density: 'comfortable', showDomains: true },
    })
  })

  it('flush runs the pending patch immediately and resolves waiters', async () => {
    const run = vi.fn(async () => true)
    const debouncer = new SettingsDebouncer(200, run)
    const pending = debouncer.enqueue(patch(1))
    await debouncer.flush()
    expect(run).toHaveBeenCalledTimes(1)
    await expect(pending).resolves.toBe(true)
    // The timer must not fire a second call.
    await vi.advanceTimersByTimeAsync(1000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('flush without a pending patch is a no-op', async () => {
    const run = vi.fn(async () => true)
    const debouncer = new SettingsDebouncer(200, run)
    await debouncer.flush()
    expect(run).not.toHaveBeenCalled()
  })

  it('resolves waiters with false when the command fails', async () => {
    const run = vi.fn(async (): Promise<boolean> => {
      throw new Error('boom')
    })
    const debouncer = new SettingsDebouncer(200, run)
    const pending = debouncer.enqueue(patch(1))
    await vi.advanceTimersByTimeAsync(200)
    await expect(pending).resolves.toBe(false)
  })

  it('starts a fresh window after a flush', async () => {
    const run = vi.fn(async () => true)
    const debouncer = new SettingsDebouncer(200, run)
    void debouncer.enqueue(patch(1))
    await vi.advanceTimersByTimeAsync(200)
    void debouncer.enqueue(patch(2))
    await vi.advanceTimersByTimeAsync(200)
    expect(run).toHaveBeenCalledTimes(2)
  })
})
