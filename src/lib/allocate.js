/**
 * Open-list PR seat allocation. Pure — no React, no network, no clock, no randomness.
 *
 * Two independent steps, which is the whole teaching point:
 *   1. HOW MANY seats each list wins — decided by the list's total votes (Hare quota)
 *   2. WHICH candidates fill them    — decided only by preference votes, never by list order
 */

import { SEATS } from '../config.js'

/**
 * FNV-1a. Used only to break ties reproducibly.
 *
 * A real election draws a fresh lot each time. We can't: the results screen
 * re-renders, and a lot that re-rolled on every render would make winners
 * flicker. So the "draw" is a fixed function of the id — arbitrary with respect
 * to vote counts and list order, which is the point of a lot, but stable for a
 * given tie. The same candidate always wins the same tie; one more vote for
 * either side dissolves it.
 */
export function drawHash(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/** Descending votes, then the lot, then id — so ordering is total and deterministic. */
const byVotesThenLot = (a, b) =>
  b.votes - a.votes || drawHash(a.id) - drawHash(b.id) || (a.id < b.id ? -1 : 1)

/**
 * @param {object} theme   a theme from src/data — { id, lists: [{ id, candidates }] }
 * @param {Array}  tallies flat rows: [{ listId, candidateId, votes }]
 * @param {number} seats
 */
export function allocate(theme, tallies, seats = SEATS) {
  const voteFor = new Map()
  for (const row of tallies ?? []) {
    voteFor.set(`${row.listId}/${row.candidateId}`, Math.max(0, Math.trunc(row.votes ?? 0)))
  }

  // --- Per-list and per-candidate vote totals -------------------------------
  const lists = theme.lists.map((list) => {
    const candidates = list.candidates.map((cand) => ({
      id: cand.id,
      name: cand.name,
      votes: voteFor.get(`${list.id}/${cand.id}`) ?? 0,
    }))
    return {
      id: list.id,
      name: list.name,
      emoji: list.emoji,
      color: list.color,
      votes: candidates.reduce((sum, cand) => sum + cand.votes, 0),
      candidates,
    }
  })

  const totalVotes = lists.reduce((sum, list) => sum + list.votes, 0)
  if (totalVotes === 0) return emptyResult(theme, lists, seats)

  // --- Step 1: how many seats per list -------------------------------------
  // Hare quota = totalVotes / seats. Rather than divide (and inherit floating
  // point error at exact boundaries — 200 votes against a quota of exactly 200
  // must yield 1 seat, not 0), scale up and stay in integers:
  //   automatic = floor(listVotes / quota) = floor(listVotes * seats / totalVotes)
  //   remainder = listVotes * seats - automatic * totalVotes
  // Every remainder shares the denominator totalVotes, so comparing these
  // integers ranks the fractional remainders exactly.
  const rows = lists.map((list) => {
    const scaled = list.votes * seats
    const automatic = Math.min(Math.floor(scaled / totalVotes), list.candidates.length)
    return {
      list,
      quotaSeats: automatic,
      remainder: scaled - Math.floor(scaled / totalVotes) * totalVotes,
      seats: automatic,
      remainderSeats: 0,
    }
  })

  // Leftover seats go to the largest remainders, one apiece — standard largest
  // remainder. Ties fall to the lot. A list already holding a seat for every
  // candidate it has is skipped and the seat passes down the queue; that can't
  // happen at 5 candidates and 5 seats, but the invariant should survive either
  // number changing.
  const queue = [...rows].sort(
    (a, b) =>
      b.remainder - a.remainder ||
      drawHash(a.list.id) - drawHash(b.list.id) ||
      (a.list.id < b.list.id ? -1 : 1),
  )

  let seatsLeft = seats - rows.reduce((sum, row) => sum + row.seats, 0)
  while (seatsLeft > 0) {
    const before = seatsLeft
    for (const row of queue) {
      if (seatsLeft === 0) break
      if (row.seats >= row.list.candidates.length) continue
      row.seats += 1
      row.remainderSeats += 1
      seatsLeft -= 1
    }
    if (seatsLeft === before) break // nobody left who can seat another candidate
  }

  // A remainder seat was genuinely drawn from a hat only if some other list held
  // the identical remainder and walked away with nothing. Computed after the
  // loop, against the untouched remainder values.
  for (const row of rows) {
    row.remainderTieBroken =
      row.remainderSeats > 0 &&
      rows.some(
        (other) =>
          other !== row && other.remainder === row.remainder && other.remainderSeats === 0,
      )
  }

  // --- Step 2: which candidates fill them ----------------------------------
  // Preference votes only. The order written in themes.js is never consulted.
  const resultLists = rows.map((row) => {
    const ranked = [...row.list.candidates].sort(byVotesThenLot)
    const candidates = ranked.map((cand, index) => {
      const elected = index < row.seats
      // A tie mattered only where it straddles the cutoff between in and out.
      const across = elected ? ranked[row.seats] : ranked[row.seats - 1]
      return {
        ...cand,
        rank: index + 1,
        elected,
        tieBroken: Boolean(across && across.votes === cand.votes),
      }
    })
    return {
      id: row.list.id,
      name: row.list.name,
      emoji: row.list.emoji,
      color: row.list.color,
      votes: row.list.votes,
      votePct: (row.list.votes / totalVotes) * 100,
      seats: row.seats,
      quotaSeats: row.quotaSeats,
      remainderSeats: row.remainderSeats,
      remainderTieBroken: row.remainderTieBroken,
      candidates,
    }
  })

  // Seat-token order for the results animation: quota seats first, remainder
  // seats last, so "the leftovers go to whoever came closest" is something the
  // viewer watches happen rather than reads about.
  const elected = (list) => list.candidates.filter((cand) => cand.elected)
  const seatOrder = [
    ...resultLists.flatMap((list) =>
      elected(list)
        .slice(0, list.quotaSeats)
        .map((cand) => ({ listId: list.id, candidateId: cand.id, viaRemainder: false })),
    ),
    ...resultLists.flatMap((list) =>
      elected(list)
        .slice(list.quotaSeats)
        .map((cand) => ({ listId: list.id, candidateId: cand.id, viaRemainder: true })),
    ),
  ]

  // --- The counterfactual --------------------------------------------------
  const wtaWinner = [...resultLists].sort(byVotesThenLot)[0]
  const wtaSeats = Math.min(seats, wtaWinner.candidates.length)

  const representedVotes = resultLists
    .filter((list) => list.seats > 0)
    .reduce((sum, list) => sum + list.votes, 0)

  return {
    themeId: theme.id,
    seats,
    totalVotes,
    quota: totalVotes / seats,
    lists: resultLists,
    seatOrder,
    winners: seatOrder.map((seat) => {
      const list = resultLists.find((l) => l.id === seat.listId)
      const cand = list.candidates.find((x) => x.id === seat.candidateId)
      return {
        listId: list.id,
        listName: list.name,
        listEmoji: list.emoji,
        color: list.color,
        candidateId: cand.id,
        name: cand.name,
        votes: cand.votes,
        viaRemainder: seat.viaRemainder,
        tieBroken: cand.tieBroken,
      }
    }),
    pctRepresented: (representedVotes / totalVotes) * 100,
    wta: {
      listId: wtaWinner.id,
      listName: wtaWinner.name,
      listEmoji: wtaWinner.emoji,
      color: wtaWinner.color,
      seats: wtaSeats,
      winners: wtaWinner.candidates.slice(0, wtaSeats),
      pctRepresented: (wtaWinner.votes / totalVotes) * 100,
    },
  }
}

function emptyResult(theme, lists, seats) {
  return {
    themeId: theme.id,
    seats,
    totalVotes: 0,
    quota: 0,
    lists: lists.map((list) => ({
      ...list,
      votePct: 0,
      seats: 0,
      quotaSeats: 0,
      remainderSeats: 0,
      remainderTieBroken: false,
      candidates: list.candidates.map((cand, index) => ({
        ...cand,
        rank: index + 1,
        elected: false,
        tieBroken: false,
      })),
    })),
    seatOrder: [],
    winners: [],
    pctRepresented: 0,
    wta: null,
  }
}

/**
 * Where a voter's own mark landed. Drives the personal payoff line, which is the
 * emotional point of the whole results screen.
 */
export function describeMyVote(result, vote) {
  if (!vote || !result?.totalVotes) return null
  const list = result.lists.find((l) => l.id === vote.listId)
  const cand = list?.candidates.find((x) => x.id === vote.candidateId)
  if (!list || !cand) return null
  return {
    candidateName: cand.name,
    candidateElected: cand.elected,
    candidateRank: cand.rank,
    listName: list.name,
    listEmoji: list.emoji,
    listSeats: list.seats,
    color: list.color,
    // True whenever the voter's list won something — the "your vote still counted" case.
    representedByList: list.seats > 0,
  }
}
