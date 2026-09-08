import { matchOutcome, type MatchProgress } from './match.ts'
import type { Outcome } from './rules.ts'
export interface GameNotification {
  id: number
  title: string
  description: string
  kind: 'win' | 'loss' | 'draw' | 'retry'
  persistent: boolean
}
export function resultNotification(
  match: MatchProgress & { outcome: Outcome | null; explanation: string },
  id: number,
): GameNotification {
  const final = matchOutcome(match)
  const roundTitle =
    match.outcome === 'win' ? 'You won' : match.outcome === 'loss' ? 'Computer won' : 'Draw'
  return {
    id,
    kind: final ?? match.outcome ?? 'draw',
    persistent: final !== null,
    title:
      final === 'win'
        ? 'You won the match!'
        : final === 'loss'
          ? 'Computer won the match'
          : final === 'draw'
            ? 'Match drawn'
            : `${roundTitle} · Round ${match.round - 1}`,
    description:
      final !== null
        ? `Final score: you ${match.local.score} · computer ${match.opponent.score}. Last round: ${roundTitle.toLowerCase()}.`
        : `${match.explanation}. ${match.outcome === 'draw' ? 'No points awarded.' : '+1 point to ' + (match.outcome === 'win' ? 'you.' : 'computer.')}`.replace(
            /\.\./g,
            '.',
          ),
  }
}
