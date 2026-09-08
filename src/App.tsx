import { useEffect } from 'react'
import { useSelector } from '@xstate/store-react'
import { gameStore } from './game/store'
import { computer, gestures, moves, wins } from './game/rules'
import { useCamera } from './vision/useCamera'
import { registerGameTools } from './game/agentTools'
import './App.css'
function CameraIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg> }
function App() {
  useEffect(registerGameTools, [])
  const state = useSelector(gameStore, s => s.context)
  const { videoRef, start, stop } = useCamera()
  const { camera, phase, local, opponent, outcome, gesture, stable } = state
  const finished = Math.max(local.score, opponent.score) >= 5
  const active = camera === 'ready'
  useEffect(() => {
    if (phase !== 'countdown') return
    if (state.countdown === 0) { gameStore.trigger.capture({ now: performance.now() }); return }
    const timer = window.setTimeout(() => gameStore.trigger.tick(), 1000)
    return () => clearTimeout(timer)
  }, [phase, state.countdown])
  const title = finished ? local.score >= 5 ? 'The universe is yours.' : 'A worthy opponent.' : phase === 'result' ? outcome === 'win' ? 'You take this round.' : outcome === 'loss' ? 'The computer takes it.' : 'A meeting of minds.' : phase === 'countdown' ? 'Make your move.' : 'Your hands. Five possibilities.'
  function primary() {
    if (finished) { gameStore.trigger.reset(); return }
    if (!active) { void start(); return }
    gameStore.trigger.start({ opponentMove: computer.chooseMove() })
  }
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Fivefold home"><span className="brand-mark">✳</span> fivefold<span className="brand-period">.</span></a>
      <span className="mode"><span className="status-dot"/> VS COMPUTER</span>
      <button className="text-button rules-button" onClick={() => gameStore.trigger.toggleRules()} aria-expanded={state.rulesOpen} aria-controls="rules">How to play <span className="help-mark">?</span></button>
    </header>
    <main>
      <section className="intro">
        <div className="eyebrow">ROCK · PAPER · SCISSORS · LIZARD · SPOCK</div>
        <h1>{title}</h1>
        <p>{finished ? 'First to five. Play again for a fresh start.' : phase === 'result' ? state.explanation : 'A familiar game. Two extra twists. Play with your webcam.'}</p>
      </section>
      <section className="game" aria-label="Game arena">
        <div className="match-strip"><span><span className="small-dot"/> {finished ? 'MATCH COMPLETE' : `ROUND ${String(phase === 'result' ? state.round - 1 : state.round).padStart(2, '0')}`}</span><span>FIRST TO <strong>5</strong></span><button className="reset-button" onClick={() => gameStore.trigger.reset()} disabled={phase === 'countdown'}>↻ <span>Reset</span></button></div>
        <div className="arena">
          <article className={`player-panel local-panel ${phase === 'result' && outcome === 'win' ? 'winner' : ''}`}>
            <div className="panel-header"><div className="player-name"><span className="player-avatar">Y</span><div><h2>You</h2><span>{active ? 'Camera connected' : camera === 'loading' ? 'Connecting camera' : 'Your side of the arena'}</span></div></div><span className={`connection ${active ? 'connected' : ''}`}><span className="status-dot"/>{active ? 'LIVE' : 'LOCAL'}</span></div>
            <div className={`video-stage ${active ? 'live' : ''}`}>
              <video ref={videoRef} autoPlay playsInline muted className={camera === 'ready' || camera === 'loading' ? 'visible' : ''}/>
              <div className="viewfinder"><i/><i/><i/><i/></div>
              {!active && <div className="camera-placeholder"><span className="camera-icon"><CameraIcon/></span><h3>{camera === 'loading' ? 'Getting things ready…' : camera === 'error' ? 'Let’s reconnect.' : 'Step into the arena.'}</h3><p>{camera === 'loading' ? 'Allow camera access. Hand tracking will load next.' : camera === 'error' ? state.error : 'Enable your camera and let your hand do the talking.'}</p><span className="privacy-note">Video stays on your device</span></div>}
              {active && <span className={`gesture-chip ${stable ? 'recognized' : ''}`}>{gesture ? `${gestures[gesture].icon} ${gesture} · ${stable ? 'Ready' : 'Hold steady'}` : 'Show one hand inside the frame'}</span>}
              {phase === 'result' && local.move && <div className="move-reveal"><span>{gestures[local.move].icon}</span><strong>{local.move}</strong></div>}
              {active && <button className="camera-stop" onClick={stop} aria-label="Turn off camera"><CameraIcon/></button>}
            </div>
            <div className="panel-footer"><span>{phase === 'result' ? 'YOUR MOVE' : 'READY WHEN YOU ARE'}</span><div className="score-dots" aria-label={`Your score: ${local.score} out of 5`}>{Array.from({length:5},(_,i)=><i key={i} className={i < local.score ? 'filled' : ''}/>)}</div><strong>{local.score}<small> / 5</small></strong></div>
          </article>
          <div className="versus" aria-hidden="true">vs</div>
          <article className={`player-panel opponent-panel ${phase === 'result' && outcome === 'loss' ? 'winner' : ''}`}>
            <div className="panel-header"><div className="player-name"><span className="player-avatar computer-avatar">✳</span><div><h2>Computer</h2><span>Your unpredictable counterpart</span></div></div><span className="connection"><span className="status-dot"/> READY</span></div>
            <div className={`opponent-stage ${phase === 'countdown' ? 'thinking' : ''}`}>
              <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/>
              {phase === 'result' && opponent.move ? <div className="opponent-reveal"><span>{gestures[opponent.move].icon}</span><h3>{opponent.move}</h3></div> : <><div className="opponent-symbol">✳</div><h3>{phase === 'countdown' ? 'Move locked in.' : 'Challenge accepted.'}</h3><p>{phase === 'countdown' ? 'Your turn to make a little magic.' : 'Five moves. Endless possibilities.'}</p></>}
              <span className="opponent-caption">A LITTLE LUCK. A LITTLE LOGIC.</span>
            </div>
            <div className="panel-footer"><span>{phase === 'result' ? 'THEIR MOVE' : 'ALWAYS UP FOR A ROUND'}</span><div className="score-dots" aria-label={`Computer score: ${opponent.score} out of 5`}>{Array.from({length:5},(_,i)=><i key={i} className={i < opponent.score ? 'filled' : ''}/>)}</div><strong>{opponent.score}<small> / 5</small></strong></div>
          </article>
        </div>
        <div className="round-controls">
          <div className="round-message" role="status" aria-live="polite">{phase === 'countdown' ? <><span className="countdown">{state.countdown || 'Go!'}</span><span>Hold your gesture through the countdown</span></> : <><span className="instruction-number">{active ? '02' : '01'}</span><span>{state.explanation && phase === 'idle' ? state.explanation : active ? 'Choose your gesture. Start a round. Hold it steady.' : 'Camera on. Game face on.'}</span></>}</div>
          <button className="primary-button" onClick={primary} disabled={camera === 'loading' || phase === 'countdown'}>{!active && !finished && <CameraIcon/>}{finished ? 'Play again' : camera === 'loading' ? 'Connecting…' : phase === 'countdown' ? 'Get ready…' : !active ? camera === 'error' ? 'Retry camera' : 'Enable camera' : phase === 'result' ? 'Next round' : 'Start round'}<span>↗</span></button>
        </div>
      </section>
      <section className="gesture-guide" aria-label="Gesture guide"><div className="guide-heading"><h2>A little hand language.</h2><span>ONE HAND. FIVE MOVES.</span></div><div className="gesture-list">{moves.map((move,i)=><div className={`gesture-card ${active && gesture === move ? 'selected' : ''}`} key={move}><span className="gesture-icon" aria-hidden="true">{gestures[move].icon}</span><div><h3>{move}<span>0{i+1}</span></h3><p>{gestures[move].hint}</p></div></div>)}</div><p className="guide-note">Face your hand toward the camera in good light. For lizard, turn slightly sideways to show the mouth shape.</p></section>
      {state.rulesOpen && <section className="rules" id="rules"><div><h2>Every move beats two.</h2><p>Hold a clear gesture until the countdown ends. The first to five wins takes the match; draws don’t add points.</p><p>The computer chooses before your move is captured. A missed gesture simply retries the round.</p></div><ul>{moves.map(move => <li key={move}><span aria-hidden="true">{gestures[move].icon}</span><span>{Object.values(wins[move]).join('. ')}.</span></li>)}</ul></section>}
    </main>
    <footer><span>FIVE MOVES. FAIR GAME.</span><span><span className="small-dot"/> On-device hand tracking · Powered by MediaPipe</span></footer>
  </div>
}
export default App
