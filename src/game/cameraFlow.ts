import { computer } from './rules.ts'
import type { makeGameStore } from './store.ts'

export function completeCameraStartup(store: ReturnType<typeof makeGameStore>) {
  // Ignore a late readiness notification after cancellation or failure.
  if (store.getSnapshot().context.camera !== 'loading') return
  store.trigger.cameraReady()
  const c = store.getSnapshot().context
  if (c.startWhenReady) store.trigger.start({ opponentMove: computer.chooseMove(c.mode) })
}
