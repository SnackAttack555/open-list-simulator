import { describe, it, expect } from 'vitest'
import { allocate, describeMyVote, drawHash } from './allocate.js'
import { getThemes } from '../data/index.js'

/** Minimal fixture: `sizes` is candidates-per-list, e.g. [5,5,5,5]. */
function makeTheme(sizes, id = 'test') {
  return {
    id,
    lists: sizes.map((n, i) => ({
      id: `l${i + 1}`,
      name: `List ${i + 1}`,
      emoji: '•',
      color: '#000',
      candidates: Array.from({ length: n }, (_, j) => ({ id: `l${i + 1}c${j + 1}`, name: `C${j + 1}` })),
    })),
  }
}

/**
 * Spread `total` votes across a list's real candidate ids in a descending,
 * unambiguous pattern, so intra-list ordering never depends on a tie-break.
 * Takes the actual candidates so it works on both fixtures and shipped rosters.
 */
function spread(list, total) {
  const n = list.candidates.length
  const weights = Array.from({ length: n }, (_, i) => n - i) // 5,4,3,2,1
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const votes = weights.map((w) => Math.floor((total * w) / weightSum))
  votes[0] += total - votes.reduce((a, b) => a + b, 0) // rounding slack to the top name
  return list.candidates.map((cand, i) => ({
    listId: list.id,
    candidateId: cand.id,
    votes: votes[i],
  }))
}

const tallyFrom = (theme, perList) =>
  theme.lists.flatMap((list, i) => spread(list, perList[i]))

describe('drawHash', () => {
  it('is deterministic and spreads values', () => {
    expect(drawHash('grogu')).toBe(drawHash('grogu'))
    expect(drawHash('grogu')).not.toBe(drawHash('yoda'))
  })
})

describe('Hare quota, exact multiples with zero remainder', () => {
  // 1000 votes, 5 seats -> quota 200. Shares 40/20/20/20 % = 400/200/200/200.
  // Every list is an exact multiple of the quota: 2/1/1/1, no remainder stage.
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, tallyFrom(theme, [400, 200, 200, 200]))

  it('allocates entirely by quota', () => {
    expect(result.totalVotes).toBe(1000)
    expect(result.quota).toBe(200)
    expect(result.lists.map((l) => l.seats)).toEqual([2, 1, 1, 1])
    expect(result.lists.map((l) => l.remainderSeats)).toEqual([0, 0, 0, 0])
  })

  it('fills exactly the seats available', () => {
    expect(result.lists.reduce((s, l) => s + l.seats, 0)).toBe(5)
    expect(result.winners).toHaveLength(5)
  })

  it('reports everyone as represented', () => {
    expect(result.pctRepresented).toBe(100)
  })

  it('does not flag a tie nobody was in', () => {
    expect(result.lists.every((l) => !l.remainderTieBroken)).toBe(true)
  })
})

describe('largest remainder decides the last seat', () => {
  // 100 votes, quota 20. 45/25/18/12 -> quota seats 2/1/0/0 = 3, two left over.
  // Remainders (scaled, denominator 100): 45*5-2*100=25, 25*5-1*100=25, 90, 60.
  // Ranked: l3 (90), l4 (60), then l1 and l2 tie at 25 — but only two seats
  // remain, so l3 and l4 take them and the tie never matters.
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, tallyFrom(theme, [45, 25, 18, 12]))

  it('gives the leftover seats to the biggest remainders', () => {
    expect(result.lists.map((l) => l.quotaSeats)).toEqual([2, 1, 0, 0])
    expect(result.lists.map((l) => l.seats)).toEqual([2, 1, 1, 1])
    expect(result.lists.map((l) => l.remainderSeats)).toEqual([0, 0, 1, 1])
  })

  it('orders seat tokens with remainder seats last', () => {
    expect(result.seatOrder.map((s) => s.viaRemainder)).toEqual([false, false, false, true, true])
  })

  it('represents every list, so a 12% list still wins a spot', () => {
    expect(result.pctRepresented).toBe(100)
    expect(result.lists.find((l) => l.id === 'l4').seats).toBe(1)
  })
})

describe('a three-way remainder tie is broken by lot', () => {
  // 300 votes, quota 60. 120/60/60/60 -> quota seats 2/1/1/1 = 5. No leftovers.
  // So force a real tie instead: 90/70/70/70 over 300. quota 60.
  // quota seats: 1/1/1/1 = 4, one seat left.
  // Remainders: 90*5-1*300=150, 70*5-1*300=50, 50, 50 -> l1 takes it outright.
  // Now make the tie decisive: 60/80/80/80 -> quota seats 1/1/1/1 = 4, one left.
  // Remainders: 0, 100, 100, 100 -> three lists tied at 100 for one seat.
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, tallyFrom(theme, [60, 80, 80, 80]))

  it('awards exactly one of the tied lists the seat', () => {
    const tied = result.lists.filter((l) => ['l2', 'l3', 'l4'].includes(l.id))
    expect(tied.filter((l) => l.remainderSeats === 1)).toHaveLength(1)
    expect(result.lists.reduce((s, l) => s + l.seats, 0)).toBe(5)
  })

  it('flags the winner as drawn from a hat', () => {
    const winner = result.lists.find((l) => l.remainderSeats === 1)
    expect(winner.remainderTieBroken).toBe(true)
  })

  it('is stable across repeated runs', () => {
    const again = allocate(theme, tallyFrom(theme, [60, 80, 80, 80]))
    expect(again.lists.map((l) => l.seats)).toEqual(result.lists.map((l) => l.seats))
  })
})

describe('one list wins 4 of 5 seats', () => {
  // 100 votes, quota 20. 85/6/5/4 -> quota seats 4/0/0/0 = 4, one left.
  // Remainders: 85*5-4*100=25, 30, 25, 20 -> l2 (30) takes the last seat.
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, tallyFrom(theme, [85, 6, 5, 4]))

  it('seats four from the dominant list and one from the runner-up', () => {
    expect(result.lists.map((l) => l.seats)).toEqual([4, 1, 0, 0])
  })

  it('elects the four highest preference votes on that list, not its first four', () => {
    const winners = result.lists[0].candidates.filter((c) => c.elected)
    expect(winners).toHaveLength(4)
    const votes = winners.map((c) => c.votes)
    expect([...votes].sort((a, b) => b - a)).toEqual(votes) // already descending
    const losers = result.lists[0].candidates.filter((c) => !c.elected)
    expect(Math.min(...votes)).toBeGreaterThanOrEqual(Math.max(...losers.map((c) => c.votes)))
  })

  it('leaves the two smallest lists unrepresented', () => {
    expect(result.pctRepresented).toBe(91) // (85 + 6) / 100
  })
})

describe('a list with zero votes', () => {
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, tallyFrom(theme, [50, 30, 20, 0]))

  it('wins no seats and does not break the maths', () => {
    const empty = result.lists.find((l) => l.id === 'l4')
    expect(empty.votes).toBe(0)
    expect(empty.seats).toBe(0)
    expect(empty.votePct).toBe(0)
    expect(result.lists.reduce((s, l) => s + l.seats, 0)).toBe(5)
  })
})

describe('an election with no votes at all', () => {
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, [])

  it('returns a zeroed result instead of dividing by zero', () => {
    expect(result.totalVotes).toBe(0)
    expect(result.winners).toEqual([])
    expect(result.pctRepresented).toBe(0)
    expect(result.wta).toBeNull()
    expect(result.lists.every((l) => l.seats === 0 && Number.isFinite(l.votePct))).toBe(true)
  })
})

describe('list order never decides who wins', () => {
  // Give the LAST candidate on a list nearly all its votes, and the FIRST just one.
  // l1 must win exactly one seat for this to prove anything, so keep its total
  // under two quotas: 201 of 1000 votes against a quota of 200.
  const theme = makeTheme([5, 5, 5, 5])
  const tallies = [
    { listId: 'l1', candidateId: 'l1c5', votes: 200 },
    { listId: 'l1', candidateId: 'l1c1', votes: 1 },
    { listId: 'l2', candidateId: 'l2c1', votes: 300 },
    { listId: 'l3', candidateId: 'l3c1', votes: 300 },
    { listId: 'l4', candidateId: 'l4c1', votes: 199 },
  ]
  const result = allocate(theme, tallies)
  const l1 = result.lists.find((l) => l.id === 'l1')

  it('gives the list exactly one seat', () => {
    expect(l1.seats).toBe(1)
  })

  it('elects the bottom-listed candidate who earned the votes', () => {
    expect(l1.candidates[0].id).toBe('l1c5')
    expect(l1.candidates[0].elected).toBe(true)
    expect(l1.candidates.find((c) => c.id === 'l1c1').elected).toBe(false)
  })
})

describe('intra-list tie at the cutoff', () => {
  // l1 wins 1 seat; two candidates tie for it.
  const theme = makeTheme([5, 5, 5, 5])
  const tallies = [
    { listId: 'l1', candidateId: 'l1c1', votes: 100 },
    { listId: 'l1', candidateId: 'l1c2', votes: 100 },
    { listId: 'l2', candidateId: 'l2c1', votes: 300 },
    { listId: 'l3', candidateId: 'l3c1', votes: 250 },
    { listId: 'l4', candidateId: 'l4c1', votes: 250 },
  ]
  const result = allocate(theme, tallies)
  const l1 = result.lists.find((l) => l.id === 'l1')

  it('seats exactly one of the tied pair', () => {
    expect(l1.seats).toBe(1)
    expect(l1.candidates.filter((c) => c.elected)).toHaveLength(1)
  })

  it('flags both sides of the tie so the UI can say it was drawn from a hat', () => {
    const tied = l1.candidates.filter((c) => c.votes === 100)
    expect(tied).toHaveLength(2)
    expect(tied.every((c) => c.tieBroken)).toBe(true)
  })

  it('does not flag candidates who were never near the cutoff', () => {
    expect(l1.candidates.filter((c) => c.votes === 0).every((c) => !c.tieBroken)).toBe(true)
  })
})

describe('winner-take-all counterfactual', () => {
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, tallyFrom(theme, [40, 30, 20, 10]))

  it('hands every seat to the leading list', () => {
    expect(result.wta.listId).toBe('l1')
    expect(result.wta.seats).toBe(5)
    expect(result.wta.winners).toHaveLength(5)
  })

  it('represents dramatically fewer voters than PR does', () => {
    expect(result.wta.pctRepresented).toBe(40)
    expect(result.pctRepresented).toBeGreaterThan(result.wta.pctRepresented)
  })
})

describe('every shipped theme allocates sanely', () => {
  const themes = getThemes('mi')

  it.each(themes.map((t) => [t.name, t]))('%s fills all 5 seats', (_name, theme) => {
    // Uneven but non-degenerate shares, cycled so no theme gets a trivial split.
    const shares = [37, 26, 19, 12, 6]
    const tallies = theme.lists.flatMap((list, i) => spread(list, shares[i % shares.length] * 10))
    const result = allocate(theme, tallies)
    expect(result.lists.reduce((s, l) => s + l.seats, 0)).toBe(5)
    expect(result.winners).toHaveLength(5)
    // No list may hold more seats than it has candidates.
    expect(result.lists.every((l) => l.seats <= l.candidates.length)).toBe(true)
    // Nobody wins a seat on zero votes while a list-mate with votes sits out.
    for (const list of result.lists) {
      const lowestWinner = Math.min(
        ...list.candidates.filter((c) => c.elected).map((c) => c.votes),
        Infinity,
      )
      const highestLoser = Math.max(
        ...list.candidates.filter((c) => !c.elected).map((c) => c.votes),
        -Infinity,
      )
      if (Number.isFinite(lowestWinner) && Number.isFinite(highestLoser)) {
        expect(lowestWinner).toBeGreaterThanOrEqual(highestLoser)
      }
    }
  })
})

describe('describeMyVote', () => {
  const theme = makeTheme([5, 5, 5, 5])
  const result = allocate(theme, tallyFrom(theme, [85, 6, 5, 4]))

  it('reports a winning mark', () => {
    const top = result.lists[0].candidates.find((c) => c.elected)
    const mine = describeMyVote(result, { listId: 'l1', candidateId: top.id })
    expect(mine.candidateElected).toBe(true)
    expect(mine.representedByList).toBe(true)
  })

  it('reports a losing mark whose list still won seats', () => {
    const loser = result.lists[0].candidates.find((c) => !c.elected)
    const mine = describeMyVote(result, { listId: 'l1', candidateId: loser.id })
    expect(mine.candidateElected).toBe(false)
    expect(mine.representedByList).toBe(true)
    expect(mine.listSeats).toBe(4)
  })

  it('reports a mark on a list that won nothing', () => {
    const mine = describeMyVote(result, { listId: 'l3', candidateId: 'l3c1' })
    expect(mine.candidateElected).toBe(false)
    expect(mine.representedByList).toBe(false)
  })

  it('returns null rather than throwing on unknown or missing input', () => {
    expect(describeMyVote(result, { listId: 'nope', candidateId: 'nope' })).toBeNull()
    expect(describeMyVote(result, null)).toBeNull()
    expect(describeMyVote(allocate(theme, []), { listId: 'l1', candidateId: 'l1c1' })).toBeNull()
  })
})
