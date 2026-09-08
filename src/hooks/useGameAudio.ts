import { useEffect } from 'react'
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
  useEffect(initializeAudio, [])
  useEffect(() => {
    if (blocked || !running || camera !== 'ready') stopAudio()
  }, [blocked, running, camera])
  useEffect(() => {
    if (blocked || !running || phase !== 'countdown' || countdown === 0) return
    playAudio(countdown === countdownSeconds ? 'start' : 'tick')
  }, [blocked, running, phase, countdown, countdownSeconds])
  useEffect(() => {
    if (!notification) return
    playAudio(notification.kind)
  }, [notification])
}
