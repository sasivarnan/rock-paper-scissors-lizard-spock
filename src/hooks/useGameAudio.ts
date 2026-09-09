import { useEffect } from 'react'
import { isMatchFinished } from '../game/match'
import { initializeAudio, playAudio, stopAudio } from '../game/audio'
import type { GameContext } from '../game/store'

export function useGameAudio(state: GameContext) {
  const {
    camera,
    phase,
    running,
    countdown,
    countdownSeconds,
    notification,
    rulesOpen,
    settingsDraft,
  } = state
  const blocked = rulesOpen || settingsDraft !== null
  const cameraUnavailable = camera !== 'ready' && !isMatchFinished(state)
  useEffect(initializeAudio, [])
  useEffect(() => {
    if (blocked || !running || cameraUnavailable) stopAudio()
  }, [blocked, running, cameraUnavailable])
  useEffect(() => {
    if (blocked || !running || phase !== 'countdown' || countdown === 0) return
    playAudio(countdown === countdownSeconds ? 'start' : 'tick')
  }, [blocked, running, phase, countdown, countdownSeconds])
  useEffect(() => {
    if (!notification) return
    playAudio(notification.kind)
  }, [notification])
}
