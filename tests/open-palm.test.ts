import { test, expect } from 'vitest'
import { classify, GestureStabilizer, type Point } from '../src/vision/classifier.ts'

// Synthetic landmark fixtures exercise geometry; they aren't recorded hands.
function palm(shifts: number[], lengths = [1.5, 1.5, 1.5, 1.5], bend = 0): Point[] {
  const p = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  p[4] = { x: -0.9, y: 0.8, z: 0 }
  for (const [k, i] of [5, 9, 13, 17].entries()) {
    const x = -0.5 + k / 3
    p[i] = { x, y: 1, z: 0 }
    p[i + 1] = { x: x + shifts[k] * 0.4, y: 1 + lengths[k] * 0.4, z: 0 }
    p[i + 2] = { x: x + shifts[k] * 0.7, y: 1 + lengths[k] * 0.7, z: bend * 0.4 }
    p[i + 3] = { x: x + shifts[k], y: 1 + lengths[k], z: bend }
  }
  return p
}
const curledTips = palm([0, 0, 0, 0])
for (const tip of [8, 12, 16, 20]) curledTips[tip].y = 1.9

const relaxedOuterFingers = palm([0, 0, 0, 0], undefined, 0.48)
for (const i of [7, 8, 11, 12]) relaxedOuterFingers[i].z = 0

const foldedSpock = palm([-0.3, -0.3, 0.3, 0.3])
for (const tip of [8, 12, 16, 20]) foldedSpock[tip].y = 1.9

const noisySpock = palm([-0.3, -0.3, 0.3, 0.3])
noisySpock[19].z = 0.25

const cuppedPaper = palm([-0.3, -0.1, 0.1, 0.3], undefined, 0.7)
const relaxedPinky = palm([0, 0, 0, 0])
relaxedPinky[19].z = 0.28
relaxedPinky[20].z = 0.7
const tuckedThumb = palm([0, 0, 0, 0], undefined, 0.7)
tuckedThumb[4] = { x: 0, y: 1, z: 0 }
const foldedPinky = palm([0, 0, 0, 0])
foldedPinky[20].y = 1.9

const fixtures: [string, Point[], string | null][] = [
  ['Spock formed by bringing the outer pairs together', palm([0.22, 0, 0, -0.22]), 'spock'],
  ['cupped Spock formed by paired fingers', palm([0.22, 0, 0, -0.22], undefined, 0.7), 'spock'],
  ['only index and middle paired', palm([0.22, 0, 0, 0]), 'paper'],
  ['slightly cupped paper', cuppedPaper, 'paper'],
  ['paper with a relaxed pinky', relaxedPinky, 'paper'],
  ['relaxed paper with thumb tucked', tuckedThumb, 'paper'],
  ['paper shape with a folded pinky', foldedPinky, null],
  ['central split with folded fingertips', foldedSpock, null],
  ['Spock with noisy pinky depth', noisySpock, 'spock'],
  ['paper with relaxed ring and pinky', relaxedOuterFingers, 'paper'],
  ['crossed finger pairs', palm([0.8, 0.8, -0.8, -0.8]), null],
  ['fingers curled at the last joint', curledTips, null],
  ['closed-finger paper', palm([0, 0, 0, 0]), 'paper'],
  ['naturally spread paper', palm([-0.6, -0.2, 0.2, 0.6]), 'paper'],
  ['wide fan paper', palm([-0.9, -0.3, 0.3, 0.9]), 'paper'],
  ['paper with unequal finger lengths', palm([0, 0, 0, 0], [1.5, 1.8, 1.3, 0.95]), 'paper'],
  ['relaxed paper', palm([-0.3, -0.1, 0.1, 0.3], [1.5, 1.7, 1.5, 1.2], 0.48), 'paper'],
  ['Spock with a loose pinky pair', palm([-0.25, -0.25, 0.25, 0.65]), 'spock'],
  ['Spock with a loose index pair', palm([-0.65, -0.25, 0.25, 0.25]), 'spock'],
  ['Spock with more finger curl', palm([-0.3, -0.3, 0.3, 0.3], undefined, 0.7), 'spock'],
  ['asymmetric paper fan', palm([-0.8, -0.2, 0.2, 0.7]), 'paper'],
  ['relaxed Spock', palm([-0.3, -0.3, 0.3, 0.3], undefined, 0.48), 'spock'],
  ['Spock with paired fingers', palm([-0.3, -0.3, 0.3, 0.3]), 'spock'],
  ['Spock with shorter pinky', palm([-0.3, -0.3, 0.3, 0.3], [1.4, 1.65, 1.5, 1]), 'spock'],
  ['modest Spock split', palm([-0.15, -0.15, 0.15, 0.15]), 'spock'],
  ['developing central split', palm([-0.07, -0.07, 0.07, 0.07]), null],
]
test.each(fixtures)(
  '%s: either hand, palm/back, rotations, scale and noise',
  (_, points, expected) => {
    for (const mirror of [1, -1]) {
      for (const theta of [0, 0.4, Math.PI / 2, Math.PI]) {
        for (const scale of [0.025, 0.05, 0.09]) {
          for (const noise of [0, 0.003]) {
            const a = Math.cos(theta),
              b = Math.sin(theta)
            const transformed = points.map((p, i) => {
              const x = p.x * mirror + Math.sin(i * 7) * noise
              const y = p.y + Math.cos(i * 11) * noise
              const z = p.z + Math.sin(i * 13) * noise
              return {
                x: (x * a - z * b) * scale + 0.2,
                y: (y * a - (x * b + z * a) * b) * scale - 0.1,
                z: (y * b + (x * b + z * a) * a) * scale + 0.3,
              }
            })
            expect(
              classify(transformed),
              `mirror ${mirror}, angle ${theta}, scale ${scale}, noise ${noise}`,
            ).toBe(expected)
          }
        }
      }
    }
  },
)

test('a brief uncertain frame does not restart a held Spock, but cannot be captured', () => {
  const stabilizer = new GestureStabilizer()
  const spock = classify(palm([-0.3, -0.3, 0.3, 0.3]))
  for (const time of [0, 100, 200, 300]) stabilizer.update(spock, time)
  expect(stabilizer.update(null, 400)).toEqual({ gesture: null, stable: false })
  expect(stabilizer.update(spock, 480)).toEqual({ gesture: 'spock', stable: true })
  expect(stabilizer.update('paper', 500).stable).toBe(false)
  expect(stabilizer.update(spock, 600).stable).toBe(false)
})

test('losing the hand or a long frame gap requires a fresh hold', () => {
  const stabilizer = new GestureStabilizer()
  stabilizer.update('spock', 0)
  stabilizer.update('spock', 450)
  expect(stabilizer.update(null, 650).stable).toBe(false)
  expect(stabilizer.update('spock', 700).stable).toBe(false)
  expect(stabilizer.update('spock', 1400).stable).toBe(false)
})

test('uniform paper fans do not turn into Spock as their spread grows', () => {
  for (const spread of [0, 0.1, 0.2, 0.3, 0.4]) {
    expect(classify(palm([-3 * spread, -spread, spread, 3 * spread]))).toBe('paper')
  }
})

test('a single paper misclassification does not erase a consistent Spock hold', () => {
  const s = new GestureStabilizer()
  for (const time of [0, 100, 200, 300]) s.update('spock', time)
  expect(s.update('paper', 400).stable).toBe(false)
  expect(s.update('spock', 480)).toEqual({ gesture: 'spock', stable: true })
})

test('alternating signs cannot become stable and sustained changes settle', () => {
  const s = new GestureStabilizer()
  for (let time = 0; time <= 1200; time += 100)
    expect(s.update(time % 200 ? 'paper' : 'spock', time).stable).toBe(false)
  for (let time = 1300; time < 2000; time += 100) s.update('paper', time)
  expect(s.update('paper', 2000).stable).toBe(true)
  expect(s.update(null, 2100)).toEqual({ gesture: null, stable: false })
})

test('too few frames cannot establish a stable gesture', () => {
  const s = new GestureStabilizer()
  expect(s.update('spock', 0).stable).toBe(false)
  expect(s.update('spock', 450).stable).toBe(false)
  expect(s.update('spock', 500).stable).toBe(false)
})

test('paired-finger Spock can settle after relaxed paper and switch back', () => {
  const s = new GestureStabilizer()
  const paper = palm([0, 0, 0, 0], undefined, 0.7)
  const spock = palm([0.22, 0, 0, -0.22], undefined, 0.7)
  for (let time = 0; time <= 600; time += 100) s.update(classify(paper), time)
  expect(s.update(classify(spock), 700).stable).toBe(false)
  for (let time = 800; time < 1400; time += 100) s.update(classify(spock), time)
  expect(s.update(classify(spock), 1400)).toEqual({ gesture: 'spock', stable: true })
  expect(s.update(classify(paper), 1500).stable).toBe(false)
  for (let time = 1600; time < 2200; time += 100) s.update(classify(paper), time)
  expect(s.update(classify(paper), 2200)).toEqual({ gesture: 'paper', stable: true })
})
