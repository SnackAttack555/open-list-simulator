/**
 * The one thing the page keeps between elections: how many have been run in
 * this browser tab, so the first can be rigged and the rest dealt at random.
 * It lives in sessionStorage and dies with the tab. Shared by both pages.
 */
import { PARTIES } from './data.js'
import { randomLayout, riggedLayout } from './election.js'

const RUNS = 'five-seats-runs'

export const runsSoFar = () => {
  try {
    return Number(sessionStorage.getItem(RUNS)) || 0
  } catch {
    return 0
  }
}

export const recordRun = (n) => {
  try {
    sessionStorage.setItem(RUNS, String(n))
  } catch {
    /* private mode: every run is the first */
  }
}

export const layoutFor = (vote, run) => (run > 1 ? randomLayout(vote) : riggedLayout(vote))

/** ?v=dogs.snoopy casts that vote; &run=2 deals it unrigged; &n=4 is page-specific. */
export function voteFromUrl() {
  const q = new URLSearchParams(window.location.search)
  const [partyId, candidateId] = (q.get('v') ?? '').split('.')
  const party = PARTIES.find((p) => p.id === partyId)
  const vote = party?.candidates.some((c) => c.id === candidateId)
    ? { partyId, candidateId }
    : null
  const run = Number(q.get('run')) || 1
  const n = Math.max(0, Number(q.get('n')) || 0)
  return { vote, run, n, layout: vote ? layoutFor(vote, run) : null }
}
