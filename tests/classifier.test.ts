import { expect, test } from 'vitest'
import { classify, GestureStabilizer, type Point } from '../src/vision/classifier'
import type { Move } from '../src/game/rules'
import { hand, straight, relaxed, folded, curved, transform } from './gesture-fixtures'

const scissors = hand([{ ...relaxed, spread: -12 }, { ...relaxed, spread: 12 }, folded, folded])
const paper = hand([relaxed, relaxed, relaxed, relaxed], 'open')
const rock = hand([folded, folded, folded, folded])
const lizard = hand([curved, curved, curved, curved], 'mouth')
const spock = hand(
  [
    { ...relaxed, spread: -14 },
    { ...relaxed, spread: -14 },
    { ...relaxed, spread: 14 },
    { ...relaxed, spread: 14 },
  ],
  'open',
)
const cases: [string, Point[], Move | null][] = [
  ['scissors with relaxed extended fingers', scissors, 'scissors'],
  ['scissors with straight fingers', hand([straight, straight, folded, folded]), 'scissors'],
  ['scissors with thumb open', hand([relaxed, relaxed, folded, folded], 'open'), 'scissors'],
  ['rock with folded fingers', rock, 'rock'],
  ['looser rock', hand(Array(4).fill({ curl: [20, 80, 50] })), 'rock'],
  ['paper with relaxed fingers', paper, 'paper'],
  ['paper with fingers together', hand([straight, straight, straight, straight]), 'paper'],
  ['lizard with curved fingers and open mouth', lizard, 'lizard'],
  ['spock with relaxed fingers', spock, 'spock'],
  ['one extended finger', hand([straight, folded, folded, folded]), null],
  ['three extended fingers', hand([straight, straight, straight, folded]), null],
  ['two nonadjacent extended fingers', hand([straight, folded, straight, folded]), null],
  ['thumb up with closed fingers', hand([folded, folded, folded, folded], 'open'), null],
]

test.each(cases)('%s across handedness, orientation, size and noise', (_, points, expected) => {
  for (const mirror of [-1, 1])
    for (const angle of [0, 0.6, Math.PI / 2, Math.PI])
      for (const scale of [0.03, 0.06, 0.09])
        for (const noise of [0, 0.003])
          expect(
            classify(transform(points, mirror, angle, scale, noise)),
            `mirror=${mirror}, angle=${angle}, scale=${scale}, noise=${noise}`,
          ).toBe(expected)
})

const gestures: [Move, Point[]][] = [
  ['rock', rock],
  ['paper', paper],
  ['scissors', scissors],
  ['lizard', lizard],
  ['spock', spock],
]
test.each(gestures)(
  '%s can replace every other gesture without retaining the old sign',
  (move, points) => {
    for (const [previous, previousPoints] of gestures) {
      if (previous === move) continue
      const stabilizer = new GestureStabilizer()
      for (let time = 0; time <= 600; time += 100) stabilizer.update(classify(previousPoints), time)
      expect(stabilizer.update(classify(points), 700).stable).toBe(false)
      for (let time = 800; time < 1400; time += 100) stabilizer.update(classify(points), time)
      expect(stabilizer.update(classify(points), 1400)).toEqual({ gesture: move, stable: true })
    }
  },
)

test.each(gestures)('%s settles with slower 300 ms camera frames', (move, points) => {
  const stabilizer = new GestureStabilizer()
  for (const at of [0, 300, 600]) expect(stabilizer.update(classify(points), at).stable).toBe(false)
  expect(stabilizer.update(classify(points), 900)).toEqual({ gesture: move, stable: true })
})

test('malformed or incomplete landmarks are rejected without throwing', () => {
  const invalid = [
    [],
    Array(21),
    Array(21).fill(null),
    Array(20).fill({ x: 0, y: 0, z: 0 }),
    Array(21).fill({ x: 0, y: 0, z: 0 }),
    Array(21).fill({ x: NaN, y: 0, z: 0 }),
  ]
  for (const points of invalid) expect(classify(points)).toBeNull()
})
