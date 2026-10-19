import PartyIcon from './PartyIcon.jsx'

/**
 * One party's candidates, most votes first. The party's animal marks each one
 * who gets a seat. `scale` multiplies the shown votes: the scroll story shows
 * the same hand of 100 votes across five districts, so it shows them times 5.
 */
export default function PartyList({ party, scale = 1 }) {
  return (
    <ol
      className="plist"
      style={{ '--c': party.color }}
      aria-label={`${party.name} candidates by votes`}
    >
      {party.ranked.map((c) => (
        <li key={c.id} className={`plist-row ${c.elected ? 'won' : ''}`}>
          <span className="plist-seat">
            {c.elected && <PartyIcon party={party} size={22} />}
          </span>
          <span className="plist-name">
            {c.name}
            {c.mine && <span className="tag">you</span>}
          </span>
          <span className="plist-n">
            {c.votes * scale} {c.votes * scale === 1 ? 'vote' : 'votes'}
          </span>
        </li>
      ))}
    </ol>
  )
}
