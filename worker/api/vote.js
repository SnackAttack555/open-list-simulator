import { badRequest, hashIp, json, readJson } from '../shared.js'
import { VOTE_CAP_PER_IP } from '../../src/config.js'
import { getThemes } from '../../src/data/index.js'
import { REGIONS } from '../../src/data/regions.js'

/**
 * Every (theme, list, candidate) triple that exists, across every region.
 * Built once per isolate. Without this check a caller could POST arbitrary
 * strings and invent candidates in the tally.
 */
let validTriples = null
function isRealCandidate(themeId, listId, candidateId) {
  if (!validTriples) {
    validTriples = new Set()
    for (const regionId of Object.keys(REGIONS)) {
      for (const theme of getThemes(regionId)) {
        for (const list of theme.lists) {
          for (const cand of list.candidates) {
            validTriples.add(`${theme.id}/${list.id}/${cand.id}`)
          }
        }
      }
    }
  }
  return validTriples.has(`${themeId}/${listId}/${candidateId}`)
}

export async function castVote(request, env) {
  const body = await readJson(request)
  if (!body) return badRequest('Expected a JSON body')

  const { themeId, listId, candidateId } = body
  if (!themeId || !listId || !candidateId) {
    return badRequest('themeId, listId and candidateId are all required')
  }
  if (!isRealCandidate(themeId, listId, candidateId)) {
    return badRequest('No such candidate on that list')
  }

  const ipHash = await hashIp(request, env)

  const guard = await env.DB.prepare('SELECT n FROM vote_guards WHERE ip_hash = ? AND theme_id = ?')
    .bind(ipHash, themeId)
    .first()

  if ((guard?.n ?? 0) >= VOTE_CAP_PER_IP) {
    // Report success but record nothing. A caller who learns they were blocked
    // learns what to change; one who doesn't, doesn't.
    return json({ ok: true, recorded: false, token: null })
  }

  const token = crypto.randomUUID()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO votes (token, theme_id, list_id, candidate_id, is_seed)
       VALUES (?, ?, ?, ?, 0)`,
    ).bind(token, themeId, listId, candidateId),
    env.DB.prepare(
      `INSERT INTO vote_guards (ip_hash, theme_id, n, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT (ip_hash, theme_id)
       DO UPDATE SET n = n + 1, updated_at = datetime('now')`,
    ).bind(ipHash, themeId),
  ])

  return json({ ok: true, recorded: true, token })
}
