import { describe, it, expect } from 'vitest'
import { relabelForFirstRun } from './firstRun.js'
import { allocate } from './allocate.js'
import { getThemes } from '../data/index.js'
import { mockTallies } from './mockElectorate.js'

const theme = getThemes('mi')[0] // Detroit
const tallies = mockTallies(theme)

const totalsOf = (rows) => {
  const t = {}
  for (const r of rows) t[r.listId] = (t[r.listId] ?? 0) + r.votes
  return t
}
const leaderOf = (rows) =>
  Object.entries(totalsOf(rows)).sort((a, b) => b[1] - a[1])[0][0]

describe('relabelForFirstRun', () => {
  const leader = leaderOf(tallies)
  const other = theme.lists.find((l) => l.id !== leader).id

  it('leaves the tally alone when my party is not the leader', () => {
    const out = relabelForFirstRun(theme, tallies, { listId: other, candidateId: 'x' })
    expect(out).toBe(tallies)
  })

  it('swaps my party with the runner-up when my party leads', () => {
    const out = relabelForFirstRun(theme, tallies, { listId: leader, candidateId: 'x' })
    const before = totalsOf(tallies)
    const after = totalsOf(out)
    const runner = Object.entries(before).sort((a, b) => b[1] - a[1])[1][0]
    expect(after[leader]).toBe(before[runner])
    expect(after[runner]).toBe(before[leader])
    expect(leaderOf(out)).not.toBe(leader)
  })

  it('invents no votes: the grand total is unchanged', () => {
    const out = relabelForFirstRun(theme, tallies, { listId: leader, candidateId: 'x' })
    const sum = (rows) => rows.reduce((s, r) => s + r.votes, 0)
    expect(sum(out)).toBe(sum(tallies))
  })

  it('keeps each candidate order inside the swapped parties', () => {
    const out = relabelForFirstRun(theme, tallies, { listId: leader, candidateId: 'x' })
    const order = (rows, id) =>
      rows
        .filter((r) => r.listId === id)
        .sort((a, b) => b.votes - a.votes)
        .map((r) => r.candidateId)
    expect(order(out, leader)).toEqual(order(tallies, leader))
  })

  it('still gives my party a seat under PR and none under winner-take-all', () => {
    const out = relabelForFirstRun(theme, tallies, { listId: leader, candidateId: 'x' })
    const result = allocate(theme, out)
    expect(result.lists.find((l) => l.id === leader).seats).toBeGreaterThan(0)
    expect(result.wta.listId).not.toBe(leader)
  })

  it('is a no-op without a vote', () => {
    expect(relabelForFirstRun(theme, tallies, null)).toBe(tallies)
  })
})
