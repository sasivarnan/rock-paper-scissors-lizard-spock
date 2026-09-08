import { Button } from './components/Button'
import { AppearanceControl } from './components/AppearanceControl'
import { initializeAppearance } from './game/appearance'
import { useGameAudio } from './hooks/useGameAudio'
import { unlockAudio } from './game/audio'
import { useEffect, useRef } from 'react'
import { useSelector } from '@xstate/store-react'
import { gameStore } from './game/store'
import { isMatchFinished, matchOutcome } from './game/match'
import { HelpDialog } from './components/HelpDialog'
import { GameToast } from './components/GameToast'
import { SettingsDialog } from './components/SettingsDialog'
import { Confetti } from './components/Confetti'
import { advanceRound } from './game/roundFlow'
import { scheduleMatchReset } from './game/matchReset'
import { computer, gameModes, gestures, movesForMode } from './game/rules'
import { useCamera } from './vision/useCamera'
import { registerGameTools } from './game/agentTools'
function CameraIcon({ className = 'size-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  )
}
function App() {
  const controlsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const update = () =>
      document.documentElement.style.setProperty(
        '--controls-height',
        `${controls.getBoundingClientRect().height}px`,
      )
    update()
    const observer = new ResizeObserver(update)
    observer.observe(controls)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--controls-height')
    }
  }, [])
  useEffect(registerGameTools, [])
  useEffect(initializeAppearance, [])
  const state = useSelector(gameStore, (s) => s.context)
  const { videoRef, start, stop } = useCamera()
  const { camera, phase, local, opponent, outcome, gesture, stable } = state
  const finished = isMatchFinished(state)
  const matchResult = matchOutcome(state)
  useGameAudio(state)
  useEffect(() => {
    return scheduleMatchReset(gameStore, stop)
  }, [finished, state.rulesOpen, state.settingsDraft, stop])
  const matchLabel =
    state.format === 'firstTo'
      ? `First to ${state.limit}`
      : `${state.limit} round${state.limit === 1 ? '' : 's'}`
  const active = camera === 'ready'
  const availableMoves = movesForMode(state.mode)
  const allowedGesture = gesture !== null && availableMoves.includes(gesture)
  useEffect(() => {
    if (!state.running || !active || finished) return
    if (advanceRound(gameStore, performance.now())) return
    const timer = window.setTimeout(() => gameStore.trigger.tick(), 1000)
    return () => clearTimeout(timer)
  }, [phase, state.countdown, state.nextIn, state.running, state.mode, active, finished])
  const roundNumber = phase === 'result' ? state.round - 1 : state.round
  const canResume = phase === 'result' || state.round > 1
  const primaryLabel = finished
    ? 'Play again'
    : camera === 'loading'
      ? 'Connecting…'
      : state.running
        ? 'Pause'
        : camera === 'error'
          ? 'Retry'
          : canResume
            ? 'Resume'
            : 'Start match'

  function primary() {
    unlockAudio()
    if (finished) gameStore.trigger.reset()
    if (!active) {
      void start(true)
    } else if (state.running) {
      gameStore.trigger.pause()
    } else {
      gameStore.trigger.start({ opponentMove: computer.chooseMove(state.mode) })
    }
  }
  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-5 arena:px-10 pt-[env(safe-area-inset-top,0px)] max-arena:pr-[max(16px,env(safe-area-inset-right,0px))] max-arena:pl-[max(16px,env(safe-area-inset-left,0px))] max-arena:pb-[calc(148px+env(safe-area-inset-bottom,0px))]">
      <GameToast />
      <SettingsDialog />
      <HelpDialog />
      {finished && matchResult === 'win' && <Confetti />}
      <header className="flex min-h-20 items-center justify-between gap-4 arena:min-h-24">
        <h1 className="whitespace-nowrap font-display text-xl font-bold tracking-tight arena:text-2xl">
          show of hands<span className="text-accent">.</span>
        </h1>
        <div className="flex items-center gap-3 arena:gap-6">
          <Button
            variant="text"
            onClick={() => gameStore.trigger.toggleRules()}
            aria-haspopup="dialog"
            aria-controls="rules"
          >
            How to play
          </Button>
          <AppearanceControl compact />
        </div>
      </header>
      <main className="flex flex-1 items-start py-6 arena:items-center arena:py-12">
        <section className="w-full" aria-label="Game arena">
          <div className="mb-4 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
            <div
              className="col-start-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-muted"
              aria-label="Current game"
            >
              <span className="font-medium text-ink">{gameModes[state.mode].name}</span>
              <span aria-hidden="true">·</span>
              <span>
                {finished
                  ? 'Match complete'
                  : `Round ${roundNumber}${state.format === 'rounds' ? ` / ${state.limit}` : ''}`}
              </span>
              <small className="basis-full text-xs text-muted">{matchLabel}</small>
            </div>
            <button
              className="col-start-3 grid size-11 place-items-center rounded-xl bg-transparent text-muted hover:bg-soft hover:text-ink"
              aria-haspopup="dialog"
              aria-label={state.running ? 'Pause and open game settings' : 'Open game settings'}
              title="Game settings"
              onClick={() => gameStore.trigger.openSettings()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden="true"
                className="size-5"
              >
                <path d="M4 7h5m4 0h7M4 17h9m4 0h3" />
                <circle cx="11" cy="7" r="2" />
                <circle cx="15" cy="17" r="2" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 arena:grid-cols-2 arena:gap-5">
            <article
              data-winner={phase === 'result' && outcome === 'win'}
              className="group/player overflow-hidden rounded-2xl border border-line bg-surface data-[winner=true]:border-accent/50 data-[winner=true]:animate-[winner-pulse_700ms_ease-out]"
            >
              <div className="flex h-14 items-center justify-between gap-3 px-4 arena:h-16 arena:px-5">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  You
                  {active && (
                    <span className="size-1.5 rounded-full bg-accent" aria-label="Camera on" />
                  )}
                </h2>
                <strong
                  className="font-display text-2xl font-semibold tabular-nums group-data-[winner=true]/player:text-accent group-data-[winner=true]/player:animate-[score-pop_450ms_ease-out]"
                  aria-label={`Your score: ${local.score}`}
                >
                  {local.score}
                </strong>
              </div>
              <div className="relative m-1.5 mt-0 overflow-hidden rounded-xl bg-soft grid place-items-center h-[clamp(260px,47svh,470px)] arena:h-80">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={
                    'absolute inset-0 size-full object-contain -scale-x-100 ' +
                    (camera === 'ready' || camera === 'loading' ? 'opacity-100' : 'opacity-0')
                  }
                />
                {!active && (
                  <div className="relative flex max-w-80 flex-col items-center gap-3 p-6 text-center">
                    <CameraIcon className="size-7 text-muted" />
                    <h3 className="text-sm font-medium text-muted">
                      {camera === 'loading'
                        ? 'Connecting…'
                        : camera === 'error'
                          ? 'Camera unavailable'
                          : 'Your camera'}
                    </h3>
                    <p className="max-w-64 text-sm leading-relaxed text-muted">
                      {camera === 'loading'
                        ? 'Allow camera access to continue.'
                        : camera === 'error'
                          ? state.error
                          : 'Start the match to turn it on.'}
                    </p>
                  </div>
                )}
                {phase === 'result' && local.move && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-center text-white [text-shadow:0_2px_12px_#0008]">
                    <span className="text-6xl">{gestures[local.move].icon}</span>
                    <h3 className="mt-3 text-base font-medium capitalize">{local.move}</h3>
                  </div>
                )}
                {active && phase !== 'result' && (
                  <div
                    className={
                      'pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-5rem)] items-center gap-3 rounded-xl bg-zinc-950/85 text-sm text-white ' +
                      (phase === 'countdown' ? 'px-4 py-3' : 'px-3 py-2.5')
                    }
                  >
                    {phase === 'countdown' ? (
                      <>
                        <strong
                          className="min-w-8 text-center font-display text-4xl leading-none font-semibold tabular-nums text-blue-300"
                          role="timer"
                          aria-live="off"
                          aria-label={`${state.countdown} seconds until capture`}
                        >
                          {state.countdown || 'Go!'}
                        </strong>
                        <span>
                          <b className="block text-sm font-semibold">
                            {stable && allowedGesture ? 'Hold your sign' : 'Show your sign'}
                          </b>
                          <small className="block mt-0.5 text-xs text-zinc-300 capitalize">
                            {gesture && allowedGesture
                              ? `${gesture} ${stable ? '✓' : '· hold steady'}`
                              : 'Capture at zero'}
                          </small>
                        </span>
                      </>
                    ) : (
                      <span>
                        {state.running
                          ? 'Next round shortly'
                          : gesture && allowedGesture
                            ? `${gestures[gesture].icon} ${gesture}${stable ? ' ✓' : ''}`
                            : 'Show one hand'}
                      </span>
                    )}
                  </div>
                )}
                {active && (
                  <button
                    className="absolute right-2 bottom-2 z-10 grid size-11 place-items-center rounded-full bg-zinc-950/70 text-white hover:bg-zinc-950"
                    onClick={stop}
                    aria-label="Turn off camera"
                  >
                    <CameraIcon className="size-4" />
                  </button>
                )}
              </div>
            </article>
            <article
              data-winner={phase === 'result' && outcome === 'loss'}
              className="group/player overflow-hidden rounded-2xl border border-line bg-surface max-arena:grid max-arena:min-h-16 max-arena:grid-cols-[1fr_auto] max-arena:items-center max-arena:gap-0 max-arena:px-4 data-[winner=true]:border-accent/50 data-[winner=true]:animate-[winner-pulse_700ms_ease-out]"
            >
              <div className="flex h-14 items-center justify-between gap-3 px-4 arena:h-16 arena:px-5 max-arena:h-auto max-arena:justify-start max-arena:gap-3 max-arena:px-0 max-arena:py-3">
                <h2 className="flex items-center gap-2 text-sm font-medium">Computer</h2>
                <strong
                  className="font-display text-2xl font-semibold tabular-nums group-data-[winner=true]/player:text-accent group-data-[winner=true]/player:animate-[score-pop_450ms_ease-out]"
                  aria-label={`Computer score: ${opponent.score}`}
                >
                  {opponent.score}
                </strong>
              </div>
              <div className="relative m-1.5 mt-0 overflow-hidden rounded-xl bg-soft arena:h-80 flex flex-col items-center justify-center max-arena:m-0 max-arena:min-h-0 max-arena:overflow-visible max-arena:bg-transparent max-arena:py-2">
                {phase === 'result' && opponent.move ? (
                  <div className="relative text-center max-arena:flex max-arena:items-center max-arena:gap-2">
                    <span className="text-6xl max-arena:text-2xl">
                      {gestures[opponent.move].icon}
                    </span>
                    <h3 className="mt-3 text-base font-medium capitalize max-arena:m-0 max-arena:text-sm">
                      {opponent.move}
                    </h3>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-muted max-arena:flex-row max-arena:gap-2">
                    <span aria-hidden="true" className="text-4xl leading-none max-arena:hidden">
                      {phase === 'countdown' ? '?' : '—'}
                    </span>
                    <h3 className="text-sm font-normal">
                      {phase === 'countdown'
                        ? 'Move locked'
                        : state.running
                          ? 'Next round shortly'
                          : 'Ready'}
                    </h3>
                  </div>
                )}
              </div>
            </article>
          </div>
          <div
            ref={controlsRef}
            className="flex flex-col items-center justify-center gap-3 arena:flex-row arena:gap-4 arena:pt-7 max-arena:fixed max-arena:inset-x-0 max-arena:bottom-0 max-arena:z-20 max-arena:border-t max-arena:border-line max-arena:bg-canvas/95 max-arena:px-5 max-arena:pt-3 max-arena:backdrop-blur-md max-arena:pb-[calc(14px+env(safe-area-inset-bottom,0px))]"
          >
            <div
              className="flex w-full items-center justify-between gap-3 text-xs text-muted arena:hidden"
              aria-label={`Score: you ${local.score}, computer ${opponent.score}`}
            >
              <span>
                You{' '}
                <strong className="ml-1 text-lg font-medium tabular-nums text-ink">
                  {local.score}
                </strong>
              </span>
              <span className="text-xs">{finished ? 'Final' : `Round ${roundNumber}`}</span>
              <span>
                Computer{' '}
                <strong className="ml-1 text-lg font-medium tabular-nums text-ink">
                  {opponent.score}
                </strong>
              </span>
            </div>
            <Button
              variant="primary"
              className="max-arena:w-full"
              onClick={primary}
              disabled={camera === 'loading'}
            >
              {primaryLabel}
            </Button>
            {!state.running && state.round > 1 && !finished && (
              <Button
                variant="secondary"
                className="max-arena:min-h-8 max-arena:py-1"
                onClick={() => gameStore.trigger.reset()}
              >
                Reset match
              </Button>
            )}
          </div>
        </section>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-3 py-6 text-xs text-muted">
        <span>
          By{' '}
          <a
            href="https://sasivarnan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-line underline-offset-4 hover:text-ink hover:decoration-muted"
          >
            Sasivarnan R ↗
          </a>
        </span>
        <span>Video stays on your device · MediaPipe</span>
      </footer>
    </div>
  )
}
export default App
