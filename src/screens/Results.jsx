import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { allocate, describeMyVote } from '../lib/allocate.js'
import { SEATS } from '../config.js'
import SeatStory from '../components/SeatStory.jsx'

/**
 * The results screen: first the explanation, then the payoff.
 *
 * SeatStory carries the argument (votes -> seats -> which people). Everything
 * below it — what happened to your own vote, how many voters ended up
 * represented, and the winner-take-all comparison — only appears once that
 * story has been read through, so the conclusion never arrives before the
 * reasoning.
 */
export default function Results({ theme, myVote, results, error, onRestart }) {
  const reduced = useReducedMotion()
  const [storyDone, setStoryDone] = useState(false)
  const [showWta, setShowWta] = useState(false)
  const wtaRef = useRef(null)
  const afterRef = useRef(null)

  const result = useMemo(
    () => (results ? allocate(theme, results.tallies) : null),
    [theme, results],
  )
  const mine = useMemo(() => (result ? describeMyVote(result, myVote) : null), [result, myVote])

  const onStoryDone = useCallback(() => setStoryDone(true), [])
  const onStoryFinish = useCallback(() => {
    afterRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }, [reduced])

  // Bring the comparison into view; on a phone it renders below the fold.
  useEffect(() => {
    if (!showWta) return
    wtaRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  }, [showWta, reduced])

  if (error && !result) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-[var(--ink-soft)]">{error}</p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 min-h-12 rounded-xl bg-[var(--accent)] px-5 font-semibold text-white"
        >
          Back to all elections
        </button>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="px-5 py-16 text-center text-[var(--ink-soft)]">
        <p>Counting the votes…</p>
      </div>
    )
  }

  const fade = reduced
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

  return (
    <div className="px-5 pt-6 pb-12">
      <h1 className="text-2xl font-semibold tracking-tight">{theme.name}</h1>
      <p className="mt-1 mb-5 text-sm text-[var(--ink-soft)]">
        {result.totalVotes.toLocaleString()} votes · {result.seats} seats
      </p>

      <SeatStory
        theme={theme}
        result={result}
        myVote={myVote}
        onDone={onStoryDone}
        onFinish={onStoryFinish}
      />

      {storyDone && (
        <motion.div {...fade} ref={afterRef} className="mt-8">
          <h2 className="text-lg font-semibold">All {result.seats} winners</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {result.winners.map((winner) => (
              <li
                key={`${winner.listId}/${winner.candidateId}`}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2.5"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: winner.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{winner.name}</span>
                  <span className="block text-xs text-[var(--ink-soft)]">
                    {winner.listName} · {winner.votes.toLocaleString()} votes
                    {winner.tieBroken && ' · tied, drawn from a hat 🎩'}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {mine && (
            <div
              className="mt-7 rounded-2xl border-2 px-4 py-4"
              style={{ borderColor: mine.color }}
            >
              {mine.candidateElected ? (
                <p className="text-[17px]">
                  You voted for <strong>{mine.candidateName}</strong>.{' '}
                  <strong>{mine.candidateName} won a seat.</strong>
                </p>
              ) : mine.representedByList ? (
                <p className="text-[17px]">
                  <strong>{mine.candidateName}</strong> didn&apos;t win a seat, but{' '}
                  {mine.listName} won {mine.listSeats} — your vote still elected someone from
                  your team.
                </p>
              ) : (
                <p className="text-[17px]">
                  You voted for <strong>{mine.candidateName}</strong>. {mine.listName} finished
                  short of a full group, so it won no seats this time.
                </p>
              )}
            </div>
          )}

          <p className="mt-7 text-[17px]">
            <strong>{Math.round(result.pctRepresented)}% of voters</strong> helped elect someone
            from their team.
          </p>

          {!showWta ? (
            <button
              type="button"
              onClick={() => setShowWta(true)}
              className="mt-4 min-h-13 w-full rounded-xl border-2 border-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent)]"
            >
              What if this were winner-take-all?
            </button>
          ) : (
            <motion.div
              ref={wtaRef}
              {...fade}
              className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
            >
              <p className="text-[15px]">
                <span aria-hidden="true">{result.wta.listEmoji}</span>{' '}
                <strong>{result.wta.listName}</strong> came in first with{' '}
                {result.wta.pctRepresented.toFixed(1)}% of the vote — so it would take{' '}
                <strong>all {SEATS} seats</strong>.
              </p>
              <div className="mt-3 flex gap-1.5">
                {Array.from({ length: SEATS }, (_, i) => (
                  <motion.span
                    key={i}
                    initial={reduced ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: reduced ? 0 : i * 0.09 }}
                    className="grid size-7 place-items-center rounded-md text-[11px] font-bold text-white"
                    style={{ backgroundColor: result.wta.color }}
                  >
                    ★
                  </motion.span>
                ))}
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {result.wta.winners.map((cand) => (
                  <li key={cand.id}>{cand.name}</li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[var(--line)] pt-3 text-[15px]">
                Voters represented: <strong>{Math.round(result.wta.pctRepresented)}%</strong>{' '}
                under winner-take-all, <strong>{Math.round(result.pctRepresented)}%</strong> the
                way you just voted.
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-[var(--ink-soft)]">
                {result.lists
                  .filter((l) => l.id !== result.wta.listId && l.seats > 0)
                  .map((l) => (
                    <li key={l.id}>
                      {l.name} would lose {l.seats} seat{l.seats === 1 ? '' : 's'} on{' '}
                      {l.votePct.toFixed(1)}% of the vote
                    </li>
                  ))}
              </ul>
            </motion.div>
          )}
        </motion.div>
      )}

      <footer className="mt-9 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          onClick={onRestart}
          className="min-h-13 w-full rounded-xl bg-[var(--accent)] font-semibold text-white"
        >
          Try another election
        </button>
        {results && (
          <p className="mt-4 text-center text-xs leading-relaxed text-[var(--ink-soft)]">
            {results.realVotes.toLocaleString()} real vote
            {results.realVotes === 1 ? '' : 's'} so far, on top of{' '}
            {results.seedVotes.toLocaleString()} simulated voters used to start this election
            off.
          </p>
        )}
      </footer>
    </div>
  )
}
