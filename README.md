# Open-List PR Simulator

A phone-first web app that lets someone cast a ballot in an open-list proportional
election — for Hogwarts houses, Detroit sports legends, animation studios — and only
then shows them how their vote was counted.

Version 2.0 is one scrolling page, read like an article. A sticky Next reveals the next
section under the one being read and nothing above is ever removed, so going back is
scrolling up. The order is the argument:

1. **Intro** — three sentences and Start.
2. **Ballot** — every party in one column. The button stays grey until the last party has
   been scrolled into view and a name is marked, then reads "Cast my vote for Barry Sanders".
3. **Winner takes all** — the party with the most votes takes all five seats; the visitor's
   party, which had votes, has nobody.
4. **Proportional representation** — the same votes, and one of the five is from their party.
5. **How did that happen?** — every vote as a dot, full rows of one seat's worth checked,
   leftovers to the closest. Plays through on its own; the sentences under it say the same.
6. **Who gets the party's seat?** — the party's most-voted candidate, shown by re-sorting
   the ballot order.
7. **The difference** — the two percentages, and "Try another election".

There is no world picker. `?theme=hogwarts` opens that election; missing or unknown means
the region's own sports election (Detroit for Michigan). "Try another election" cycles to
the next world.

**The first run is arranged** (`src/lib/firstRun.js`). The page only works if winner-take-all
goes badly for the visitor, and one vote in eight hundred can't make that happen. So on a
browser's first election, if the visitor's party has the most votes, its total is swapped
with the runner-up's — each party keeps its own candidates in their own proportions, at the
other party's size. No votes are invented, nothing else is touched, and every later election
is shown exactly as counted. This is deliberately the smallest arrangement that makes the
contrast certain; it is not labelled on the page.

The seat picture is dots only in 2.0. `docs/anim-storyboard-bars.html` and
`docs/ab-test-dots-vs-bars.md` describe the bars arm that 1.x served from `?viz=bars`; it
is parked, with its parsing and tests kept in `src/lib/variant.js`, and comes back for user
testing in a later version. The other storyboards in `docs/` are the record of how the
dots animation was designed.

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
npm test             # seat-allocation maths, first-run relabel, URL parsing
npm run lint
```

## Changing the content

Almost everything lives in two files.

- **`src/data/themes.js`** — the five universal rosters. Adding a theme means appending
  one object. **Four parties per theme, five candidates per party.** Four is a content
  decision, not a constraint the code enforces: five parties against five seats left
  the last party winning nothing often enough that the ballot looked like a trap.
  The word "party" is appended at display time by `partyName()` in `src/data/index.js`
  rather than baked into the names, so the data stays "Gryffindor" and the screen
  reads "Gryffindor party".
- **`src/data/regions.js`** — what varies by state edition: the sports roster and the
  state outline. v1 ships Michigan only.

The one rule: **`id` values are written into the database.** Renaming an `id` orphans
every vote already cast for it. Change a `name` freely; never an `id`.

Removing a party is safe on the seed side — `npm run db:deploy` deletes and rewrites
every `is_seed = 1` row per theme, so dropped parties disappear on the next seed. Real
votes cast for a removed party are left in the table and ignored: `allocate()` builds
from the theme and looks tallies up by id, so rows it doesn't recognise never reach the
arithmetic. Check for them before dropping a party, because those voters silently stop
being counted:

```sql
SELECT theme_id, list_id, COUNT(*) FROM votes
 WHERE is_seed = 0 AND list_id IN ('the','ids','you','are','dropping')
 GROUP BY theme_id, list_id;
```

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
- The `ease` column and `POST /api/ease` remain in the Worker. Nothing in 2.0 calls them;
  the ease question was dropped from the page.

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
