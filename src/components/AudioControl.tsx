import { Toggle } from './Toggle'
import { useSelector } from '@xstate/store-react'
import { audioStore, unlockAudio } from '../game/audio'

export function AudioControl() {
  const enabled = useSelector(audioStore, (s) => s.context.mode === 'sounds')
  return (
    <div className="mt-5 border-b border-line pb-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>Sounds</span>
        <Toggle
          label="Game sounds"
          checked={enabled}
          onChange={() => {
            audioStore.trigger.choose({ mode: enabled ? 'off' : 'sounds' })
            unlockAudio()
          }}
        />
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Countdown and result sounds. Saved immediately.
      </p>
    </div>
  )
}
