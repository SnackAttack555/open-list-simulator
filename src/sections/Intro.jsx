import { SEATS } from '../config.js'

/**
 * Three sentences, then Start. Everything a cold visitor needs and nothing they
 * would skim past: what this is, what they will do, and the one comparison
 * that makes "5 seats" mean something to an American.
 */
export default function Intro({ theme }) {
  return (
    <section className="pt-10 pb-2">
      <h1 className="text-[32px] leading-[1.15] font-semibold tracking-tight text-balance">
        A voting simulation
      </h1>
      <p className="mt-5 text-[19px] leading-snug">
        You&apos;ll vote for one candidate in the <strong>{theme.name}</strong> election. There
        are {theme.lists.length} parties and {SEATS} seats to fill.
      </p>
      <p className="mt-4 text-[19px] leading-snug">
        Just like you have 2 U.S. senators, under this system you&apos;d have {SEATS} state
        representatives.
      </p>
    </section>
  )
}
