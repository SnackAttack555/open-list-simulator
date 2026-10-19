import { describe, expect, test } from 'vitest'
import { PARTIES, SEATS, SHARES, VOTERS } from './data.js'
import {
  LEADERS,
  dealDistricts,
  groupsFor,
  randomLayout,
  riggedLayout,
  runElection,
} from './election.js'

const everyVote = PARTIES.flatMap((p) =>
  p.candidates.map((c) => ({ partyId: p.id, candidateId: c.id })),
)

const permutations = (items) =>
  items.length <= 1
    ? [items]
    : items.flatMap((x, i) =>
        permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
      )

/** What must hold for any layout: the numbers the copy and pictures lean on. */
function expectSound(r) {
  expect(r.total).toBe(100)
  expect(r.quota).toBe(20)
  expect(r.council.length).toBe(SEATS)
  expect(r.parties.reduce((s, p) => s + p.seats, 0)).toBe(SEATS)
  expect([...r.parties.map((p) => p.seats)].sort()).toEqual([1, 1, 1, 2])
  expect(r.wta.party.seats).toBe(2)
  expect(r.fullSeats).toBe(3)
  expect(r.leftoverWinners.length).toBe(2)
  expect(r.represented).toBe(100)
  expect(r.wta.council.every((c) => c.partyId === r.wta.party.id)).toBe(true)
  // No ties anywhere a tie would matter: between parties' leftovers, or at a seat cutoff.
  const leftovers = r.parties.map((p) => p.leftover)
  expect(new Set(leftovers).size).toBe(leftovers.length)
  const totals = r.parties.map((p) => p.votes)
  expect(new Set(totals).size).toBe(totals.length)
  for (const p of r.parties) {
    expect(p.ranked[p.seats - 1].votes).toBeGreaterThan(p.ranked[p.seats].votes)
  }
  // The districts picture: five districts of 20, the leader biggest in each.
  const deal = dealDistricts(r.standings.map((p) => p.votes))
  for (const d of deal) {
    expect(d.reduce((a, b) => a + b, 0)).toBe(20)
    expect(d[0]).toBeGreaterThan(Math.max(...d.slice(1)))
  }
  // My vote is counted once, for me.
  expect(r.parties.filter((p) => p.mine).length).toBe(1)
  expect(r.parties.flatMap((p) => p.candidates).filter((c) => c.mine).length).toBe(1)
}

describe('the simulated town', () => {
  test('deals exactly 99 neighbors, so you make 100', () => {
    expect(SHARES.flat().reduce((s, n) => s + n, 0)).toBe(VOTERS - 1)
  })

  test('every party has one candidate per seat, and every hand covers them', () => {
    for (const p of PARTIES) expect(p.candidates.length).toBe(SEATS)
    for (const hand of SHARES) expect(hand.length).toBe(SEATS)
  })
})

describe('the first run is rigged: for every possible vote', () => {
  for (const vote of everyVote) {
    const r = runElection(vote)
    const my = r.me.party

    test(`${vote.candidateId}: the numbers are sound`, () => {
      expectSound(r)
    })

    test(`${vote.candidateId}: my party comes second and loses under winner-take-all`, () => {
      expect(my.place).toBe(2)
      expect(my.votes).toBe(27)
      expect(r.wta.party.id).not.toBe(my.id)
      expect(r.me.wtaElected).toBe(false)
      expect(r.wta.represented).toBe(37)
      expect(my.seats).toBe(1)
    })

    test(`${vote.candidateId}: my candidate tops my party and takes its seat`, () => {
      expect(r.me.candidate.votes).toBe(SHARES[1][0] + 1)
      expect(my.ranked[0].id).toBe(vote.candidateId)
      expect(r.me.candidate.elected).toBe(true)
      expect(r.council.some((c) => c.mine)).toBe(true)
    })
  }
})

describe('later runs are not rigged: for every deal of the hands and every vote', () => {
  const handOrders = permutations(SHARES.map((_, i) => i))
  for (const handOrder of handOrders) {
    for (const vote of everyVote) {
      // My candidate takes each possible share in the hand; the others keep ballot order.
      for (let slot = 0; slot < SEATS; slot += 1) {
        const hands = {}
        const slots = {}
        PARTIES.forEach((p, i) => {
          hands[p.id] = handOrder[i]
          const order = p.candidates.map((_, k) => k)
          if (p.id !== vote.partyId) {
            slots[p.id] = order
          } else {
            const k = p.candidates.findIndex((c) => c.id === vote.candidateId)
            const rest = order.filter((i) => i !== slot)
            slots[p.id] = order.map((i) => (i === k ? slot : rest[i < k ? i : i - 1]))
          }
        })
        test(`hands ${handOrder.join('')}, ${vote.candidateId} in slot ${slot}`, () => {
          const r = runElection(vote, { hands, slots })
          expectSound(r)
          expect(r.me.candidate.votes).toBe(SHARES[hands[vote.partyId]][slot] + 1)
        })
      }
    }
  }

  test('randomLayout: a permutation of hands and slots, led by Cats or Dogs, never me', () => {
    for (let n = 0; n < 200; n += 1) {
      const vote = everyVote[n % everyVote.length]
      const layout = randomLayout(vote)
      expect([...Object.values(layout.hands)].sort()).toEqual([0, 1, 2, 3])
      for (const p of PARTIES) expect([...layout.slots[p.id]].sort()).toEqual([0, 1, 2, 3, 4])
      const r = runElection(vote, layout)
      expectSound(r)
      expect(LEADERS).toContain(r.wta.party.id)
      expect(r.wta.party.id).not.toBe(vote.partyId)
      expect(r.me.wtaElected).toBe(false)
    }
  })

  test('riggedLayout is a permutation of hands and of slots', () => {
    for (const vote of everyVote) {
      const layout = riggedLayout(vote)
      expect([...Object.values(layout.hands)].sort()).toEqual([0, 1, 2, 3])
      for (const p of PARTIES) expect([...layout.slots[p.id]].sort()).toEqual([0, 1, 2, 3, 4])
    }
  })
})

describe('groupsFor', () => {
  test('draws full groups of 20 then the leftover', () => {
    const r = runElection({ partyId: 'dogs', candidateId: 'toto' })
    const cats = groupsFor(
      r.parties.find((p) => p.id === 'cats'),
      r.quota,
    )
    expect(cats.map((g) => [g.kind, g.dots])).toEqual([
      ['full', 20],
      ['partial', 17],
    ])
    const fish = groupsFor(
      r.parties.find((p) => p.id === 'fish'),
      r.quota,
    )
    expect(fish).toEqual([{ key: 'fish-left', kind: 'partial', dots: 14, won: true }])
  })

  test('dots add up to the votes', () => {
    const r = runElection({ partyId: 'birds', candidateId: 'hedwig' })
    for (const p of r.parties) {
      const dots = groupsFor(p, r.quota).reduce((s, g) => s + g.dots, 0)
      expect(dots).toBe(p.votes)
    }
  })
})
