# Open-List PR Simulator

A phone-first web app that lets someone cast a ballot in an open-list proportional
election — for Hogwarts houses, Detroit sports legends, animation studios — and only
then shows them how their vote was counted.

The design constraint is **minimum explanation**. No tutorial, no primer. The ballot
teaches by being obviously easy; the results teach by showing that the voter's side got
represented even though it didn't win everything.

## Running it

```bash
npm install
npm run dev          # UI only, on a mock electorate — no database needed
```

`npm run dev` has no backend, so `src/lib/api.js` falls back to a local mock that
generates the same synthetic electorate the real seed uses. The fallback is gated on
`import.meta.env.DEV`, so a production outage surfaces as an error rather than quietly
showing invented numbers.

To run the real Worker and a local D1 database:

```bash
npm run db:reset     # generate seed.sql, apply schema + seed to local D1
npm run preview:full # build, then serve the real Worker + D1 locally
```

```bash
npm test             # 33 assertions against the seat-allocation maths
npm run lint
```

## Changing the content

Almost everything lives in two files.

- **`src/data/themes.js`** — the five universal rosters. Adding a theme means appending
  one object. Five candidates per list.
- **`src/data/regions.js`** — what varies by state edition: the sports roster and the
  state outline. v1 ships Michigan only.

The one rule: **`id` values are written into the database.** Renaming an `id` orphans
every vote already cast for it. Change a `name` freely; never an `id`.

To add a state edition, add an entry to `REGIONS` and generate its outline from Census
data — never by hand:

```bash
npm i -D us-atlas d3-geo topojson-client
node scripts/generate-outline.mjs 08     # Colorado; Michigan is 26
npm uninstall us-atlas d3-geo topojson-client
```

Paste the printed `viewBox` and `path` into the region. Those three packages are
deliberately not installed — they exist only to produce a string, and keeping them
would mean carrying a build dependency for a constant.

## How the election works

Five seats. **Hare quota plus largest remainder**: 20% of the vote wins one spot, 40%
wins two, and leftover seats go to whoever came closest. No legal threshold — at five
seats the ~17% natural threshold does the work.

Two independent steps, which is the whole teaching point:

1. **How many** seats each list wins — from the list's total votes.
2. **Which** candidates fill them — from preference votes alone. The order written in
   `themes.js` is never consulted.

`src/lib/allocate.js` is pure: no React, no network, no clock, no randomness. It works
in integer arithmetic (scaling by seats rather than dividing by the quota) so a list
sitting exactly on the quota boundary wins its seat instead of losing it to floating
point error. Ties resolve through a deterministic FNV-1a draw — a real election draws a
fresh lot, but a lot that re-rolled on every React render would make winners flicker.
The UI calls it what it is: "drawn from a hat 🎩".

## The synthetic electorate

The first real visitor would otherwise land on a results screen containing their own
single vote, which teaches nothing. So each theme starts with ~800 simulated voters, and
the results screen says plainly how many are simulated.

`src/lib/mockElectorate.js` is shared by the dev mock and the real seed, so what you tune
in dev is what ships. List shares come from a fixed shape rather than raw randomness,
because a seeded election where one list sweeps teaches the wrong lesson on the very
first visit. Preference votes follow a fame curve with jitter — enough that neighbours
trade places, not enough that a fifth-listed name leapfrogs a first-listed one.

Seeding is idempotent. Re-running leaves 4,800 rows, not 9,600. Real votes are never
touched.

## Data and abuse control

Votes go through the Worker, not straight from the browser, so no database
credential ships in the page.

- The `(theme, list, candidate)` triple must exist. Posting a real name on the wrong
  list is refused too.
- **IP addresses are never stored** — only a salted SHA-256, and `VOTE_SALT` must be set
  as a secret.
- **35 votes per IP hash per theme.** Not 1: a classroom, office, or conference room
  shares one public IP, and a cap of 1 would lock out everyone after whoever voted
  first. Over the cap the API returns success and records nothing, so a script gets no
  signal to optimise against.
- One ballot per theme per browser, in `localStorage`. A repeat visitor lands on the
  results with their original pick restored, so the personal payoff still reads correctly
  however much the election has grown. The local record is written only after the server
  answers — writing it first would burn someone's vote on a dropped request.
- Ease answers attach via an opaque per-vote token and only fill a `NULL`, so the one
  statistic this app exists to produce can't be stuffed or rewritten.

## Deploying

**Pushing to `main` deploys.** The Cloudflare Worker is connected to this repo and runs
`npm run build` then `npx wrangler deploy` on every push. Nothing else to do.

This is a Worker serving static assets, not a Pages project — see the note in
`wrangler.toml`. That matters because Cloudflare's git builds run `wrangler deploy`, and
against the old Pages config that command failed outright.

To deploy by hand, or from a fresh account:

```bash
npx wrangler login
npx wrangler d1 create ols-votes     # paste the returned id into wrangler.toml
npx wrangler secret put VOTE_SALT    # any long random string
npm run db:deploy                    # schema + seed against the remote database
npm run deploy                       # build + wrangler deploy
```

`VOTE_SALT` is a Worker secret, so it lives only in Cloudflare and never in the repo.
Without it the API still runs and still never stores raw IPs, but it logs a warning and
the hashes become guessable.

For a custom domain, add it under the Worker's **Domains** tab, then point one CNAME at
it. A path like `representation.vote/mi-sim` is *not* reachable from Namecheap DNS — a
path has to be served by whatever already serves the apex domain, which would mean
moving the domain's nameservers to Cloudflare. The app hardcodes no absolute URLs and no
base path, so either choice works later with no code change.

## Content and rights

Character and film names appear as plain text in a free, non-commercial educational
parody. There are no images, logos, crests, studio wordmarks, or fetched art anywhere —
only original colour palettes and generic emoji. The footer states the app is
unaffiliated.
