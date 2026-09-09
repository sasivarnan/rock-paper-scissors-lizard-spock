import { Dialog } from './Dialog'
import { Button } from './Button'
import { AudioControl } from './AudioControl'
import { unlockAudio } from '../game/audio'
import { AppearanceControl } from './AppearanceControl'
import { useModal } from '../hooks/useModal'
import { useSelector } from '@xstate/store-react'
import { gameStore, type SettingsDraft } from '../game/store'
import { computer, gameModes } from '../game/rules'
import type { MatchFormat } from '../game/match'

export function SettingsDialog() {
  const draft = useSelector(gameStore, (s) => s.context.settingsDraft)
  const dialogRef = useModal(draft !== null)
  const updateDraft = (changes: Partial<SettingsDraft>) => {
    if (draft) gameStore.trigger.editSettings({ draft: { ...draft, ...changes } })
  }
  const cancel = () => gameStore.trigger.cancelSettings()
  return (
    <Dialog
      ref={dialogRef}
      aria-labelledby="settings-title"
      aria-describedby="settings-description"
      onCancel={(event) => {
        event.preventDefault()
        cancel()
      }}
    >
      {draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            unlockAudio()
            gameStore.trigger.applySettings()
            const c = gameStore.getSnapshot().context
            if (c.camera === 'ready')
              gameStore.trigger.start({ opponentMove: computer.chooseMove(c.mode) })
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="settings-title" className="font-display text-xl font-semibold tracking-tight">
              Game settings
            </h2>
            <Button
              type="button"
              variant="close"
              aria-label="Cancel settings and close"
              onClick={cancel}
            >
              ×
            </Button>
          </div>
          <p id="settings-description" className="text-sm leading-relaxed text-muted">
            Your game, your pace.
          </p>
          <div className="mt-5 border-b border-line pb-4">
            <AppearanceControl />
            <p className="leading-relaxed text-muted mt-1 text-xs">Appearance saves immediately.</p>
          </div>
          <AudioControl />
          <fieldset className="my-5 grid gap-2 border-0 p-0">
            <legend className="mb-3 text-sm font-medium">Choose your game</legend>
            {(['rps', 'rpsls'] as const).map((mode) => (
              <label
                key={mode}
                data-selected={draft.mode === mode}
                className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-line p-3 hover:bg-soft data-[selected=true]:border-accent/50 data-[selected=true]:bg-accent-soft"
              >
                <input
                  type="radio"
                  name="game-mode"
                  value={mode}
                  checked={draft.mode === mode}
                  onChange={() => updateDraft({ mode })}
                  className="size-4 shrink-0 accent-accent"
                />
                <span>
                  <strong className="block text-sm font-medium">{gameModes[mode].name}</strong>
                  <small className="block text-sm mt-1 leading-snug text-muted">
                    {gameModes[mode].description}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
              Match format
              <select
                value={draft.format}
                onChange={(event) => updateDraft({ format: event.target.value as MatchFormat })}
                className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base font-normal text-ink"
              >
                <option value="firstTo">First to win</option>
                <option value="rounds">Fixed rounds</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
              {draft.format === 'firstTo' ? 'Points to win' : 'Number of rounds'}
              <select
                value={draft.limit}
                onChange={(event) => updateDraft({ limit: Number(event.target.value) })}
                className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base font-normal text-ink"
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            {draft.format === 'firstTo'
              ? `First player to ${draft.limit} point${draft.limit === 1 ? '' : 's'} wins. Draws award no points.`
              : `Most points after ${draft.limit} round${draft.limit === 1 ? '' : 's'} wins. Draws count as rounds; missed gestures retry.`}
          </p>
          <fieldset className="mt-5 border-0 p-0">
            <legend className="mb-3 text-sm font-medium">Time to make your move</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  [1, 'Fast'],
                  [3, 'Standard'],
                  [5, 'Relaxed'],
                ] as const
              ).map(([seconds, label]) => (
                <label
                  key={seconds}
                  data-selected={draft.countdownSeconds === seconds}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-line p-3 text-center hover:bg-soft data-[selected=true]:border-accent/50 data-[selected=true]:bg-accent-soft"
                >
                  <input
                    type="radio"
                    name="move-timer"
                    value={seconds}
                    checked={draft.countdownSeconds === seconds}
                    onChange={() => updateDraft({ countdownSeconds: seconds })}
                    className="size-4 shrink-0 accent-accent"
                  />
                  <span>
                    <strong className="block text-sm font-medium">
                      {seconds} second{seconds === 1 ? '' : 's'}
                    </strong>
                    <span className="text-xs text-muted">{label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="leading-relaxed text-muted mt-5 rounded-xl bg-soft p-3 text-xs">
            Apply saves these settings and starts a fresh match. Cancel keeps your match paused.
          </p>
          <div className="mt-6 flex items-center justify-end gap-3 max-arena:flex-col-reverse max-arena:items-stretch">
            <Button type="button" variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button variant="primary" className="max-arena:w-full" type="submit">
              Apply & restart match
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
