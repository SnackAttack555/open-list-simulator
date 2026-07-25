import { badRequest, json, readJson } from '../_shared.js'

/**
 * Attaches an ease answer to a vote already recorded.
 *
 * Requires the vote's opaque token, and only fills a NULL — so an answer can't be
 * changed after the fact and nobody can set the ease on someone else's ballot.
 * That matters because "93% said the ballot was easy" is the one number this app
 * exists to produce, and a number anyone can stuff is worth nothing.
 */
export async function onRequestPost({ request, env }) {
  const body = await readJson(request)
  if (!body) return badRequest('Expected a JSON body')

  const { token, ease } = body
  if (typeof token !== 'string' || token.length < 8) return badRequest('A valid token is required')

  const value = Number(ease)
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return badRequest('ease must be an integer from 1 to 5')
  }

  const result = await env.DB.prepare(
    'UPDATE votes SET ease = ? WHERE token = ? AND ease IS NULL',
  )
    .bind(value, token)
    .run()

  // Already answered, or an unknown token. Either way there is nothing the client
  // should do about it, so don't turn it into an error the user could see.
  return json({ ok: true, recorded: (result.meta?.changes ?? 0) > 0 })
}
