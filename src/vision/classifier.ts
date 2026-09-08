import type { Move } from '../game/rules'
export interface Point { x: number; y: number; z: number }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
function angle(a: Point, b: Point, c: Point) {
  const u = [a.x-b.x, a.y-b.y, a.z-b.z], v = [c.x-b.x, c.y-b.y, c.z-b.z]
  return Math.acos(Math.max(-1, Math.min(1, u.reduce((s, x, i) => s + x*v[i], 0) / (Math.hypot(...u)*Math.hypot(...v) || 1)))) * 180 / Math.PI
}
// World coordinates make these ratios independent of video aspect ratio and mirroring.
export function classify(points: Point[]): Move | null {
  if (points.length !== 21 || points.some(p => !Number.isFinite(p.x+p.y+p.z))) return null
  const scale = distance(points[5], points[17])
  if (scale < .0001) return null
  const bends = [5,9,13,17].map(i => angle(points[i], points[i+1], points[i+3]))
  const extended = [5,9,13,17].map((i,k) => bends[k] > 155 && distance(points[i+3],points[0]) > distance(points[i+1],points[0]) * 1.08)
  if (extended[0] && extended[1] && !extended[2] && !extended[3]) return 'scissors'
  if (extended.every(Boolean)) {
    const middleGap = distance(points[12],points[16])/scale
    const outsideGap = Math.max(distance(points[8],points[12]),distance(points[16],points[20]))/scale
    if (middleGap > .43 && middleGap > outsideGap * 1.35) return 'spock'
    if (middleGap < .43) return 'paper'
    return null
  }
  const tipDistances = [8,12,16,20].map(i => distance(points[i],points[0])/scale)
  const thumbOpen = distance(points[4],points[9])/scale > .7
  if (extended.every(v => !v)) {
    if (tipDistances.every(d => d < 1.55) && !thumbOpen) return 'rock'
    const mouth = distance(points[4],points[12])/scale
    if (thumbOpen && mouth < 1.15 && bends.every(a => a > 65 && a < 155)) return 'lizard'
  }
  return null
}
export class GestureStabilizer {
  private candidate: Move | null = null
  private since = 0
  update(gesture: Move | null, now: number) {
    if (gesture !== this.candidate) { this.candidate = gesture; this.since = now }
    return { gesture, stable: gesture !== null && now - this.since >= 450 }
  }
}
