import type { Command } from '$lib/types'
import type { Browser } from 'wxt/browser'
import { MESSAGE_SCOPE, nativeBookmarks, nativePersistence } from '$lib/adapters/native'
import { loadSettings } from '$lib/config'
import { BookmarkCoordinator } from '$lib/coordinator'
import { applyLocale } from '$lib/locale'
import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'

/**
 * YouTube refuses embedded players that arrive without an HTTP Referer
 * ("Error 153"). Chromium does not send a Referer from extension pages,
 * so the extension sets it explicitly on the embed request via a dynamic
 * declarativeNetRequest rule. Requires the youtube-nocookie.com host
 * permission (see wxt.config.ts). Registered synchronously at startup and
 * idempotently; safe to re-register on every launch.
 */
const YOUTUBE_EMBED_RULE_ID = 1

function youtubeEmbedRefererRule(withInitiator: boolean): Browser.declarativeNetRequest.Rule {
  return {
    id: YOUTUBE_EMBED_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'referer', operation: 'set', value: browser.runtime.id }],
    },
    condition: {
      ...(withInitiator ? { initiatorDomains: [browser.runtime.id] } : {}),
      requestDomains: ['www.youtube-nocookie.com'],
      resourceTypes: ['sub_frame'],
    },
  }
}

async function registerYoutubeEmbedRefererRule(): Promise<void> {
  const dnr = browser.declarativeNetRequest
  if (typeof dnr?.updateDynamicRules !== 'function')
    return
  try {
    await dnr.updateDynamicRules({ removeRuleIds: [YOUTUBE_EMBED_RULE_ID], addRules: [youtubeEmbedRefererRule(true)] })
  }
  catch {
    // Some engines reject the initiator-domain condition for extension
    // requests; fall back to a rule scoped by domain and frame type only.
    try {
      await dnr.updateDynamicRules({ removeRuleIds: [YOUTUBE_EMBED_RULE_ID], addRules: [youtubeEmbedRefererRule(false)] })
    }
    catch (error) {
      console.warn('[youtube] Unable to register the embed Referer rule.', error)
    }
  }
}

export default defineBackground(() => {
  void registerYoutubeEmbedRefererRule()
  const settings = loadSettings()
  // Provisional locale for messages thrown before the stored settings arrive.
  applyLocale(settings.language, { persist: false })
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
