import { expect, test, vi } from 'vitest'
import { persistGameSettings, readGameSettings } from '../src/game/preferences'
import { makeGameStore } from '../src/game/store'
import { defaultSettings, settingsFrom } from '../src/game/settings'

const key = 'show-of-hands-game-settings'
const choice = { mode: 'rps', format: 'rounds', limit: 12, countdownSeconds: 1 } as const

function storage(saved: string | null = null, legacy: string | null = null) {
  const values = new Map([
    [key, saved],
    ['show-of-hands-game-mode', legacy],
  ])
  const setItem = vi.fn((key: string, value: string) => values.set(key, value))
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key), setItem })
  return setItem
}

test('all applied settings restore on a new visit without restoring the match', () => {
  const setItem = storage()
  const store = makeGameStore()
  const cleanup = persistGameSettings(store)
  try {
    store.trigger.openSettings()
    store.trigger.editSettings({ draft: choice })
    store.trigger.cancelSettings()
    expect(setItem).not.toHaveBeenCalled()
    store.trigger.openSettings()
    store.trigger.editSettings({ draft: choice })
    store.trigger.applySettings()
    expect(JSON.parse(setItem.mock.calls[0][1])).toEqual(choice)
    store.trigger.detected({ gesture: 'paper', stable: true, at: 100 })
    store.trigger.reset()
    expect(setItem).toHaveBeenCalledTimes(1)
    const next = makeGameStore(readGameSettings()).getSnapshot().context
    expect(settingsFrom(next)).toEqual(choice)
    expect(next.countdown).toBe(1)
    expect(next.camera).toBe('off')
    expect(next.running).toBe(false)
    expect(next.local.score).toBe(0)
    expect(next.notification).toBeNull()
  } finally {
    cleanup()
  }
})

test.each([{ mode: 'rps' }, { format: 'rounds' }, { limit: 20 }, { countdownSeconds: 5 }] as const)(
  'saves an independent setting change: %j',
  (change) => {
    const setItem = storage()
    const store = makeGameStore()
    const cleanup = persistGameSettings(store)
    try {
      store.trigger.openSettings()
      store.trigger.editSettings({ draft: { ...defaultSettings, ...change } })
      store.trigger.applySettings()
      expect(setItem).toHaveBeenCalledOnce()
      expect(readGameSettings()).toEqual({ ...defaultSettings, ...change })
    } finally {
      cleanup()
    }
  },
)

test.each(['rps', 'rpsls', 'invalid', null])('migrates legacy mode %s', (mode) => {
  storage(null, mode)
  expect(readGameSettings()).toEqual({ ...defaultSettings, mode: mode === 'rps' ? 'rps' : 'rpsls' })
})

test.each([
  null,
  '{broken',
  'null',
  '[]',
  '{}',
  JSON.stringify({ ...choice, countdownSeconds: 4 }),
  JSON.stringify({ ...choice, countdownSeconds: 2, limit: 0 }),
  JSON.stringify({ ...choice, limit: 0 }),
  JSON.stringify({ ...choice, limit: 21 }),
  JSON.stringify({ ...choice, limit: 1.5 }),
  JSON.stringify({ ...choice, format: 'invalid' }),
  JSON.stringify({ ...choice, mode: 'invalid' }),
])('invalid saved settings %s fall back safely', (saved) => {
  storage(saved)
  expect(readGameSettings()).toEqual(defaultSettings)
})

test('new settings override legacy mode and ignore unrelated saved state', () => {
  storage(JSON.stringify({ ...choice, local: { score: 99 }, running: true }), 'rpsls')
  expect(readGameSettings()).toEqual(choice)
})

test('unavailable storage does not block applying settings', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  })
  expect(readGameSettings()).toEqual(defaultSettings)
  const store = makeGameStore()
  const cleanup = persistGameSettings(store)
  try {
    store.trigger.openSettings()
    store.trigger.editSettings({ draft: choice })
    expect(() => store.trigger.applySettings()).not.toThrow()
    expect(settingsFrom(store.getSnapshot().context)).toEqual(choice)
  } finally {
    cleanup()
  }
})

test('saved two-second pace becomes one second while preserving other settings', () => {
  storage(JSON.stringify({ ...choice, countdownSeconds: 2 }))
  expect(readGameSettings()).toEqual(choice)
  expect(makeGameStore(readGameSettings()).getSnapshot().context.countdown).toBe(1)
})
