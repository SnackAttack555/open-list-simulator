// Election rules and copy that the whole app agrees on.

/** Seats up for election in every simulated district. */
export const SEATS = 5

/**
 * "20% of the vote wins 1 spot, 40% wins 2, and so on."
 * Derived from SEATS so the copy can never drift from the math.
 */
export const QUOTA_PCT = Math.round(100 / SEATS)

export const QUOTA_SENTENCE = `${QUOTA_PCT}% of the vote wins 1 spot, ${QUOTA_PCT * 2}% wins 2, and so on.`

/** 5-point ease scale, stored as 1..5. Order matters: index 0 is "easiest". */
export const EASE_OPTIONS = [
  { value: 1, label: 'Very easy', emoji: '😃' },
  { value: 2, label: 'Easy', emoji: '🙂' },
  { value: 3, label: 'In between', emoji: '😐' },
  { value: 4, label: 'Confusing', emoji: '🤔' },
  { value: 5, label: 'Very confusing', emoji: '😕' },
]

/** localStorage key holding the theme ids this browser has already voted in. */
export const VOTED_STORAGE_KEY = 'ols.voted.v1'
