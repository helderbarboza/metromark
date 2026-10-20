import type { AppData, BookmarkPort, Client, Command, CommandResult, Snapshot } from '../types'
import { browser } from 'wxt/browser'
import { validateUrl } from '../url.js'
import { normalizeTree } from './memory'

export const MESSAGE_SCOPE = 'metro-bookmarks/v1'
export const STORAGE_KEY = 'metro.presentation.v1'
export function nativeBookmarks(): BookmarkPort {
  return {
    async getTree() { return normalizeTree(await browser.bookmarks.getTree()) },
    async create(details) {
      // Firefox alone supports the separator type. Existing separators are preserved on subtree Undo.
      return browser.bookmarks.create(details)
    },
    async update(id, changes) { return browser.bookmarks.update(id, changes) },
    async move(id, destination) { return browser.bookmarks.move(id, destination) },
    async remove(id, recursive) {
      if (recursive)
        await browser.bookmarks.removeTree(id)
      else
        await browser.bookmarks.remove(id)
    },
    onChange(listener) {
      const events = [browser.bookmarks.onCreated, browser.bookmarks.onChanged, browser.bookmarks.onMoved, browser.bookmarks.onRemoved, browser.bookmarks.onChildrenReordered, browser.bookmarks.onImportBegan, browser.bookmarks.onImportEnded].filter(Boolean)
      for (const event of events) event.addListener(listener)
      return () => {
        for (const event of events) event.removeListener(listener)
      }
    },
  }
}
function isAppData(value: unknown): value is AppData {
  return typeof value === 'object' && value !== null
}

export function nativePersistence() {
  return {
    async read() {
      const result: unknown = (await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY]
      if (result === undefined) {
        return undefined
      }
      return isAppData(result) ? result : undefined
    },
    async write(data: AppData) { await browser.storage.local.set({ [STORAGE_KEY]: data }) },
  }
}
type Response = { ok: true, snapshot?: Snapshot, result?: CommandResult } | { ok: false, error: string }
export function createNativeClient(): Client {
  const listeners = new Set<(snapshot: Snapshot) => void>()
  let disposed = false
  const request = async (kind: 'snapshot' | 'execute', command?: Command): Promise<Response & { ok: true }> => {
    const response: Response | undefined = await browser.runtime.sendMessage({ scope: MESSAGE_SCOPE, kind, command })
    if (!response)
      throw new Error('The extension background did not respond. Reload this tab to reconnect.')
    if (!response.ok)
      throw new Error(response.error)
    return response
  }
  const snapshot = async () => {
    const response = await request('snapshot')
    if (!response.snapshot)
      throw new Error('The bookmark snapshot is unavailable.')
    return response.snapshot
  }
  let refreshInProgress: Promise<void> | undefined
  let refreshAgain = false
  const refresh = () => {
    if (refreshInProgress) {
      refreshAgain = true
      return
    }
    refreshInProgress = snapshot().then((value) => {
      if (!disposed) {
        for (const listener of listeners) listener(value)
      }
    }).catch((error: unknown) => console.error('Reconnection failed:', error)).finally(() => {
      refreshInProgress = undefined
      if (refreshAgain && !disposed) {
        refreshAgain = false
        refresh()
      }
    })
  }
  const onMessage = (message: { scope?: string, kind?: string }) => {
    if (message?.scope === MESSAGE_SCOPE && message.kind === 'changed')
      refresh()
  }
  browser.runtime.onMessage.addListener(onMessage)
  const onFocus = () => refresh()
  window.addEventListener('focus', onFocus)
  return {
    mode: 'extension',
    snapshot,
    async execute(command) {
      const response = await request('execute', command)
      if (!response.result)
        throw new Error('The bookmark command did not return a result.')
      return response.result
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async open(url, disposition) {
      const validated = validateUrl(url)
      if (disposition === 'window')
        await browser.windows.create({ url: validated })
      else await browser.tabs.create({ url: validated })
    },
    dispose() {
      disposed = true
      listeners.clear()
      browser.runtime.onMessage.removeListener(onMessage)
      window.removeEventListener('focus', onFocus)
    },
  }
}
