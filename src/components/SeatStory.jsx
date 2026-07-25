import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ballotOrder } from '../data/index.js'

/**
 * The results explained, one tap at a time.
 *
 * This is not decoration. It exists to carry exactly one argument, in the order
 * a person actually asks the questions:
 *
 *   1. How many votes were there?
 *   2. Where did they go?                    -> every vote joins a team
 *   3. How do votes become seats?            -> each group of QUOTA votes wins one
 *   4. What about the votes left over?       -> the biggest leftover takes the last seat
 *   5. Who fills my team's seats?            -> the most personal votes, full stop
 *
 * Step 5 is the payload. It only lands because step 5a first shows the ballot in
 * its printed (alphabetical) order — you cannot see that the printed order was
 * irrelevant unless you were shown the printed order.
 *
 * Every vote is drawn. One dot is a fixed number of votes, and a group of dots
 * worth QUOTA votes wins a seat, so "votes add up to seats" is literally the
 * thing on screen rather than a sentence next to a bar chart.
 *
 * Advancing is manual. Timed beats race an explanation past whoever reads slower
 * than the timer, and there is no way to go back.
 */

const DOTS_PER_SEAT = 20 // one group = one seat, so 5 seats = 100 dots
const COLS = 10 // grid layout for the opening beat
const WIDTH = 320

const GRID = { x0: 16, dx: 32, y0: 14, dy: 21 }
const ROW = { x0: 7, dx: 11, height: 19, labelHeight: 16, partyGap: 9 }
const GUTTER = 96 // room at the right for '138 left over' plus the seat star

export default function SeatStory({ theme, result, myVote, onDone, onFinish }) {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const liveRef = useRef(null)

  const model = useMemo(() => buildModel(theme, result, myVote), [theme, result, myVote])
  const beats = model.beats
  const current = beats[Math.min(beat, beats.length - 1)]
  const isLast = beat >= beats.length - 1

  // Tell the parent once the story has played out, so the payoff and the
  // winner-take-all comparison appear only after the explanation lands.
  useEffect(() => {
    if (isLast) onDone?.()
  }, [isLast, onDone])

  const anim = (to, delay = 0) =>
    reduced
      ? { animate: to, transition: { duration: 0 } }
      : { animate: to, transition: { type: 'spring', stiffness: 260, damping: 30, delay } }

  return (
    <section aria-label="How the seats were decided">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <p className="min-h-11 text-[15px] leading-snug" aria-live="polite" ref={liveRef}>
          {current.headline}
        </p>

        {current.stage === 'dots' ? (
          <DotStage model={model} phase={current.phase} anim={anim} reduced={reduced} />
        ) : (
          <CandidateStage
            model={model}
            phase={current.phase}
            reduced={reduced}
            theme={theme}
          />
        )}

        {current.note && (
          <p className="mt-3 text-[13px] leading-snug text-[var(--ink-soft)]">{current.note}</p>
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
 * Act 1 — every vote as a dot, gathering into teams and then seats
 * ------------------------------------------------------------------ */

function DotStage({ model, phase, anim, reduced }) {
  const showGroups = phase !== 'count' && phase !== 'gather'
  const showSeats = phase === 'seats' || phase === 'leftover'
  const spread = phase === 'count'

  return (
    <div className="relative mt-3" style={{ width: '100%', height: model.stageHeight }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${model.stageHeight}`}
        width="100%"
        height={model.stageHeight}
        role="img"
        aria-label={model.stageLabel(phase)}
      >
        {/* Party labels and the outline around each group of votes */}
        {!spread &&
          model.rows.map((row) => {
            // More than one leftover seat can be awarded in the same round, so
            // this has to light every winning team, not just the first one.
            const lit =
              showSeats &&
              (row.kind === 'full' ||
                (phase === 'leftover' && model.leftoverWinners.includes(row.listId)))
            return (
              <g key={row.key}>
                {row.first && (
                  <text
                    x="2"
                    y={row.y - 12}
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--ink)"
                  >
                    {row.listName} · {row.listVotes.toLocaleString()} votes
                  </text>
                )}
                {showGroups && (
                  <rect
                    x="2"
                    y={row.y - 9}
                    width={WIDTH - GUTTER}
                    height="18"
                    rx="9"
                    fill="none"
                    stroke={row.color}
                    strokeWidth={lit ? 2 : 1}
                    strokeDasharray={row.kind === 'full' ? undefined : '4 3'}
                    opacity={row.kind === 'full' ? 1 : 0.75}
                  />
                )}
                {showSeats && lit && (
                  <g>
                    <rect
                      x={WIDTH - 26}
                      y={row.y - 9}
                      width="18"
                      height="18"
                      rx="5"
                      fill={row.color}
                    />
                    <text
                      x={WIDTH - 17}
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
                    x={WIDTH - 34}
                    y={row.y + 4}
                    textAnchor="end"
                    fontSize="9"
                    fill="var(--ink-soft)"
                  >
                    {/* Rounded: the quota is votes÷5 and rarely a whole number,
                        and "136.8 votes left over" invites a question the story
                        doesn't need to answer. */}
                    {Math.round(row.leftoverVotes).toLocaleString()} left over
                  </text>
                )}
              </g>
            )
          })}
      </svg>

      {/* The votes themselves. Absolutely positioned so they can travel between
          the opening grid and their team's rows. */}
      {model.dots.map((dot) => {
        const to = spread ? dot.grid : dot.seatPos
        const scale = WIDTH / (model.stageWidthPx || WIDTH)
        return (
          <motion.span
            key={dot.id}
            initial={false}
            {...anim(
              {
                left: `${(to.x / WIDTH) * 100}%`,
                top: to.y,
                backgroundColor: spread ? '#9aa0a8' : dot.color,
              },
              reduced ? 0 : dot.delay,
            )}
            className="absolute rounded-full"
            style={{
              width: 7 * scale,
              height: 7 * scale,
              marginLeft: -3.5,
              marginTop: -3.5,
              boxShadow: dot.isMine ? '0 0 0 2px var(--ink)' : undefined,
              zIndex: dot.isMine ? 2 : 1,
            }}
          />
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Act 2 — inside the voter's own team
 * ------------------------------------------------------------------ */

function CandidateStage({ model, phase, reduced, theme }) {
  const { myList } = model
  const showVotes = phase !== 'ballot'
  const ranked = phase === 'elected'
  const rows = ranked ? myList.byVotes : myList.printed
  const max = Math.max(...myList.printed.map((c) => c.votes), 1)

  return (
    <div className="mt-3">
      <div
        className="flex items-center justify-between rounded-t-xl px-3 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: myList.color }}
      >
        <span>
          {myList.emoji} {myList.name}
        </span>
        <span>
          {myList.seats === 0
            ? 'no seats'
            : `${myList.seats} seat${myList.seats === 1 ? '' : 's'} to fill`}
        </span>
      </div>

      <ul className="rounded-b-xl border border-t-0 border-[var(--line)]">
        {rows.map((cand) => {
          const won = ranked && cand.elected
          return (
            <motion.li
              key={cand.id}
              layout={!reduced}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="flex items-center gap-2 border-t border-[var(--line)] px-3 py-2 first:border-t-0"
              style={{ backgroundColor: won ? `${myList.color}14` : undefined }}
            >
              <span className="w-4 shrink-0 text-center text-xs">
                {won ? '★' : ''}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[13px] ${won ? 'font-semibold' : ''}`}>
                {cand.name}
              </span>
              {showVotes && (
                <>
                  <span className="block h-2 w-14 shrink-0 overflow-hidden rounded-full bg-black/[0.07] sm:w-20">
                    <motion.span
                      className="block h-2 rounded-full"
                      style={{ backgroundColor: myList.color }}
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${(cand.votes / max) * 100}%` }}
                      transition={{ duration: reduced ? 0 : 0.5 }}
                    />
                  </span>
                  <b className="w-11 shrink-0 text-right text-xs tabular-nums">
                    {cand.votes.toLocaleString()}
                  </b>
                </>
              )}
            </motion.li>
          )
        })}
      </ul>

      <p className="mt-2 text-[12px] text-[var(--ink-soft)]">
        {phase === 'ballot'
          ? `Printed in alphabetical order — the same order you saw on the ballot.`
          : `Nothing about the printed order decides this. Only the ${theme.nounPlural ?? 'people'} voters marked.`}
      </p>
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

  // Rows: one per group of votes. Full groups have already won a seat; a partial
  // group is the votes that didn't reach the next full group.
  const rows = []
  for (const list of result.lists) {
    const leftoverVotes = Math.max(0, list.votes - list.quotaSeats * quota)
    // Size the partial group from the real leftover, not from rounded dots, so
    // the biggest leftover always *looks* biggest — otherwise rounding could
    // show a smaller bar winning the last seat.
    const partialDots = Math.max(0, Math.min(DOTS_PER_SEAT - 1, Math.round((leftoverVotes / quota) * DOTS_PER_SEAT)))
    let first = true
    for (let g = 0; g < list.quotaSeats; g += 1) {
      rows.push({
        key: `${list.id}-full-${g}`,
        listId: list.id,
        listName: list.name,
        listVotes: list.votes,
        color: list.color,
        kind: 'full',
        dotCount: DOTS_PER_SEAT,
        first,
      })
      first = false
    }
    if (partialDots > 0 || list.quotaSeats === 0) {
      rows.push({
        key: `${list.id}-part`,
        listId: list.id,
        listName: list.name,
        listVotes: list.votes,
        color: list.color,
        kind: 'partial',
        dotCount: partialDots,
        leftoverVotes,
        first,
      })
    }
  }

  // Vertical placement: a label above each party's first row, then its rows.
  let y = ROW.labelHeight + 6
  for (const row of rows) {
    if (row.first && row !== rows[0]) y += ROW.partyGap
    if (row.first) y += ROW.labelHeight - 6
    row.y = y
    y += ROW.height
  }
  const stageHeight = y + 6

  // One dot per chunk of votes, positioned in the opening grid and again in its
  // team's row. Same dot in both places, so it visibly travels.
  const dots = []
  let gridIndex = 0
  for (const row of rows) {
    for (let i = 0; i < row.dotCount; i += 1) {
      dots.push({
        id: `${row.key}-${i}`,
        listId: row.listId,
        color: row.color,
        grid: {
          x: GRID.x0 + (gridIndex % COLS) * GRID.dx,
          y: GRID.y0 + Math.floor(gridIndex / COLS) * GRID.dy,
        },
        seatPos: { x: ROW.x0 + i * ROW.dx + 7, y: row.y },
        delay: gridIndex * 0.006,
        isMine: false,
      })
      gridIndex += 1
    }
  }

  // Mark one dot as the reader's own, in the team they voted for.
  if (myVote) {
    const mine = dots.find((d) => d.listId === myVote.listId)
    if (mine) mine.isMine = true
  }

  const leftoverWinnerLists = result.lists.filter((l) => l.remainderSeats > 0)
  const leftoverWinners = leftoverWinnerLists.map((l) => l.id)
  const remainderCount = result.lists.reduce((n, l) => n + l.remainderSeats, 0)
  const fullSeats = result.seats - remainderCount

  // Act 2 focuses on the reader's own team; without a vote, the biggest team.
  const focusId =
    myVote?.listId ?? [...result.lists].sort((a, b) => b.votes - a.votes)[0]?.id
  const focus = result.lists.find((l) => l.id === focusId) ?? result.lists[0]
  const printed = ballotOrder(focus.candidates)
  const byVotes = [...focus.candidates].sort((a, b) => a.rank - b.rank)

  const seatWord = focus.seats === 1 ? 'seat' : 'seats'
  const winnerSentence =
    focus.seats === 0
      ? `${focus.name} finished short of a full group of ${Math.round(quota).toLocaleString()} votes, so it won no seats.`
      : focus.seats === 1
        ? `${focus.name} wins 1 seat. The ${noun} with the most votes wins.`
        : `${focus.name} wins ${focus.seats} seats. The ${focus.seats} ${nounPlural} with the most votes win.`

  const beats = [
    {
      stage: 'dots',
      phase: 'count',
      headline: `${result.totalVotes.toLocaleString()} votes were cast.`,
      note: `Every dot is about ${votesPerDot.toLocaleString()} ${votesPerDot === 1 ? 'vote' : 'votes'}.`,
    },
    {
      stage: 'dots',
      phase: 'gather',
      headline: 'Every vote joins the team it was cast for.',
      note: 'Nobody’s vote is set aside. They all end up somewhere.',
    },
    {
      stage: 'dots',
      phase: 'seats',
      headline: `It takes 20% of the votes to win one of the ${result.seats} seats — that’s ${Math.round(quota).toLocaleString()} votes.`,
      note: `Every group of ${Math.round(quota).toLocaleString()} votes wins one seat. ${
        fullSeats === result.seats
          ? 'All 5 seats are filled exactly.'
          : `That fills ${fullSeats} of the ${result.seats} seats. The dashed groups are votes that didn’t reach ${Math.round(quota).toLocaleString()}.`
      }`,
    },
  ]

  if (remainderCount > 0 && leftoverWinnerLists.length > 0) {
    const names = leftoverWinnerLists.map((l) => l.name)
    const nameList =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    beats.push({
      stage: 'dots',
      phase: 'leftover',
      headline: `${remainderCount === 1 ? 'One seat is' : `${remainderCount} seats are`} still open, and no team has another full group of ${Math.round(quota).toLocaleString()}.`,
      note:
        names.length === 1
          ? `${nameList} has the most votes left over, so it takes that seat.`
          : `The ${names.length} teams with the most votes left over — ${nameList} — take them.`,
    })
  }

  beats.push({
    stage: 'cands',
    phase: 'ballot',
    headline: `So who fills ${focus.name}’s ${focus.seats === 0 ? 'seats' : seatWord}?`,
    note: null,
  })

  beats.push({
    stage: 'cands',
    phase: 'elected',
    headline: winnerSentence,
    note: null,
  })

  return {
    rows,
    dots,
    stageHeight,
    stageWidthPx: WIDTH,
    leftoverWinners,
    myList: {
      ...focus,
      printed,
      byVotes,
    },
    stageLabel: (phase) =>
      phase === 'count'
        ? `${result.totalVotes.toLocaleString()} votes, drawn as dots`
        : result.lists
            .map((l) => `${l.name}: ${l.votes.toLocaleString()} votes, ${l.seats} seats`)
            .join('. '),
    beats,
  }
}
