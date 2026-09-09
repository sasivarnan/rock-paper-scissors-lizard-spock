import type { makeGameStore } from './store'
import { defaultSettings, settingsFrom, validSettings, type GameSettings } from './settings'

const settingsKey = 'show-of-hands-game-settings'

export function readGameSettings(): GameSettings {
  const fallback = { ...defaultSettings }
  try {
    const mode = localStorage.getItem('show-of-hands-game-mode')
    if (mode === 'rps' || mode === 'rpsls') fallback.mode = mode
    let saved: unknown = JSON.parse(localStorage.getItem(settingsKey) ?? 'null')
    if (
      saved &&
      typeof saved === 'object' &&
      'countdownSeconds' in saved &&
      saved.countdownSeconds === 2
    )
      saved = { ...saved, countdownSeconds: 1 }
    if (validSettings(saved)) return settingsFrom(saved)
  } catch {
    // Fall back to defaults if storage is unavailable or malformed.
  }
  return fallback
}

export function persistGameSettings(store: ReturnType<typeof makeGameStore>) {
  let previous = settingsFrom(store.getSnapshot().context)
  const subscription = store.subscribe(({ context }) => {
    if (
      context.mode === previous.mode &&
      context.format === previous.format &&
      context.limit === previous.limit &&
      context.countdownSeconds === previous.countdownSeconds
    )
      return
    previous = settingsFrom(context)
    try {
      localStorage.setItem(settingsKey, JSON.stringify(previous))
    } catch {
      // Keep the choices for this session when storage is unavailable.
    }
  })
  return () => subscription.unsubscribe()
}
