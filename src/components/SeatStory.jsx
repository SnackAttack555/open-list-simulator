import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ballotOrder, partyName } from '../data/index.js'

/**
 * The results explained, one tap at a time.
 *
 * This is not decoration. It carries one argument, in the order a person
 * actually asks the questions:
 *
 *   1. How many votes were there?
 *   2. Where did they go?              -> every vote joins a party
 *   3. How do votes become seats?      -> each group worth 20% wins one
 *   4. What about the votes left over? -> the closest leftovers take what remains
 *   5. Who fills my party's seats?     -> the most personal votes, full stop
 *
 * Step 5 is the payload, and it only lands because the candidates are shown
 * first in printed (alphabetical) order: you cannot see that the printed order
 * was irrelevant unless you were shown the printed order.
 *
 * Everything is drawn inside ONE svg. An earlier version positioned the dots as
 * HTML over an svg holding the outlines, which lined up at exactly one viewport
 * width and drifted at every other.
 *
 * Beats advance on tap. Within a beat, groups are circled one at a time on a
 * timer, because "these votes add up to a seat" is a sequence of events rather
 * than a picture.
 */

const DOTS_PER_SEAT = 20 // one group = one seat, so 5 seats = 100 dots
const WIDTH = 320

// Everything below is in svg user units, so it scales as one piece.
const GRID = { cols: 10, x0: 20, dx: 30, y0: 16, dy: 20 }
const GROUP = { x: 4, w: 214, pad: 10, rowH: 19, labelH: 16, partyGap: 10 }
const STAR = { x: GROUP.x + GROUP.w + 8, size: 18 }
const DOT_R = 3.4
const dotX = (i) => GROUP.x + GROUP.pad + i * ((GROUP.w - GROUP.pad * 2) / (DOTS_PER_SEAT - 1))

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

        {current.stage === 'dots' ? (
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
          {isLast ? 'See all the winners ↓' : 'Next'}
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
                  // A leftover seat is drawn dashed and marked +, an earned one
                  // solid and marked ★. Without that, the leftover screen looks
                  // identical to the one before it and reads as though these
                  // parties had also reached a full group.
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
                    {row.kind === 'full' ? '★' : '+'}
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

      <Dots dots={model.dots} myDot={model.myDot} spread={spread} reduced={reduced} />
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
function Dots({ dots, myDot, spread, reduced }) {
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
          r={DOT_R}
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
          r={DOT_R + 2.5}
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
  const votesPerDot = Math.max(1, Math.round(quota / DOTS_PER_SEAT))

  const rows = []
  for (const list of result.lists) {
    const leftoverVotes = Math.max(0, list.votes - list.quotaSeats * quota)
    // Size the partial group from the real leftover rather than from rounded
    // dots, so the biggest leftover always *looks* biggest — otherwise rounding
    // could show a smaller group winning the last seat.
    const partialDots = Math.max(
      0,
      Math.min(DOTS_PER_SEAT - 1, Math.round((leftoverVotes / quota) * DOTS_PER_SEAT)),
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
        dotCount: DOTS_PER_SEAT,
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
  const gridHeight = GRID.y0 + Math.ceil(100 / GRID.cols) * GRID.dy + 6
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
    {
      stage: 'dots',
      phase: 'count',
      headline: `${result.totalVotes.toLocaleString()} votes were cast.`,
      steps: 0,
      note: () =>
        `Every dot is about ${votesPerDot.toLocaleString()} ${votesPerDot === 1 ? 'vote' : 'votes'}${
          myDot ? ', and the colored dot includes yours' : ''
        }.`,
    },
    {
      stage: 'dots',
      phase: 'gather',
      headline: 'Every vote joins the party it was cast for.',
      steps: 0,
      note: () => null,
    },
    {
      stage: 'dots',
      phase: 'seats',
      headline: `It takes 20% of the votes to win 1 of the ${result.seats} seats. Right now that’s ${quotaText} votes.`,
      steps: fullSeats,
      stepDelay: (i) => (i === 1 ? 500 : 850),
      note: (step) =>
        step >= fullSeats
          ? `Every group of ${quotaText} votes wins one seat — that fills ${fullSeats} of the ${result.seats}.`
          : null,
    },
  ]

  if (remainderCount > 0) {
    const names = leftoverOrder.map((r) => r.listName)
    const nameList =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    beats.push({
      stage: 'dots',
      phase: 'leftover',
      headline: `${remainderCount === 1 ? 'One seat is' : `${remainderCount} seats are`} still open, and no party has another full group of ${quotaText}.`,
      steps: remainderCount,
      stepDelay: (i) => (i === 1 ? 600 : 950),
      // "Came closest to another full group" described the arithmetic accurately
      // and taught nobody anything: it asks the reader to hold a group they never
      // saw, that nobody completed. Leftover votes are the thing actually on
      // screen, so the sentence names those instead.
      note: (step) =>
        step >= remainderCount
          ? names.length === 1
            ? `${nameList} had the most leftover votes, so it wins the last seat, shown with a +. ★ marks the seats already won outright.`
            : `${nameList} had the most leftover votes, so they win the last seats, shown with a +. ★ marks the seats already won outright.`
          : null,
    })
  }

  const act2Steps = printed.length + 3
  beats.push({
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
