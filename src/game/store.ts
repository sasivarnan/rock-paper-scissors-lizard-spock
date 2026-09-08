import { createStore } from '@xstate/store-react'
import { resolveRound, movesForMode, type GameMode, type Move, type Outcome } from './rules.ts'
import { isMatchFinished, type MatchFormat } from './match.ts'
import { resultNotification, type GameNotification } from './notifications.ts'
export interface SettingsDraft {
  countdownSeconds: 3 | 5
  mode: GameMode
  format: MatchFormat
  limit: number
}
export interface GameContext {
  notification: GameNotification | null
  notificationId: number
  startWhenReady: boolean
  settingsDraft: SettingsDraft | null
  countdownSeconds: 3 | 5
  format: MatchFormat
  limit: number
  mode: GameMode
  running: boolean
  nextIn: number
  camera: 'off' | 'loading' | 'ready' | 'error'
  error: string
  phase: 'idle' | 'countdown' | 'result'
  countdown: number
  gesture: Move | null
  stable: boolean
  detectedAt: number
  local: { id: string; name: string; score: number; move: Move | null }
  opponent: { id: string; name: string; score: number; move: Move | null }
  outcome: Outcome | null
  explanation: string
  round: number
  rulesOpen: boolean
}
const initial: GameContext = {
  notification: null,
  notificationId: 0,
  startWhenReady: false,
  settingsDraft: null,
  countdownSeconds: 3,
  format: 'firstTo',
  limit: 5,
  mode: 'rpsls',
  running: false,
  nextIn: 3,
  camera: 'off',
  error: '',
  phase: 'idle',
  countdown: 3,
  gesture: null,
  stable: false,
  detectedAt: 0,
  local: { id: 'local', name: 'You', score: 0, move: null },
  opponent: { id: 'computer', name: 'Computer', score: 0, move: null },
  outcome: null,
  explanation: '',
  round: 1,
  rulesOpen: false,
}
function settingsFrom(context: GameContext): SettingsDraft {
  const { mode, format, limit, countdownSeconds } = context
  return { mode, format, limit, countdownSeconds }
}

function validSettings(settings: SettingsDraft) {
  return (
    [3, 5].includes(settings.countdownSeconds) &&
    ['rps', 'rpsls'].includes(settings.mode) &&
    ['firstTo', 'rounds'].includes(settings.format) &&
    Number.isInteger(settings.limit) &&
    settings.limit >= 1 &&
    settings.limit <= 20
  )
}

function pauseMatch(context: GameContext): GameContext {
  const interrupted = context.phase === 'countdown'
  return {
    ...context,
    startWhenReady: false,
    running: false,
    nextIn: 3,
    phase: interrupted ? 'idle' : context.phase,
    explanation: interrupted
      ? 'Paused. No points awarded for the interrupted round.'
      : context.explanation,
  }
}

function resetMatch(context: GameContext, settings = settingsFrom(context)): GameContext {
  return {
    ...initial,
    ...settings,
    camera: context.camera,
    error: context.error,
    rulesOpen: context.rulesOpen,
  }
}

export function makeGameStore() {
  return createStore({
    context: initial,
    on: {
      openSettings: (c) =>
        c.settingsDraft ? c : { ...pauseMatch(c), settingsDraft: settingsFrom(c) },
      editSettings: (c, e: { draft: SettingsDraft }) =>
        !c.settingsDraft || !validSettings(e.draft) ? c : { ...c, settingsDraft: { ...e.draft } },
      cancelSettings: (c) => ({ ...c, settingsDraft: null }),
      applySettings: (c) => (c.settingsDraft ? resetMatch(c, c.settingsDraft) : c),
      dismissNotification: (c, e: { id: number }) =>
        c.notification?.id === e.id ? { ...c, notification: null } : c,
      cameraLoading: (c, e: { startMatch?: boolean }) => ({
        ...c,
        camera: 'loading' as const,
        startWhenReady: e.startMatch === true,
        error: '',
      }),
      cameraReady: (c) => ({ ...c, camera: 'ready' as const, error: '' }),
      cameraOff: (c) => ({
        ...c,
        camera: 'off' as const,
        startWhenReady: false,
        running: false,
        phase: c.phase === 'countdown' ? ('idle' as const) : c.phase,
        gesture: null,
        stable: false,
      }),
      cameraError: (c, e: { message: string }) => ({
        ...c,
        camera: 'error' as const,
        startWhenReady: false,
        running: false,
        error: e.message,
        phase: c.phase === 'countdown' ? ('idle' as const) : c.phase,
        gesture: null,
        stable: false,
      }),
      detected: (c, e: { gesture: Move | null; stable: boolean; at: number }) => ({
        ...c,
        gesture: e.gesture,
        stable: e.stable,
        detectedAt: e.at,
      }),
      start: (c, e: { opponentMove: Move }) =>
        c.rulesOpen ||
        c.settingsDraft !== null ||
        c.camera !== 'ready' ||
        c.phase === 'countdown' ||
        isMatchFinished(c) ||
        !movesForMode(c.mode).includes(e.opponentMove)
          ? c
          : {
              ...c,
              phase: 'countdown' as const,
              startWhenReady: false,
              running: true,
              countdown: c.countdownSeconds,
              outcome: null,
              explanation: '',
              local: { ...c.local, move: null },
              opponent: { ...c.opponent, move: e.opponentMove },
            },
      tick: (c) =>
        !c.running
          ? c
          : c.phase === 'countdown'
            ? { ...c, countdown: Math.max(0, c.countdown - 1) }
            : { ...c, nextIn: Math.max(0, c.nextIn - 1) },
      pause: pauseMatch,
      capture: (c, e: { now: number }) => {
        if (c.phase !== 'countdown' || c.countdown !== 0) return c
        if (
          !c.stable ||
          !c.gesture ||
          !movesForMode(c.mode).includes(c.gesture) ||
          e.now - c.detectedAt > 500 ||
          !c.opponent.move
        )
          return {
            ...c,
            phase: 'idle' as const,
            nextIn: 3,
            notificationId: c.notificationId + 1,
            notification: {
              id: c.notificationId + 1,
              kind: 'retry' as const,
              persistent: false,
              title: 'No clear sign captured',
              description: 'No points awarded. Hold one valid sign steady for the next countdown.',
            },
            explanation:
              c.gesture && !movesForMode(c.mode).includes(c.gesture)
                ? 'Use rock, paper or scissors in Classic. No points awarded.'
                : 'No clear gesture captured. No points awarded. Get ready to retry.',
            opponent: { ...c.opponent, move: null },
          }
        const result = resolveRound(c.gesture, c.opponent.move)
        const next: GameContext = {
          ...c,
          ...result,
          phase: 'result',
          nextIn: 3,
          local: {
            ...c.local,
            move: c.gesture,
            score: c.local.score + (result.outcome === 'win' ? 1 : 0),
          },
          opponent: {
            ...c.opponent,
            score: c.opponent.score + (result.outcome === 'loss' ? 1 : 0),
          },
          round: c.round + 1,
        }
        return {
          ...next,
          running: !isMatchFinished(next),
          notificationId: c.notificationId + 1,
          notification: resultNotification(next, c.notificationId + 1),
        }
      },
      returnToStart: (c) => ({ ...initial, ...settingsFrom(c) }),
      reset: (c) => ({
        ...resetMatch(c),
        gesture: c.gesture,
        stable: c.stable,
        detectedAt: c.detectedAt,
      }),
      toggleRules: (c) =>
        c.rulesOpen ? { ...c, rulesOpen: false } : { ...pauseMatch(c), rulesOpen: true },
      closeRules: (c) => ({ ...c, rulesOpen: false }),
    },
  })
}
export const gameStore = makeGameStore()
