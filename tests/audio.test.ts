import { test, expect, vi } from 'vitest'
import { audioStore, initializeAudio, playAudio, unlockAudio } from '../src/game/audio.ts'

test.each([null, 'voice', 'invalid', 'sounds', 'off'])(
  'sound preference loads %s and preserves explicit mute',
  (saved) => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => saved, setItem })
    vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
    const cleanup = initializeAudio()
    try {
      expect(audioStore.getSnapshot().context.mode).toBe(saved === 'off' ? 'off' : 'sounds')
      audioStore.trigger.choose({ mode: 'off' })
      expect(setItem).toHaveBeenLastCalledWith('show-of-hands-audio', 'off')
      audioStore.trigger.choose({ mode: 'sounds' })
      expect(setItem).toHaveBeenLastCalledWith('show-of-hands-audio', 'sounds')
    } finally {
      cleanup()
    }
  },
)

test('sound effects play after activation, stop on mute, and stay silent in background', () => {
  const stops = vi.fn()
  const starts = vi.fn()
  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    resume = vi.fn().mockResolvedValue(undefined)
    createOscillator() {
      return {
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: starts,
        stop: stops,
      }
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }
    }
  }
  const document = { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('document', document)
  vi.stubGlobal('window', { AudioContext: FakeAudioContext })
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  const cleanup = initializeAudio()
  try {
    unlockAudio()
    playAudio('win')
    expect(starts).toHaveBeenCalledTimes(3)
    stops.mockClear()
    audioStore.trigger.choose({ mode: 'off' })
    expect(stops).toHaveBeenCalledTimes(3)
    playAudio('start')
    expect(starts).toHaveBeenCalledTimes(3)
    audioStore.trigger.choose({ mode: 'sounds' })
    document.hidden = true
    playAudio('tick')
    expect(starts).toHaveBeenCalledTimes(3)
  } finally {
    cleanup()
  }
})
