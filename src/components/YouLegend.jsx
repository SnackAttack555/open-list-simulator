/**
 * Explains the marks in a dot picture: the ringed dot is the reader (drawn in
 * whatever state their dot is actually in), and grey means nobody from that
 * party is in the legislature.
 */
export default function YouLegend({ party, off = false, greyed = false, voter = false }) {
  return (
    <p className="legend" style={{ '--c': party.color }}>
      {greyed && (
        <span>
          <i className="dot off" aria-hidden="true" /> no one in the legislature
        </span>
      )}
      {voter && (
        <span>
          <i className={`dot ${off ? 'off' : 'on'}`} aria-hidden="true" /> {party.singular}{' '}
          voter
        </span>
      )}
      <span>
        <i className={`dot me ${off ? 'off' : 'on'}`} aria-hidden="true" /> your vote
      </span>
    </p>
  )
}
