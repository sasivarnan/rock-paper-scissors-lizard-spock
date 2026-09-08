import { createStore } from '@xstate/store-react'

export type AudioMode = 'off' | 'sounds'
export type AudioCue = 'start' | 'tick' | 'win' | 'loss' | 'draw' | 'retry'
export const isAudioMode = (value: unknown): value is AudioMode =>
  value === 'off' || value === 'sounds'
export const audioStore = createStore({
  context: { mode: 'sounds' as AudioMode },
  on: { choose: (c, e: { mode: AudioMode }) => (isAudioMode(e.mode) ? { mode: e.mode } : c) },
})
const notes: Record<AudioCue, number[]> = {
  start: [440, 660],
  tick: [440],
  win: [523, 659, 784],
  loss: [392, 330, 262],
  draw: [440, 440],
  retry: [330, 392],
}

let context: AudioContext | undefined
const oscillators = new Set<OscillatorNode>()

export function stopAudio() {
  for (const oscillator of oscillators) oscillator.stop()
  oscillators.clear()
}

export function unlockAudio() {
  if (audioStore.getSnapshot().context.mode !== 'sounds' || !('AudioContext' in window)) return
  try {
    context ??= new AudioContext()
    void context.resume().catch(() => {})
  } catch {
    /* Audio is optional. */
  }
}

export function playAudio(cue: AudioCue) {
  const { mode } = audioStore.getSnapshot().context
  if (mode === 'off' || document.hidden) return
  const audio = context
  if (!audio || audio.state !== 'running') return
  notes[cue].forEach((frequency, index) => {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const time = audio.currentTime + index * 0.12
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.08, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillators.add(oscillator)
    oscillator.onended = () => {
      oscillators.delete(oscillator)
      oscillator.disconnect()
      gain.disconnect()
    }
    oscillator.start(time)
    oscillator.stop(time + 0.12)
  })
}

export function initializeAudio() {
  try {
    const saved = localStorage.getItem('show-of-hands-audio')
    audioStore.trigger.choose({ mode: isAudioMode(saved) ? saved : 'sounds' })
  } catch {
    /* Keep the session preference when storage is unavailable. */
  }
  const subscription = audioStore.subscribe(() => {
    stopAudio()
    try {
      localStorage.setItem('show-of-hands-audio', audioStore.getSnapshot().context.mode)
    } catch {
      /* Keep the session preference. */
    }
  })
  const onVisibility = () => {
    if (document.hidden) stopAudio()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    subscription.unsubscribe()
    document.removeEventListener('visibilitychange', onVisibility)
    stopAudio()
  }
}
