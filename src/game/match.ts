export type MatchFormat = 'firstTo' | 'rounds'
export interface MatchProgress {
  format: MatchFormat
  limit: number
  round: number
  local: { score: number }
  opponent: { score: number }
}
export function isMatchFinished(match: MatchProgress) {
  return match.format === 'rounds'
    ? match.round - 1 >= match.limit
    : Math.max(match.local.score, match.opponent.score) >= match.limit
}
export function matchOutcome(match: MatchProgress) {
  if (!isMatchFinished(match)) return null
  return match.local.score === match.opponent.score
    ? 'draw'
    : match.local.score > match.opponent.score
      ? 'win'
      : 'loss'
}
