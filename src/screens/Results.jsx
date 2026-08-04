import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { allocate, describeMyVote } from '../lib/allocate.js'
import { partyName } from '../data/index.js'
import { QUOTA_PCT, SEATS } from '../config.js'
import SeatStory from '../components/SeatStory.jsx'

/**
 * The results screen: first the explanation, then the payoff.
 *
 * SeatStory carries the argument: who won, then votes -> seats -> which people.
 * The winners open the story rather than closing it, so they are not repeated
 * here. What is left below — what happened to your own vote, how many voters
 * ended up represented, and the winner-take-all comparison — appears only once
 * the story has been read through.
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
      <div className="mx-auto w-full max-w-[520px] px-5 py-16 text-center">
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
      <div className="mx-auto w-full max-w-[520px] px-5 py-16 text-center text-[var(--ink-soft)]">
        <p>Counting the votes…</p>
      </div>
    )
  }

  const fade = reduced
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

  // Rounded once and the remainder derived from it, never rounded separately:
  // two independent Math.rounds of 37.5 and 62.5 both go up and the sentence
  // claims 101% of voters.
  const wtaPct = Math.round(result.wta.pctRepresented)

  // For the shut-out case. "Just short" is only true when it nearly cleared the
  // quota — a party on 4% is short, not just short, and claiming otherwise is the
  // kind of small dishonesty a sceptical reader notices.
  const myList = myVote ? result.lists.find((l) => l.id === myVote.listId) : null
  const myPct = myList ? Math.round(myList.votePct) : 0
  const justShort = Boolean(myList) && myList.votePct >= QUOTA_PCT - 5

  return (
    <div className="mx-auto w-full max-w-[520px] px-5 pt-6 pb-12">
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
          {/* The winners are the story's opening beat now, so they are not
              repeated here. What is left is what the result meant for you. */}
          {mine && (
            <div
              className="rounded-2xl border-2 px-4 py-4"
              style={{ borderColor: mine.color }}
            >
              {mine.candidateElected ? (
                <p className="text-[17px]">
                  You voted for <strong>{mine.candidateName}</strong>.{' '}
                  <strong>{mine.candidateName} won a seat.</strong>
                </p>
              ) : mine.representedByList ? (
                <p className="text-[17px]">
                  <strong>{mine.candidateName}</strong> didn&apos;t win a seat, but the{' '}
                  {partyName(mine.listName)} won {mine.listSeats} — your vote still elected
                  someone from your party.
                </p>
              ) : (
                <p className="text-[17px]">
                  You voted for <strong>{mine.candidateName}</strong>. The{' '}
                  {partyName(mine.listName)} won <strong>{myPct}%</strong> of the vote —{' '}
                  {justShort ? 'just short of' : 'short of'} the {QUOTA_PCT}% it takes to win
                  one of {result.seats} seats — so it elected no one this time.
                </p>
              )}
            </div>
          )}

          <p className="mt-7 text-[17px]">
            <strong>{Math.round(result.pctRepresented)}% of voters</strong> helped elect someone
            from their party.
          </p>

          {/* The question stays on screen after it is answered. It was the button
              label before, so tapping it took the question away and left the
              answer sitting under nothing — you had to remember what you'd asked. */}
          <h2 className="mt-7 text-lg font-semibold">
            What if this was winner-take-all, like most US elections?
          </h2>

          {!showWta ? (
            <button
              type="button"
              onClick={() => setShowWta(true)}
              className="mt-3 min-h-13 w-full rounded-xl border-2 border-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent)]"
            >
              Show me what would happen
            </button>
          ) : (
            <motion.div
              ref={wtaRef}
              {...fade}
              className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
            >
              <p className="text-[15px] leading-relaxed">
                This district elected {result.seats} {theme.nounPlural ?? 'people'}. Under
                traditional (winner take all) rules, there would be {result.seats} nearby
                districts and the{' '}
                <strong>
                  <span aria-hidden="true">{result.wta.listEmoji}</span>{' '}
                  {partyName(result.wta.listName)}
                </strong>{' '}
                would have won all of them even though they only won{' '}
                <strong>{wtaPct}%</strong> of the vote. Voters supporting the other parties,
                who made up <strong>{100 - wtaPct}%</strong> of voters, would elect no
                representative from these districts.
              </p>
              {/* The party owning the five stars, named next to them. Five coloured
                  squares alone leave the reader matching a swatch against a
                  sentence two lines up. */}
              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="flex gap-1.5">
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
                </span>
                <span className="text-sm font-semibold" style={{ color: result.wta.color }}>
                  <span aria-hidden="true">{result.wta.listEmoji}</span>{' '}
                  {partyName(result.wta.listName)}
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {result.wta.winners.map((cand) => (
                  <li key={cand.id}>{cand.name}</li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[var(--line)] pt-3 text-[15px]">
                Voters represented: <strong>{wtaPct}%</strong> under winner-take-all,{' '}
                <strong>{Math.round(result.pctRepresented)}%</strong> the way you just voted.
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-[var(--ink-soft)]">
                {result.lists
                  .filter((l) => l.id !== result.wta.listId && l.seats > 0)
                  .map((l) => (
                    <li key={l.id}>
                      The {partyName(l)} would lose {l.seats} seat{l.seats === 1 ? '' : 's'} on{' '}
                      {Math.round(l.votePct)}% of the vote
                    </li>
                  ))}
              </ul>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Third tier, deliberately. This footer is on screen for the whole story,
          so while it was a solid accent button it carried the same weight as the
          one advancing the explanation — two equally loud buttons, one of which
          abandons the thing the reader came for. The hierarchy is now: solid
          accent moves you forward, outlined accent reveals the comparison, and
          this is a quiet neutral exit. Still a full touch target, just not a
          competing invitation. */}
      <footer className="mt-9 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          onClick={onRestart}
          className="mx-auto flex min-h-12 w-full max-w-[260px] items-center justify-center rounded-xl border border-[var(--line)] text-[15px] text-[var(--ink-soft)] transition-colors hover:border-[var(--ink-soft)] hover:text-[var(--ink)]"
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
