/**
 * Pure election maths. No React; randomness only where a layout asks for it.
 *
 * Open-list proportional representation, Hare quota + largest remainder:
 *   1. a seat costs `total / SEATS` votes; every full quota a party holds is a seat
 *   2. seats still open go to the parties with the most leftover votes
 *   3. inside a party, the candidates with the most personal votes take its seats
 *
 * Ties are broken by total party votes, then by ballot order. The data is tuned so
 * none of that ever triggers, but the function stays total.
 *
 * A *layout* says how the neighbors' votes are dealt: `hands[partyId]` is which hand
 * of SHARES a party gets, and `slots[partyId][i]` is which value in that hand the
 * party's i-th candidate gets. Two layouts exist:
 *   - riggedLayout(vote): the first run. Your party is dealt second place, and your
 *     candidate takes the biggest share in it, so you lose under winner-take-all and
 *     your own candidate is elected under PR, whoever you picked.
 *   - randomLayout(vote): later runs. Cats or Dogs lead (never your party), the other
 *     hands and every party's shares are shuffled, so your party may come 2nd to 4th
 *     and your candidate may win or lose their party's seat. The hands are built so
 *     the split is still 2/1/1/1 and nothing ever ties.
 */

import { MY_PLACE, PARTIES, SEATS, SHARES } from './data.js'

export function riggedLayout(vote) {
  const others = SHARES.map((_, i) => i).filter((i) => i !== MY_PLACE)
  const hands = {}
  const slots = {}
  for (const p of PARTIES) {
    const mine = p.id === vote.partyId
    hands[p.id] = mine ? MY_PLACE : others.shift()
    const order = p.candidates.map((_, i) => i)
    if (mine) {
      // Your candidate takes the hand's biggest share; the others follow in ballot order.
      const k = p.candidates.findIndex((c) => c.id === vote.candidateId)
      slots[p.id] = order.map((i) => (i === k ? 0 : i < k ? i + 1 : i))
    } else {
      slots[p.id] = order
    }
  }
  return { hands, slots }
}

/** The parties that may lead: the two the reader is likeliest to have an opinion about. */
export const LEADERS = ['cats', 'dogs']

export function randomLayout(vote, rand = Math.random) {
  const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  // The leader is Cats or Dogs but never the reader's party; the other hands are shuffled.
  const leaders = LEADERS.filter((id) => id !== vote.partyId)
  const leader = leaders[Math.floor(rand() * leaders.length)]
  const rest = shuffle(SHARES.map((_, i) => i).filter((i) => i !== 0))
  const hands = {}
  const slots = {}
  PARTIES.forEach((p) => {
    hands[p.id] = p.id === leader ? 0 : rest.pop()
    slots[p.id] = shuffle(p.candidates.map((_, k) => k))
  })
  return { hands, slots }
}

export function runElection(vote, layout = riggedLayout(vote)) {
  const parties = PARTIES.map((party) => {
    const hand = SHARES[layout.hands[party.id]]
    const candidates = party.candidates.map((cand, i) => {
      const mine = vote.partyId === party.id && vote.candidateId === cand.id
      const votes = hand[layout.slots[party.id][i]] + (mine ? 1 : 0)
      return { ...cand, partyId: party.id, votes, mine }
    })
    const votes = candidates.reduce((sum, cand) => sum + cand.votes, 0)
    return { ...party, candidates, votes, mine: vote.partyId === party.id }
  })

  const total = parties.reduce((sum, p) => sum + p.votes, 0)
  const quota = total / SEATS

  for (const p of parties) {
    p.fullSeats = Math.floor(p.votes / quota)
    p.leftover = p.votes - p.fullSeats * quota
    p.seats = p.fullSeats
    p.wonLeftover = false
  }

  const fullSeats = parties.reduce((sum, p) => sum + p.fullSeats, 0)
  let open = SEATS - fullSeats
  const byLeftover = [...parties].sort((a, b) => b.leftover - a.leftover || b.votes - a.votes)
  const leftoverWinners = []
  for (const p of byLeftover) {
    if (open === 0) break
    p.seats += 1
    p.wonLeftover = true
    leftoverWinners.push(p)
    open -= 1
  }

  for (const p of parties) {
    p.ranked = [...p.candidates].sort((a, b) => b.votes - a.votes)
    p.ranked.forEach((cand, i) => {
      cand.elected = i < p.seats
    })
    p.winners = p.ranked.slice(0, p.seats)
  }

  // Finishing order by votes, for "came in 2nd".
  const standings = [...parties].sort((a, b) => b.votes - a.votes)
  standings.forEach((p, i) => {
    p.place = i + 1
  })

  const council = parties.flatMap((p) => p.winners.map((cand) => ({ ...cand, party: p })))
  const represented = parties.filter((p) => p.seats > 0).reduce((sum, p) => sum + p.votes, 0)

  // The other way of counting: one winner-take-all race, biggest party takes everything.
  const top = standings[0]
  const wta = {
    party: top,
    council: top.ranked.slice(0, SEATS).map((cand) => ({ ...cand, party: top })),
    represented: top.votes,
  }

  const party = parties.find((p) => p.id === vote.partyId)
  const candidate = party.candidates.find((c) => c.id === vote.candidateId)
  const me = { party, candidate, wtaElected: top.id === party.id }

  return {
    parties,
    standings,
    total,
    quota,
    fullSeats,
    leftoverWinners,
    council,
    represented,
    wta,
    me,
  }
}

/**
 * Split party totals (biggest first) across five districts of equal size, each
 * party's votes spread as evenly as possible with the extras dealt round the
 * districts in turn, so every district sums to the same number and the leader
 * is the biggest group in every one. Used by the districts picture.
 */
export function dealDistricts(totals, districts = 5) {
  const deal = Array.from({ length: districts }, () => [])
  let pointer = 0
  totals.forEach((votes, p) => {
    const base = Math.floor(votes / districts)
    const extra = votes % districts
    for (let d = 0; d < districts; d += 1) deal[d][p] = base
    for (let k = 0; k < extra; k += 1) {
      deal[pointer % districts][p] += 1
      pointer += 1
    }
  })
  return deal
}

/**
 * How a party's votes are drawn: full groups of one quota each, then whatever is
 * left as a partial group. A party under one quota gets just the partial group.
 */
export function groupsFor(party, quota) {
  const groups = []
  for (let i = 0; i < party.fullSeats; i += 1) {
    groups.push({ key: `${party.id}-full-${i}`, kind: 'full', dots: Math.round(quota) })
  }
  if (party.leftover > 0 || party.fullSeats === 0) {
    groups.push({
      key: `${party.id}-left`,
      kind: 'partial',
      dots: Math.round(party.leftover),
      won: party.wonLeftover,
    })
  }
  return groups
}

/** "Cats, Dogs, and Birds" (or "Dogs or Birds") */
export function listNames(names, conj = 'and') {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} ${conj} ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, ${conj} ${names[names.length - 1]}`
}
