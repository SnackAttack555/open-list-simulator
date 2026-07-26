import { json } from '../shared.js'

/**
 * Tallies for one theme.
 *
 * Seed and real votes are counted together — they're all votes — and reported
 * separately alongside so the results screen can state the split honestly.
 */
export async function themeResults(_request, env, themeId) {
  const [tallies, totals, ease] = await env.DB.batch([
    env.DB.prepare(
      `SELECT list_id AS listId, candidate_id AS candidateId, COUNT(*) AS votes
         FROM votes
        WHERE theme_id = ?
        GROUP BY list_id, candidate_id`,
    ).bind(themeId),
    env.DB.prepare(
      `SELECT
         SUM(CASE WHEN is_seed = 1 THEN 1 ELSE 0 END) AS seedVotes,
         SUM(CASE WHEN is_seed = 0 THEN 1 ELSE 0 END) AS realVotes
         FROM votes
        WHERE theme_id = ?`,
    ).bind(themeId),
    env.DB.prepare(
      `SELECT ease, COUNT(*) AS n
         FROM votes
        WHERE theme_id = ? AND ease IS NOT NULL
        GROUP BY ease`,
    ).bind(themeId),
  ])

  const easeCounts = {}
  for (const row of ease.results ?? []) easeCounts[row.ease] = row.n

  const totalsRow = totals.results?.[0] ?? {}

  return json({
    tallies: tallies.results ?? [],
    realVotes: totalsRow.realVotes ?? 0,
    seedVotes: totalsRow.seedVotes ?? 0,
    ease: easeCounts,
  })
}
