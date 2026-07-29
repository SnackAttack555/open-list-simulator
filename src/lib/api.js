/**
 * The only place the app talks to the server.
 *
 * In `npm run dev` there is no Pages Function to call, so requests fall back to a
 * local mock that generates a plausible electorate. That keeps the whole flow
 * playable without wrangler running. Under `wrangler pages dev` and in production
 * the real endpoints answer and the mock never runs — the fallback is gated on
 * import.meta.env.DEV so a production outage surfaces as an error rather than
 * quietly showing invented numbers.
 */

import { EASE_ASKED_KEY, VOTED_STORAGE_KEY } from '../config.js'
import { getTheme, getThemes } from '../data/index.js'
import { mockTallies } from './mockElectorate.js'

const isDev = import.meta.env?.DEV ?? false

/**
 * This browser's ballots: { [themeId]: {listId, candidateId} }.
 * One vote per theme per browser, so "312 people voted" means roughly 312 people.
 */
export function myBallots() {
  try {
    const raw = localStorage.getItem(VOTED_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {} // private mode or blocked storage — the server cap still applies
  }
}

export function hasVoted(themeId) {
  return Boolean(myBallots()[themeId])
}

/** The candidate this browser already picked in a theme, or null. */
export function myVoteIn(themeId) {
  return myBallots()[themeId] ?? null
}

/**
 * Has this browser already been asked how the ballot felt?
 *
 * Marked when the question is *shown*, not when it is answered — someone who
 * skipped it has been asked, and asking again is the nagging the flag exists to
 * prevent. Storage being unavailable means the question comes back, which is the
 * safe direction to fail: a duplicate answer costs one row, a suppressed one
 * costs the statistic.
 */
export function hasBeenAskedEase() {
  try {
    return localStorage.getItem(EASE_ASKED_KEY) === '1'
  } catch {
    return false
  }
}

export function markEaseAsked() {
  try {
    localStorage.setItem(EASE_ASKED_KEY, '1')
  } catch {
    /* nothing we can do, and nothing that should break the flow */
  }
}

function rememberVote(themeId, listId, candidateId) {
  try {
    const all = myBallots()
    all[themeId] = { listId, candidateId }
    localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* nothing we can do, and nothing that should break the flow */
  }
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} responded ${res.status}`)
  return res.json()
}

/** @returns {Promise<{tallies: Array, realVotes: number, seedVotes: number, ease: object}>} */
export async function fetchResults(themeId, regionId) {
  try {
    const res = await fetch(`api/results/${encodeURIComponent(themeId)}`)
    if (!res.ok) throw new Error(`results responded ${res.status}`)
    return await res.json()
  } catch (err) {
    if (!isDev) throw err
    return mockResults(themeId, regionId)
  }
}

/** Real vote counts per theme, for the start screen. */
export async function fetchThemeCounts(regionId) {
  try {
    const res = await fetch('api/counts')
    if (!res.ok) throw new Error(`counts responded ${res.status}`)
    return await res.json()
  } catch (err) {
    if (!isDev) throw err
    return mockCounts(regionId)
  }
}

/**
 * @returns {Promise<{token: string|null}>} token is needed to attach an ease answer.
 *
 * The local "already voted" record is written only once the server has actually
 * answered. Writing it first would burn someone's vote on a dropped request:
 * locked out of voting again, on a ballot that never reached the database. A
 * server response — including a silent over-cap one — does mean this device has
 * had its turn.
 */
export async function castVote({ themeId, listId, candidateId, regionId }) {
  try {
    const result = await postJson('api/vote', { themeId, listId, candidateId })
    rememberVote(themeId, listId, candidateId)
    return result
  } catch (err) {
    if (!isDev) throw err
    const result = mockCastVote({ themeId, listId, candidateId, regionId })
    rememberVote(themeId, listId, candidateId)
    return result
  }
}

export async function submitEase({ token, ease }) {
  try {
    return await postJson('api/ease', { token, ease })
  } catch (err) {
    if (!isDev) throw err
    return { ok: true }
  }
}

// --- Dev-only mock --------------------------------------------------------
// Session-scoped, so a vote cast in dev visibly moves the numbers.

const mockStore = new Map()

function mockState(themeId, regionId) {
  if (!mockStore.has(themeId)) {
    const theme = getTheme(themeId, regionId)
    if (!theme) throw new Error(`Unknown theme "${themeId}"`)
    mockStore.set(themeId, {
      tallies: mockTallies(theme),
      realVotes: 0,
      seedVotes: 800,
      ease: { 1: 210, 2: 340, 3: 90, 4: 28, 5: 11 },
    })
  }
  return mockStore.get(themeId)
}

function mockResults(themeId, regionId) {
  return structuredClone(mockState(themeId, regionId))
}

function mockCastVote({ themeId, listId, candidateId, regionId }) {
  const state = mockState(themeId, regionId)
  const row = state.tallies.find((t) => t.listId === listId && t.candidateId === candidateId)
  if (row) row.votes += 1
  state.realVotes += 1
  return { ok: true, recorded: true, token: 'dev-token' }
}

function mockCounts(regionId) {
  const counts = {}
  for (const theme of getThemes(regionId)) {
    counts[theme.id] = mockStore.get(theme.id)?.realVotes ?? 0
  }
  return counts
}
