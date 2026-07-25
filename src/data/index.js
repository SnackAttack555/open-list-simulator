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
