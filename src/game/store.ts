import { createStore } from '@xstate/store-react'
import { resolveRound, type Move, type Outcome } from './rules.ts'
export interface GameContext {
  camera: 'off' | 'loading' | 'ready' | 'error'; error: string
  phase: 'idle' | 'countdown' | 'result'; countdown: number
  gesture: Move | null; stable: boolean; detectedAt: number
  local: { id: string; name: string; score: number; move: Move | null }
  opponent: { id: string; name: string; score: number; move: Move | null }
  outcome: Outcome | null; explanation: string; round: number; rulesOpen: boolean
}
const initial: GameContext = {
  camera: 'off', error: '', phase: 'idle', countdown: 3,
  gesture: null, stable: false, detectedAt: 0,
  local: { id: 'local', name: 'You', score: 0, move: null },
  opponent: { id: 'computer', name: 'Computer', score: 0, move: null },
  outcome: null, explanation: '', round: 1, rulesOpen: false,
}
export function makeGameStore() { return createStore({
  context: initial,
  on: {
    cameraLoading: (c) => ({ ...c, camera: 'loading' as const, error: '' }),
    cameraReady: (c) => ({ ...c, camera: 'ready' as const, error: '' }),
    cameraOff: (c) => ({ ...c, camera: 'off' as const, phase: c.phase === 'countdown' ? 'idle' as const : c.phase, gesture: null, stable: false }),
    cameraError: (c, e: { message: string }) => ({ ...c, camera: 'error' as const, error: e.message, phase: c.phase === 'countdown' ? 'idle' as const : c.phase, gesture: null, stable: false }),
    detected: (c, e: { gesture: Move | null; stable: boolean; at: number }) => ({ ...c, gesture: e.gesture, stable: e.stable, detectedAt: e.at }),
    start: (c, e: { opponentMove: Move }) => c.camera !== 'ready' || c.phase === 'countdown' || Math.max(c.local.score, c.opponent.score) >= 5 ? c : ({ ...c, phase: 'countdown' as const, countdown: 3, outcome: null, explanation: '', local: { ...c.local, move: null }, opponent: { ...c.opponent, move: e.opponentMove } }),
    tick: (c) => c.phase === 'countdown' ? { ...c, countdown: Math.max(0, c.countdown - 1) } : c,
    capture: (c, e: { now: number }) => {
      if (c.phase !== 'countdown' || c.countdown !== 0) return c
      if (!c.stable || !c.gesture || e.now - c.detectedAt > 500 || !c.opponent.move) return { ...c, phase: 'idle' as const, explanation: 'No clear gesture captured. Hold a pose and try again.', opponent: { ...c.opponent, move: null } }
      const result = resolveRound(c.gesture, c.opponent.move)
      return { ...c, ...result, phase: 'result' as const, local: { ...c.local, move: c.gesture, score: c.local.score + (result.outcome === 'win' ? 1 : 0) }, opponent: { ...c.opponent, score: c.opponent.score + (result.outcome === 'loss' ? 1 : 0) }, round: c.round + 1 }
    },
    reset: (c) => ({ ...initial, camera: c.camera, error: c.error, gesture: c.gesture, stable: c.stable, detectedAt: c.detectedAt, rulesOpen: c.rulesOpen }),
    toggleRules: (c) => ({ ...c, rulesOpen: !c.rulesOpen }),
  },
}) }
export const gameStore = makeGameStore()
