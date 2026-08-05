# Serving dots vs bars for user testing

The results explanation draws Act 1 — votes by party, full groups, leftover seats — either
as **dots** (one dot ≈ 10 votes, countable) or as **bars** (each party's share of a
0–100% track). Which one teaches better is an open question, so the app can serve either
from a link.

Everything else is identical. Every headline, note, step count and progress pip comes from
`buildModel()` in `src/components/SeatStory.jsx`, which never receives the variant, so the
two arms are the same story drawn twice — by construction, not by inspection. Exactly one
line of copy differs, because it is the line that describes the graphic:

- dots — *Every dot is about 10 votes, and the colored dot includes yours.*
- bars — *Each bar is that party's share of all 800 votes, and yours is in the Lions party bar.*

## The links

```
https://open-list-simulator.adam-368.workers.dev/?viz=dots&theme=detroit
https://open-list-simulator.adam-368.workers.dev/?viz=bars&theme=detroit
```

`?viz=` picks the graphic. `?theme=` skips the world picker so both arms vote in the same
contest — otherwise half the panel is judging four parties they chose against four
somebody else chose. Theme ids are in `src/data/themes.js` and `src/data/regions.js`
(`detroit`, `hogwarts`, …); an unknown id just shows the picker.

No parameter means dots, exactly as the site has always behaved, so organic traffic stays
out of the experiment.

Parsing is deliberately forgiving: `?VIZ=BARS`, `?viz=Bars%20`, `?viz=bar` all work, and
the parameter can sit anywhere among a survey tool's tracking junk. An unrecognised value
is ignored, logs a console warning, and leaves the visit in whatever arm it was already in.

The arm is remembered in `sessionStorage` for the rest of the tab, so a respondent who
finishes one election and taps "Try another election" stays in their arm. It is *not*
remembered beyond the tab — a stored arm that outlived the study would keep showing bars
to people for weeks, and there would be nothing on screen to tell them. The parameter also
stays in the address bar, which is the fallback when storage is blocked or partitioned.

There is no in-app measurement and no `variant` column in the database. The firm splits its
own panel, so it already knows which arm each respondent is in, and it brings its own
instrument.

## Notes for whoever fields this

These can invalidate the study, so they matter more than the code does.

- **Field both arms in the same window, randomising per respondent, not per day.** The
  electorate grows as votes land, so the quota, the seat split, and how many seats go to
  leftover votes all drift. An arm fielded Wednesday can see a materially different
  election than one fielded Monday, and that difference would look like a difference
  between the visuals.
- **Stimulus length is not fixed in either arm.** The leftover-seats frame only exists when
  a leftover seat exists, and the final frame — who fills your own party's seats — is
  skipped entirely when the respondent's party won nothing. So respondents face 4, 5 or 6
  taps. This matters if you measure time-on-task, and it is the same in both arms.
- **Send each panelist exactly one link.** One ballot per election per browser, and the
  pre-ballot instruction screen and the ease question are once-per-browser. A respondent
  who gets both links skips straight to the results on the second, having seen neither
  ballot nor primer.
- **Consider raising `VOTE_CAP_PER_IP` (currently 35, in `src/config.js`) before fielding.**
  Over the cap the API returns success and records nothing. Hundreds of panel respondents
  behind carrier-grade NAT can exceed 35 per election from what looks like one address.
  Their own screen still reads correctly; the arm fielded into the busier period just
  contributes fewer votes to the tally.
- **Ask whether they redirect or iframe.** Inside a third-party iframe Safari partitions
  storage, so the URL becomes the only carrier of the arm — which is why the parameter is
  left in place rather than cleaned up after it is read.
- **The in-app ease question is not evidence here.** It fires between the ballot and the
  results, so it is pre-exposure and arm-neutral by construction.

## One honest asymmetry

The dots arm marks the reader's own vote with a pulsing ring around one dot. The bars arm
can't — a single vote is a fraction of a pixel of a bar — so it names the bar in the
caption instead. That is not an oversight to be fixed; it is one of the things being
tested. A share is a share at any turnout, and it is calmer and shorter on a phone, but the
quantity is abstract. The dots make the quota countable, which is the whole reason they
were built first, and their honest risk is that they take longer to parse.

The storyboards are side by side: `anim-storyboard-winners-first.html` (dots, built) and
`anim-storyboard-bars.html` (bars). They differ in three frames.
