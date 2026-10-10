import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { partyName } from '../data/index.js'
import { CheckPath } from '../components/Check.jsx'
import { QUOTA_PCT } from '../config.js'
import { joinNames } from '../lib/text.js'

/**
 * How votes became seats, in one picture and three sentences.
 *
 * Every vote is a dot, sitting with its party. A full row of dots is one
 * seat's worth, and a check lands on each full row; then the leftover rows
 * that were closest to full take whatever seats are still open. The picture
 * plays through on its own when it arrives — nobody taps through it — and the
 * sentences under it say the same thing in words, so a reader who scrolls
 * past the animation loses nothing.
 *
 * Everything is drawn inside ONE svg. Positioning the dots as HTML over an
 * svg lined up at exactly one viewport width and drifted at every other.
 */

const WIDTH = 340
const GROUP = { x: 4, w: 214, pad: 10, rowH: 20, labelH: 20, partyGap: 12 }
const BADGE = { x: GROUP.x + GROUP.w + 8, size: 18 }

/**
 * One dot is ten votes. A fixed dot count would make the scale drift as an
 * election grows, so the dot count grows instead, and the scale steps up only
 * when a row of one seat's worth would stop being legible.
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

export default function HowSeats({ result }) {
  const reduced = useReducedMotion()
  const model = useMemo(() => buildModel(result), [result])
  const total = model.fullGroupOrder.length + model.leftoverOrder.length
  const [step, setStep] = useState(reduced ? total : 0)

  // Full rows first, briskly; a breath; then the leftovers, slower, because
  // "the closest to full wins" is the one idea here that needs watching.
  useEffect(() => {
    if (reduced) {
      setStep(total)
      return
    }
    const timers = []
    let at = 600
    for (let i = 1; i <= total; i += 1) {
      const isFirstLeftover = i === model.fullGroupOrder.length + 1
      at += i === 1 ? 0 : isFirstLeftover ? 900 : i <= model.fullGroupOrder.length ? 420 : 650
      timers.push(setTimeout(() => setStep(i), at))
    }
    return () => timers.forEach(clearTimeout)
  }, [reduced, total, model])

  const order = [...model.fullGroupOrder, ...model.leftoverOrder]
  const revealed = new Set(order.slice(0, step).map((r) => r.key))
  const leftoverPhase = step > model.fullGroupOrder.length
  const quotaText = Math.round(result.quota).toLocaleString()
  const fullSeats = model.fullGroupOrder.length
  const openSeats = model.leftoverOrder.length

  return (
    <section className="pt-12" aria-labelledby="how-heading">
      <h2 id="how-heading" className="text-[26px] leading-tight font-semibold tracking-tight">
        How did that happen?
      </h2>
      <p className="mt-3 text-[18px] leading-snug">
        {result.totalVotes.toLocaleString()} votes were cast. Every dot is about{' '}
        {model.votesPerDot.toLocaleString()} votes.
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${model.stageHeight}`}
        width="100%"
        className="mt-4 block"
        style={{ height: 'auto' }}
        role="img"
        aria-label={result.lists
          .map((l) => `${partyName(l)}: ${l.votes.toLocaleString()} votes, ${l.seats} seats`)
          .join('. ')}
      >
        {model.rows.map((row) => {
          const circled = revealed.has(row.key)
          return (
            <g key={row.key}>
              {row.first && (
                <text x="2" y={row.y - 14} fontSize="14" fontWeight="600" fill="var(--ink)">
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
                  // A leftover seat is drawn dashed, a full group solid, so
                  // the two kinds of seat look like two kinds of thing.
                  strokeDasharray={row.kind === 'full' ? undefined : '5 3'}
                />
              )}
              {circled && (
                /* Two groups, not one: the badge-in keyframes set a CSS
                   transform, and a CSS transform replaces an SVG transform
                   attribute on the same element — every badge would land
                   at the origin. */
                <g transform={`translate(${BADGE.x} ${row.y - 9})`}>
                  <g className={reduced ? undefined : 'seat-badge'}>
                    <rect width={BADGE.size} height={BADGE.size} rx="5" fill={row.color} />
                    <CheckPath size={BADGE.size} />
                  </g>
                </g>
              )}
              {leftoverPhase && row.kind === 'partial' && (
                <text
                  x={BADGE.x + BADGE.size + 7}
                  y={row.y + 4.5}
                  fontSize="13"
                  fill="var(--ink-soft)"
                >
                  {Math.round(row.leftoverVotes).toLocaleString()} left over
                </text>
              )}
              {row.dots.map((dot) => (
                <circle key={dot.id} cx={dot.x} cy={row.y} r={model.dotR} fill={row.color} />
              ))}
            </g>
          )
        })}
      </svg>

      <p className="mt-5 text-[18px] leading-snug">
        It takes {QUOTA_PCT}% of the votes to win a seat. That&apos;s about{' '}
        <strong>{quotaText} votes</strong>.
      </p>
      <p className="mt-3 text-[18px] leading-snug">
        Every full row of {quotaText} votes wins one seat. That fills {fullSeats} of the{' '}
        {result.seats} seats.
      </p>
      {openSeats > 0 && (
        <p className="mt-3 text-[18px] leading-snug">
          {openSeats === 1 ? 'One seat is' : `${openSeats} seats are`} still open, and no party
          has another full row. The {openSeats === 1 ? 'party' : 'parties'} with the most votes
          left over {openSeats === 1 ? 'gets it' : 'get them'}:{' '}
          <strong>{joinNames(model.leftoverOrder.map((r) => r.listName))}</strong>.
        </p>
      )}
    </section>
  )
}

function buildModel(result) {
  const quota = result.quota
  const { votesPerDot, dotsPerSeat } = chooseScale(quota)
  const spacing = (GROUP.w - GROUP.pad * 2) / Math.max(1, dotsPerSeat - 1)
  const dotR = Math.max(1.4, Math.min(3.6, 0.32 * spacing))

  const rows = []
  for (const list of result.lists) {
    const leftoverVotes = Math.max(0, list.votes - list.quotaSeats * quota)
    // Size the partial row from the real leftover rather than from rounded
    // dots, so the biggest leftover always *looks* biggest.
    const partialDots = Math.max(
      0,
      Math.min(dotsPerSeat - 1, Math.round((leftoverVotes / quota) * dotsPerSeat)),
    )
    let first = true
    for (let g = 0; g < list.quotaSeats; g += 1) {
      rows.push(row(list, `${list.id}-full-${g}`, 'full', dotsPerSeat, 0, first))
      first = false
    }
    if (partialDots > 0 || list.quotaSeats === 0) {
      rows.push({
        ...row(list, `${list.id}-part`, 'partial', partialDots, leftoverVotes, first),
        wonLeftover: list.remainderSeats > 0,
      })
    }
  }

  let y = GROUP.labelH + 8
  for (const r of rows) {
    if (r.first && r !== rows[0]) y += GROUP.partyGap
    if (r.first) y += GROUP.labelH - 2
    r.y = y
    r.dots = Array.from({ length: r.dotCount }, (_, i) => ({
      id: `${r.key}-${i}`,
      x: GROUP.x + GROUP.pad + i * spacing,
    }))
    y += GROUP.rowH
  }

  const fullGroupOrder = rows.filter((r) => r.kind === 'full')
  const leftoverOrder = rows
    .filter((r) => r.kind === 'partial' && r.wonLeftover)
    .sort((a, b) => b.leftoverVotes - a.leftoverVotes) // closest to full first

  return { rows, dotR, votesPerDot, stageHeight: y + 2, fullGroupOrder, leftoverOrder }
}

function row(list, key, kind, dotCount, leftoverVotes, first) {
  return {
    key,
    listId: list.id,
    listName: partyName(list),
    listVotes: list.votes,
    color: list.color,
    kind,
    dotCount,
    leftoverVotes,
    first,
  }
}
