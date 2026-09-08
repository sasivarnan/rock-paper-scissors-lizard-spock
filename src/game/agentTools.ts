import { gameStore } from './store'
import { isMatchFinished } from './match'
import { computer } from './rules'
interface Tool {
  name: string
  description: string
  inputSchema: object
  annotations: { readOnlyHint: boolean }
  execute: (input: unknown) => unknown
}
interface ModelContext {
  registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void>
}
export function registerGameTools() {
  const context = (document as Document & { modelContext?: ModelContext }).modelContext
  if (!context?.registerTool) return
  const lifecycle = new AbortController()
  const read = () => {
    const c = gameStore.getSnapshot().context
    return {
      camera: c.camera,
      phase: c.phase,
      round: c.round,
      format: c.format,
      limit: c.limit,
      countdownSeconds: c.countdownSeconds,
      mode: c.mode,
      running: c.running,
      nextIn: c.nextIn,
      scores: { you: c.local.score, computer: c.opponent.score },
      gesture: c.gesture,
      stable: c.stable,
      outcome: c.outcome,
      explanation: c.explanation,
    }
  }
  const register = (
    name: string,
    description: string,
    readOnlyHint: boolean,
    action: () => unknown,
  ) => {
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name,
            description,
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: { readOnlyHint },
            execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object')
              return action()
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {})
    } catch {
      /* Optional browser capability. */
    }
  }
  register(
    'read_game',
    'Read the visible game status and score. Does not reveal the computer’s unrevealed move.',
    true,
    read,
  )
  register(
    'start_match',
    'Start or resume automatic webcam rounds: the selected countdown to pose, three seconds between rounds. Requires an enabled camera and unfinished match.',
    false,
    () => {
      const c = gameStore.getSnapshot().context
      if (
        c.rulesOpen ||
        c.settingsDraft !== null ||
        c.camera !== 'ready' ||
        c.running ||
        isMatchFinished(c)
      )
        throw new Error('Enable the camera and finish or reset the current round first.')
      gameStore.trigger.start({ opponentMove: computer.chooseMove(c.mode) })
      return read()
    },
  )
  return () => lifecycle.abort()
}
