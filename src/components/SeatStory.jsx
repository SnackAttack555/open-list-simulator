import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ballotOrder, partyName } from '../data/index.js'

/**
 * The results explained, one tap at a time.
 *
 * This is not decoration. It carries one argument, in the order a person
 * actually asks the questions:
 *
 *   1. Who won?                        -> five seats, visibly split across parties
 *   2. Where did the votes go?         -> every vote sits with its party
 *   3. How do votes become seats?      -> each group worth 20% wins one
 *   4. What about the votes left over? -> the biggest leftovers take what remains
 *   5. Who fills my party's seats?     -> the most personal votes, full stop
 *
 * Opening on the answer rather than withholding it: somebody who just voted
 * wants to know what happened, and the split across parties is the proportional
 * result in one glance. Every later beat then reads as confirmation.
 *
 * Step 5 is the payload, and it only lands because the candidates are shown
 * first in printed (alphabetical) order: you cannot see that the printed order
 * was irrelevant unless you were shown the printed order. It is skipped outright
 * when the reader's own party won nothing — there is no seat to award inside it.
 *
 * Everything is drawn inside ONE svg. An earlier version positioned the dots as
 * HTML over an svg holding the outlines, which lined up at exactly one viewport
 * width and drifted at every other.
 *
 * Beats advance on tap. Within a beat, groups are circled one at a time on a
 * timer, because "these votes add up to a seat" is a sequence of events rather
 * than a picture.
 */

const WIDTH = 320

// Everything below is in svg user units, so it scales as one piece.
const GROUP = { x: 4, w: 214, pad: 10, rowH: 19, labelH: 16, partyGap: 10 }
const STAR = { x: GROUP.x + GROUP.w + 8, size: 18 }

/**
 * One dot is ten votes.
 *
 * A fixed dot count would make the scale drift as an election grows — the same
 * picture meaning 8 votes per dot today and 40 next month, which quietly breaks
 * the one thing the opening beat is for. So the dot *count* grows instead.
 *
 * What limits that is not the opening grid but the group rows: a group is one
 * seat's worth of votes drawn as a single row of fixed width, so dots-per-seat
 * is the real constraint. Past about 40 the spacing inside a row falls below a
 * dot's own diameter and the group reads as a smudge. Rather than let it degrade,
 * the scale steps up the ladder until a row is legible again, and the caption
 * states whichever value it landed on. In practice 10 holds to ~2,000 votes per
 * election, which is well past anything this has seen.
 */
const VOTES_PER_DOT_LADDER = [10, 20, 25, 50, 100, 200, 500, 1000]
const MAX_DOTS_PER_SEAT = 40

function chooseScale(quota) {
  for (const votesPerDot of VOTES_PER_DOT_LADDER) {
    const dotsPerSeat = Math.round(quota / votesPerDot)
    if (dotsPerSeat <= MAX_DOTS_PER_SEAT) {
      return { votesPerDot, dotsPerSeat: Math.max(4, dotsPerSeat) }
    }
  }
  const votesPerDot = VOTES_PER_DOT_LADDER[VOTES_PER_DOT_LADDER.length - 1]
  return { votesPerDot, dotsPerSeat: Math.max(4, Math.round(quota / votesPerDot)) }
}

/**
 * The opening grid, sized to hold however many dots this election needs.
 *
 * Deliberately wide rather than square: the block has to share one phone screen
 * with a headline above it and a caption below, so height is the scarce axis.
 */
function gridFor(count) {
  const cols = Math.max(10, Math.min(30, Math.ceil(Math.sqrt(Math.max(1, count) * 1.9))))
  const dx = (WIDTH - 24) / Math.max(1, cols - 1)
  return { cols, x0: 12, dx, y0: 16, dy: Math.min(dx, 20) }
}

const rowSpacing = (dotsPerSeat) => (GROUP.w - GROUP.pad * 2) / Math.max(1, dotsPerSeat - 1)
const dotXFor = (dotsPerSeat) => (i) => GROUP.x + GROUP.pad + i * rowSpacing(dotsPerSeat)

export default function SeatStory({ theme, result, myVote, onDone, onFinish }) {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [step, setStep] = useState(0)

  const model = useMemo(() => buildModel(theme, result, myVote), [theme, result, myVote])
  const beats = model.beats
  const current = beats[Math.min(beat, beats.length - 1)]
  const isLast = beat >= beats.length - 1

  useEffect(() => {
    if (isLast) onDone?.()
  }, [isLast, onDone])

  // Reveal the steps inside a beat. Reduced motion jumps to the finished state.
  useEffect(() => {
    const total = current.steps ?? 0
    if (reduced || total === 0) {
      setStep(total)
      return
    }
    setStep(0)
    const timers = []
    let at = 0
    for (let i = 1; i <= total; i += 1) {
      at += current.stepDelay?.(i) ?? 700
      timers.push(setTimeout(() => setStep(i), at))
    }
    return () => timers.forEach(clearTimeout)
  }, [beat, reduced, current])

  return (
    <section aria-label="How the seats were decided">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <p className="min-h-11 text-[15px] leading-snug" aria-live="polite">
          {current.headline}
        </p>

        {current.stage === 'winners' ? (
          <WinnersStage winners={model.winners} myVote={myVote} reduced={reduced} />
        ) : current.stage === 'dots' ? (
          <DotStage model={model} phase={current.phase} step={step} reduced={reduced} />
        ) : (
          <CandidateStage model={model} step={step} reduced={reduced} />
        )}

        {current.note(step) && (
          <p className="mt-3 text-[13px] leading-snug text-[var(--ink-soft)]">
            {current.note(step)}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setBeat((b) => Math.max(0, b - 1))}
          disabled={beat === 0}
          className="min-h-12 rounded-xl border border-[var(--line)] px-4 text-sm text-[var(--ink-soft)] disabled:opacity-35"
        >
          Back
        </button>
        {/* At the end the button keeps working rather than greying out — it
            hands the reader on to the results instead of dead-ending. */}
        <button
          type="button"
          onClick={() =>
            isLast ? onFinish?.() : setBeat((b) => Math.min(beats.length - 1, b + 1))
          }
          className="min-h-12 flex-1 rounded-xl bg-[var(--accent)] font-semibold text-white"
        >
          {isLast ? 'What it means for your vote ↓' : 'Next'}
        </button>
      </div>

      <ol className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
        {beats.map((_, i) => (
          <li
            key={i}
            className="size-1.5 rounded-full transition-colors"
            style={{ backgroundColor: i <= beat ? 'var(--accent)' : 'var(--line)' }}
          />
        ))}
      </ol>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * The opening — who won
 * ------------------------------------------------------------------ */

/**
 * The five winners, with the vote each one got.
 *
 * Deliberately the same shape as the rest of the story rather than a separate
 * scoreboard: one row per seat, party colour on the left, so the split across
 * parties is legible before any of it is explained. The reader's own candidate
 * is marked, because finding yourself in the list is the first question anyone
 * asks of it.
 */
function WinnersStage({ winners, myVote, reduced }) {
  return (
    <ol className="mt-3 flex flex-col gap-1.5">
      {winners.map((winner, i) => {
        const isMine =
          myVote?.listId === winner.listId && myVote?.candidateId === winner.candidateId
        return (
          <motion.li
            key={`${winner.listId}/${winner.candidateId}`}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduced ? 0 : i * 0.12, duration: reduced ? 0 : 0.35 }}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
            style={isMine ? { backgroundColor: `${winner.color}14` } : undefined}
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: winner.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">
                {winner.name}
                {isMine && (
                  <span className="ml-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
                    your vote
                  </span>
                )}
              </span>
              <span className="block text-xs text-[var(--ink-soft)]">
                {partyName(winner.listName)} · {winner.votes.toLocaleString()} votes
              </span>
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ *
 * Act 1 — every vote as a dot
 * ------------------------------------------------------------------ */

function DotStage({ model, phase, step, reduced }) {
  const spread = phase === 'count'

  // Which groups have been circled so far, in the order this beat reveals them.
  const revealed = new Set(
    (phase === 'seats' ? model.fullGroupOrder : phase === 'leftover' ? model.leftoverOrder : [])
      .slice(0, step)
      .map((r) => r.key),
  )
  // Groups circled in an earlier beat stay circled.
  const settled = new Set(
    phase === 'leftover' ? model.fullGroupOrder.map((r) => r.key) : [],
  )

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${model.stageHeight}`}
      width="100%"
      className="mt-3 block"
      style={{ height: 'auto' }}
      role="img"
      aria-label={model.stageLabel(phase)}
    >
      {!spread &&
        model.rows.map((row) => {
          const circled = revealed.has(row.key) || settled.has(row.key)
          return (
            <g key={row.key}>
              {row.first && (
                <text x="2" y={row.y - 12} fontSize="10" fontWeight="600" fill="var(--ink)">
                  {row.listName} · {row.listVotes.toLocaleString()} votes
                </text>
              )}

              {circled && (
                <rect
                  className={reduced ? undefined : 'group-ring'}
                  x={GROUP.x}
                  y={row.y - 9}
                  width={GROUP.w}
                  height="18"
                  rx="9"
                  fill="none"
                  stroke={row.color}
                  strokeWidth="2"
                  // A leftover seat is drawn dashed, an earned one solid — the
                  // ring is what distinguishes them now that both carry a star.
                  // Without some difference the leftover screen looks identical
                  // to the one before it and reads as though these parties had
                  // also reached a full group.
                  strokeDasharray={row.kind === 'full' ? undefined : '5 3'}
                />
              )}

              {circled && (
                <g className={reduced ? undefined : 'seat-badge'}>
                  <rect
                    x={STAR.x}
                    y={row.y - 9}
                    width={STAR.size}
                    height={STAR.size}
                    rx="5"
                    fill={row.color}
                  />
                  <text
                    x={STAR.x + STAR.size / 2}
                    y={row.y + 5}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill="#fff"
                  >
                    ★
                  </text>
                </g>
              )}

              {phase === 'leftover' && row.kind === 'partial' && (
                <text
                  x={WIDTH - 4}
                  y={row.y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--ink-soft)"
                >
                  {/* Rounded: the quota is votes ÷ 5 and rarely whole, and
                      "136.8 votes left over" raises a question the story
                      doesn't need to answer. */}
                  {Math.round(row.leftoverVotes).toLocaleString()} left over
                </text>
              )}
            </g>
          )
        })}

      <Dots
        dots={model.dots}
        myDot={model.myDot}
        dotR={model.dotR}
        spread={spread}
        reduced={reduced}
      />
    </svg>
  )
}

/**
 * The votes, isolated behind memo.
 *
 * These depend only on which layout is showing, never on the circling step. Left
 * in the parent they re-rendered on every step tick, and each re-render handed
 * Motion a fresh transition, restarting the spring before it could finish — the
 * dots visibly stalled partway between the grid and their party rows.
 */
/**
 * The votes.
 *
 * Plain SVG with CSS transitions rather than Motion. Each dot is anchored at its
 * party-row position and translated out to the opening grid, so moving them is
 * one transform change. Motion was applying these values on mount and then
 * ignoring every later update — every vote stayed stranded in the grid while
 * the group outlines drew around them — and for something this simple (100
 * elements, one property, no orchestration) a CSS transition is both
 * deterministic and cheaper.
 */
function Dots({ dots, myDot, dotR, spread, reduced }) {
  const ease = reduced
    ? 'none'
    : 'transform .55s cubic-bezier(.22,1,.36,1), fill .35s linear'
  const shift = (dot) =>
    spread
      ? `translate(${dot.grid.x - dot.seatPos.x}px, ${dot.grid.y - dot.seatPos.y}px)`
      : 'none'

  return (
    <>
      {dots.map((dot) => (
        <circle
          key={dot.id}
          cx={dot.seatPos.x}
          cy={dot.seatPos.y}
          r={dotR}
          // The reader's own vote wears its party colour from the first beat.
          fill={dot.isMine || !spread ? dot.color : '#9aa0a8'}
          style={{ transform: shift(dot), transition: ease }}
        />
      ))}

      {/* and pulses, so it stays findable once the dots have moved */}
      {myDot && (
        <circle
          cx={myDot.seatPos.x}
          cy={myDot.seatPos.y}
          r={dotR + 2.5}
          fill="none"
          stroke={myDot.color}
          strokeWidth="1.6"
          className={reduced ? undefined : 'vote-pulse'}
          style={{
            transform: shift(myDot),
            transition: ease,
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Act 2 — inside the voter's own party, in one continuous sequence
 * ------------------------------------------------------------------ */

function CandidateStage({ model, step, reduced }) {
  const { myList } = model
  const n = myList.printed.length

  // step 0: header only. 1: names appear. 2..n+1: votes count in, one per row.
  // n+2: the list re-sorts. n+3: seats awarded.
  const showNames = step >= 1
  const votesShown = Math.max(0, Math.min(n, step - 1))
  const sorted = step >= n + 2
  const awarded = step >= n + 3
  const rows = sorted ? myList.byVotes : myList.printed
  const max = Math.max(...myList.printed.map((c) => c.votes), 1)

  return (
    <div className="mt-3">
      <div
        className="flex items-center justify-between rounded-t-xl px-3 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: myList.color }}
      >
        <span>
          {myList.emoji} {partyName(myList)}
        </span>
        <span>
          {myList.seats === 0
            ? 'no seats'
            : `${myList.seats} seat${myList.seats === 1 ? '' : 's'} to fill`}
        </span>
      </div>

      <ul
        className="overflow-hidden rounded-b-xl border border-t-0 border-[var(--line)]"
        style={{ minHeight: n * 37 }}
      >
        {showNames &&
          rows.map((cand) => {
            const rank = myList.printed.findIndex((c) => c.id === cand.id)
            const revealed = sorted || rank < votesShown
            const won = awarded && cand.elected
            return (
              <motion.li
                key={cand.id}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="flex items-center gap-2 border-t border-[var(--line)] px-3 py-2 first:border-t-0"
                style={{ backgroundColor: won ? `${myList.color}14` : undefined }}
              >
                <span className="w-4 shrink-0 text-center text-xs">{won ? '★' : ''}</span>
                <span
                  className={`min-w-0 flex-1 truncate text-[13px] ${won ? 'font-semibold' : ''}`}
                >
                  {cand.name}
                </span>
                <span className="block h-2 w-14 shrink-0 overflow-hidden rounded-full bg-black/[0.07] sm:w-20">
                  <motion.span
                    className="block h-2 rounded-full"
                    style={{ backgroundColor: myList.color }}
                    initial={false}
                    animate={{ width: revealed ? `${(cand.votes / max) * 100}%` : 0 }}
                    transition={{ duration: reduced ? 0 : 0.45 }}
                  />
                </span>
                <b className="w-11 shrink-0 text-right text-xs tabular-nums">
                  {revealed ? cand.votes.toLocaleString() : ''}
                </b>
              </motion.li>
            )
          })}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Model
 * ------------------------------------------------------------------ */

function buildModel(theme, result, myVote) {
  const quota = result.quota
  const noun = theme.noun ?? 'person'
  const nounPlural = theme.nounPlural ?? 'people'
  const { votesPerDot, dotsPerSeat } = chooseScale(quota)
  const dotX = dotXFor(dotsPerSeat)

  const rows = []
  for (const list of result.lists) {
    const leftoverVotes = Math.max(0, list.votes - list.quotaSeats * quota)
    // Size the partial group from the real leftover rather than from rounded
    // dots, so the biggest leftover always *looks* biggest — otherwise rounding
    // could show a smaller group winning the last seat.
    const partialDots = Math.max(
      0,
      Math.min(dotsPerSeat - 1, Math.round((leftoverVotes / quota) * dotsPerSeat)),
    )
    let first = true
    for (let g = 0; g < list.quotaSeats; g += 1) {
      rows.push({
        key: `${list.id}-full-${g}`,
        listId: list.id,
        listName: partyName(list),
        listVotes: list.votes,
        color: list.color,
        kind: 'full',
        dotCount: dotsPerSeat,
        leftoverVotes: 0,
        first,
      })
      first = false
    }
    if (partialDots > 0 || list.quotaSeats === 0) {
      rows.push({
        key: `${list.id}-part`,
        listId: list.id,
        listName: partyName(list),
        listVotes: list.votes,
        color: list.color,
        kind: 'partial',
        dotCount: partialDots,
        leftoverVotes,
        wonLeftover: list.remainderSeats > 0,
        first,
      })
    }
  }

  let y = GROUP.labelH + 6
  for (const row of rows) {
    if (row.first && row !== rows[0]) y += GROUP.partyGap
    if (row.first) y += GROUP.labelH - 6
    row.y = y
    y += GROUP.rowH
  }
  const rowsHeight = y + 6

  const totalDots = rows.reduce((n, row) => n + row.dotCount, 0)
  const GRID = gridFor(totalDots)
  // One radius for both layouts, because it is the same circle translated between
  // them: whichever layout packs tighter is the one that sets the size.
  const dotR = Math.max(
    1.2,
    Math.min(3.4, 0.3 * Math.min(rowSpacing(dotsPerSeat), GRID.dx, GRID.dy)),
  )
  const gridHeight = GRID.y0 + Math.ceil(totalDots / GRID.cols) * GRID.dy + 6
  // One height for every beat, so the card doesn't resize as the story advances.
  const stageHeight = Math.max(rowsHeight, gridHeight)

  const dots = []
  let gridIndex = 0
  for (const row of rows) {
    for (let i = 0; i < row.dotCount; i += 1) {
      dots.push({
        id: `${row.key}-${i}`,
        listId: row.listId,
        color: row.color,
        grid: {
          x: GRID.x0 + (gridIndex % GRID.cols) * GRID.dx,
          y: GRID.y0 + Math.floor(gridIndex / GRID.cols) * GRID.dy,
        },
        seatPos: { x: dotX(i), y: row.y },
        // Small stagger only. A long one leaves the dots visibly mid-flight
        // under the party labels, which reads as a broken layout rather than
        // as votes travelling.
        delay: gridIndex * 0.0025,
        isMine: false,
      })
      gridIndex += 1
    }
  }

  const myDot = myVote ? dots.find((d) => d.listId === myVote.listId) : null
  if (myDot) myDot.isMine = true

  const fullGroupOrder = rows.filter((r) => r.kind === 'full')
  const leftoverOrder = rows
    .filter((r) => r.kind === 'partial' && r.wonLeftover)
    .sort((a, b) => b.leftoverVotes - a.leftoverVotes) // closest to a full group first

  // Which parties cleared a full group, named for the caption. Taken from the
  // lists rather than from the drawn rows, because a party with two full groups
  // owns two rows and would otherwise be named twice.
  const earned = result.lists.filter((l) => l.quotaSeats > 0)
  const joinNames = (names) =>
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
  const earnedSentence =
    earned.length === 0
      ? ''
      : earned.length === 1
        ? ` The ${earned[0].name} Party wins one seat, shown with a ★.`
        : earned.every((l) => l.quotaSeats === 1)
          ? ` The ${joinNames(earned.map((l) => l.name))} Parties each win one seat, shown with a ★.`
          // A party holding two full groups makes "each win one seat" false.
          : ` The ${joinNames(earned.map((l) => l.name))} Parties win those seats, shown with a ★.`

  const remainderCount = leftoverOrder.length
  const fullSeats = fullGroupOrder.length
  const quotaText = Math.round(quota).toLocaleString()

  const focusId =
    myVote?.listId ?? [...result.lists].sort((a, b) => b.votes - a.votes)[0]?.id
  const focus = result.lists.find((l) => l.id === focusId) ?? result.lists[0]
  const printed = ballotOrder(focus.candidates)
  const byVotes = [...focus.candidates].sort((a, b) => a.rank - b.rank)

  const winnerSentence =
    focus.seats === 0
      ? `The ${partyName(focus)} finished short of a full group of ${quotaText} votes, so it won no seats.`
      : focus.seats === 1
        ? `The ${partyName(focus)} wins 1 seat. The ${noun} with the most votes wins.`
        : `The ${partyName(focus)} wins ${focus.seats} seats. The ${focus.seats} ${nounPlural} with the most votes win.`

  const beats = [
    // Winners first. Somebody who just voted wants to know what happened, and
    // four colours sharing five seats *is* the proportional result — visible in
    // one glance, before a single number. Everything after this reads as
    // confirmation of something already seen rather than suspense.
    {
      stage: 'winners',
      phase: 'winners',
      headline: 'Here’s who won.',
      steps: 0,
      note: () => 'Now here’s how they were chosen.',
    },
    // The opening grid of loose dots is gone. Its only job was to fix the scale
    // before the dots sorted themselves, which this headline does outright — and
    // it was a whole tap that showed no result. The scale caption comes with it.
    {
      stage: 'dots',
      phase: 'gather',
      headline: `${result.totalVotes.toLocaleString()} votes were cast. Here are the votes by party.`,
      steps: 0,
      note: () =>
        `Every dot is about ${votesPerDot.toLocaleString()} ${votesPerDot === 1 ? 'vote' : 'votes'}${
          myDot ? ', and the colored dot includes yours' : ''
        }.`,
    },
    {
      stage: 'dots',
      phase: 'seats',
      // All of it above the dots. Split across a headline and a caption, the
      // reader's eye had to cross the drawing mid-sentence and the second half
      // arrived only after the rings finished, so the two halves never read as
      // one thought.
      headline: `It takes 20% of the votes to win 1 of the ${result.seats} seats. That’s ${quotaText} votes. Every group of ${quotaText} votes wins one seat — that fills ${fullSeats} of the ${result.seats}.${earnedSentence}`,
      steps: fullSeats,
      stepDelay: (i) => (i === 1 ? 500 : 850),
      note: () => null,
    },
  ]

  if (remainderCount > 0) {
    const names = leftoverOrder.map((r) => r.listName)
    const nameList =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    const leftoverSentence =
      names.length === 1
        ? ` ${nameList} had the most leftover votes, so it wins the last seat.`
        : ` ${nameList} had the most leftover votes, so they win the last seats.`
    beats.push({
      stage: 'dots',
      phase: 'leftover',
      headline: `${remainderCount === 1 ? 'One seat is' : `${remainderCount} seats are`} still open, and no party has another full group of ${quotaText}.${leftoverSentence}`,
      steps: remainderCount,
      stepDelay: (i) => (i === 1 ? 600 : 950),
      note: () => null,
    })
  }

  // Skipped when the reader's own party won nothing. There is no seat to award
  // inside it, and showing some other party's contest at this point answers a
  // question they didn't ask — the results screen states their shortfall
  // instead.
  const act2Steps = printed.length + 3
  if (focus.seats > 0) beats.push({
    stage: 'cands',
    phase: 'inside',
    headline:
      focus.seats === 0
        ? `So who did the ${partyName(focus)}’s voters pick?`
        : `So who fills the ${partyName(focus)}’s ${focus.seats === 1 ? 'seat' : 'seats'}?`,
    steps: act2Steps,
    // A beat to read the question, then names, then a vote per row, then the
    // re-sort, then the seats.
    stepDelay: (i) => (i === 1 ? 1000 : i <= printed.length + 1 ? 420 : 750),
    note: (step) => (step >= act2Steps ? winnerSentence : null),
  })

  return {
    rows,
    dots,
    myDot,
    dotR,
    winners: result.winners,
    stageHeight,
    fullGroupOrder,
    leftoverOrder,
    myList: { ...focus, printed, byVotes },
    stageLabel: (phase) =>
      phase === 'count'
        ? `${result.totalVotes.toLocaleString()} votes, drawn as dots`
        : result.lists
            .map((l) => `${partyName(l)}: ${l.votes.toLocaleString()} votes, ${l.seats} seats`)
            .join('. '),
    beats,
  }
}
