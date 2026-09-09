import { completeCameraStartup } from '../src/game/cameraFlow.ts'
import { test, expect, vi, afterEach } from 'vitest'
import { moves, resolveRound } from '../src/game/rules.ts'
import { makeGameStore, type SettingsDraft } from '../src/game/store.ts'
import { GestureStabilizer } from '../src/vision/classifier.ts'
import { completeMatch } from '../src/game/matchCompletion.ts'
import { audioStore, isAudioMode } from '../src/game/audio.ts'

afterEach(() => {
  vi.useRealTimers()
})
function configure(store: ReturnType<typeof makeGameStore>, changes: Partial<SettingsDraft>) {
  const context = store.getSnapshot().context
  if (context.running) return
  store.trigger.openSettings()
  const draft = store.getSnapshot().context.settingsDraft!
  store.trigger.editSettings({ draft: { ...draft, ...changes } })
  if (store.getSnapshot().context.settingsDraft === draft) store.trigger.cancelSettings()
  else store.trigger.applySettings()
}

const expected = [
  ['draw', 'loss', 'win', 'win', 'loss'],
  ['win', 'draw', 'loss', 'loss', 'win'],
  ['loss', 'win', 'draw', 'win', 'loss'],
  ['loss', 'win', 'loss', 'draw', 'win'],
  ['win', 'loss', 'win', 'loss', 'draw'],
]
test('all 25 standard outcomes', () =>
  moves.forEach((a, i) =>
    moves.forEach((b, j) => expect(resolveRound(a, b).outcome).toBe(expected[i][j])),
  ))
function round(
  store: ReturnType<typeof makeGameStore>,
  move: (typeof moves)[number] | null,
  opponentMove: (typeof moves)[number],
  at = 1000,
  now = 1100,
) {
  store.trigger.start({ opponentMove })
  store.trigger.detected({ gesture: move, stable: move !== null, at })
  for (let i = 0; i < 3; i++) store.trigger.tick()
  store.trigger.capture({ now })
}
test('five wins finish a match, repeated capture and start cannot change it', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  for (let i = 0; i < 5; i++) round(store, 'rock', 'scissors')
  expect(store.getSnapshot().context.local.score).toBe(5)
  store.trigger.capture({ now: 1100 })
  store.trigger.start({ opponentMove: 'paper' })
  expect(store.getSnapshot().context.phase).toBe('result')
  expect(store.getSnapshot().context.local.score).toBe(5)
  store.trigger.reset()
  expect(store.getSnapshot().context.local.score).toBe(0)
  expect(store.getSnapshot().context.camera).toBe('ready')
})
test('no hand, unstable pose, stale frame and early capture cannot score', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, null, 'paper')
  expect(store.getSnapshot().context.phase).toBe('idle')
  round(store, 'rock', 'scissors', 0, 1000)
  expect(store.getSnapshot().context.local.score).toBe(0)
  store.trigger.start({ opponentMove: 'scissors' })
  store.trigger.detected({ gesture: 'rock', stable: false, at: 1000 })
  store.trigger.capture({ now: 1100 })
  expect(store.getSnapshot().context.phase).toBe('countdown')
  for (let i = 0; i < 3; i++) store.trigger.tick()
  store.trigger.capture({ now: 1100 })
  expect(store.getSnapshot().context.local.score).toBe(0)
})
test('draws, losses, camera interruption and reset are consistent', () => {
  const store = makeGameStore()
  store.trigger.start({ opponentMove: 'paper' })
  expect(store.getSnapshot().context.phase).toBe('idle')
  store.trigger.cameraReady()
  round(store, 'paper', 'paper')
  expect(store.getSnapshot().context.outcome).toBe('draw')
  round(store, 'rock', 'paper')
  expect(store.getSnapshot().context.opponent.score).toBe(1)
  store.trigger.start({ opponentMove: 'paper' })
  store.trigger.cameraOff()
  store.trigger.capture({ now: 1100 })
  expect(store.getSnapshot().context.phase).toBe('idle')
  expect(store.getSnapshot().context.opponent.score).toBe(1)
})
test('gesture stability resets on changed pose and missing hand', () => {
  const s = new GestureStabilizer()
  expect(s.update('rock', 0).stable).toBe(false)
  s.update('rock', 150)
  s.update('rock', 300)
  expect(s.update('rock', 449).stable).toBe(false)
  expect(s.update('rock', 450).stable).toBe(true)
  expect(s.update('paper', 460).stable).toBe(false)
  expect(s.update(null, 1000).stable).toBe(false)
  expect(s.update('paper', 1010).stable).toBe(false)
})
test('automatic rounds wait three ticks after results and start without a next-round action', async () => {
  const { advanceRound } = await import('../src/game/roundFlow.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, 'rock', 'scissors')
  expect(store.getSnapshot().context.running).toBe(true)
  for (let i = 0; i < 2; i++) {
    store.trigger.tick()
    advanceRound(store, 1100)
    expect(store.getSnapshot().context.phase).toBe('result')
  }
  store.trigger.tick()
  expect(advanceRound(store, 1100)).toBe(true)
  expect(store.getSnapshot().context.phase).toBe('countdown')
  expect(store.getSnapshot().context.countdown).toBe(3)
  expect(store.getSnapshot().context.local.score).toBe(1)
})

test('pause, camera loss and match completion stop automatic progression', async () => {
  const { advanceRound } = await import('../src/game/roundFlow.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  store.trigger.start({ opponentMove: 'rock' })
  store.trigger.pause()
  for (let i = 0; i < 10; i++) {
    store.trigger.tick()
    advanceRound(store, 1000)
  }
  expect(store.getSnapshot().context.phase).toBe('idle')
  expect(store.getSnapshot().context.local.score).toBe(0)
  round(store, 'paper', 'rock')
  store.trigger.cameraOff()
  for (let i = 0; i < 10; i++) {
    store.trigger.tick()
    advanceRound(store, 1000)
  }
  expect(store.getSnapshot().context.running).toBe(false)
  expect(store.getSnapshot().context.phase).toBe('result')
  store.trigger.cameraReady()
  for (let i = 0; i < 4; i++) round(store, 'paper', 'rock')
  expect(store.getSnapshot().context.running).toBe(false)
  expect(advanceRound(store, 1000)).toBe(false)
})

test('RPS restricts both players and changing variants resets scores while retaining camera', async () => {
  const { computer, movesForMode } = await import('../src/game/rules.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  configure(store, { mode: 'rps' })
  store.trigger.start({ opponentMove: 'spock' })
  expect(store.getSnapshot().context.phase).toBe('idle')
  round(store, 'spock', 'rock')
  expect(store.getSnapshot().context.local.score).toBe(0)
  expect(store.getSnapshot().context.explanation).toMatch(/Classic/)
  expect(store.getSnapshot().context.running).toBe(true)
  configure(store, { mode: 'rpsls' })
  expect(store.getSnapshot().context.mode).toBe('rps')
  for (let i = 0; i < 100; i++)
    expect(movesForMode('rps').includes(computer.chooseMove('rps'))).toBeTruthy()
  round(store, 'rock', 'scissors')
  store.trigger.pause()
  configure(store, { mode: 'rpsls' })
  expect(store.getSnapshot().context.local.score).toBe(0)
  expect(store.getSnapshot().context.camera).toBe('ready')
  expect(store.getSnapshot().context.running).toBe(false)
  round(store, 'spock', 'rock')
  expect(store.getSnapshot().context.local.score).toBe(1)
  store.trigger.pause()
  configure(store, { mode: 'rps' })
  store.trigger.reset()
  expect(store.getSnapshot().context.mode).toBe('rps')
})

test('invalid captures retry automatically without consuming a round or points', async () => {
  const { advanceRound } = await import('../src/game/roundFlow.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, null, 'rock')
  for (let i = 0; i < 3; i++) {
    store.trigger.tick()
    advanceRound(store, 1000)
  }
  expect(store.getSnapshot().context.phase).toBe('countdown')
  expect(store.getSnapshot().context.round).toBe(1)
  expect(store.getSnapshot().context.local.score).toBe(0)
  expect(store.getSnapshot().context.opponent.score).toBe(0)
})

test('custom first-to targets stop exactly at the winning score and survive reset', async () => {
  const { isMatchFinished, matchOutcome } = await import('../src/game/match.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  configure(store, { format: 'firstTo', limit: 2 })
  round(store, 'rock', 'scissors')
  expect(isMatchFinished(store.getSnapshot().context)).toBe(false)
  round(store, 'rock', 'scissors')
  expect(matchOutcome(store.getSnapshot().context)).toBe('win')
  expect(store.getSnapshot().context.running).toBe(false)
  store.trigger.start({ opponentMove: 'paper' })
  expect(store.getSnapshot().context.phase).toBe('result')
  store.trigger.reset()
  expect(store.getSnapshot().context.limit).toBe(2)
  expect(matchOutcome(store.getSnapshot().context)).toBe(null)
})

test('fixed rounds include draws, exclude invalid captures and resolve a tied match', async () => {
  const { isMatchFinished, matchOutcome } = await import('../src/game/match.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  configure(store, { format: 'rounds', limit: 3 })
  round(store, null, 'rock')
  expect(store.getSnapshot().context.round).toBe(1)
  round(store, 'rock', 'rock')
  round(store, 'paper', 'rock')
  expect(isMatchFinished(store.getSnapshot().context)).toBe(false)
  round(store, 'rock', 'paper')
  expect(matchOutcome(store.getSnapshot().context)).toBe('draw')
  expect(store.getSnapshot().context.round).toBe(4)
  expect(store.getSnapshot().context.running).toBe(false)
})

test('fixed-round winner uses the full match score, not the last round outcome', async () => {
  const { matchOutcome } = await import('../src/game/match.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  configure(store, { format: 'rounds', limit: 3 })
  round(store, 'paper', 'rock')
  round(store, 'paper', 'rock')
  round(store, 'rock', 'paper')
  expect(store.getSnapshot().context.outcome).toBe('loss')
  expect(matchOutcome(store.getSnapshot().context)).toBe('win')
  store.trigger.reset()
  round(store, 'rock', 'paper')
  round(store, 'rock', 'paper')
  round(store, 'paper', 'rock')
  expect(matchOutcome(store.getSnapshot().context)).toBe('loss')
})

test('match settings validate limits, require pause, reset scores and survive game changes', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  for (const limit of [0, 21, -1, 1.5, NaN]) configure(store, { format: 'firstTo', limit })
  expect(store.getSnapshot().context.limit).toBe(5)
  round(store, 'paper', 'rock')
  configure(store, { format: 'rounds', limit: 10 })
  expect(store.getSnapshot().context.format).toBe('firstTo')
  store.trigger.pause()
  configure(store, { format: 'rounds', limit: 10 })
  expect(store.getSnapshot().context.local.score).toBe(0)
  expect(store.getSnapshot().context.camera).toBe('ready')
  configure(store, { mode: 'rps' })
  expect(store.getSnapshot().context.format).toBe('rounds')
  expect(store.getSnapshot().context.limit).toBe(10)
})

test('settings dialog pauses play and keeps draft edits separate until canceled', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, 'paper', 'rock')
  store.trigger.start({ opponentMove: 'rock' })
  store.trigger.tick()
  store.trigger.openSettings()
  expect(store.getSnapshot().context.running).toBe(false)
  expect(store.getSnapshot().context.phase).toBe('idle')
  store.trigger.editSettings({
    draft: { countdownSeconds: 3, mode: 'rps', format: 'rounds', limit: 3 },
  })
  expect(store.getSnapshot().context.mode).toBe('rpsls')
  expect(store.getSnapshot().context.local.score).toBe(1)
  store.trigger.start({ opponentMove: 'rock' })
  expect(store.getSnapshot().context.running).toBe(false)
  store.trigger.cancelSettings()
  expect(store.getSnapshot().context.settingsDraft).toBe(null)
  expect(store.getSnapshot().context.local.score).toBe(1)
  expect(store.getSnapshot().context.limit).toBe(5)
  expect(store.getSnapshot().context.running).toBe(false)
  store.trigger.openSettings()
  expect(store.getSnapshot().context.settingsDraft).toEqual({
    countdownSeconds: 3,
    mode: 'rpsls',
    format: 'firstTo',
    limit: 5,
  })
})

test('applying dialog settings atomically resets score and preserves camera', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, 'paper', 'rock')
  store.trigger.openSettings()
  store.trigger.editSettings({
    draft: { countdownSeconds: 3, mode: 'rps', format: 'rounds', limit: 7 },
  })
  store.trigger.applySettings()
  const c = store.getSnapshot().context
  expect(c.settingsDraft).toBe(null)
  expect(c.local.score).toBe(0)
  expect(c.opponent.score).toBe(0)
  expect(c.round).toBe(1)
  expect(c.mode).toBe('rps')
  expect(c.format).toBe('rounds')
  expect(c.limit).toBe(7)
  expect(c.camera).toBe('ready')
  store.trigger.start({ opponentMove: 'rock' })
  expect(store.getSnapshot().context.phase).toBe('countdown')
})

test('dialog rejects invalid draft values and cannot apply after cancel', () => {
  const store = makeGameStore()
  store.trigger.openSettings()
  for (const limit of [0, 21, NaN, 1.5])
    store.trigger.editSettings({
      draft: { countdownSeconds: 3, mode: 'rps', format: 'rounds', limit },
    })
  expect(store.getSnapshot().context.settingsDraft?.limit).toBe(5)
  store.trigger.editSettings({
    draft: { countdownSeconds: 3, mode: 'rps', format: 'rounds', limit: 3 },
  })
  store.trigger.cancelSettings()
  store.trigger.applySettings()
  expect(store.getSnapshot().context.mode).toBe('rpsls')
  expect(store.getSnapshot().context.camera).toBe('off')
})

test('opening help pauses the round, blocks play while open and preserves scores on close', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, 'paper', 'rock')
  store.trigger.start({ opponentMove: 'rock' })
  store.trigger.tick()
  store.trigger.toggleRules()
  expect(store.getSnapshot().context.rulesOpen).toBe(true)
  expect(store.getSnapshot().context.running).toBe(false)
  expect(store.getSnapshot().context.phase).toBe('idle')
  store.trigger.start({ opponentMove: 'rock' })
  expect(store.getSnapshot().context.running).toBe(false)
  store.trigger.closeRules()
  store.trigger.closeRules()
  expect(store.getSnapshot().context.rulesOpen).toBe(false)
  expect(store.getSnapshot().context.local.score).toBe(1)
  expect(store.getSnapshot().context.running).toBe(false)
  store.trigger.start({ opponentMove: 'rock' })
  expect(store.getSnapshot().context.phase).toBe('countdown')
})

test('five-second countdown applies to first and automatic rounds and survives reset', async () => {
  const { advanceRound } = await import('../src/game/roundFlow.ts')
  const store = makeGameStore()
  store.trigger.cameraReady()
  store.trigger.openSettings()
  store.trigger.editSettings({
    draft: { mode: 'rps', format: 'firstTo', limit: 5, countdownSeconds: 5 },
  })
  store.trigger.applySettings()
  store.trigger.start({ opponentMove: 'rock' })
  expect(store.getSnapshot().context.countdown).toBe(5)
  store.trigger.detected({ gesture: 'paper', stable: true, at: 1000 })
  for (let i = 0; i < 3; i++) store.trigger.tick()
  expect(advanceRound(store, 1100)).toBe(false)
  expect(store.getSnapshot().context.local.score).toBe(0)
  store.trigger.tick()
  store.trigger.tick()
  advanceRound(store, 1100)
  expect(store.getSnapshot().context.local.score).toBe(1)
  for (let i = 0; i < 3; i++) store.trigger.tick()
  advanceRound(store, 1100)
  expect(store.getSnapshot().context.countdown).toBe(5)
  store.trigger.pause()
  store.trigger.reset()
  expect(store.getSnapshot().context.countdownSeconds).toBe(5)
  store.trigger.start({ opponentMove: 'rock' })
  expect(store.getSnapshot().context.countdown).toBe(5)
})

test('appearance resolves system preference and leaves active matches untouched', async () => {
  const { appearanceStore, resolveTheme } = await import('../src/game/appearance.ts')
  expect(resolveTheme('system', true)).toBe('dark')
  expect(resolveTheme('system', false)).toBe('light')
  expect(resolveTheme('light', true)).toBe('light')
  expect(resolveTheme('dark', false)).toBe('dark')
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, 'paper', 'rock')
  const before = store.getSnapshot()
  for (const preference of ['dark', 'light', 'system'] as const) {
    appearanceStore.trigger.choose({ preference })
    expect(appearanceStore.getSnapshot().context.preference).toBe(preference)
    expect(store.getSnapshot()).toBe(before)
  }
})

test('appearance loads saved choice, persists updates and follows system changes', async () => {
  const { initializeAppearance, appearanceStore } = await import('../src/game/appearance.ts')
  const savedGlobals = new Map(
    ['window', 'document', 'localStorage'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  )
  const storage = new Map([['hand-to-hand-appearance', 'dark']])
  let listener = () => {}
  const query = {
    matches: false,
    addEventListener: (_event: string, fn: () => void) => {
      listener = fn
    },
    removeEventListener: () => {},
  }
  const root = {
    dataset: {} as Record<string, string>,
    style: { colorScheme: '' },
  }
  let cleanup: (() => void) | undefined
  try {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        matchMedia: () => query,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    })
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { documentElement: root, querySelector: () => null },
    })
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    })
    cleanup = initializeAppearance()
    expect(root.dataset.theme).toBe('dark')
    appearanceStore.trigger.choose({ preference: 'light' })
    expect(root.dataset.theme).toBe('light')
    expect(storage.get('hand-to-hand-appearance')).toBe('light')
    query.matches = true
    listener()
    expect(root.dataset.theme).toBe('light')
    appearanceStore.trigger.choose({ preference: 'system' })
    expect(root.dataset.theme).toBe('dark')
    query.matches = false
    listener()
    expect(root.dataset.theme).toBe('light')
  } finally {
    cleanup?.()
    for (const [key, descriptor] of savedGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})

test('one-click start waits for camera readiness before beginning the countdown', async () => {
  const { completeCameraStartup } = await import('../src/game/cameraFlow.ts')
  const store = makeGameStore()
  store.trigger.cameraLoading({ startMatch: true })
  expect(store.getSnapshot().context.running).toBe(false)
  expect(store.getSnapshot().context.phase).toBe('idle')
  completeCameraStartup(store)
  expect(store.getSnapshot().context.camera).toBe('ready')
  expect(store.getSnapshot().context.phase).toBe('countdown')
  expect(store.getSnapshot().context.startWhenReady).toBe(false)
  store.trigger.tick()
  completeCameraStartup(store)
  expect(store.getSnapshot().context.countdown).toBe(2)
})

test('camera failure, cancellation and opening help cancel automatic start', async () => {
  const { completeCameraStartup } = await import('../src/game/cameraFlow.ts')
  for (const action of ['error', 'off', 'help', 'settings'] as const) {
    const store = makeGameStore()
    store.trigger.cameraLoading({ startMatch: true })
    if (action === 'error') store.trigger.cameraError({ message: 'Permission denied' })
    if (action === 'off') store.trigger.cameraOff()
    if (action === 'help') {
      store.trigger.toggleRules()
      store.trigger.closeRules()
    }
    if (action === 'settings') {
      store.trigger.openSettings()
      store.trigger.cancelSettings()
    }
    completeCameraStartup(store)
    expect(store.getSnapshot().context.running, action).toBe(false)
    expect(store.getSnapshot().context.startWhenReady, action).toBe(false)
  }
})

test('round toasts identify the winner and stale dismissal cannot hide a newer result', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, 'paper', 'rock')
  const first = store.getSnapshot().context.notification!
  expect(first.title).toMatch(/You won.*Round 1/)
  expect(first.persistent).toBe(false)
  round(store, 'rock', 'paper')
  const second = store.getSnapshot().context.notification!
  expect(second.title).toMatch(/Computer won.*Round 2/)
  store.trigger.dismissNotification({ id: first.id })
  expect(store.getSnapshot().context.notification?.id).toBe(second.id)
  store.trigger.dismissNotification({ id: second.id })
  expect(store.getSnapshot().context.notification).toBe(null)
})

test('match toast takes priority and uses final score rather than last-round winner', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  configure(store, { format: 'rounds', limit: 3 })
  round(store, 'paper', 'rock')
  round(store, 'paper', 'rock')
  round(store, 'rock', 'paper')
  const toast = store.getSnapshot().context.notification!
  expect(toast.title).toBe('You won the match!')
  expect(toast.persistent).toBe(true)
  expect(toast.description).toMatch(/you 2 · computer 1/)
  expect(toast.description).toMatch(/Last round: computer won/)
  store.trigger.reset()
  expect(store.getSnapshot().context.notification).toBe(null)
})

test('drawn match and missed sign receive distinct notifications', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  configure(store, { format: 'rounds', limit: 1 })
  round(store, null, 'rock')
  expect(store.getSnapshot().context.notification?.kind).toBe('retry')
  expect(store.getSnapshot().context.notification?.persistent).toBe(false)
  round(store, 'rock', 'rock')
  expect(store.getSnapshot().context.notification?.title).toBe('Match drawn')
  expect(store.getSnapshot().context.notification?.persistent).toBe(true)
})

test.each(['rock', 'paper', 'scissors'] as const)(
  'completed match with %s turns off the camera and retains the final result',
  (move) => {
    vi.useFakeTimers()
    const store = makeGameStore()
    configure(store, { mode: 'rps', format: 'rounds', limit: 1 })
    store.trigger.cameraReady()
    round(store, move, 'scissors')
    const final = store.getSnapshot().context
    const stop = vi.fn(() => store.trigger.cameraOff())
    completeMatch(store, stop)
    expect(stop).toHaveBeenCalledOnce()
    completeMatch(store, stop)
    expect(stop).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(60000)
    const c = store.getSnapshot().context
    expect(c.camera).toBe('off')
    expect(c.phase).toBe('result')
    expect(c.local).toEqual(final.local)
    expect(c.opponent).toEqual(final.opponent)
    expect(c.notification).toEqual(final.notification)
    expect(c.notification?.persistent).toBe(true)
    expect(c.running).toBe(false)
    store.trigger.openSettings()
    store.trigger.cancelSettings()
    expect(store.getSnapshot().context.local).toEqual(final.local)
    store.trigger.reset()
    const reset = store.getSnapshot().context
    expect(reset.round).toBe(1)
    expect(reset.local.score).toBe(0)
    expect(reset.opponent.score).toBe(0)
    expect(reset.local.move).toBeNull()
    expect(reset.notification).toBeNull()
    expect(reset.mode).toBe('rps')
    expect(reset.limit).toBe(1)
    store.trigger.cameraLoading({ startMatch: true })
    completeCameraStartup(store)
    completeMatch(store, stop)
    expect(store.getSnapshot().context.phase).toBe('countdown')
    expect(stop).toHaveBeenCalledOnce()
  },
)

test('an unfinished match keeps its camera running', () => {
  const store = makeGameStore()
  store.trigger.cameraReady()
  round(store, 'rock', 'scissors')
  const stop = vi.fn()
  completeMatch(store, stop)
  expect(stop).not.toHaveBeenCalled()
  expect(store.getSnapshot().context.running).toBe(true)
})

test('audio defaults to sounds and accepts only supported preference names', () => {
  expect(audioStore.getSnapshot().context.mode).toBe('sounds')
  expect(isAudioMode('loud')).toBe(false)
  for (const mode of ['sounds', 'off'] as const) {
    expect(isAudioMode(mode)).toBe(true)
    audioStore.trigger.choose({ mode })
    expect(audioStore.getSnapshot().context.mode).toBe(mode)
  }
})
