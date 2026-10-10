import { useMemo } from 'react'
import { useReducedMotion } from 'motion/react'
import { partyName } from '../data/index.js'
import { QUOTA_PCT } from '../config.js'
import WinnerList from './WinnerList.jsx'
import { joinNames } from '../lib/text.js'

/**
 * The same votes, the new way. Parties win seats in proportion to their votes,
 * so the five winners come from more than one party — and one of them is from
 * the reader's. That sentence is the whole product; the rest of the page
 * explains how it came to be true.
 */
export default function Proportional({ result, mine, myVote }) {
  const reduced = useReducedMotion()
  const myList = myVote ? result.lists.find((l) => l.id === myVote.listId) : null
  const myPct = myList ? Math.round(myList.votePct) : 0

  // Biggest party first, then by votes inside it — the order a results board
  // would print them in, rather than the order the seats were allocated.
  const winners = useMemo(() => {
    const share = new Map(result.lists.map((l) => [l.id, l.votes]))
    return [...result.winners].sort(
      (a, b) => share.get(b.listId) - share.get(a.listId) || b.votes - a.votes,
    )
  }, [result])

  const mySeatHolders = myList
    ? myList.candidates.filter((c) => c.elected).map((c) => c.name)
    : []
  const names = joinNames(mySeatHolders)

  return (
    <section className="pt-12" aria-labelledby="pr-heading">
      <h2 id="pr-heading" className="text-[26px] leading-tight font-semibold tracking-tight">
        Now, a new way: proportional representation
      </h2>
      <p className="mt-3 text-[18px] leading-snug">
        Same votes, counted a new way. Each party wins seats in proportion to its votes.
      </p>
      <p className="mt-3 text-[18px] leading-snug">Here&apos;s who won:</p>

      <WinnerList winners={winners} myVote={myVote} reduced={reduced} />

      {mine && (
        <p
          className="mt-5 rounded-xl px-4 py-3.5 text-[18px] leading-snug"
          style={{ backgroundColor: `${mine.color}14` }}
        >
          {mine.candidateElected ? (
            <>
              You voted for <strong>{mine.candidateName}</strong>, and {mine.candidateName} won a
              seat. <strong>Now you have representation.</strong>
            </>
          ) : mine.representedByList ? (
            <>
              {mine.candidateName} didn&apos;t win. But the {partyName(mine.listName)} won{' '}
              {mine.listSeats === 1 ? 'a seat' : `${mine.listSeats} seats`}, and{' '}
              {mine.listSeats === 1 ? 'it went' : 'they went'} to <strong>{names}</strong>.{' '}
              <strong>Now you have representation.</strong>
            </>
          ) : (
            <>
              {mine.candidateName} didn&apos;t win, and the {partyName(mine.listName)} came up
              short of a seat. It got {myPct}% of the votes, and it takes about {QUOTA_PCT}% to
              win one.
            </>
          )}
        </p>
      )}
    </section>
  )
}
