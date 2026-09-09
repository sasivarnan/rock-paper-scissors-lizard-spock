import type { GameMode } from './rules'
import type { MatchFormat } from './match'

export interface GameSettings {
  countdownSeconds: 1 | 3 | 5
  mode: GameMode
  format: MatchFormat
  limit: number
}

export const defaultSettings: GameSettings = {
  countdownSeconds: 3,
  mode: 'rpsls',
  format: 'firstTo',
  limit: 5,
}

export function settingsFrom({
  mode,
  format,
  limit,
  countdownSeconds,
}: GameSettings): GameSettings {
  return { mode, format, limit, countdownSeconds }
}

export function validSettings(value: unknown): value is GameSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Partial<GameSettings>
  return (
    (settings.countdownSeconds === 1 ||
      settings.countdownSeconds === 3 ||
      settings.countdownSeconds === 5) &&
    (settings.mode === 'rps' || settings.mode === 'rpsls') &&
    (settings.format === 'firstTo' || settings.format === 'rounds') &&
    typeof settings.limit === 'number' &&
    Number.isInteger(settings.limit) &&
    settings.limit >= 1 &&
    settings.limit <= 20
  )
}
