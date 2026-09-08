import { Dialog } from './Dialog'
import { Button } from './Button'
import { useModal } from '../hooks/useModal'
import { useSelector } from '@xstate/store-react'
import { gameStore } from '../game/store'
import { gameModes, gestures, movesForMode, wins } from '../game/rules'

export function HelpDialog() {
  const state = useSelector(gameStore, (s) => s.context)
  const dialogRef = useModal(state.rulesOpen)
  const availableMoves = movesForMode(state.mode)
  const close = () => gameStore.trigger.closeRules()
  return (
    <Dialog
      ref={dialogRef}
      id="rules"
      wide
      aria-labelledby="help-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="help-title" className="font-display text-xl font-semibold tracking-tight">
          How to play
        </h2>
        <Button type="button" variant="close" aria-label="Close instructions" onClick={close}>
          ×
        </Button>
      </div>
      <ol className="my-5 grid list-none gap-3 p-0">
        <li className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-soft text-xs tabular-nums text-muted"
          >
            1
          </span>
          <p className="text-sm leading-relaxed text-muted">
            <strong className="font-medium text-ink">Start.</strong> Allow camera access. Keep one
            hand in view.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-soft text-xs tabular-nums text-muted"
          >
            2
          </span>
          <p className="text-sm leading-relaxed text-muted">
            <strong className="font-medium text-ink">Show your sign.</strong> Hold it until the{' '}
            {state.countdownSeconds}-second timer reaches zero.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-soft text-xs tabular-nums text-muted"
          >
            3
          </span>
          <p className="text-sm leading-relaxed text-muted">
            <strong className="font-medium text-ink">Play on.</strong> Rounds follow automatically.
            After the final result, the camera turns off and scores reset.
          </p>
        </li>
      </ol>
      <section className="mt-6" aria-labelledby="gesture-title">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="gesture-title" className="text-sm font-semibold">
            Your moves
          </h3>
          <span className="text-xs text-muted">{gameModes[state.mode].name}</span>
        </div>
        <div className="grid grid-cols-1">
          {availableMoves.map((move) => (
            <div className="flex items-center gap-3 border-b border-line/60 py-2.5" key={move}>
              <span aria-hidden="true" className="w-9 shrink-0 text-center text-2xl">
                {gestures[move].icon}
              </span>
              <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h4 className="text-sm font-medium capitalize">{move}</h4>
                <p className="leading-relaxed text-muted text-xs">{gestures[move].hint}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="leading-relaxed text-muted mt-3 text-xs">
          Either hand works. Use good light; prop up your phone.
          {state.mode === 'rpsls' && ' Show lizard slightly sideways.'}
        </p>
      </section>
      <details className="mt-5 rounded-xl border border-line px-4">
        <summary className="cursor-pointer py-3 text-sm font-medium select-none">
          Scoring & winning moves
        </summary>
        <div className="space-y-3 pb-4">
          <p className="text-sm leading-relaxed text-muted">
            A round win earns one point. Draws and missed signs earn none.{' '}
            {state.format === 'firstTo'
              ? `First to ${state.limit} point${state.limit === 1 ? '' : 's'} wins.`
              : `Most points after ${state.limit} round${state.limit === 1 ? '' : 's'} wins. Draws count as rounds; missed signs retry. Equal final scores mean a draw.`}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted">
            {availableMoves.map((move) => (
              <li key={move}>
                {Object.entries(wins[move])
                  .filter(([other]) => availableMoves.includes(other as typeof move))
                  .map(([, text]) => text)
                  .join('. ')}
                .
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-muted">
            The computer chooses before your sign is captured.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Turn game sounds on or off in Game settings.
          </p>
        </div>
      </details>
      <div className="mt-6 flex items-center justify-end gap-3 max-arena:flex-col-reverse max-arena:items-stretch">
        <span className="mr-auto text-xs text-muted max-arena:m-0 max-arena:text-center">
          Paused until you resume.
        </span>
        <Button type="button" variant="primary" className="max-arena:w-full" onClick={close}>
          Got it
        </Button>
      </div>
    </Dialog>
  )
}
