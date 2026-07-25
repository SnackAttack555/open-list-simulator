/**
 * Generates the synthetic electorate.
 *
 * Used by two callers that must agree: the dev-mode mock in api.js, and
 * scripts/generate-seed.mjs which writes the real seed rows into D1. Same
 * function, same numbers, so what you tune in dev is what ships.
 *
 * Two design constraints:
 *
 *  1. Every theme must produce a non-degenerate 5-seat split. A seeded election
 *     where one list sweeps teaches the wrong lesson on the very first visit, so
 *     list shares come from a fixed shape rather than from raw randomness. Which
 *     list draws the dominant share varies by theme; the shape does not.
 *
 *  2. Preference votes must correlate with fame but not track list order
 *     exactly. If the top-listed name always won, the app would look like it was
 *     rewarding list position — the precise misconception it exists to kill. So
 *     each candidate's weight is a Zipf curve over their position multiplied by
 *     a per-candidate jitter, which reliably swaps neighbours (Hermione outpolls
 *     Harry) while rarely dragging a bottom name over a top one.
 */

import { drawHash } from './allocate.js'

/** Vote-share shapes chosen so the resulting seat split is always interesting. */
const SHARE_SHAPES = {
  // 37/26/21/16 -> seats 2/1/1/1, everyone represented, WTA would take all 5 on 37%.
  4: [0.37, 0.26, 0.21, 0.16],
  // 32/24/19/14/11 -> seats 2/1/1/1/0, the 11% list shut out, WTA all 5 on 32%.
  5: [0.32, 0.24, 0.19, 0.14, 0.11],
}

/** mulberry32 — small, fast, and reproducible from a 32-bit seed. */
function rng(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * @param {object} theme
 * @param {number} total how many synthetic votes to distribute
 * @returns {Array<{listId: string, candidateId: string, votes: number}>}
 */
export function mockTallies(theme, total = 800) {
  const shape = SHARE_SHAPES[theme.lists.length]
  if (!shape) {
    throw new Error(
      `No share shape for a ${theme.lists.length}-list theme ("${theme.id}"). ` +
        `Add one to SHARE_SHAPES and check the resulting seat split is non-degenerate.`,
    )
  }

  // Which list gets which share: deterministic per theme, but not list order.
  const order = theme.lists
    .map((list, index) => ({ list, index, key: drawHash(`${theme.id}:${list.id}`) }))
    .sort((a, b) => a.key - b.key)

  const rows = []
  order.forEach(({ list }, shareIndex) => {
    const listTotal = Math.round(total * shape[shareIndex])

    // Zipf by position, jittered per candidate. Position still matters — famous
    // names are listed first — but neighbours swap often.
    const random = rng(drawHash(`${theme.id}:${list.id}:pref`))
    // 1/(i+1)^1.15 gives roughly a 6:1 spread from top name to bottom, which is
    // about what a fandom poll looks like. Jitter of 0.75-1.45 lets neighbours
    // trade places without letting a fifth-listed name leapfrog a first-listed one.
    const weights = list.candidates.map(
      (_, i) => (1 / Math.pow(i + 1, 1.15)) * (0.75 + random() * 0.7),
    )
    const weightSum = weights.reduce((a, b) => a + b, 0)

    const votes = weights.map((w) => Math.floor((listTotal * w) / weightSum))
    // Hand rounding slack to the list's strongest name rather than losing votes.
    const strongest = weights.indexOf(Math.max(...weights))
    votes[strongest] += listTotal - votes.reduce((a, b) => a + b, 0)

    list.candidates.forEach((cand, i) => {
      rows.push({ listId: list.id, candidateId: cand.id, votes: votes[i] })
    })
  })

  return rows
}
