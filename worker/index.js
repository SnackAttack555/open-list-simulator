import { json } from './shared.js'
import { castVote } from './api/vote.js'
import { attachEase } from './api/ease.js'
import { themeCounts } from './api/counts.js'
import { themeResults } from './api/results.js'

/**
 * The whole app: static files plus a small JSON API.
 *
 * This replaced a set of Cloudflare Pages Functions. Cloudflare's git builds run
 * `wrangler deploy`, which is the Workers deploy and refuses a Pages config, so
 * the repo and the platform disagreed on what this project was. A Worker with a
 * static-assets binding is the one shape where the command Cloudflare runs by
 * default is the command this repo is configured for.
 *
 * Requests that match a built file are served by the assets binding before they
 * ever reach this script. Everything else lands here: /api/* is answered below,
 * and anything else is handed back to the assets binding so unknown paths get a
 * normal 404 rather than a JSON error.
 */

const ROUTES = [
  { method: 'POST', path: '/api/vote', handler: (req, env) => castVote(req, env) },
  { method: 'POST', path: '/api/ease', handler: (req, env) => attachEase(req, env) },
  { method: 'GET', path: '/api/counts', handler: (req, env) => themeCounts(req, env) },
]

const RESULTS = /^\/api\/results\/([^/]+)$/

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    try {
      for (const route of ROUTES) {
        if (route.path === url.pathname) {
          if (route.method !== request.method) {
            return json({ error: `Use ${route.method}` }, 405)
          }
          return await route.handler(request, env)
        }
      }

      const match = url.pathname.match(RESULTS)
      if (match) {
        if (request.method !== 'GET') return json({ error: 'Use GET' }, 405)
        return await themeResults(request, env, decodeURIComponent(match[1]))
      }

      return json({ error: 'No such endpoint' }, 404)
    } catch (err) {
      // A thrown error would otherwise surface as a bare 500 with an HTML body,
      // which the client tries to parse as JSON. Keep the shape consistent.
      console.error('api error', url.pathname, err)
      return json({ error: 'Something went wrong handling that request' }, 500)
    }
  },
}
