import type { Move } from '../game/rules'
export interface Point {
  x: number
  y: number
  z: number
}
const fingerBases = [5, 9, 13, 17] as const
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
function angle(a: Point, b: Point, c: Point) {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z],
    v = [c.x - b.x, c.y - b.y, c.z - b.z]
  return (
    (Math.acos(
      Math.max(
        -1,
        Math.min(
          1,
          u.reduce((s, x, i) => s + x * v[i], 0) / (Math.hypot(...u) * Math.hypot(...v) || 1),
        ),
      ),
    ) *
      180) /
    Math.PI
  )
}
// World coordinates make these ratios independent of video aspect ratio and mirroring.
export function classify(points: Point[]): Move | null {
  if (points.length !== 21) return null
  for (const point of points)
    if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) return null
  const scale = distance(points[5], points[17])
  if (scale < 0.0001) return null
  const bends = fingerBases.map((i) => angle(points[i], points[i + 1], points[i + 3]))
  const fingers = fingerBases.map((i, k) => {
    const length =
      distance(points[i], points[i + 1]) +
      distance(points[i + 1], points[i + 2]) +
      distance(points[i + 2], points[i + 3])
    // A single noisy depth estimate can kink one joint of an otherwise straight finger.
    const straightness = distance(points[i], points[i + 3]) / (length || 1)
    const reach = distance(points[i + 3], points[0]) / (distance(points[i + 1], points[0]) || 1)
    return {
      open: bends[k] > 130 && straightness > 0.86 && reach > 1.04,
      folded: bends[k] < 125 && (straightness < 0.8 || reach < 1.04),
    }
  })
  if (fingers.every((finger) => finger.open)) {
    // Project onto the palm's sideways axis. Euclidean fingertip gaps also
    // measure differences in finger length and depth, which can mimic Spock.
    const forward = {
      x: points[9].x - points[0].x,
      y: points[9].y - points[0].y,
      z: points[9].z - points[0].z,
    }
    const forwardLength = Math.hypot(forward.x, forward.y, forward.z)
    if (forwardLength < 0.0001) return null
    const f = {
      x: forward.x / forwardLength,
      y: forward.y / forwardLength,
      z: forward.z / forwardLength,
    }
    const across = {
      x: points[17].x - points[5].x,
      y: points[17].y - points[5].y,
      z: points[17].z - points[5].z,
    }
    const along = across.x * f.x + across.y * f.y + across.z * f.z
    const side = { x: across.x - along * f.x, y: across.y - along * f.y, z: across.z - along * f.z }
    const width = Math.hypot(side.x, side.y, side.z)
    if (width < scale * 0.2) return null
    const lateral = (i: number) =>
      ((points[i].x - points[0].x) * side.x +
        (points[i].y - points[0].y) * side.y +
        (points[i].z - points[0].z) * side.z) /
      (width * width)
    // Preserve finger order: crossed fingers are neither paper nor a salute.
    const gap = (a: number, b: number) => lateral(b) - lateral(a)
    if ([gap(8, 12), gap(12, 16), gap(16, 20)].some((value) => value < -0.05)) return null
    const center = gap(12, 16)
    const outer = Math.max(gap(8, 12), gap(16, 20))
    const spread = center - gap(9, 13)
    const direction = (base: number) =>
      (lateral(base + 3) - lateral(base)) / (distance(points[base], points[base + 3]) / width)
    const divergence = direction(13) - direction(9)
    const outerDivergence = Math.max(direction(9) - direction(5), direction(17) - direction(13))
    // A central split can remain clear even when one outer pair is slightly apart.
    // Compare finger directions as well as gaps; a uniform fan must stay paper.
    const paired = center > outer * 1.45
    const distinctSplit = center > outer * 1.08 && divergence > outerDivergence + 0.06
    if (center > 0.32 && spread > 0.12 && divergence > 0.12 && (paired || distinctSplit))
      return 'spock'
    // Some salutes form by closing both outer pairs rather than splaying the center.
    // Check the grouping at two joints so one noisy fingertip cannot create it.
    const gatheredPairs = gap(8, 12) < gap(5, 9) * 0.65 && gap(16, 20) < gap(13, 17) * 0.65
    const groupedAtKnuckles = gap(11, 15) > Math.max(gap(7, 11), gap(15, 19)) * 1.45
    if (
      center > 0.28 &&
      center > outer * 1.65 &&
      divergence > -0.04 &&
      gatheredPairs &&
      groupedAtKnuckles
    )
      return 'spock'
    // Don't lock in paper while a plausible central split is still forming.
    if (spread > 0.08 && center > outer * 1.2 && divergence > 0.08) return null
    // The whole-finger checks already rule out folded fingers. Paper can be relaxed too.
    return 'paper'
  }
  if (fingers[0].open && fingers[1].open && fingers[2].folded && fingers[3].folded)
    return 'scissors'
  const tipDistances = [8, 12, 16, 20].map((i) => distance(points[i], points[0]) / scale)
  const thumbOpen = distance(points[4], points[9]) / scale > 0.7
  if (fingers.every((finger) => !finger.open)) {
    if (tipDistances.every((d) => d < 1.55) && !thumbOpen) return 'rock'
    const mouth = distance(points[4], points[12]) / scale
    if (thumbOpen && mouth < 1.15 && bends.every((a) => a > 65 && a < 155)) return 'lizard'
  }
  return null
}
export class GestureStabilizer {
  private samples: { gesture: Move | null; at: number }[] = []
  private lastSeen = -Infinity

  update(gesture: Move | null, now: number) {
    if (now - this.lastSeen > (gesture === null ? 160 : 500) || now < this.lastSeen)
      this.samples = []
    if (gesture !== null) this.lastSeen = now
    this.samples = this.samples.filter((sample) => now - sample.at <= 900)
    this.samples.push({ gesture, at: now })
    const matching = this.samples.filter((sample) => sample.gesture === gesture)
    // Require a current valid sign and sustained agreement, not an uninterrupted streak.
    const stable =
      gesture !== null &&
      matching.length >= 4 &&
      matching.length / this.samples.length >= 0.8 &&
      now - matching[0].at >= 450
    return { gesture, stable }
  }
}
