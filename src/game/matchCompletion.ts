import { isMatchFinished } from './match.ts'
import type { makeGameStore } from './store.ts'

export function completeMatch(store: ReturnType<typeof makeGameStore>, stopCamera: () => void) {
  const state = store.getSnapshot().context
  if (isMatchFinished(state) && state.camera !== 'off') stopCamera()
}
