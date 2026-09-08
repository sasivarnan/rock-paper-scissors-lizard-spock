import { isMatchFinished } from './match.ts'
import { computer } from './rules.ts'
import type { makeGameStore } from './store.ts'

export function advanceRound(store: ReturnType<typeof makeGameStore>, now: number): boolean {
  const c = store.getSnapshot().context
  if (!c.running || c.camera !== 'ready' || isMatchFinished(c)) return false
  if (c.phase === 'countdown' && c.countdown === 0) {
    store.trigger.capture({ now })
    return true
  }
  if (c.phase !== 'countdown' && c.nextIn === 0) {
    store.trigger.start({ opponentMove: computer.chooseMove(c.mode) })
    return true
  }
  return false
}
