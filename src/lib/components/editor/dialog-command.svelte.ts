import type { Command } from '../../types'

export function createDialogCommand(
  oncommand: (command: Command) => Promise<boolean>,
  onclose: () => void,
) {
  const state = $state({ busy: false, error: '' })

  function fail(failure: unknown): void {
    state.error = failure instanceof Error ? failure.message : 'Something went wrong.'
  }

  async function run(task: () => Promise<void>): Promise<void> {
    state.busy = true
    state.error = ''
    try {
      await task()
    }
    catch (failure) {
      fail(failure)
    }
    finally {
      state.busy = false
    }
  }

  async function send(command: Command, close = true): Promise<void> {
    state.busy = true
    state.error = ''
    try {
      const ok = await oncommand(command)
      if (ok && close) {
        onclose()
      }
      else if (!ok) {
        state.error = 'The operation could not be completed. See the notification for details.'
      }
    }
    catch (failure) {
      fail(failure)
    }
    finally {
      state.busy = false
    }
  }

  return { state, send, run }
}
