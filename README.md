# Five Seats

A two-minute mock election that teaches proportional representation by having you
do it. You and 99 simulated neighbors elect a five-seat town council from four parties
(Cats, Dogs, Birds, Fish). You cast one vote, then watch the count: every 20 votes is a
seat, leftovers decide the last seats, the most-voted candidates in your party fill its
seats, and finally the same 100 voters are shown under winner-take-all.

Ground-up rewrite of version 2 (2026-10-10, in this repo's history), stripped to the
essentials. `PRODUCT.md` keeps the original vision; this version keeps the lesson and drops
everything else.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (/ is the scroll story, /v3.html the Next-button page)
npm test           # election maths, all 20 possible votes (Vitest)
npm run build      # static output in dist/, deploy anywhere
```

Deep link for testing: `/?v=dogs.snoopy&n=3` (vote as `party.candidate`, `n` the card to open
on, 1 to 11; add `&run=2` for an unrigged deal). On `/v3.html`, `n` is how many steps of the
count are revealed, 1 to 9.

The front page (`index.html`, code in `src/v4/`) is the lesson told as a scroll story: one
picture of a hundred dots that only ever moves (your district, zoom out, the neighbours, merge
into one, seats shared out), eleven text cards scrolling over it, no Next button. The earlier
Next-button telling is kept at `/v3.html` so the two can be compared; the rest of this file
describes that page.

## Shape

One scrolling page, read like an article. Intro and ballot at the top; casting a vote
replaces the ballot with a one-line receipt and reveals the first section of the count.
The single sticky button at the bottom reveals each next section and scrolls to it, and
nothing is ever removed, so the reader can scroll back up at any point. The sections:

1. The votes are in: counted winner-take-all first, the familiar way. Five seats of one
   colour, the 100 voters with 63 greyed out, and your party came second and got nothing.
2. One bigger district, in three frames: five small districts where one party is the
   biggest group but never half, and still wins every seat; the merge into one district
   with the voters regrouped by party; then "What if everyone's voice was represented?"
   and the five seats shared out to match the groups. Replays when scrolled back into view.
3. Same votes, counted a different way: the proportional legislature, everyone coloured in.
4. How the seats were decided: the rows-of-twenty picture (full rows get a seat, the
   biggest leftovers get the last seats).
5. Your party's seat: its candidates ranked, a seat on the winner.
6. Every vote counted, and the name for it.

**It always goes badly for you first.** On the first run in a tab the 99 neighbors are
dealt out after you vote (`SHARES` in `src/data.js`): your party comes second with 27 votes,
another party leads with 37 and would sweep under winner-take-all, and under PR your party
holds one seat and your own candidate takes it. From the second run on the deal is random:
Cats or Dogs lead (never your party), your candidate may lose, but the split is always 2/1/1/1. `npm test`
checks every vote under every deal.

## What changed from the original, and why

- **No world picker, no backend, no persistence.** One fixed world and a dealt electorate
  of 99 means the numbers can be hand-tuned: exactly 100 votes, a quota of exactly 20,
  every dot is one person, and the story is the same whichever candidate you pick
  (`src/election.test.js` proves it). The original's shared live tally made every number
  approximate ("each dot is about 10 votes") and needed a Worker and a database.
- **One page instead of screens.** Three sentences of intro, then the ballot, then the
  count revealed a section at a time below. The reader always has the whole story above
  them.
- **Sentences first, pictures sparingly.** Every section is written for a ten-year-old.
  Four pictures total, each only where a sentence couldn't carry the idea.
- **Ballot as an accordion, not a carousel.** All four parties are visible at once on a
  phone with no party pre-opened, so none gets the first-card advantage the original
  documented. Scantron-style ovals make "mark one" self-explanatory. The button label
  carries the choice ("Vote for Snoopy"), so there is no separate status line.
- **The count is one picture.** Dots in rows of 20 per party; full rows outlined and
  seated, leftover rows dashed, the biggest get the last chairs, the rest fade. The
  original regrouped dots between beats and had to size a scale ladder to stay legible.
- Dropped: the world picker, the primer, the ease survey, the dots-vs-bars A/B, the
  "drawn from a hat" tie copy (the data can't tie), progress dots, back buttons, section
  labels, stats tables, fine print, Tailwind and Motion.

## Layout

```
src/data.js             the world: parties, candidates, simulated votes
src/election.js         pure maths: Hare quota + largest remainder, open list
src/election.test.js    npm test (Vitest)
src/App.jsx             the page: intro, ballot, revealed sections, the one button
src/sections.jsx        the five sections of the count, copy and all
src/components/         Ballot, VoteDots, Districts, PartyList, Council, MiniDots,
                        PartyIcon (Lucide cat/dog/bird/fish), inline (coloured names)
variants/               the three candidate figures for "One bigger district" (B was chosen)
src/styles.css          all styling; oklch tokens at the top
```

Content is plain-text parody of well-known characters, no images or logos.
