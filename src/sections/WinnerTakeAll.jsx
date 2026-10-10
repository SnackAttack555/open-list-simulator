import { useReducedMotion } from 'motion/react'
import { partyName } from '../data/index.js'
import WinnerList from './WinnerList.jsx'

/**
 * The old system first, and it goes badly.
 *
 * Under winner-take-all the party with the most votes takes every seat, so the
 * list of winners is five names from one party. The reader's own line is the
 * point: their party had votes, and it has nobody.
 */
export default function WinnerTakeAll({ result, mine, myVote }) {
  const reduced = useReducedMotion()
  const { wta } = result
  const myList = myVote ? result.lists.find((l) => l.id === myVote.listId) : null
  const wtaPct = Math.round(wta.pctRepresented)
  const myPct = myList ? Math.round(myList.votePct) : 0
  const inWinningParty = Boolean(myList) && myList.id === wta.listId
  const myCandidateWon = inWinningParty && wta.winners.some((c) => c.id === myVote.candidateId)

  const winners = wta.winners.map((cand) => ({
    listId: wta.listId,
    listName: wta.listName,
    color: wta.color,
    candidateId: cand.id,
    name: cand.name,
  }))

  return (
    <section className="pt-12" aria-labelledby="wta-heading">
      <h2 id="wta-heading" className="text-[26px] leading-tight font-semibold tracking-tight">
        First, the usual way: winner takes all
      </h2>
      <p className="mt-3 text-[18px] leading-snug">
        This is how most U.S. elections work. The party with the most votes wins every seat.
      </p>
      <p className="mt-3 text-[18px] leading-snug">
        The <strong>{partyName(wta.listName)}</strong> got the most votes, {wtaPct}%. So the{' '}
        {partyName(wta.listName)} won all {result.seats} seats.
      </p>

      <WinnerList winners={winners} myVote={myVote} reduced={reduced} />

      {mine && (
        <p
          className="mt-5 rounded-xl px-4 py-3.5 text-[18px] leading-snug"
          style={{ backgroundColor: `${mine.color}14` }}
        >
          {myCandidateWon ? (
            <>
              You voted for <strong>{mine.candidateName}</strong>, and {mine.candidateName} won a
              seat. Your party won everything.
            </>
          ) : inWinningParty ? (
            <>
              You voted for <strong>{mine.candidateName}</strong>. {mine.candidateName} didn&apos;t
              win, but your party won everything.
            </>
          ) : (
            <>
              You voted for <strong>{mine.candidateName}</strong>. The {partyName(mine.listName)}{' '}
              got {myPct}% of the votes but won <strong>zero seats</strong>. You have no
              representation.
            </>
          )}
        </p>
      )}
    </section>
  )
}
