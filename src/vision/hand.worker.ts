import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { classify, GestureStabilizer } from './classifier'
let detector: HandLandmarker | null = null
const stabilizer = new GestureStabilizer()
self.onmessage = async (event: MessageEvent) => {
  const data = event.data
  try {
    if (data.type === 'init') {
      const vision = await FilesetResolver.forVisionTasks(data.wasmUrl, true)
      detector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: data.modelUrl, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      })
      self.postMessage({ type: 'ready' })
    } else if (data.type === 'frame' && detector) {
      const result = detector.detectForVideo(data.frame, data.at)
      const gesture = result.worldLandmarks[0] ? classify(result.worldLandmarks[0]) : null
      self.postMessage({ type: 'result', at: data.at, ...stabilizer.update(gesture, data.at) })
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Hand tracking failed',
    })
  } finally {
    data.frame?.close()
  }
}
