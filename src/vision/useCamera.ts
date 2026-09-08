import { useCallback, useEffect, useRef } from 'react'
import { gameStore } from '../game/store'
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cleanupRef = useRef<() => void>(() => {})
  const generation = useRef(0)
  const stop = useCallback(() => {
    generation.current++
    cleanupRef.current()
    cleanupRef.current = () => {}
    if (videoRef.current) videoRef.current.srcObject = null
    gameStore.trigger.cameraOff()
  }, [])
  const start = useCallback(async () => {
    stop()
    const run = generation.current
    gameStore.trigger.cameraLoading()
    let stream: MediaStream | null = null
    let worker: Worker | null = null
    let timer = 0
    let startup = 0
    let busy = false
    let ended = false
    const current = () => generation.current === run && !ended
    const cleanup = () => { ended = true; clearInterval(timer); clearTimeout(startup); worker?.terminate(); stream?.getTracks().forEach(t => t.stop()) }
    cleanupRef.current = cleanup
    const fail = (message: string) => { if (!current()) return; cleanup(); gameStore.trigger.cameraError({ message }) }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost and a supported browser.')
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      if (!current()) { stream.getTracks().forEach(t => t.stop()); return }
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      if (!current()) return
      stream.getVideoTracks()[0].onended = () => fail('Camera disconnected. Reconnect it and try again.')
      worker = new Worker(new URL('./hand.worker.ts', import.meta.url), { type: 'module' })
      worker.onerror = () => fail('Hand tracking could not start. Try a current Chrome or Edge browser.')
      startup = window.setTimeout(() => fail('Hand tracking took too long to load. Check your connection and retry.'), 30000)
      worker.onmessage = (event) => {
        if (!current()) return
        if (event.data.type === 'ready') {
          clearTimeout(startup)
          gameStore.trigger.cameraReady()
          timer = window.setInterval(async () => {
            if (busy || video.readyState < 2 || document.hidden || !current()) return
            busy = true
            try {
              const frame = await createImageBitmap(video)
              if (!current()) { frame.close(); return }
              worker!.postMessage({ type: 'frame', frame, at: performance.now() }, [frame])
            } catch { busy = false; fail('Could not read the camera. Please reconnect and retry.') }
          }, 80)
        } else if (event.data.type === 'result') {
          busy = false
          gameStore.trigger.detected({ gesture: event.data.gesture, stable: event.data.stable, at: event.data.at })
        } else if (event.data.type === 'error') fail('Hand tracking failed to load. Check your connection and try again.')
      }
      worker.postMessage({ type: 'init', wasmUrl: new URL('/mediapipe/wasm/', location.href).href, modelUrl: new URL('/mediapipe/hand_landmarker.task', location.href).href })
    } catch (error) {
      fail(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow access in your browser, then retry.' : error instanceof DOMException && error.name === 'NotFoundError' ? 'No camera found. Connect a webcam and retry.' : error instanceof DOMException && error.name === 'NotReadableError' ? 'Your camera is busy. Close other camera apps and retry.' : error instanceof Error ? error.message : 'Could not start the camera.')
    }
  }, [stop])
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { document.removeEventListener('visibilitychange', onVisibility); stop() }
  }, [stop])
  return { videoRef, start, stop }
}
