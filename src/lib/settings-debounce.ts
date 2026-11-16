import type { Command, Settings } from '$lib/types'

export type SettingsUpdate = Extract<Command, { type: 'settings.update' }>

/**
 * Trailing debounce for `settings.update` commands. Rapid changes (slider
 * drags, color inputs) merge into one command per quiet window. All callers
 * in the window receive the single result. Non-settings commands must call
 * `flush()` first so they never run before a pending settings patch.
 */
export class SettingsDebouncer {
  private pending: Partial<Settings> | null = null
  private waiters: Array<(ok: boolean) => void> = []
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly delay: number,
    private readonly run: (command: SettingsUpdate) => Promise<boolean>,
  ) {}

  async enqueue(command: SettingsUpdate): Promise<boolean> {
    this.pending = { ...this.pending, ...command.patch }
    return new Promise<boolean>((resolve) => {
      this.waiters.push(resolve)
      clearTimeout(this.timer)
      this.timer = setTimeout(() => void this.flush(), this.delay)
    })
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer)
    this.timer = undefined
    const patch = this.pending
    this.pending = null
    const waiters = this.waiters
    this.waiters = []
    if (!patch || waiters.length === 0)
      return
    let ok = false
    try {
      ok = await this.run({ type: 'settings.update', patch })
    }
    catch {
      ok = false
    }
    for (const waiter of waiters)
      waiter(ok)
  }
}
