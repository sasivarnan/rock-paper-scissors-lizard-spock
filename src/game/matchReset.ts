import { isMatchFinished } from './match.ts'
import type { makeGameStore } from './store.ts'

export function scheduleMatchReset(
  store: ReturnType<typeof makeGameStore>,
  stopCamera: () => void,
) {
  const ready = () => {
    const state = store.getSnapshot().context
    return isMatchFinished(state) && !state.rulesOpen && !state.settingsDraft
  }
  if (!ready()) return
  const timer = setTimeout(() => {
    if (!ready()) return
    stopCamera()
    store.trigger.returnToStart()
  }, 6000)
  return () => clearTimeout(timer)
}
