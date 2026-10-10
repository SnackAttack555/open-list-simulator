/**
 * The first election a browser sees is arranged so the visitor's party is never
 * the one that would sweep under winner-take-all.
 *
 * The whole argument of the page is "the old system gave your side nothing; the
 * new one gave it a seat", and a visitor who happens to pick the most popular
 * party sees the old system work out fine for them — which teaches the opposite
 * lesson on the one run that matters. One vote out of eight hundred cannot move
 * the result, so the only way to guarantee the contrast is to arrange it.
 *
 * This is the smallest arrangement that does it: no votes are invented. If the
 * visitor's party has the most votes, its total is swapped with the runner-up's
 * — each party keeps its own candidates in their own proportions, just at the
 * other party's size. Every other case is left exactly as counted. Pure, so it
 * can be tested; whether it applies at all is decided by the caller.
 */
export function relabelForFirstRun(theme, tallies, myVote) {
  if (!myVote || !Array.isArray(tallies)) return tallies

  const totals = new Map(theme.lists.map((list) => [list.id, 0]))
  for (const row of tallies) {
    if (totals.has(row.listId)) totals.set(row.listId, totals.get(row.listId) + (row.votes ?? 0))
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  const [leaderId, leaderVotes] = ranked[0] ?? []
  if (leaderId !== myVote.listId || ranked.length < 2) return tallies

  const [runnerId, runnerVotes] = ranked[1]
  if (runnerVotes === leaderVotes) return tallies

  return [
    ...scaleList(tallies, leaderId, runnerVotes),
    ...scaleList(tallies, runnerId, leaderVotes),
    ...tallies.filter((row) => row.listId !== leaderId && row.listId !== runnerId),
  ]
}

/**
 * Resize one list's candidate rows so they sum to exactly `target`, keeping
 * their proportions. Largest-remainder rounding, so the total is exact rather
 * than off by the number of candidates.
 */
function scaleList(tallies, listId, target) {
  const rows = tallies.filter((row) => row.listId === listId)
  const current = rows.reduce((sum, row) => sum + (row.votes ?? 0), 0)
  if (current === 0) return rows

  const exact = rows.map((row) => ((row.votes ?? 0) * target) / current)
  const floored = exact.map(Math.floor)
  let short = target - floored.reduce((a, b) => a + b, 0)
  const byRemainder = exact
    .map((value, i) => ({ i, frac: value - floored[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of byRemainder) {
    if (short <= 0) break
    floored[i] += 1
    short -= 1
  }
  return rows.map((row, i) => ({ ...row, votes: floored[i] }))
}
