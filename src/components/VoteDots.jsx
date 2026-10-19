import PartyIcon from './PartyIcon.jsx'
import YouLegend from './YouLegend.jsx'
import { groupsFor } from '../election.js'

/**
 * Every vote as one dot, in rows of twenty per party. The layout never changes;
 * each phase draws more on top of it:
 *   0  the dots, yours ringed
 *   1  every full row is circled, one after another, and earns a seat
 *   2  the leftover rows: the biggest are circled (dashed) and earn the last
 *      seats, the rest fade; the counts switch to "left over"
 */
/** Gap between one row being circled and the next. Slow enough to watch. */
export const STAGGER = 700
/** How long the leftover step's picture takes to finish: each winner's ring, then the losers fading. */
export const settleTime = (election) => (election.leftoverWinners.length + 1) * STAGGER + 600

export default function VoteDots({ election, phase = 2 }) {
  const quota = Math.round(election.quota)
  const fullOrder = election.parties.flatMap((p) =>
    groupsFor(p, election.quota)
      .filter((g) => g.kind === 'full')
      .map((g) => g.key),
  )
  const leftOrder = election.leftoverWinners.map((p) => `${p.id}-left`)
  let dotIndex = 0

  return (
    <div className="figure">
      <div className="dots" style={{ '--q': quota }}>
        {election.parties.map((p) => (
          <section
            key={p.id}
            className="pv"
            style={{ '--c': p.color }}
            aria-label={`${p.name}: ${p.votes} votes, ${p.seats} seats`}
          >
            <header className="pv-head">
              <PartyIcon party={p} size={18} />
              <b>{p.name}</b>
              <span className="n">
                {phase >= 2 ? `${p.leftover} left over` : `${p.votes} votes`}
              </span>
            </header>
            {groupsFor(p, election.quota).map((g, gi) => {
              const lit = g.kind === 'full' ? phase >= 1 : phase >= 2 && g.won
              const lost = g.kind === 'partial' && phase >= 2 && !g.won
              // Stagger: full rows circle in ballot order, leftover winners biggest first.
              const order =
                g.kind === 'full' ? fullOrder.indexOf(g.key) : leftOrder.indexOf(g.key)
              const delay = (lost ? leftOrder.length : Math.max(0, order)) * STAGGER
              return (
                <div
                  key={g.key}
                  className={`group ${g.kind} ${lit ? 'lit' : ''} ${lost ? 'lost' : ''}`}
                  style={{ '--d': `${delay}ms` }}
                >
                  <div className="row">
                    {Array.from({ length: quota }, (_, k) => {
                      const on = k < g.dots
                      const me = on && p.mine && gi === 0 && k === 0
                      return (
                        <i
                          key={k}
                          className={`dot ${on ? 'on' : ''} ${me ? 'me' : ''}`}
                          style={on ? { '--i': dotIndex++ } : undefined}
                        />
                      )
                    })}
                  </div>
                  <div className="tail">{lit && <PartyIcon party={p} size={22} />}</div>
                </div>
              )
            })}
          </section>
        ))}
      </div>
      <YouLegend party={election.me.party} />
    </div>
  )
}
