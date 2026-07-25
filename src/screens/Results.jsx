import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { allocate, describeMyVote } from '../lib/allocate.js'
import { QUOTA_SENTENCE, SEATS } from '../config.js'

/**
 * The payoff. Beats arrive one at a time, each carrying one short caption, so the
 * allocation is something the viewer watches happen rather than reads about.
 *
 * Beat order matters. The winner-take-all comparison comes last and only on a tap,
 * because leading with it would make the app an argument instead of an experience.
 */
const BEATS = ['bars', 'quota', 'seats', 'mine', 'stat']
const BEAT_MS = 1150

export default function Results({ theme, myVote, results, error, onRestart }) {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(0)
  const [showWta, setShowWta] = useState(false)
  const wtaRef = useRef(null)

  const result = useMemo(
    () => (results ? allocate(theme, results.tallies) : null),
    [theme, results],
  )
  const mine = useMemo(() => (result ? describeMyVote(result, myVote) : null), [result, myVote])

  // Advance the beats. Reduced motion skips straight to the end state.
  useEffect(() => {
    if (!result) return
    if (reduced) {
      setBeat(BEATS.length - 1)
      return
    }
    if (beat >= BEATS.length - 1) return
    const timer = setTimeout(() => setBeat((b) => b + 1), BEAT_MS)
    return () => clearTimeout(timer)
  }, [result, beat, reduced])

  // The comparison renders below the fold on a phone, so bring it to the reader
  // rather than making them hunt for what they just asked to see.
  useEffect(() => {
    if (!showWta) return
    wtaRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    })
  }, [showWta, reduced])

  const reached = (name) => beat >= BEATS.indexOf(name)

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

  const maxPct = Math.max(...result.lists.map((l) => l.votePct))
  const seatsSoFar = reached('seats') ? result.seats : 0

  return (
    <div className="px-5 pt-6 pb-12">
      <h1 className="text-2xl font-semibold tracking-tight">{theme.name}</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        {result.totalVotes.toLocaleString()} votes · {result.seats} seats
      </p>

      {/* Beat 1: the vote shares. */}
      <ul className="mt-6 flex flex-col gap-3">
        {result.lists.map((list, index) => (
          <li key={list.id}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                <span aria-hidden="true">{list.emoji}</span> {list.name}
              </span>
              <span className="tabular-nums text-[var(--ink-soft)]">
                {list.votePct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: list.color }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${(list.votePct / maxPct) * 100}%` }}
                transition={{ duration: 0.7, delay: reduced ? 0 : index * 0.08, ease: 'easeOut' }}
              />
            </div>

            {/* Beat 3: seat tokens land in each list's row. */}
            <div className="mt-1.5 flex min-h-6 items-center gap-1.5">
              <AnimatePresence>
                {reached('seats') &&
                  Array.from({ length: list.seats }, (_, i) => (
                    <motion.span
                      key={i}
                      layout
                      initial={reduced ? false : { scale: 0, y: -18, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 26,
                        // Quota seats settle before remainder seats, so the
                        // leftovers visibly arrive last.
                        delay: reduced ? 0 : (i >= list.quotaSeats ? 0.45 : 0) + i * 0.12,
                      }}
                      className="grid size-6 place-items-center rounded-md text-[11px] font-bold text-white"
                      style={{ backgroundColor: list.color }}
                      title={i >= list.quotaSeats ? 'Won on remainder' : 'Won a full quota'}
                    >
                      {i >= list.quotaSeats ? '+' : '✓'}
                    </motion.span>
                  ))}
              </AnimatePresence>
              {reached('seats') && (
                <span className="ml-1 text-xs text-[var(--ink-soft)]">
                  {list.seats === 0
                    ? 'no seats'
                    : `${list.seats} of ${result.seats} seats`}
                  {list.remainderTieBroken && ' · drawn from a hat 🎩'}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Beat 2: the one-sentence rule. */}
      <AnimatePresence>
        {reached('quota') && (
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[15px]"
          >
            {QUOTA_SENTENCE}
            <span className="mt-1 block text-sm text-[var(--ink-soft)]">
              Leftover seats go to whoever came closest. ✓ = a full share, + = a leftover seat.
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Beat 3 continued: who actually won, ordered by preference votes. */}
      <AnimatePresence>
        {reached('seats') && (
          <motion.section
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-7"
          >
            <h2 className="text-lg font-semibold">
              Elected {seatsSoFar > 0 && `(${seatsSoFar})`}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
              The lists didn&apos;t choose these five. You did.
            </p>
            <ol className="mt-3 flex flex-col gap-2">
              {result.winners.map((winner, i) => (
                <motion.li
                  key={`${winner.listId}/${winner.candidateId}`}
                  layout
                  initial={reduced ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduced ? 0 : 0.3 + i * 0.14 }}
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
                      {winner.viaRemainder && ' · leftover seat'}
                      {winner.tieBroken && ' · drawn from a hat 🎩'}
                    </span>
                  </span>
                </motion.li>
              ))}
            </ol>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Beat 4: the personal payoff. */}
      <AnimatePresence>
        {reached('mine') && mine && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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
                your party.
              </p>
            ) : (
              <p className="text-[17px]">
                You voted for <strong>{mine.candidateName}</strong>. {mine.listName} finished
                short of a full share, so it won no seats this time.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beat 5: the stat, then the contrast on a tap. */}
      <AnimatePresence>
        {reached('stat') && (
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-7"
          >
            <p className="text-[17px]">
              <strong>{Math.round(result.pctRepresented)}% of voters</strong> helped elect
              someone from their party.
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
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
              >
                <p className="text-[15px]">
                  <span aria-hidden="true">{result.wta.listEmoji}</span>{' '}
                  <strong>{result.wta.listName}</strong> came first with{' '}
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
                      ✓
                    </motion.span>
                  ))}
                </div>
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {result.wta.winners.map((cand) => (
                    <li key={cand.id}>{cand.name}</li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-[var(--line)] pt-3 text-[15px]">
                  Voters represented:{' '}
                  <strong>{Math.round(result.wta.pctRepresented)}%</strong> under
                  winner-take-all, <strong>{Math.round(result.pctRepresented)}%</strong> the
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
          </motion.section>
        )}
      </AnimatePresence>

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
