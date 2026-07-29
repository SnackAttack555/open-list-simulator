import { UNIVERSAL_THEMES } from './themes.js'
import { getRegion } from './regions.js'

/**
 * The ordered theme list for an edition. The region's sports theme leads, because
 * the start screen shows that state's outline and the local franchises are the hook.
 */
export function getThemes(regionId) {
  return [getRegion(regionId).sportsTheme, ...UNIVERSAL_THEMES]
}

export function getTheme(themeId, regionId) {
  return getThemes(regionId).find((t) => t.id === themeId)
}

/**
 * The order candidates are printed in, on the ballot and in the results story.
 *
 * Alphabetical by first name, deliberately. Listing them by fame would mean the
 * top name usually wins, and the single most important thing this app has to
 * teach — that the printed order decides nothing, and a name at the bottom can
 * outpoll the one at the top — would almost never actually happen on screen.
 * An arbitrary-looking order makes the lesson demonstrate itself.
 *
 * Display-time only: the stored data keeps its authored order, so the simulated
 * electorate's popularity model stays attached to the right names.
 */
export function ballotOrder(candidates) {
  return [...candidates].sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

/**
 * How a list is named on screen: "Gryffindor party", "Lions party", "Dogs party".
 *
 * The word is doing teaching work, not decoration. Someone meeting proportional
 * representation for the first time has to carry one idea across the whole flow —
 * that a vote for a candidate is also a vote for that candidate's party — and the
 * word has to be attached to the thing every time it appears, or the ballot reads
 * as a list of sports teams and the results read as a different subject entirely.
 *
 * Takes a list object or a bare name, because the allocator flattens lists to
 * `listName` strings on winners and on the winner-take-all summary.
 */
export function partyName(list) {
  return `${typeof list === 'string' ? list : list.name} party`
}

/** Flat list of every candidate in a theme, tagged with its list. Used by seeding and tallying. */
export function allCandidates(theme) {
  return theme.lists.flatMap((list) =>
    list.candidates.map((cand) => ({
      listId: list.id,
      candidateId: cand.id,
      name: cand.name,
    })),
  )
}

export { UNIVERSAL_THEMES, getRegion }
export { REGIONS, DEFAULT_REGION } from './regions.js'
