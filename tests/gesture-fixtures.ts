import type { Point } from '../src/vision/classifier'

// Articulated synthetic hands: each finger has three fixed-length bones.
// These exercise anatomy variations; they are not recordings from MediaPipe.
export type FingerPose = { curl: [number, number, number]; spread?: number }
export const straight: FingerPose = { curl: [0, 0, 0] }
export const relaxed: FingerPose = { curl: [10, 22, 12] }
export const folded: FingerPose = { curl: [25, 95, 55] }
export const curved: FingerPose = { curl: [45, 50, 20] }

export function hand(
  fingers: FingerPose[],
  thumb: 'tucked' | 'open' | 'mouth' = 'tucked',
): Point[] {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  const thumbTip =
    thumb === 'open'
      ? { x: -1, y: 1, z: 0 }
      : thumb === 'mouth'
        ? { x: -0.35, y: 1.3, z: 0.8 }
        : { x: 0, y: 0.9, z: 0.2 }
  for (let i = 1; i <= 4; i++)
    points[i] = { x: (thumbTip.x * i) / 4, y: (thumbTip.y * i) / 4, z: (thumbTip.z * i) / 4 }
  const lengths = [1.35, 1.5, 1.4, 1.05]
  fingers.forEach((finger, k) => {
    const base = 5 + k * 4
    points[base] = { x: -0.5 + k / 3, y: 1, z: 0 }
    let curl = 0
    const spread = ((finger.spread ?? 0) * Math.PI) / 180
    for (let joint = 0; joint < 3; joint++) {
      curl += (finger.curl[joint] * Math.PI) / 180
      const length = lengths[k] * [0.45, 0.3, 0.25][joint]
      const previous = points[base + joint]
      points[base + joint + 1] = {
        x: previous.x + length * Math.cos(curl) * Math.sin(spread),
        y: previous.y + length * Math.cos(curl) * Math.cos(spread),
        z: previous.z + length * Math.sin(curl),
      }
    }
  })
  return points
}

export function transform(
  points: Point[],
  mirror: number,
  angle: number,
  scale: number,
  noise = 0,
) {
  return points.map((point, i) => {
    const x = point.x * mirror + Math.sin(i * 7) * noise
    const y = point.y + Math.cos(i * 11) * noise
    const z = point.z + Math.sin(i * 13) * noise
    const a = Math.cos(angle),
      b = Math.sin(angle)
    return {
      x: (x * a - y * b) * scale + 0.2,
      y: ((x * b + y * a) * a - z * b) * scale - 0.1,
      z: ((x * b + y * a) * b + z * a) * scale + 0.3,
    }
  })
}
