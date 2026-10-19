import YouLegend from './YouLegend.jsx'

/** All 100 voters in a small grid. Grey ones have nobody from their party in the legislature. */
export default function MiniDots({ parties, represented }) {
  const mine = parties.find((p) => p.mine)
  const dots = parties.flatMap((p) =>
    Array.from({ length: p.votes }, (_, k) => ({
      color: p.color,
      on: represented(p),
      me: p.mine && k === 0,
    })),
  )
  const greyed = dots.filter((d) => !d.on).length
  return (
    <div className="figure">
      <div
        className="mini"
        role="img"
        aria-label={
          greyed === 0
            ? 'Every voter has someone from their party in the legislature'
            : `${greyed} of 100 voters have no one from their party in the legislature`
        }
      >
        {dots.map((d, i) => (
          <i
            key={i}
            className={`dot ${d.on ? '' : 'off'} ${d.me ? 'me' : ''}`}
            style={{ '--c': d.color }}
          />
        ))}
      </div>
      <YouLegend party={mine} off={!represented(mine)} greyed={greyed > 0} voter />
    </div>
  )
}
