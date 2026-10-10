---
name: Open-List Simulator
description: One paper column of short sentences; ink, one slate control, and party colour only where a party is.
colors:
  ink: "#14161a"
  ink-soft: "#5a6069"
  paper: "#f7f7f5"
  card: "#ffffff"
  line: "#d9dade"
  accent: "#2f4858"
  accent-soft: "#e4ebef"
  on-accent: "#ffffff"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  lead:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.375
  prose:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.375
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  table:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.25
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.625
rounded:
  row: "8px"
  control: "12px"
  card: "16px"
  pill: "9999px"
spacing:
  gutter: "20px"
  stack-xs: "6px"
  stack-sm: "12px"
  stack-md: "16px"
  stack-lg: "20px"
  stack-xl: "24px"
  section: "48px"
  page-top: "40px"
  touch: "56px"
  column: "560px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.lead}"
    rounded: "{rounded.control}"
    height: "56px"
    width: "100%"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "0"
  card-header:
    textColor: "{colors.on-accent}"
    typography: "{typography.prose}"
    padding: "12px 16px"
  ballot-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 16px"
    height: "56px"
  callout:
    textColor: "{colors.ink}"
    typography: "{typography.prose}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
  winner-row:
    textColor: "{colors.ink}"
    typography: "{typography.prose}"
    rounded: "{rounded.row}"
    padding: "6px 8px"
---

# Design System: Open-List Simulator

## Overview

**Creative North Star: "The Plain Newspaper Column"**

The page is a single newspaper column read on a phone held at arm's length. Everything is set on a warm off-white paper in near-black ink, and the whole system is deliberately unbranded: the only colour that carries meaning is a party's colour, and it appears only on things that belong to that party (a card header, a seat check, a dot, a tinted row). The one control, a solid slate button in a sticky bottom bar, is the single non-party colour on the page, and it is a tool, not an identity.

Density is low and sentence-sized. Sections stack downward with a fixed rhythm (48px between sections, 12px between sentences), and nothing is ever removed from above; the page grows like an article as the reader taps Next. Depth is almost absent: white cards with a hairline border, one soft two-layer shadow on the ballot, and tints at 8% opacity for emphasis. Motion is authored in two places only, a short rise when a section arrives and a self-playing seat picture, and every timer yields to the OS reduced-motion setting.

Confirmed rejections, from the shipped build: no wizard chrome (no Back button, no progress pips), no eyebrows or kickers above headings, no star or glyph seat marks, no decorative colour outside party data, no imported art or logos.

**Key Characteristics:**
- One 560px column, 20px gutters, grows downward and never shrinks
- Paper and ink neutrals; party colour is the only meaningful colour
- Exactly one solid button on screen, always in the sticky bottom bar
- System sans everywhere, sized up: 17px body, 18px section prose, 26px heads, 32px h1
- Drawn single-stroke check marks for seats, in both SVG and HTML
- Two authored motions, both short, both ease-out, both reduced-motion aware

## Colors

A neutral paper-and-ink palette with one slate control colour; party hues are data, not tokens.

### Primary
- **Slate** (`accent`): the sticky bar's solid button, the `:focus-visible` outline (2px, 2px offset), and the inset focus ring on ballot rows. It appears nowhere else.
- **Slate Wash** (`accent-soft`): text selection background only. It is defined on `:root` and otherwise unused in the build.
- **White on Slate** (`on-accent`): button label and card-header text over party colour.

### Neutral
- **Ink** (`ink`): body text, headings, SVG party labels.
- **Soft Ink** (`ink-soft`): parenthetical party names in winner lists, "your vote" labels, the "left over" counts in the seat picture, the loading line, and the footer disclaimer.
- **Paper** (`paper`): page ground; also the sticky bar at 95% opacity behind a backdrop blur.
- **Card** (`card`): ballot cards, the party-seat table.
- **Line** (`line`): card borders, row dividers, the sticky bar's top rule, and the unselected radio ring.

### Party colour (from data, not a token)
Each party in `src/data/themes.js` and `src/data/regions.js` carries one hex, chosen "dark enough to carry white text". The build uses it four ways: solid fill for card headers, seat checks, dots, and vote bars; white text on top of it; and an 8% tint (`${color}14`) as a row or callout wash. Never use a party colour for anything that is not that party.

### Named Rules
**The Party-Only Colour Rule.** Any hue that is not ink, paper, line, or slate must come from a party's data and sit only on that party's own element. There is no decorative colour.

**The One Slate Rule.** Slate exists for the single control and for focus. It never tints a surface, heading, or link.

**The Eight-Percent Wash Rule.** Emphasis by colour is a party tint at 8% opacity (hex alpha `14`) behind ink text; the text itself never changes colour.

## Typography

**Display Font:** system sans stack (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial)
**Body Font:** the same stack
**Label/Mono Font:** none; vote counts use `tabular-nums` on the body stack

**Character:** Unbranded and legible first. One family, two weights (400 and 600, with 500 for a winner's name), and a scale that is one step larger than the browser default throughout because the page is read on a phone at arm's length.

### Hierarchy
- **Display** (600, 32px, 1.15, tight tracking, `text-balance`): the page's single h1 in the intro.
- **Headline** (600, 26px, 1.25, tight tracking): every section h2.
- **Lead** (400, 19px, 1.375): the two intro sentences and the sticky button label (600 on the button).
- **Prose** (400, 18px, 1.375): every section paragraph, callout, winner-list row, and ballot card header (600 on the header).
- **Body** (400, 17px, 1.5): the base size on `body`; ballot candidate rows and the sticky bar's note line (500).
- **Table** (400, 16px, 1.25): party-seat table rows and their header; vote counts at 15px, 700, tabular.
- **Label** (600, 14px): the "your vote" tag; also the footer disclaimer at 14px/1.625 regular in soft ink.
- **SVG text:** 14px/600 ink for party labels in the seat picture, 13px soft ink for leftover counts.

### Named Rules
**The One-Step-Up Rule.** Nothing on the page is set smaller than 14px, and body copy is never below 17px. If text feels too small, raise the size; do not add weight or colour.

**The Heading-Then-Sentence Rule.** A section is an h2 followed directly by prose. No eyebrow, kicker, number, or label precedes a heading.

## Layout

One centred column, `max-width: 560px`, with 20px side gutters and 40px bottom padding on `main`. The page is `min-height: 100dvh` as a flex column so the sticky bar sits at the viewport bottom and tracks mobile browser chrome.

Vertical rhythm is fixed: the intro starts 40px from the top; every later section opens with 48px of top padding; a heading is followed by prose at 12px; related paragraphs are 12px apart; a picture, list, or card sits 16px to 20px below its heading or paragraph; a closing thought sits 24px below. Stacked cards are 16px apart; winner-list rows 6px apart. Each revealed section is scrolled into view with a 16px scroll margin.

There is one breakpoint in use: at `sm` (640px) the vote bar in the party-seat table widens from 64px to 96px. Everything else is the same at every width. Touch targets are 56px tall (ballot rows, the button).

The sticky bar is full-width, pinned to the bottom with `z-index: 10`, a top hairline in `line`, paper at 95% behind a backdrop blur, and inner padding of 16px sides, 12px top, and `max(12px, safe-area-inset-bottom)` below. It contains an optional centred note line (17px, 500, min-height 28px, `aria-live="polite"`) and the button.

## Elevation & Depth

Effectively flat. Depth is conveyed by the white card on the warm paper plus a hairline `line` border; the only shadow in the build is a soft two-layer lift under ballot cards. The sticky bar uses translucency and blur rather than a shadow to separate from the page.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 1px 2px rgba(20,22,26,0.06), 0 4px 14px rgba(20,22,26,0.05)`): the ballot party cards. Ink-tinted, never black, and low enough that the border still does the work.

### Named Rules
**The Hairline-First Rule.** A container is defined by its `line` border and card white. A shadow may be added to lift a card the reader must act on; it is never the only edge.

## Shapes

Softly rounded, with the radius tied to the size of the thing. Cards are 16px; the button, callouts, and tinted messages are 12px; winner-list rows are 8px; radio dots, vote bars, and the seat-picture rings are full pills. Card contents are clipped (`overflow: hidden`) so the party header fills the rounded top. Seat badges are a square with corner radius 28% of their side (5px at 18px, ~6px at 22px). Borders are always 1px in `line`, except the 2px radio ring which takes the party colour when selected. The seat picture distinguishes a full seat (solid ring) from a remainder seat (dashed `5 3` ring) by stroke, not colour.

## Components

### Buttons
- **Shape:** rounded control (12px), full width, 56px minimum height, contents centred with a 10px gap.
- **Primary:** slate background, white text, 19px semibold. There is exactly one on the page, in the sticky bar; its label changes with the stage (Start, Cast my vote for …, Next, Try another election).
- **Hover / Focus:** opacity 0.9 on hover with an opacity transition; the global 2px slate outline on `:focus-visible`.
- **Disabled:** opacity 0.35; the instruction moves to the bar's note line in ink rather than living on the greyed button.
- **Icon:** the cast button carries a drawn ballot-box icon (28px, `currentColor`, 1.7 stroke) whose ballot drops through the slot for 0.32s on cast.

### Cards / Containers
- **Corner Style:** 16px, clipped.
- **Background:** card white on paper.
- **Shadow Strategy:** the ballot cards take the card lift; the party-seat table is border-only.
- **Border:** 1px `line`; rows inside divided by 1px `line`.
- **Internal Padding:** header 12px 16px (table header 10px 16px); rows 16px sides, 56px tall (table rows 8px vertical, 46px minimum).
- **Header:** solid party colour with white 18px semibold text (16px in the table) and the party's emoji from data.

### Ballot rows (radio)
- **Style:** full-width 17px text row, 56px tall, 12px gap, a 24px ring in `line` at the left.
- **Selected:** ring fills and borders in the party colour with a white drawn check; the row washes with the party colour at 7% (`${color}12`); the name goes semibold.
- **Focus:** 2px inset slate ring. One roving radio group across every card; arrows walk the whole ballot.

### Callouts
- **Style:** a paragraph, 18px, in a 12px-radius box padded 14px 16px, washed in the reader's party colour at 8%. Used for the "you voted for … " sentence under each result. Text stays ink; emphasis is `<strong>` only.

### Winner list
- **Style:** an ordered list of 18px rows with 6px between them, each row 8px-radius with 6px 8px padding: a 22px seat check in the party colour, the name (500; 600 if it is the reader's), the party name in soft ink in parentheses, and a 14px "your vote" tag when it is theirs. Rows from the reader's party take the 8% wash.
- **Motion:** rows slide in from 8px left, 0.35s, staggered 0.15s + 0.1s per row.

### Seat check (signature)
A single-stroke drawn check (round caps and joins, 2.4 stroke at 18px) in white on a party-coloured square with 28% corner radius. `SeatCheck` renders it inline in HTML at 22px; `CheckPath` renders it inside the seat picture at 18px. It is the only seat mark; the earlier star glyph is retired.

### Seat picture (signature)
One 340-unit-wide SVG. Each vote cluster is a row of party-coloured dots; a full seat's worth of dots is ringed (solid, 2px, 9px radius) and gets a seat badge at its right; a remainder seat is ringed dashed. Rings scale in from the left (0.4s), badges pop in (0.38s, delayed 0.25s), and the sequence plays itself: full rows every 420ms, a 900ms breath, then leftovers every 650ms. Under reduced motion the finished picture is shown at once.

### Party-seat table (signature)
A border-only card: party header with the vote total on the right, then rows of name, a pill vote bar (10px tall, black at 7% track, party colour fill, 0.45s width tween) and a tabular count. Rows reveal one by one (320ms), re-sort by votes with a layout spring (stiffness 320, damping 34), then the elected row takes a seat check and the 8% wash.

### Section reveal (motion)
Every section after the intro arrives with `section-in`: a 14px rise and fade over 0.45s on `cubic-bezier(0.22, 1, 0.36, 1)`, and the window scrolls to its top (smooth, or instant under reduced motion). The same ease-out curve is the only curve used in the stylesheet; the ballot drop uses `[0.4, 0, 0.6, 1]` in Motion.

## Do's and Don'ts

### Do:
- **Do** keep one column at 560px with 20px gutters and open every section with 48px of top padding and an h2 at 26px.
- **Do** set prose at 18px and never below 17px for anything the reader must read; 14px is reserved for the "your vote" tag and the disclaimer.
- **Do** take every non-neutral colour from the party's data, and use it only as a solid behind white, a solid mark, or an 8% wash behind ink text.
- **Do** keep exactly one solid control on screen, slate, in the sticky bottom bar, and move any instruction to the bar's note line in ink.
- **Do** mark a seat with the drawn check on a party-coloured square, in SVG and HTML alike.
- **Do** define containers with a 1px `line` border on card white at 16px radius; add the ink-tinted two-layer lift only on cards the reader acts on.
- **Do** gate every animation on `prefers-reduced-motion` (CSS) and `useReducedMotion` (Motion), and show the finished state instead.

### Don't:
- **Don't** add Back buttons, progress pips, steppers, or anything that removes content above; the page only grows.
- **Don't** put an eyebrow, kicker, label, or number above a heading.
- **Don't** use stars, emoji, or icon-font glyphs as seat or selection marks.
- **Don't** apply slate to anything other than the one button and focus rings, or use `accent-soft` as a surface.
- **Don't** change text colour for emphasis; emphasis is `<strong>` and, for a party, the 8% wash.
- **Don't** import logos, crests, images, or fetched art; party identity is a colour, a name, and a plain emoji from data.
- **Don't** add a second type family or a size below 14px.
