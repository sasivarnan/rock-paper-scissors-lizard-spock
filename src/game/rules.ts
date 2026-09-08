export const moves = ['rock', 'paper', 'scissors', 'lizard', 'spock'] as const
export type Move = typeof moves[number]
export type Outcome = 'win' | 'loss' | 'draw'
export const gestures: Record<Move, { icon: string; hint: string }> = {
  rock: { icon: '✊', hint: 'Make a closed fist' },
  paper: { icon: '✋', hint: 'Open palm, fingers together' },
  scissors: { icon: '✌️', hint: 'Extend index + middle fingers' },
  lizard: { icon: '🤏', hint: 'Curve four fingers toward your thumb' },
  spock: { icon: '🖖', hint: 'Split middle + ring fingers' },
}
export const wins: Record<Move, Partial<Record<Move, string>>> = {
  rock: { scissors: 'Rock crushes scissors', lizard: 'Rock crushes lizard' },
  paper: { rock: 'Paper covers rock', spock: 'Paper disproves Spock' },
  scissors: { paper: 'Scissors cuts paper', lizard: 'Scissors decapitates lizard' },
  lizard: { paper: 'Lizard eats paper', spock: 'Lizard poisons Spock' },
  spock: { rock: 'Spock vaporizes rock', scissors: 'Spock smashes scissors' },
}
export function resolveRound(local: Move, opponent: Move): { outcome: Outcome; explanation: string } {
  if (local === opponent) return { outcome: 'draw', explanation: 'Same move. Great minds think alike.' }
  const explanation = wins[local][opponent]
  return explanation ? { outcome: 'win', explanation } : { outcome: 'loss', explanation: wins[opponent][local]! }
}
export interface Opponent { id: string; name: string; chooseMove: () => Move }
export const computer: Opponent = {
  id: 'computer', name: 'Computer',
  chooseMove: () => { const value = new Uint32Array(1); crypto.getRandomValues(value); return moves[Math.floor(value[0] / 2 ** 32 * moves.length)] },
}
