# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Curious Michiganders who have never heard of open-list proportional representation. They arrive cold from a shared link or social post, on a phone, and will give it about two minutes. They know nothing about electoral systems and have no reason to read instructions. They do have opinions about Hogwarts houses, Detroit sports legends, and animation studios.

Secondary audiences: respondents in a user-testing panel (the dots-vs-bars study in `docs/ab-test-dots-vs-bars.md`), and rooms of people voting together from one shared IP (the reason the vote cap is 35, not 1). Neither of these is the audience to design for first.

## Product Purpose

People cast a ballot in a five-seat open-list election in a world they already care about, and only afterward see how their vote was counted. Success means two things. The visitor stops for a moment and thinks "that wasn't so hard" about a ballot type they would have assumed was complicated. Then the results show them their side got represented even though it didn't win everything.

The ease question that used to follow the ballot was dropped in 2.0. The reflection it prompted now comes from the contrast the page draws: the old system gives the visitor nothing, the new one gives their side a seat.

## Positioning

The ballot teaches by being obviously easy, and the results teach by showing the outcome. There's no tutorial and nothing to read first. Explanation is kept to a minimum on purpose: the visitor experiences proportional representation before anyone explains it to them, using the people and teams they'd vote for anyway.

## Operating Context

- Phone-first, one sitting, arriving from a link with no context.
- Flow (2.0): one scrolling page. Intro → ballot → winner-take-all result (their party gets nothing) → proportional result (their party gets a seat) → how the seats were decided → who filled their party's seat → the two percentages. A sticky Next reveals each section below the last; nothing above is ever removed. "Try another election" cycles to the next world.
- `?theme=` picks the world; missing or unknown means the region's own sports election (Detroit). There is no picker.
- First run per browser: if the visitor's party has the most votes, its total is swapped with the runner-up's (`src/lib/firstRun.js`) so the winner-take-all section always goes badly for them. No votes are invented and every later election is shown as counted.
- Each world starts with ~800 simulated voters so the first real visitor doesn't see a one-vote election. The page says once, at the end, that most of the votes are simulated.
- v1 ships a Michigan edition; the structure allows other state editions.

## Capabilities and Constraints

- Five seats per election. Hare quota plus largest remainder, no legal threshold. The two-step lesson: how many seats a party wins comes from its list total, and which candidates fill them comes from preference votes only.
- Four parties per world, five candidates per party (a content decision). Parties are displayed as "<Name> party".
- Ties are broken by a deterministic draw, and the UI calls it that: "drawn from a hat 🎩".
- One ballot per world per browser. A repeat visitor goes straight to their results with their original pick restored.
- The seat picture is dots only in 2.0. The bars arm (`?viz=bars`) is parked, parsing kept, and comes back for user testing in a later version.
- Ballot layout: every party stacked in one column; the cast button stays grey until the last party has been scrolled into view and a candidate is marked.
- Stack is established: React 19, Vite, Tailwind v4, Motion, served by a Cloudflare Worker with D1. Pushing to `main` deploys.
- Privacy: raw IPs are never stored (salted hash only), and no database credential ships to the browser.
- Open: custom domain (`docs/custom-domain.md`).

## Brand Commitments

- **Unbranded and neutral.** No PR Hub name, no advocacy framing, no campaign call to action. It should read as a fun tool, not a pitch.
- Free, non-commercial educational parody. Character, team, and studio names appear as plain text only. No images, logos, crests, wordmarks, or fetched art; only original color palettes and generic emoji. The footer says the app is unaffiliated with any rights holder.
- Voice: plain, short, no jargon, honest about mechanics (simulated voters are labeled; the hat draw is named).

## Evidence on Hand

- Five themed rosters in `src/data/themes.js`; the Michigan region and its Census-derived outline in `src/data/regions.js`.
- Results animation storyboards in `docs/` (`anim-storyboard-winners-first.html` is the built flow).
- No collected ease results, user-test findings, testimonials, or press yet. Don't invent them.

## Product Principles

1. **Do it, then understand it.** The visitor votes first and gets the explanation afterward, and only as much as the results need.
2. **Easy is the argument.** Anything that makes the ballot feel harder than it is works against the product's reason to exist.
3. **Their side got a seat.** The results lead with the visitor's own representation, not with the arithmetic.
4. **Honest mechanics.** Simulated voters, tie draws, and caps are named plainly, never hidden.
5. **Neutral, not a pitch.** The experience persuades by being fair and fun, never by advocating.
