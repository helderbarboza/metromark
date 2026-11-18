// Tests for the YouTube widget bridge (src/lib/youtube-bridge.ts).
// A hand-rolled fake frame + message target; no DOM, no jsdom.

import type { BridgeFrame, BridgeMessageEvent, BridgeMessageTarget } from '$lib/youtube-bridge'
import { YoutubeBackgroundBridge } from '$lib/youtube-bridge'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ID = 'dQw4w9WgXcQ'
const PLAYLIST = 'PLabc123XYZ_-0123456789abcdef'
const PLAYLIST_IDS = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'ddddddddddd']
const playlistInfo = () => ({ playlist: PLAYLIST_IDS, playlistIndex: 0, playlistId: PLAYLIST })

function makeCursor(stored: Record<string, number> = {}) {
  const map = new Map(Object.entries(stored))
  const writes: Array<{ playlistId: string, nextIndex: number }> = []
  return {
    writes,
    cursor: {
      read: (playlistId: string) => map.get(playlistId) ?? null,
      write: (playlistId: string, nextIndex: number) => {
        map.set(playlistId, nextIndex)
        writes.push({ playlistId, nextIndex })
      },
    },
  }
}

class FakeContentWindow {
  posted: Array<{ message: string, targetOrigin: string }> = []
  postMessage(message: string, targetOrigin: string) {
    this.posted.push({ message, targetOrigin })
  }

  commands(): Array<{ func: string, args: unknown[] }> {
    const out: Array<{ func: string, args: unknown[] }> = []
    for (const { message } of this.posted) {
      const parsed: unknown = JSON.parse(message)
      if (typeof parsed !== 'object' || parsed === null || !('event' in parsed))
        continue
      if (parsed.event !== 'command')
        continue
      const func = 'func' in parsed && typeof parsed.func === 'string' ? parsed.func : ''
      const args = 'args' in parsed && Array.isArray(parsed.args) ? parsed.args : []
      out.push({ func, args })
    }
    return out
  }
}

class FakeFrame implements BridgeFrame {
  contentWindow = new FakeContentWindow()
  private src = ''
  private listeners: Array<() => void> = []
  setAttribute(name: string, value: string) {
    if (name === 'src')
      this.src = value
  }

  getAttribute(name: string) {
    return name === 'src' ? this.src : null
  }

  addEventListener(type: 'load', listener: () => void) {
    if (type === 'load')
      this.listeners.push(listener)
  }

  fireLoad() {
    for (const listener of this.listeners)
      listener()
  }
}

class FakeWindow implements BridgeMessageTarget {
  location: { origin: string, href: string }
  private listeners: Array<(event: BridgeMessageEvent) => void> = []
  constructor(origin = 'chrome-extension://extid', href = 'chrome-extension://extid/newtab.html') {
    this.location = { origin, href }
  }

  addEventListener(_type: 'message', listener: (event: BridgeMessageEvent) => void) {
    this.listeners.push(listener)
  }

  removeEventListener(_type: 'message', listener: (event: BridgeMessageEvent) => void) {
    this.listeners = this.listeners.filter(candidate => candidate !== listener)
  }

  dispatch(contentWindow: FakeContentWindow, origin: string, data: unknown) {
    const event: BridgeMessageEvent = { source: contentWindow, origin, data }
    for (const listener of [...this.listeners])
      listener(event)
  }

  ready(frame: FakeFrame, origin = 'https://www.youtube-nocookie.com') {
    this.dispatch(frame.contentWindow, origin, { event: 'onReady' })
  }

  info(frame: FakeFrame, info: Record<string, unknown>, origin = 'https://www.youtube-nocookie.com') {
    this.dispatch(frame.contentWindow, origin, { event: 'infoDelivery', info })
  }
}

function makeBridge(overrides: Partial<ConstructorParameters<typeof YoutubeBackgroundBridge>[1]> = {}) {
  const frame = new FakeFrame()
  const win = new FakeWindow()
  const events: Array<Record<string, unknown>> = []
  const bridge = new YoutubeBackgroundBridge(frame, {
    videoId: ID,
    target: win,
    onEvent: snapshot => events.push({ ...snapshot }),
    ...overrides,
  })
  return { bridge, frame, win, events }
}

describe('youtubeBackgroundBridge', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('builds a params-floor embed URL on mount', () => {
    const { bridge, frame } = makeBridge()
    bridge.mount()
    const src = frame.getAttribute('src') ?? ''
    expect(src.startsWith(`https://www.youtube-nocookie.com/embed/${ID}?`)).toBe(true)
    expect(src).toContain('enablejsapi=1')
    expect(src).toContain('autoplay=1')
    expect(src).toContain('mute=1')
    expect(src).toContain('controls=0')
    expect(src).toContain('loop=1')
    expect(src).toContain(`playlist=${ID}`)
    expect(src).toContain('origin=chrome-extension%3A%2F%2Fextid')
  })

  it('builds a paused URL for reduced motion', () => {
    const { bridge, frame } = makeBridge({ autoplay: false })
    bridge.mount()
    expect(frame.getAttribute('src')).toContain('autoplay=0')
  })

  it('queues commands until onReady, then replays them once, in order', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    bridge.play()
    bridge.setVolume(40)
    expect(frame.contentWindow.commands()).toEqual([])
    win.ready(frame)
    const commands = frame.contentWindow.commands()
    expect(commands.map(command => command.func)).toEqual(['playVideo', 'unMute', 'setVolume', 'setPlaybackRate', 'unloadModule', 'unloadModule'])
    expect(commands[2].args).toEqual([40])
    expect(commands[3].args).toEqual([1])
  })

  it('unloads the caption modules on ready and on every transition to PLAYING', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame)
    let unloads = frame.contentWindow.commands().filter(command => command.func === 'unloadModule')
    expect(unloads.map(command => command.args[0])).toEqual(['captions', 'cc'])

    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 1 } })
    unloads = frame.contentWindow.commands().filter(command => command.func === 'unloadModule')
    expect(unloads.map(command => command.args[0])).toEqual(['captions', 'cc', 'captions', 'cc'])
  })

  it('sends commands with the widget wire shape', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame)
    bridge.pause()
    const raw = frame.contentWindow.posted.at(-1)
    expect(JSON.parse(raw!.message)).toEqual({
      event: 'command',
      func: 'pauseVideo',
      args: [],
      id: 'ytbg',
      channel: 'widget',
    })
  })

  it('ignores messages from a foreign window', () => {
    const { bridge, win } = makeBridge()
    bridge.mount()
    const foreign = new FakeContentWindow()
    win.dispatch(foreign, 'https://www.youtube-nocookie.com', { event: 'onReady' })
    expect(bridge.apiReady).toBe(false)
  })

  it('ignores messages from a disallowed origin', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.dispatch(frame.contentWindow, 'https://evil.example.com', { event: 'onReady' })
    expect(bridge.apiReady).toBe(false)
  })

  it('accepts messages from www.youtube.com (the nocookie host can redirect)', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame, 'https://www.youtube.com')
    expect(bridge.apiReady).toBe(true)
  })

  it('falls back through the handshake ladder and keeps playing via params', () => {
    const { bridge, frame } = makeBridge()
    bridge.mount()
    frame.fireLoad()
    vi.advanceTimersByTime(4000)
    expect(frame.getAttribute('src')).toContain('widget_referrer=chrome-extension%3A%2F%2Fextid%2Fnewtab.html')
    expect(frame.getAttribute('src')).not.toContain('origin=chrome-extension')
    frame.fireLoad()
    vi.advanceTimersByTime(4000)
    const bare = frame.getAttribute('src') ?? ''
    expect(bare).not.toContain('widget_referrer=')
    expect(bare).not.toContain('origin=')
    frame.fireLoad()
    vi.advanceTimersByTime(4000)
    expect(bridge.apiReady).toBe(false)
    expect(bridge.snapshot.attempt).toBe('3/3')
    // The URL-parameter floor is intact even with no widget answer.
    expect(bridge.snapshot.src).toContain('enablejsapi=1')
  })

  it('resumes from the last known time when reloading for a loop-mode change', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame)
    bridge.seekTo(12.4)
    bridge.seekBy(-10)
    bridge.setLoopMode('js')
    expect(frame.getAttribute('src')).toContain('start=2')
  })

  it('rounds floats in seekTo so 12.4 - 10 is exactly 2.4', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame)
    bridge.seekTo(12.4)
    bridge.seekBy(-10)
    const seeks = frame.contentWindow.commands().filter(command => command.func === 'seekTo')
    expect(seeks.map(command => command.args[0])).toEqual([12.4, 2.4])
  })

  it('rewinds on ENDED in js loop mode and stays silent in native mode', () => {
    const js = makeBridge({ loopMode: 'js' })
    js.bridge.mount()
    js.win.ready(js.frame)
    js.win.dispatch(js.frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 0 } })
    const jsCommands = js.frame.contentWindow.commands().map(command => command.func)
    expect(jsCommands).toEqual(expect.arrayContaining(['seekTo', 'playVideo']))

    const native = makeBridge({ loopMode: 'native' })
    native.bridge.mount()
    native.win.ready(native.frame)
    native.win.dispatch(native.frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 0 } })
    const nativeCommands = native.frame.contentWindow.commands().map(command => command.func)
    expect(nativeCommands).not.toContain('seekTo')
    expect(nativeCommands).not.toContain('playVideo')
  })

  it('applies the configured playback rate once the player is ready', () => {
    const { bridge, frame, win } = makeBridge({ playbackRate: 1.5 })
    bridge.mount()
    expect(frame.contentWindow.commands()).toEqual([])
    win.ready(frame)
    const rateCommands = frame.contentWindow.commands().filter(command => command.func === 'setPlaybackRate')
    expect(rateCommands).toEqual([{ func: 'setPlaybackRate', args: [1.5] }])
  })

  it('replays a rate set before ready exactly once, after ready', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    bridge.setPlaybackRate(0.5)
    expect(frame.contentWindow.commands()).toEqual([])
    win.ready(frame)
    const rateCommands = frame.contentWindow.commands().filter(command => command.func === 'setPlaybackRate')
    expect(rateCommands).toEqual([{ func: 'setPlaybackRate', args: [0.5] }])
  })

  it('commands the live player when the rate changes after ready', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame)
    frame.contentWindow.posted.length = 0
    bridge.setPlaybackRate(2)
    const commands = frame.contentWindow.commands()
    expect(commands).toEqual([{ func: 'setPlaybackRate', args: [2] }])
    expect(bridge.snapshot.playbackRate).toBe(2)
  })

  it('ignores unsupported playback rates and keeps the current one', () => {
    const { bridge: preset } = makeBridge({ playbackRate: 1.75 })
    expect(preset.snapshot.playbackRate).toBe(1)
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame)
    frame.contentWindow.posted.length = 0
    bridge.setPlaybackRate(1.25)
    expect(frame.contentWindow.commands()).toEqual([])
    expect(bridge.snapshot.playbackRate).toBe(1)
  })

  it('surfaces widget errors through snapshot.error', () => {
    const { bridge, frame, win, events } = makeBridge()
    bridge.mount()
    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onError', info: 150 })
    expect(bridge.snapshot.error).toContain('150')
    expect(events.at(-1)?.error).toContain('150')
  })

  it('reports a handshake failure through the snapshot', () => {
    const { bridge, frame } = makeBridge()
    bridge.mount()
    frame.fireLoad()
    vi.advanceTimersByTime(4000)
    expect(bridge.snapshot.attempt).toBe('2/3')
    expect(bridge.snapshot.apiReady).toBe(false)
  })

  it('builds a videoseries embed URL for a playlist', () => {
    const { bridge, frame } = makeBridge({ videoId: undefined, playlistId: PLAYLIST })
    bridge.mount()
    const src = frame.getAttribute('src') ?? ''
    expect(src.startsWith('https://www.youtube-nocookie.com/embed/videoseries?')).toBe(true)
    expect(src).toContain(`list=${PLAYLIST}`)
    expect(src).toContain('loop=1')
    expect(src).not.toContain('playlist=')
    expect(src).not.toContain(`/embed/${ID}`)
    expect(src).toContain('enablejsapi=1')
    expect(src).toContain('autoplay=1')
    expect(src).toContain('mute=1')
  })

  it('throws when neither or both IDs are passed', () => {
    expect(() => new YoutubeBackgroundBridge(new FakeFrame(), { target: new FakeWindow() })).toThrow()
    expect(() => new YoutubeBackgroundBridge(new FakeFrame(), { target: new FakeWindow(), videoId: ID, playlistId: PLAYLIST })).toThrow()
    expect(() => new YoutubeBackgroundBridge(new FakeFrame(), { target: new FakeWindow(), playlistId: 'ab' })).toThrow()
  })

  it('sets loop on ready and shuffles once when the playlist starts playing', () => {
    const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST })
    bridge.mount()
    win.ready(frame)
    let commands = frame.contentWindow.commands()
    expect(commands.map(command => command.func)).toContain('setLoop')
    expect(commands.map(command => command.func)).not.toContain('setShuffle')

    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 1 } })
    commands = frame.contentWindow.commands()
    const shuffles = commands.filter(command => command.func === 'setShuffle')
    expect(shuffles).toEqual([{ func: 'setShuffle', args: [true] }])

    // A second PLAYING transition must not reshuffle.
    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 1 } })
    expect(frame.contentWindow.commands().filter(command => command.func === 'setShuffle')).toHaveLength(1)
  })

  it('falls back to a timer when no PLAYING state is reported', () => {
    const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST })
    bridge.mount()
    win.ready(frame)
    expect(frame.contentWindow.commands().filter(command => command.func === 'setShuffle')).toEqual([])
    vi.advanceTimersByTime(1600)
    expect(frame.contentWindow.commands().filter(command => command.func === 'setShuffle')).toEqual([{ func: 'setShuffle', args: [true] }])
  })

  it('never shuffles a single video', () => {
    const { bridge, frame, win } = makeBridge()
    bridge.mount()
    win.ready(frame)
    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 1 } })
    vi.advanceTimersByTime(2000)
    const funcs = frame.contentWindow.commands().map(command => command.func)
    expect(funcs).not.toContain('setShuffle')
    expect(funcs).not.toContain('setLoop')
  })

  it('picks a random starting video from the playlist on each mount', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5) // floor(0.5 * 4) = 2
    try {
      const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST })
      bridge.mount()
      win.info(frame, playlistInfo())
      win.ready(frame)
      expect(frame.contentWindow.commands().filter(command => command.func === 'playVideoAt'))
        .toEqual([{ func: 'playVideoAt', args: [2] }])
      // Repeated deliveries must not re-pick.
      win.info(frame, playlistInfo())
      expect(frame.contentWindow.commands().filter(command => command.func === 'playVideoAt')).toHaveLength(1)
    }
    finally {
      random.mockRestore()
    }
  })

  it('plays the stored cursor position in sequential mode and advances it, wrapping at the end', () => {
    const { cursor, writes } = makeCursor({ [PLAYLIST]: 3 })
    const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST, playlistOrder: 'sequential', playlistCursor: cursor })
    bridge.mount()
    win.info(frame, playlistInfo())
    win.ready(frame)
    expect(frame.contentWindow.commands().filter(command => command.func === 'playVideoAt'))
      .toEqual([{ func: 'playVideoAt', args: [3] }])
    expect(writes).toEqual([{ playlistId: PLAYLIST, nextIndex: 0 }])
    // Sequential mode never reshuffles.
    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 1 } })
    vi.advanceTimersByTime(2000)
    expect(frame.contentWindow.commands().map(command => command.func)).not.toContain('setShuffle')
  })

  it('sequential mode with a stale cursor normalizes it into range', () => {
    const { cursor, writes } = makeCursor({ [PLAYLIST]: 7 })
    const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST, playlistOrder: 'sequential', playlistCursor: cursor })
    bridge.mount()
    win.info(frame, playlistInfo())
    win.ready(frame)
    expect(frame.contentWindow.commands().filter(command => command.func === 'playVideoAt'))
      .toEqual([{ func: 'playVideoAt', args: [3] }])
    expect(writes).toEqual([{ playlistId: PLAYLIST, nextIndex: 0 }])
  })

  it('sequential mode without a store starts at the top', () => {
    const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST, playlistOrder: 'sequential' })
    bridge.mount()
    win.info(frame, playlistInfo())
    win.ready(frame)
    expect(frame.contentWindow.commands().filter(command => command.func === 'playVideoAt'))
      .toEqual([{ func: 'playVideoAt', args: [0] }])
  })

  it('reduced motion does not pick a start video nor advance the cursor', () => {
    const { cursor, writes } = makeCursor({ [PLAYLIST]: 2 })
    const shuffle = makeBridge({ videoId: undefined, playlistId: PLAYLIST, autoplay: false })
    shuffle.bridge.mount()
    shuffle.win.info(shuffle.frame, playlistInfo())
    shuffle.win.ready(shuffle.frame)
    expect(shuffle.frame.contentWindow.commands().map(command => command.func)).not.toContain('playVideoAt')
    vi.advanceTimersByTime(2000)
    expect(shuffle.frame.contentWindow.commands().map(command => command.func)).not.toContain('setShuffle')

    const sequential = makeBridge({ videoId: undefined, playlistId: PLAYLIST, autoplay: false, playlistOrder: 'sequential', playlistCursor: cursor })
    sequential.bridge.mount()
    sequential.win.info(sequential.frame, playlistInfo())
    sequential.win.ready(sequential.frame)
    expect(sequential.frame.contentWindow.commands().map(command => command.func)).not.toContain('playVideoAt')
    expect(writes).toEqual([])
  })

  it('does not pick a start video when the playlist payload is missing', () => {
    const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST })
    bridge.mount()
    win.ready(frame)
    expect(frame.contentWindow.commands().filter(command => command.func === 'playVideoAt')).toEqual([])
    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 1 } })
    expect(frame.contentWindow.commands().map(command => command.func)).toContain('setShuffle')
  })

  it('reloads the playlist from the top on ENDED in js loop mode', () => {
    const { bridge, frame, win } = makeBridge({ videoId: undefined, playlistId: PLAYLIST, loopMode: 'js' })
    bridge.mount()
    win.ready(frame)
    frame.setAttribute('src', 'about:blank') // observe the reload
    win.dispatch(frame.contentWindow, 'https://www.youtube-nocookie.com', { event: 'onStateChange', info: { playerState: 0 } })
    expect(frame.getAttribute('src')).toContain('/embed/videoseries?')
    expect(frame.contentWindow.commands().map(command => command.func)).not.toContain('playVideo')
  })
})
