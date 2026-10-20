import type { Command } from '../lib/types'
import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { MESSAGE_SCOPE, nativeBookmarks, nativePersistence } from '../lib/adapters/native'
import { loadSettings } from '../lib/config'
import { BookmarkCoordinator } from '../lib/coordinator'

const settings = loadSettings()

export default defineBackground(() => {
  const coordinator = new BookmarkCoordinator(nativeBookmarks(), nativePersistence(), settings)
  coordinator.subscribe(() => {
    void browser.runtime.sendMessage({ scope: MESSAGE_SCOPE, kind: 'changed' }).catch(() => undefined)
  })
  browser.runtime.onMessage.addListener((message: { scope?: string, kind?: string, command?: Command }, sender, respond) => {
    if (sender.id !== browser.runtime.id || message?.scope !== MESSAGE_SCOPE || !['snapshot', 'execute'].includes(message.kind ?? ''))
      return false
    void (async () => {
      try {
        await coordinator.ready
        if (message.kind === 'snapshot')
          respond({ ok: true, snapshot: await coordinator.snapshot() })
        else if (message.command)
          respond({ ok: true, result: await coordinator.execute(message.command) })
        else respond({ ok: false, error: 'Missing bookmark command.' })
      }
      catch (error) { respond({ ok: false, error: error instanceof Error ? error.message : 'The bookmark operation failed.' }) }
    })()
    return true
  })
})
