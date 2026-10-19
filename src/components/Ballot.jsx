import { PARTIES } from '../data.js'
import PartyIcon from './PartyIcon.jsx'

/**
 * The ballot sheet, laid out like a real one: the instruction across the top,
 * a column per party, every name visible, fill in one oval. Two columns on a phone so all twenty names fit on
 * one screen. Marking a name in one party clears any mark in another.
 */
export default function Ballot({ vote, onChange }) {
  return (
    <div className="ballot" role="radiogroup" aria-labelledby="ballot-instruction">
      <p className="instruction" id="ballot-instruction">
        Vote for 1 candidate from any party
      </p>
      <div className="columns">
        {PARTIES.map((p) => (
          <section key={p.id} className="column" style={{ '--c': p.color, '--t': p.text }}>
            <h2 className="column-head">
              <PartyIcon party={p} size={24} strokeWidth={2} />
              {p.name}
            </h2>
            <ul>
              {p.candidates.map((c) => {
                const checked = vote?.partyId === p.id && vote.candidateId === c.id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      aria-label={`${c.name}, ${p.name}`}
                      className="cand"
                      onClick={() => onChange({ partyId: p.id, candidateId: c.id })}
                    >
                      <span className="oval" aria-hidden="true" />
                      <span className="cand-name">{c.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
