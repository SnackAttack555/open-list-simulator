// Election rules and copy that the whole app agrees on.

/** Seats up for election in every simulated district. */
export const SEATS = 5

/**
 * "20% of the vote wins 1 spot, 40% wins 2, and so on."
 * Derived from SEATS so the copy can never drift from the math.
 */
export const QUOTA_PCT = Math.round(100 / SEATS)

export const QUOTA_SENTENCE = `${QUOTA_PCT}% of the vote wins 1 spot, ${QUOTA_PCT * 2}% wins 2, and so on.`

/**
 * localStorage key holding this browser's ballots: { [themeId]: {listId, candidateId} }.
 *
 * The choice is stored, not just the fact of voting, so someone returning a week
 * later still gets "you voted for Grogu" against the grown-up results instead of
 * an anonymous tally.
 */
export const VOTED_STORAGE_KEY = 'ols.ballots.v2'

/* ------------------------------------------------------------------ *
 * A/B test: how the seat-allocation picture is drawn
 *
 * Parked in 2.0 — the page draws dots only and `?viz=` is read by nothing.
 * Kept, with `src/lib/variant.js` and its tests, because the study comes back
 * in a later version and the parsing is the part worth not rewriting.
 *
 * A survey firm fields both versions to its own panel with its own
 * measurement instrument, so the app's whole job is to serve one visual or
 * the other from a link the firm controls, and to keep serving the same one
 * for the rest of the visit. Hence no variant column, no in-app question,
 * and no randomisation — see src/lib/variant.js.
 *
 * Strings only in this file. worker/api/vote.js imports it, so anything
 * touching `window` or `location` here would crash the Worker at module load.
 * ------------------------------------------------------------------ */

/** `?viz=bars` — which Act 1 graphic to draw. */
export const VIZ_PARAM = 'viz'

/** `?theme=hogwarts` — which election to open. Unknown or missing means the
 *  region's own sports election, which for Michigan is Detroit. */
export const THEME_PARAM = 'theme'

export const VIZ_VARIANTS = ['dots', 'bars']

/** No parameter means the version that has always shipped, so organic traffic
 *  stays out of the experiment. */
export const DEFAULT_VIZ = 'dots'

/**
 * sessionStorage key holding the arm this tab is in.
 *
 * sessionStorage, not localStorage: a stored 'bars' in localStorage would
 * outlive the tab and the study, so this browser would keep showing bars for
 * weeks afterwards. Failing to "you get the default" is recoverable; failing
 * to "you get a stale arm you can't see" is not.
 */
export const VIZ_STORAGE_KEY = 'ols.viz.v1'

/**
 * Votes accepted per IP hash per theme.
 *
 * Not 1. A classroom, an office, or a conference room shares a single public IP,
 * and a cap of 1 would lock out everyone after whoever voted first — the exact
 * opposite of useful for the setting this tool is built for. 35 covers a typical
 * room while still stopping a script.
 */
export const VOTE_CAP_PER_IP = 35
