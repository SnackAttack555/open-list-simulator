/**
 * The two numbers the whole page was building to, and nothing after them.
 */
export default function Wrap({ result }) {
  // Rounded once and the remainder derived from it, never rounded separately:
  // two independent Math.rounds of 37.5 and 62.5 both go up and the sentence
  // claims 101% of voters.
  const wtaPct = Math.round(result.wta.pctRepresented)
  const prPct = Math.round(result.pctRepresented)

  return (
    <section className="pt-12 pb-6" aria-labelledby="wrap-heading">
      <h2 id="wrap-heading" className="text-[26px] leading-tight font-semibold tracking-tight">
        The difference
      </h2>
      <p className="mt-3 text-[18px] leading-snug">
        Under winner-take-all, <strong>{wtaPct}% of voters</strong> helped elect someone from
        their party. The other {100 - wtaPct}% got nobody.
      </p>
      <p className="mt-3 text-[18px] leading-snug">
        Under proportional representation, <strong>{prPct}% of voters</strong> did.
      </p>
      {/* Said once, here, rather than on every screen: most of this electorate
          is simulated so the first visitor doesn't see a one-vote election. */}
      <p className="mt-6 text-[18px] leading-snug">
        Most of the votes in this election are from pretend voters, added so it wasn&apos;t
        empty when you arrived. Yours is real.
      </p>
      <p className="mt-10 text-[14px] leading-relaxed text-[var(--ink-soft)]">
        An educational parody. Not affiliated with, endorsed by, or sponsored by any of the
        rights holders named here.
      </p>
    </section>
  )
}
