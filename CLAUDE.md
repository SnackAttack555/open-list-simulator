# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A two-minute, phone-first mock election that teaches proportional representation by having the
reader do it: vote once on a ballot of Cats / Dogs / Birds / Fish, lose under winner-take-all,
then see the same 100 votes counted proportionally and learn why. One static page, no backend;
the only thing kept is a run counter in sessionStorage. It is a ground-up rewrite of version 2 (git history before "Version 3.0"); `PRODUCT.md`
and `docs/` are kept from it for the original vision, audience and deploy notes.

## Commands

```bash
npm install
npm run dev                                   # localhost:5173 (/ scroll story, /v3.html buttons)
npm run dev -- --host 100.118.60.31 --port 5180  # on the tailnet, for phone testing
npm run build                                 # static dist/
npm test                                      # all election maths (Vitest)
npx vitest run -t "no ties"                   # one test by name
npm run format                                # prettier; .prettierrc: no semicolons, single quotes, 96 cols
node scripts/click-through.mjs [url]          # headless Chrome: real ballot -> vote -> results, prints runtime errors
```

Deep link to any state for screenshots or review: `/?v=dogs.toto&n=4` opens the scroll story
(the front page) with that vote cast and card `n` (1 to 13) on screen; `v` is `party.candidate`.
Add `&run=2` for an unrigged deal. The Next-button page is `/v3.html` with the same `v` and
`run`; there `n` is how many steps of the count are revealed (1 to 9: wta, district x3, pr, how
x2, party, end). Deep links can't
exercise the click path, so after touching `App.jsx` or `Ballot.jsx` run the click-through script
too. If the dev server throws `X is not defined` for something that is on disk, `touch` the file:
Vite's watcher sometimes misses a formatter rewrite.

## How it fits together

**The first run is rigged on purpose; later runs are not; the tests enforce both.** `data.js`
holds four hands of candidate votes (`SHARES`), one per finishing place. A *layout* says which
party gets which hand and which candidate gets which share. `riggedLayout(vote)` (the first run
in a tab) gives the reader's party the second-place hand (27 votes) with the reader's candidate
on its biggest share, so whichever of the 20 candidates is picked: your party comes 2nd and gets
nothing under winner-take-all, the leader (37) would sweep, and under PR your party holds one
seat and your own candidate takes it. `randomLayout(vote)` (every run after, counted in
sessionStorage by `session.js`) gives the lead to Cats or Dogs (never your party) and shuffles
the other hands and every party's shares, so your party may come 2nd to 4th and your candidate
may lose. The hands are built so that under any layout the split is 2/1/1/1, three parties fill a
row, two win leftovers, and nothing ties. `election.test.js` runs every vote under the rigged
layout and every deal of the hands under the random one (2,400-odd cases), so any change to
`SHARES` or `PARTIES` has to keep the suite green or the copy in `sections.jsx` (which branches
on `me.wtaElected`, `me.elected`, `place` and `seats` but assumes two leftover seats) silently
goes wrong.

**`election.js` is pure** (Hare quota + largest remainder, open list) and returns everything the
page needs: per-party `fullSeats` / `leftover` / `seats` / `wonLeftover` / `place` / `ranked`,
the council, the winner-take-all counterfactual (`wta`), and `me`. Components never recompute
any of it.

**Two pages share the maths but not the pictures.** `index.html` + `src/v4/` is the front page,
the scroll story (the folder keeps its working name); `v3.html` + `src/App.jsx` + `sections.jsx`
is the earlier Next-button page with its several pictures. The scroll story is ONE picture (`src/v4/Crowd.jsx`, a hundred dots that only ever move) pinned to the
screen with `position: fixed` a tenth of the way down, thirteen text cards passing through the
screen over it, a card becoming active as its top enters the bottom quarter of the screen (so the
picture changes while it is wholly in view), each card naming the picture's `phase` (0 to 12:
your district's votes; the winner takes it and every voter with no one turns hollow; hold; zoom
out, the hundred gather in fives into twenty and the district shrinks to a tile; four
neighbouring tiles slide in; the tiles become one box and the dots travel into columns of
twenty while the winners turn into open seats, a question mark each; hold; the seats go over
their columns and become the matched animals as every dot fills in; hold; solid rings on the
full columns while the two leftover seats go back to question marks; dashed rings on the two
leftover winners and their animals return; your party's columns in focus; all back). Every
height in `scrolly.css` is in svh and App.jsx measures the pinned picture rather than
`window.innerHeight`: dvh or innerHeight change as a phone's address bar slides away and
would reflow the cards mid-scroll. A voter with no one is a hollow dot in its
own party colour, never a faded one. The leader is always Cats or Dogs and never the reader's
party (`election.LEADERS`), on every run. `src/lib/tracks.js` is the engine
both `Crowd` and `Districts` could share (Districts keeps its own copy): numbers in [0, 1],
tracks per frame, forwards or mirrored backwards, catch-up on retarget, a cut to the
neighbouring frame when more than one away, reduced motion snaps. Both pages use the same
`election.js`, `session.js` (the run counter) and components. Drop the scroll story by deleting `index.html`,
`src/v4/` and its line in `vite.config.js`, then renaming `v3.html` back to `index.html`.

**The page is a step machine over sections.** `sections.jsx` returns an ordered list of
`{ id, title, steps?, settle?(phase), body(phase) }`. `App.jsx` keeps one integer, `shown`, and
`visible()` maps it onto "which sections are rendered, and how far into the last one" (`steps`
defaults to 1; the seats section has 2, so its `body(1)` adds a paragraph and bumps `VoteDots`
to its next phase). The single sticky button either casts the vote, reveals the next step, or
restarts. Three behaviours live in `App.jsx` and are easy to break together:

- `revealScroll` scrolls down just enough that the new content's bottom clears the bar, but
  never past its top; it never scrolls up. A new section targets the `<section>`, a step inside
  one targets `.part:last-of-type`. A step whose section gives a `settle(phase)` time is two
  beats instead: `showScroll` brings the section's `.figure` to the top of the screen (in either
  direction) so the animation is watched, and after `settle` ms the new `.part.late` (whose
  `--late` delays its own fade-in by the same amount) is revealed with `revealScroll`.
  `VoteDots.settleTime(election)` is the source of that number, built from its `STAGGER`.
- The button is gated ("Keep reading") until the reader has scrolled to the page bottom; the
  last section gets `min-height` of one screen so a heading can always reach the top. That
  `min-height` is why `.sec` has `align-content: start` (without it grid rows stretch and the
  dots balloon).
- Effects compare against a `prev` ref instead of a first-run flag, because StrictMode double-
  runs effects in dev and would scroll on load.

The sticky bar height (102px) is hard-coded in both `App.jsx` (`BAR`) and `styles.css`
(`.sec:last-of-type`); change both.

**Pictures are annotated, never rearranged.** `Districts` is the one exception: three frames
driven by a `phase` prop (five fenced districts with one winner each and everyone else faded;
the merge into one district with the dots regrouped by party; the five seats shared out to match
the groups). Every position is a lerp between fixed spots, played by a requestAnimationFrame
loop as tracks that run forwards or mirrored backwards, so it checks prefers-reduced-motion
itself, and `DISTRICT_SETTLE` gives each frame's length to the section. Its per-district deal is
`election.dealDistricts(totals)`, tested to keep the leader biggest in every district. `VoteDots` lays every vote out in rows of 20 per
party and only adds layers by `phase` (0 dots, 1 full rows circled + seat icon, 2 leftover rows
dashed, losers faded, counts switch to "left over"). Stagger comes from a `--d` CSS variable per
group. `MiniDots` is the 100-voter grid with greys for "no one on the council"; both end in
`YouLegend`, which must mirror the reader's dot's actual state (grey when their party has no
seat).

**Colour is the only brand.** Party `color` fills dots and icons; party `text` is the darker
shade used for words. Components pass them down as `--c` / `--t` CSS variables. `inline.jsx`
(`<Party>`, `<Cand>`) colours names inside sentences; use it only where the name is the subject
of the sentence. Icons come from `lucide-react` via `PartyIcon` (cat/dog/bird/fish); there is no
hand-drawn art and no emoji.

## Writing and design rules that shape every change

These came from the owner during the build and are the reason the page looks the way it does
(the fuller version is in `.impeccable.md`):

- Strip any text or UI that doesn't need to be there. One button on screen, no eyebrows,
  progress dots, labels, stats tables or fine print.
- Plain sentences a ten-year-old can follow; a picture only where a sentence can't do the job.
  Keep numbers out of prose when the picture already shows them.
- Let a picture answer: the seats section shows the rows and nothing under them, and Next
  circles the leftover winners before the sentence naming them appears.
- Animations only when they represent something (votes counting in, a row being circled to
  earn a seat, losers fading). No decorative pops or staggers.
- Single quotes to flag a term being introduced: "each seat ‘costs’ 20 votes".
- No em-dashes anywhere; rewrite the sentence instead.
