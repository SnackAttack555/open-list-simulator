import { Fragment } from 'react'
import { SEATS, VOTERS } from '../data.js'
import PartyList from '../components/PartyList.jsx'
import { Cand, Party } from '../components/inline.jsx'
import Crowd from './Crowd.jsx'

/**
 * The count as a scroll story: one picture (Crowd) that only ever moves, and
 * eleven cards. Each card names the phase the picture should be in; scrolling a
 * card into the lower-middle of the screen makes it active, and the picture
 * animates to that phase, forwards or backwards. A card narrates the change
 * that happens while it is on screen, never one still to come.
 *
 *   scenes: { id, render(phase) }
 *   steps:  { scene, phase, title?, body }
 */

const ordinal = (n) =>
  `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`
const seats = (n) => (n === 1 ? '1 seat' : `${n} seats`)
const list = (names) =>
  names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`

function PartyCounts({ parties, verb, what }) {
  return parties.map((p, i) => (
    <Fragment key={p.id}>
      {i > 0 && (i === parties.length - 1 ? ', and ' : ', ')}
      <Party p={p} /> {verb} {what(p)}
    </Fragment>
  ))
}

export function buildStory(e) {
  const top = e.wta.party
  const rest = e.standings.slice(1)
  const others = e.total - top.votes
  const leftWinners = [...e.parties]
    .sort((a, b) => b.leftover - a.leftover)
    .filter((p) => p.wonLeftover)
  const fullParties = e.standings.filter((p) => p.fullSeats > 0)

  const my = e.me.party
  const me = e.me.candidate
  const rank = my.ranked.findIndex((c) => c.id === me.id) + 1
  const sameSeats = rest.every((p) => p.seats === rest[0].seats)
  const mySeats = my.seats === 1 ? 'its seat' : `its ${my.seats} seats`

  const scenes = [{ id: 'crowd', render: (phase) => <Crowd election={e} phase={phase} /> }]

  const steps = [
    {
      scene: 'crowd',
      phase: 0,
      title: 'The votes are in.',
      body: (
        <p>
          <Party p={top} /> got the most votes: {top.votes} out of {VOTERS}.{' '}
          <PartyCounts parties={rest} verb="got" what={(p) => p.votes} />.
        </p>
      ),
    },
    {
      scene: 'crowd',
      phase: 1,
      body: (
        <p>
          Most elections in the US are winner-take-all. The party with the most votes wins
          everything. So your district’s seat goes to a{' '}
          <Party p={top} word={top.singular[0].toUpperCase() + top.singular.slice(1)} />.
        </p>
      ),
    },
    {
      scene: 'crowd',
      phase: 2,
      body: (
        <>
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
            {others} out of {VOTERS} people have no one in the legislature (the empty circles).
          </p>
        </>
      ),
    },
    {
      scene: 'crowd',
      phase: 3,
      body: (
        <p>
          Let’s zoom out. From here on, each dot stands for about 5 people, so your district is
          20 dots.
        </p>
      ),
    },
    {
      scene: 'crowd',
      phase: 4,
      body: (
        <p>
          Now let’s look at nearby districts too. You live in an area that’s mostly{' '}
          {top.singular} people, and <Party p={top} /> got the most votes in each of them. So{' '}
          {top.short} get all {SEATS} seats near you.
        </p>
      ),
    },
    {
      scene: 'crowd',
      phase: 5,
      title: 'One bigger district.',
      body: (
        <p>
          Now imagine your five districts were combined into one bigger district with {SEATS}{' '}
          seats to fill. Just like you have 2 U.S. senators, you’d have {SEATS} state
          representatives and each will represent you all.
        </p>
      ),
    },
    {
      scene: 'crowd',
      phase: 6,
      title: 'Same votes, counted a different way.',
      body: (
        <p>
          Now let’s count the same votes the way most other countries do. Each party gets seats
          to match its share of the votes. <Party p={top} /> get {seats(top.seats)}.{' '}
          {sameSeats ? (
            <>
              {list(rest.map((p) => p.short))} get {rest[0].seats} each.
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
      ),
    },
    {
      scene: 'crowd',
      phase: 7,
      body: (
        <p>
          The party with the most votes still wins the most seats. They just can’t shut others
          out. Everyone who voted has someone from their party in the legislature.
        </p>
      ),
    },
    {
      scene: 'crowd',
      phase: 8,
      title: 'How the seats were decided.',
      body: (
        <p>
          There are {SEATS} seats and {VOTERS * 5} votes, so each seat ‘costs’ {VOTERS} votes
          (two full bars of dots). {list(fullParties.map((p) => p.short))} each had enough votes
          for a seat. The last{' '}
          {leftWinners.length === 1 ? 'seat goes' : `${leftWinners.length} seats go`} to whoever
          came closest:{' '}
          {leftWinners.map((p, i) => (
            <Fragment key={p.id}>
              {i > 0 && ' and '}
              <Party p={p} />
            </Fragment>
          ))}
          .
        </p>
      ),
    },
    {
      scene: 'crowd',
      phase: 9,
      title: `Your party won ${seats(my.seats)}.`,
      body: (
        <>
          <p>
            The {my.seats === 1 ? my.singular : `${my.seats} ${my.plural}`} with the most votes{' '}
            {my.seats === 1 ? 'gets it' : 'get them'}.
          </p>
          <PartyList party={my} scale={5} />
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
      scene: 'crowd',
      phase: 10,
      title: 'Voters choose.',
      body: (
        <p>
          Today, for a party to win a seat, it has to get the most votes in one of the
          districts. Under this proposal, smaller parties could win seats, not just the two
          major parties. Every legislator would face a competitive race, so they’ll have to
          listen to voters. That means it’s easier to elect lawmakers who really represent you
          and it’s easier to throw them out if they don’t do what you want.
        </p>
      ),
    },
  ]

  return { scenes, steps }
}
