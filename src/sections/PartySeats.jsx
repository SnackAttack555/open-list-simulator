import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ballotOrder, partyName } from '../data/index.js'
import { QUOTA_PCT } from '../config.js'
import SeatCheck from '../components/Check.jsx'
import { joinNames } from '../lib/text.js'

/**
 * Inside the reader's own party: who gets its seat.
 *
 * The names are shown in ballot (alphabetical) order first, then the votes
 * count in, then the list re-sorts and the seat lands — all on its own timer,
 * because you cannot see that the printed order was irrelevant unless you were
 * shown the printed order. A party that won nothing gets one plain sentence
 * instead of a contest with nothing at stake.
 */
export default function PartySeats({ result, myVote, theme }) {
  const reduced = useReducedMotion()
  const list = result.lists.find((l) => l.id === myVote?.listId) ?? result.lists[0]
  const printed = useMemo(() => ballotOrder(list.candidates), [list])
  const byVotes = useMemo(() => [...list.candidates].sort((a, b) => a.rank - b.rank), [list])
  const n = printed.length
  const totalSteps = n + 2 // votes per row, then sort, then award

  const [step, setStep] = useState(reduced ? totalSteps : 0)
  useEffect(() => {
    if (reduced || list.seats === 0) {
      setStep(totalSteps)
      return
    }
    const timers = []
    let at = 500
    for (let i = 1; i <= totalSteps; i += 1) {
      at += i === 1 ? 0 : i <= n ? 320 : 800
      timers.push(setTimeout(() => setStep(i), at))
    }
    return () => timers.forEach(clearTimeout)
  }, [reduced, totalSteps, n, list.seats])

  const votesShown = Math.min(n, step)
  const sorted = step >= n + 1
  const awarded = step >= n + 2
  const rows = sorted ? byVotes : printed
  const max = Math.max(...printed.map((c) => c.votes), 1)
  const noun = theme.noun ?? 'person'
  const winners = byVotes.filter((c) => c.elected).map((c) => c.name)
  const pct = Math.round(list.votePct)

  if (list.seats === 0) {
    return (
      <section className="pt-12" aria-labelledby="party-heading">
        <h2 id="party-heading" className="text-[26px] leading-tight font-semibold tracking-tight">
          What about the {partyName(list)}?
        </h2>
        <p className="mt-3 text-[18px] leading-snug">
          Every vote for a {list.name} candidate counted for the {partyName(list)}. It got {pct}%
          of the votes, and it takes about {QUOTA_PCT}% to win a seat. So the {partyName(list)}{' '}
          came up short this time.
        </p>
      </section>
    )
  }

  return (
    <section className="pt-12" aria-labelledby="party-heading">
      <h2 id="party-heading" className="text-[26px] leading-tight font-semibold tracking-tight">
        Who gets the {partyName(list)}&apos;s {list.seats === 1 ? 'seat' : 'seats'}?
      </h2>
      <p className="mt-3 text-[18px] leading-snug">
        Every vote for a {list.name} candidate counted for the {partyName(list)}. The{' '}
        {partyName(list)} won {list.seats === 1 ? '1 seat' : `${list.seats} seats`}.
      </p>
      <p className="mt-3 text-[18px] leading-snug">
        {list.seats === 1
          ? `The ${list.name} candidate with the most votes gets it: `
          : `The ${list.seats} ${list.name} candidates with the most votes get them: `}
        <strong>{joinNames(winners)}</strong>.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
        <div
          className="flex items-center justify-between px-4 py-2.5 text-[16px] font-semibold text-white"
          style={{ backgroundColor: list.color }}
        >
          <span>
            <span aria-hidden="true">{list.emoji}</span> {partyName(list)}
          </span>
          <span>{list.votes.toLocaleString()} votes</span>
        </div>
        <ul style={{ minHeight: n * 46 }}>
          {rows.map((cand) => {
            const rank = printed.findIndex((c) => c.id === cand.id)
            const revealed = sorted || rank < votesShown
            const won = awarded && cand.elected
            return (
              <motion.li
                key={cand.id}
                layout={!reduced}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="flex min-h-[46px] items-center gap-3 border-t border-[var(--line)] px-4 py-2 first:border-t-0"
                style={{ backgroundColor: won ? `${list.color}14` : undefined }}
              >
                <span className="w-[22px] shrink-0">
                  {won && <SeatCheck color={list.color} />}
                </span>
                <span
                  className={`min-w-0 flex-1 text-[16px] leading-tight ${won ? 'font-semibold' : ''}`}
                >
                  {cand.name}
                </span>
                <span className="block h-2.5 w-16 shrink-0 overflow-hidden rounded-full bg-black/[0.07] sm:w-24">
                  <motion.span
                    className="block h-2.5 rounded-full"
                    style={{ backgroundColor: list.color }}
                    initial={false}
                    animate={{ width: revealed ? `${(cand.votes / max) * 100}%` : 0 }}
                    transition={{ duration: reduced ? 0 : 0.45 }}
                  />
                </span>
                <b className="w-11 shrink-0 text-right text-[15px] tabular-nums">
                  {revealed ? cand.votes.toLocaleString() : ''}
                </b>
              </motion.li>
            )
          })}
        </ul>
      </div>

      <p className="mt-5 text-[18px] leading-snug">
        So <strong>100% of {list.name} votes</strong> helped elect a {list.name}{' '}
        {noun === 'person' ? 'representative' : noun}.
        {list.id === result.wta.listId
          ? ' Under winner-take-all, they did too — but nobody else\u2019s did.'
          : ' Under winner-take-all, it was 0%.'}
      </p>
    </section>
  )
}
