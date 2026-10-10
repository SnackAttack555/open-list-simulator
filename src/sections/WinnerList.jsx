import { motion } from 'motion/react'
import { partyName } from '../data/index.js'
import SeatCheck from '../components/Check.jsx'

/**
 * Five seats as five lines: "Barry Sanders (Lions party)". Candidate first,
 * party second, a check for the seat. The reader's own candidate is marked
 * because finding yourself is the first thing anyone does with a list of
 * winners; rows from the reader's party carry a wash of its colour.
 */
export default function WinnerList({ winners, myVote, reduced }) {
  return (
    <ol className="mt-4 flex flex-col gap-1.5">
      {winners.map((winner, i) => {
        const mine =
          myVote?.listId === winner.listId && myVote?.candidateId === winner.candidateId
        const myParty = myVote?.listId === winner.listId
        return (
          <motion.li
            key={`${winner.listId}/${winner.candidateId}`}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduced ? 0 : 0.15 + i * 0.1, duration: reduced ? 0 : 0.35 }}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-[18px]"
            style={myParty ? { backgroundColor: `${winner.color}14` } : undefined}
          >
            <SeatCheck color={winner.color} />
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 leading-snug">
              <span className={mine ? 'font-semibold' : 'font-medium'}>{winner.name}</span>
              <span className="text-[var(--ink-soft)]">({partyName(winner.listName)})</span>
              {mine && (
                <span className="text-[14px] font-semibold whitespace-nowrap text-[var(--ink-soft)]">
                  your vote
                </span>
              )}
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}
