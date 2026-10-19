import PartyIcon from './PartyIcon.jsx'

/** The five people on the council, drawn as their party's animal. */
export default function Council({ seats }) {
  return (
    <ol className="seats">
      {seats.map((s, i) => (
        <li
          key={`${s.partyId}-${s.id}`}
          className="seat"
          style={{ '--c': s.party.color, '--i': i }}
        >
          <PartyIcon party={s.party} size={40} />
          <span className="seat-name">{s.name}</span>
          {s.mine && <span className="tag">your vote</span>}
        </li>
      ))}
    </ol>
  )
}
