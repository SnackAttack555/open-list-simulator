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
 * How long the pre-ballot instruction screen stays up, in milliseconds.
 *
 * Long enough to read two short lines without feeling stalled. Both lines also
 * appear on the ballot itself, so this screen is emphasis rather than the only
 * place the information lives — and a tap skips it.
 */
export const PRIMER_MS = 2200

/**
 * localStorage key recording that this browser has seen the pre-ballot
 * instruction.
 *
 * Shown on the first ballot only. It exists to teach the two things a
 * first-timer misses; by the second election the reader already knows them, and
 * six of these on the way through six themes is the same nagging the ease
 * question was cut back for.
 */
export const PRIMER_SEEN_KEY = 'ols.primer-seen.v1'

/** 5-point ease scale, stored as 1..5. Order matters: index 0 is "easiest". */
export const EASE_OPTIONS = [
  { value: 1, label: 'Very easy', emoji: '😃' },
  { value: 2, label: 'Easy', emoji: '🙂' },
  { value: 3, label: 'In between', emoji: '😐' },
  { value: 4, label: 'Confusing', emoji: '🤔' },
  { value: 5, label: 'Very confusing', emoji: '😕' },
]

/**
 * localStorage key holding this browser's ballots: { [themeId]: {listId, candidateId} }.
 *
 * The choice is stored, not just the fact of voting, so someone returning a week
 * later still gets "you voted for Grogu" against the grown-up results instead of
 * an anonymous tally.
 */
export const VOTED_STORAGE_KEY = 'ols.ballots.v2'

/**
 * localStorage key recording that this browser has already been asked how the
 * ballot felt.
 *
 * Asked once ever, not once per election. The question is measuring a first
 * impression of an unfamiliar ballot, and there is only one of those per person —
 * by the second election the answer is about the app's novelty wearing off, which
 * is not the statistic this exists to produce. Re-asking also reads as nagging to
 * exactly the people engaged enough to try a second theme.
 */
export const EASE_ASKED_KEY = 'ols.ease-asked.v1'

/**
 * Votes accepted per IP hash per theme.
 *
 * Not 1. A classroom, an office, or a conference room shares a single public IP,
 * and a cap of 1 would lock out everyone after whoever voted first — the exact
 * opposite of useful for the setting this tool is built for. 35 covers a typical
 * room while still stopping a script.
 */
export const VOTE_CAP_PER_IP = 35
