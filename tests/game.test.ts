import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moves, resolveRound } from '../src/game/rules.ts'
import { makeGameStore } from '../src/game/store.ts'
import { classify, GestureStabilizer } from '../src/vision/classifier.ts'
const expected = [
  ['draw','loss','win','win','loss'],
  ['win','draw','loss','loss','win'],
  ['loss','win','draw','win','loss'],
  ['loss','win','loss','draw','win'],
  ['win','loss','win','loss','draw'],
]
test('all 25 standard outcomes', () => moves.forEach((a,i) => moves.forEach((b,j) => assert.equal(resolveRound(a,b).outcome,expected[i][j]))))
function round(store: ReturnType<typeof makeGameStore>, move: typeof moves[number] | null, opponentMove: typeof moves[number], at = 1000, now = 1100) {
  store.trigger.start({opponentMove})
  store.trigger.detected({gesture:move,stable:move !== null,at})
  for(let i=0;i<3;i++) store.trigger.tick()
  store.trigger.capture({now})
}
test('five wins finish a match, repeated capture and start cannot change it', () => {
  const store=makeGameStore(); store.trigger.cameraReady()
  for(let i=0;i<5;i++) round(store,'rock','scissors')
  assert.equal(store.getSnapshot().context.local.score,5)
  store.trigger.capture({now:1100}); store.trigger.start({opponentMove:'paper'})
  assert.equal(store.getSnapshot().context.phase,'result')
  assert.equal(store.getSnapshot().context.local.score,5)
  store.trigger.reset(); assert.equal(store.getSnapshot().context.local.score,0)
  assert.equal(store.getSnapshot().context.camera,'ready')
})
test('no hand, unstable pose, stale frame and early capture cannot score', () => {
  const store=makeGameStore();store.trigger.cameraReady()
  round(store,null,'paper');assert.equal(store.getSnapshot().context.phase,'idle')
  round(store,'rock','scissors',0,1000);assert.equal(store.getSnapshot().context.local.score,0)
  store.trigger.start({opponentMove:'scissors'});store.trigger.detected({gesture:'rock',stable:false,at:1000})
  store.trigger.capture({now:1100});assert.equal(store.getSnapshot().context.phase,'countdown')
  for(let i=0;i<3;i++)store.trigger.tick()
  store.trigger.capture({now:1100});assert.equal(store.getSnapshot().context.local.score,0)
})
test('draws, losses, camera interruption and reset are consistent', () => {
  const store=makeGameStore();store.trigger.start({opponentMove:'paper'});assert.equal(store.getSnapshot().context.phase,'idle')
  store.trigger.cameraReady();round(store,'paper','paper');assert.equal(store.getSnapshot().context.outcome,'draw')
  round(store,'rock','paper');assert.equal(store.getSnapshot().context.opponent.score,1)
  store.trigger.start({opponentMove:'paper'});store.trigger.cameraOff();store.trigger.capture({now:1100})
  assert.equal(store.getSnapshot().context.phase,'idle');assert.equal(store.getSnapshot().context.opponent.score,1)
})
test('gesture stability resets on changed pose and missing hand', () => {
  const s=new GestureStabilizer()
  assert.equal(s.update('rock',0).stable,false)
  assert.equal(s.update('rock',449).stable,false)
  assert.equal(s.update('rock',450).stable,true)
  assert.equal(s.update('paper',460).stable,false)
  assert.equal(s.update(null,1000).stable,false)
  assert.equal(s.update('paper',1010).stable,false)
})
test('classifier rejects malformed and degenerate landmarks', () => {
  assert.equal(classify([]),null)
  assert.equal(classify(Array(21).fill({x:0,y:0,z:0})),null)
  assert.equal(classify(Array(21).fill({x:NaN,y:0,z:0})),null)
})

test('five landmark poses classify consistently after scale, rotation and reflection', () => {
  const make = (move: typeof moves[number]) => {
    const p = Array.from({length:21},()=>({x:0,y:0,z:0}))
    p[0]={x:0,y:0,z:0};p[4]={x:move==='lizard'?-.85:0,y:move==='lizard'?1.7:.9,z:0}
    for (const [k,i] of [5,9,13,17].entries()) {
      const x=-.5+k/3
      const open=move==='paper'||move==='spock'||(move==='scissors'&&k<2)
      const shift=move==='spock'?(k<2?-.3:.3):0
      p[i]={x,y:1,z:0}
      p[i+1]={x:x+shift/3,y:1.6,z:0}
      p[i+2]={x:x+shift*2/3,y:open?2:1.3,z:0}
      p[i+3]=open?{x:x+shift,y:2.5,z:0}:move==='lizard'?{x:x-.55,y:1.7,z:0}:{x,y:.7,z:0}
    }
    return p
  }
  for (const move of moves) {
    const p=make(move)
    assert.equal(classify(p),move,move)
    const transformed=p.map(v=>({x:-v.y*2+4,y:-v.x*2-8,z:v.z*2+1}))
    assert.equal(classify(transformed),move,`${move} transformed`)
  }
})
