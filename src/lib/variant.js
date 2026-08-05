/**
 * Which Act 1 graphic this visit gets, and which election it starts on.
 *
 * A survey firm splits its own panel and sends each half a different link, so
 * the app never randomises and never records the arm — it only has to honour
 * the link and then stop changing its mind. The resolution happens once, at
 * module load, for two reasons: StrictMode double-invokes effects, and a value
 * that could be recomputed mid-visit is a value that could flip mid-visit.
 *
 * `resolveViz` is kept pure and separately exported so the precedence table can
 * be tested without a DOM, the same way `allocate.js` keeps the arithmetic away
 * from React.
 */

import { DEFAULT_VIZ, THEME_PARAM, VIZ_PARAM, VIZ_STORAGE_KEY, VIZ_VARIANTS } from '../config.js'

/**
 * Tolerant matching, deliberately. These links are pasted into survey
 * platforms and email templates by people who never see this code, and the
 * failure mode of a strict parser is a whole arm of a study silently served the
 * control. `?VIZ=Bars%20` and `?viz=bar` both mean bars.
 */
function normaliseViz(raw) {
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  if (VIZ_VARIANTS.includes(value)) return value
  if (value === 'dot') return 'dots'
  if (value === 'bar') return 'bars'
  return null
}

/**
 * Case-insensitive parameter lookup. URLSearchParams is case-sensitive on keys,
 * and `?VIZ=bars` from a mail merge that upper-cased a template is exactly the
 * kind of thing that would otherwise fail silently.
 */
function param(search, name) {
  let found = null
  for (const [key, value] of new URLSearchParams(search ?? '')) {
    if (key.trim().toLowerCase() === name) found = value // last wins, as URLSearchParams.get does not
  }
  return found
}

/**
 * The precedence table, in one place:
 *
 *   1. a valid `viz` in the URL wins, and overwrites what was stored
 *   2. otherwise a valid stored value (same tab, earlier navigation)
 *   3. otherwise the default
 *
 * An invalid value is treated as absent and must *not* overwrite storage —
 * otherwise a typo halfway through a visit would knock a respondent out of
 * their arm. `warn` is reported rather than swallowed so the caller can log it;
 * a broken survey link is worth a console line in production, not just in dev.
 */
export function resolveViz({ search, stored } = {}) {
  const raw = param(search, VIZ_PARAM)
  const fromUrl = normaliseViz(raw)
  if (fromUrl) return { viz: fromUrl, store: fromUrl, warn: null }

  const warn =
    raw != null && raw.trim() !== ''
      ? `Ignoring unrecognised ?${VIZ_PARAM}=${raw} — expected one of ${VIZ_VARIANTS.join(', ')}.`
      : null

  const fromStore = normaliseViz(stored)
  return { viz: fromStore ?? DEFAULT_VIZ, store: null, warn }
}

/** A valid theme id from `?theme=`, or null. Unknown ids fall through to the picker. */
export function resolveTheme(search, validIds = []) {
  const raw = param(search, THEME_PARAM)
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  return validIds.find((id) => id.toLowerCase() === value) ?? null
}

/**
 * Storage is wrapped in try/catch on both sides, matching the pattern in
 * `api.js`. Private mode, blocked storage and third-party-iframe partitioning
 * all mean the URL is the only carrier of the arm — which is why `?viz=` is
 * left in the address bar rather than cleaned up after reading.
 */
function readStored() {
  try {
    return sessionStorage.getItem(VIZ_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(value) {
  try {
    sessionStorage.setItem(VIZ_STORAGE_KEY, value)
  } catch {
    /* the URL still carries it */
  }
}

function readViz() {
  if (typeof window === 'undefined') return DEFAULT_VIZ
  const { viz, store, warn } = resolveViz({
    search: window.location.search,
    stored: readStored(),
  })
  if (warn) console.warn(warn)
  if (store) writeStored(store)
  return viz
}

/** Resolved once, on import. */
export const VIZ = readViz()
