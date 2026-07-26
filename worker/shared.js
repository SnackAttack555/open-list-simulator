/** Helpers shared by the API handlers. */

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Tallies change with every vote; a cached answer would show stale results.
      'Cache-Control': 'no-store',
    },
  })

export const badRequest = (message) => json({ error: message }, 400)

/**
 * Salted SHA-256 of the caller's IP. The raw address is never written anywhere.
 *
 * VOTE_SALT must be set as a Worker secret. Without it we fall back to a
 * constant, which still avoids storing raw IPs but makes the hashes guessable
 * across deployments — so this warns rather than failing shut, since blocking
 * every vote over a missing env var would be worse than a weak salt.
 */
export async function hashIp(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const salt = env.VOTE_SALT
  if (!salt) console.warn('VOTE_SALT is not set; IP hashes are guessable')
  const bytes = new TextEncoder().encode(`${salt ?? 'unsalted'}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Reads a JSON body without throwing on malformed input. */
export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}
