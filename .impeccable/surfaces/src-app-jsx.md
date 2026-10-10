---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: ["src/sections/Intro.jsx","src/sections/Ballot.jsx","src/sections/WinnerTakeAll.jsx","src/sections/Proportional.jsx","src/sections/HowSeats.jsx","src/sections/PartySeats.jsx","src/sections/Wrap.jsx","src/components/StickyBar.jsx"]
---

# Surface: the whole app, v2.0 (src/App.jsx)

Scope: one scrolling page. Mode: Read, with one Operate step (the ballot) inside it.
Audience: a cold phone visitor with two minutes. Job: vote once, then understand why
their side got a seat under one system and nothing under the other.

Constraints from the brief (Augie, 2026-10-10): strip every word and control that is not
needed; sentences a fifth-grader reads, diagrams sparingly; one page that reveals the next
section from a sticky Next, scroll-back always possible; winner-take-all first, then PR;
first run per browser relabels parties so the visitor's party is never the plurality winner;
no world picker, `?theme=` with Detroit as default; dots only (bars parked); no ease question.

## Direction contract

THESIS: a news article, not a slideshow. The page is one column of short sentences that
grows downward as the reader taps Next; nothing is ever taken away from them. It refuses the
category default of a wizard with Back/Next and progress pips.

OWN-WORLD: the incumbent neutral world is kept: paper ground, ink text, one slate accent,
party colours only on things that belong to a party. Type goes up a size everywhere (17px
body, 26px section heads). Controls: exactly one solid button on screen, in a sticky bottom
bar. Seat marks are drawn checkmarks, never stars or glyphs. No eyebrows or kickers.

STORY: I vote. The old system gives my party nothing. The new system gives it a seat. Then
I learn why, in two short pictures: votes grouped into seats, and my party's most-voted
candidate taking the seat.

FIRST VIEWPORT: a heading and two sentences on paper, nothing else, with Start in the sticky
bar. The ballot arrives below it on tap.

FORM: brief-pinned (single reveal-scroll article); no seed roll, structure dictated by the
client's own notes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.
