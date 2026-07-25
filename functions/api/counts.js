import { json } from '../_shared.js'

/**
 * Real vote counts per theme, for the start screen. Seed votes are excluded
 * deliberately: "312 voted" should mean 312 people, not 312 people plus a
 * synthetic electorate.
 */
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT theme_id AS themeId, COUNT(*) AS n
       FROM votes
      WHERE is_seed = 0
      GROUP BY theme_id`,
  ).all()

  const counts = {}
  for (const row of results ?? []) counts[row.themeId] = row.n
  return json(counts)
}
