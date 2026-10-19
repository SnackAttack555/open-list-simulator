import { Fragment } from 'react'
import { SEATS, VOTERS } from './data.js'
import { listNames } from './election.js'
import VoteDots, { settleTime } from './components/VoteDots.jsx'
import PartyList from './components/PartyList.jsx'
import Council from './components/Council.jsx'
import MiniDots from './components/MiniDots.jsx'
import Districts, { DISTRICT_SETTLE } from './components/Districts.jsx'
import { Cand, Party } from './components/inline.jsx'

/**
 * The count, in six short sections of plain sentences, in this order:
 *
 *   1. the familiar way first: winner-take-all in your own district, and it
 *      goes badly for you (on the first run; later runs are not rigged)
 *   2. the idea of one bigger district with five representatives
 *   3. the same votes counted the other way, and what you get
 *   4. how those seats were decided: the full rows circle in on arrival, and
 *      Next answers who gets the leftover seats on the same picture
 *   5. which candidate got your party's seat
 *   6. every vote counted, and the name for it
 *
 * Each section has `steps` (default 1) and renders from `body(phase)`, where
 * phase is how many extra steps Next has revealed inside it. A section whose
 * step animates a picture before its text appears gives `settle(phase)`, the
 * milliseconds the picture needs; App waits that long before scrolling to the
 * text. A picture only where a sentence can't do the job. Party and candidate
 * names are colour-coded where they are the subject of the sentence, not
 * every time.
 */

const ordinal = (n) =>
  `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`
const seats = (n) => (n === 1 ? '1 seat' : `${n} seats`)

/** "Dogs got 27, Birds got 22, and Fish got 14" with the names coloured. */
function PartyCounts({ parties, verb, what }) {
  return parties.map((p, i) => (
    <Fragment key={p.id}>
      {i > 0 && (i === parties.length - 1 ? ', and ' : ', ')}
      <Party p={p} /> {verb} {what(p)}
    </Fragment>
  ))
}

export function buildSections(e) {
  const top = e.wta.party
  const rest = e.standings.slice(1)
  const others = e.total - top.votes
  const quota = Math.round(e.quota)
  const open = SEATS - e.fullSeats
  const leftWinners = [...e.parties]
    .sort((a, b) => b.leftover - a.leftover)
    .filter((p) => p.wonLeftover)
  const settle = settleTime(e)

  const my = e.me.party
  const me = e.me.candidate
  const rank = my.ranked.findIndex((c) => c.id === me.id) + 1
  const sameSeats = rest.every((p) => p.seats === rest[0].seats)
  const restNames = listNames(rest.map((p) => p.short))
  const mySeats = my.seats === 1 ? 'its seat' : `its ${my.seats} seats`

  return [
    {
      id: 'wta',
      title: 'The votes are in.',
      body: () => (
        <>
          <p>
            <Party p={top} /> got the most votes: {top.votes} out of {VOTERS}.{' '}
            <PartyCounts parties={rest} verb="got" what={(p) => p.votes} />.
          </p>
          <p>
            You live in an area that’s mostly {top.singular} people and <Party p={top} /> got
            the most votes in each nearby district too.
          </p>
          <p>
            Most elections in the US are winner-take-all. The party with the most votes wins
            everything. So <Party p={top} /> get all {SEATS} seats near you.
          </p>
          <Council seats={e.wta.council} />
          <p>
            You voted for <Cand c={me} p={my} /> from the <Party p={my} long />.{' '}
            {e.me.wtaElected ? (
              <>
                {my.short} came in 1st, so {me.name} is in the legislature.
              </>
            ) : (
              <>
                {my.short} came in {ordinal(my.place)}, but they get nothing. Your vote elected
                nobody.
              </>
            )}
          </p>
          <p>
            {others} out of {VOTERS} people have no one in the legislature.
          </p>
          <MiniDots parties={e.parties} represented={(p) => p.id === top.id} />
        </>
      ),
    },
    {
      id: 'district',
      title: 'One bigger district.',
      steps: 3,
      settle: (phase) => DISTRICT_SETTLE[phase],
      body: (phase) => (
        <>
          <p>
            Now imagine your neighborhood district is combined with other nearby districts. Just
            like you have 2 U.S. senators, you’d have 5 state representatives and each will
            represent you all.
          </p>
          <Districts election={e} phase={phase} />
          {phase >= 2 && (
            <p className="part" key="ask">
              What if everyone’s voice was represented?
            </p>
          )}
        </>
      ),
    },
    {
      id: 'pr',
      title: 'Same votes, counted a different way.',
      body: () => (
        <>
          <p>
            Now let’s count the same {VOTERS} votes the way most other countries do. Each party
            gets seats to match its votes.
          </p>
          <Council seats={e.council} />
          <p>
            <Party p={top} /> get {seats(top.seats)}.{' '}
            {sameSeats ? (
              <>
                {restNames} get {rest[0].seats} each.
              </>
            ) : (
              <>
                <PartyCounts parties={rest} verb="get" what={(p) => p.seats} />.
              </>
            )}{' '}
            {me.elected ? (
              <>
                <Cand c={me} p={my} /> is in the legislature.
              </>
            ) : (
              <>
                Your vote helped put <Cand c={my.winners[0]} p={my} /> in the legislature.
              </>
            )}
          </p>
          <MiniDots parties={e.parties} represented={(p) => p.seats > 0} />
          <p>
            The party with the most votes wins the most seats, but they don’t win all the seats.
          </p>
        </>
      ),
    },
    {
      id: 'how',
      title: 'How the seats were decided.',
      steps: 2,
      settle: (phase) => (phase === 1 ? settle : 0),
      body: (phase) => (
        <>
          <p>
            There are {SEATS} seats and {VOTERS} votes so each seat ‘costs’ {quota} votes (one
            row).
          </p>
          <VoteDots election={e} phase={phase + 1} />
          {phase >= 1 && (
            <p className="part late" key="left" style={{ '--late': `${settle}ms` }}>
              The last {open === 1 ? 'seat goes' : `${open} seats go`} to whoever came closest
              to filling another row:{' '}
              <PartyCounts
                parties={leftWinners}
                verb="with"
                what={(p) => `${p.leftover} left over`}
              />
              .
            </p>
          )}
        </>
      ),
    },
    {
      id: 'party',
      title: `Your party’s ${my.seats === 1 ? 'seat' : 'seats'}.`,
      body: () => (
        <>
          <p>
            The <Party p={my} long /> won {seats(my.seats)}. The{' '}
            {my.seats === 1 ? my.singular : `${my.seats} ${my.plural}`} with the most votes{' '}
            {my.seats === 1 ? 'gets it' : 'get them'}.
          </p>
          <PartyList party={my} />
          <p>
            {me.elected ? (
              <>
                You voted for <Cand c={me} p={my} />, who came in {ordinal(rank)}. {me.name}{' '}
                gets {my.seats === 1 ? 'the seat' : 'a seat'}.
              </>
            ) : (
              <>
                You voted for <Cand c={me} p={my} />, who came in {ordinal(rank)}, so {me.name}{' '}
                doesn’t get a seat. But your vote still counted: it helped the{' '}
                <Party p={my} long /> win {mySeats}.
              </>
            )}
          </p>
        </>
      ),
    },
    {
      id: 'end',
      title: 'Every vote counted.',
      body: () => (
        <>
          <p>
            Under winner-take-all, only the {top.votes} people who voted for <Party p={top} />{' '}
            got someone in the legislature. Counted the new way, all {VOTERS} people did. Every
            vote helped elect someone from its own party.
          </p>
          <p>
            This way of counting is called proportional representation. Most democracies in the
            world use it.
          </p>
        </>
      ),
    },
  ]
}
