import { useEffect, useMemo, useRef } from 'react'
import { dealDistricts } from '../election.js'
import { createEngine, lerp } from '../lib/tracks.js'
import PartyIcon from '../components/PartyIcon.jsx'

/**
 * The one picture of the scroll story. A hundred dots that only ever move,
 * driven by `phase`:
 *
 *   0  the votes are in: your district's 100 voters, coloured by party
 *   1  winner-take-all: the biggest party's animal takes your district's seat;
 *      every voter without someone of their own turns hollow
 *   2  (hold) your vote elected nobody
 *   3  zoom out: the hundred gather in fives into twenty dots and the district
 *      shrinks around them to a fifth of the width. Each dot is now about
 *      five people.
 *   4  the neighbours: four districts slide in beside yours, each with its own
 *      twenty and the same animal over it
 *   5  one bigger district: the five districts become one, the dots travel
 *      into columns by party (biggest first, twenty to a full column) while
 *      the five winners gather above and turn into five plain seats
 *   6  counted a different way: the seats slide over the columns they belong
 *      to and become the matching animals; every hollow dot fills in
 *   7  (hold)
 *   8  how the seats were decided: full columns ring solid, the two tallest
 *      partial columns ring dashed
 *   9  your party's seat: the other columns step back
 *  10  every vote counted: all back to full
 *
 * Positions are lerps between fixed spots played by the tracks engine, so
 * every frame runs forwards or mirrored backwards and reduced motion snaps.
 */

export const CROWD_PHASES = 11

const SEED = 309
const BACK = 0.35 // opacity of the other parties while one is in focus

// Geometry in SVG user units, about 1:1 with pixels on a phone.
const W = 340
const H = 206
const FULL = { x: 0.75, y: 0.75, w: 338.5, h: 204 }
const TILE_H = 150
const R = 5.5
const PITCH = 14
const ICON = 24
const ICON_TOP = 12
const SEAT = 18
const SEAT_INSET = (ICON - SEAT) / 2
const REP_STEP = 32
const RING_R = 8
const GRID = 10 // your district's voters: 10 by 10
const GRID_TOP = 52
const TILE_COLS = 4
const TILE_ROWS = 5
const TILE_TOP = 62
const COL_WIDE = 2 // a column is two dots wide and ten tall: one full column, one seat
const COL_TALL = 10
const COL_GAP = 14
const COL_BOTTOM = 192
const SLIDE = 60 // how far the neighbours slide in from

// The reader: your district is the middle one; in the hundred, a central dot.
const ME = { district: 2, tileRow: 0, tileCol: 2, gridRow: 4, gridCol: 5 }

const START = {
  show: 0, // the hundred fade in
  rep0: 0, // your district's winner shown
  hollow: 0, // voters with no one are hollow
  gather: 0, // the hundred gather in fives
  swap: 0, // persons out, five-person dots in
  zoom: 0, // the district shrinks to a tile
  nb: 0, // the neighbours slide in
  reps: 0, // the neighbours' winners shown
  merge: 0, // tiles become one box, dots travel into columns, winners gather
  sq: 0, // winners are plain seats
  spread: 0, // seats stand over their columns
  an: 0, // seats are the matched animals
  pr: 0, // everyone with a seat is filled in
  ringFull: 0, // solid rings on full columns
  ringLeft: 0, // dashed rings on the leftover winners
  focus: 0, // your party's columns alone at full strength
}
const STEPS = [
  { dur: 700, tracks: [['show', 0, 1, 0, 700]] },
  {
    dur: 1100,
    tracks: [
      ['rep0', 0, 1, 0, 500],
      ['hollow', 0, 1, 350, 1100],
    ],
  },
  { dur: 0, tracks: [] },
  {
    dur: 2200,
    tracks: [
      ['gather', 0, 1, 0, 1100],
      ['swap', 0, 1, 900, 1300],
      ['zoom', 0, 1, 1100, 2000],
    ],
  },
  {
    dur: 1600,
    tracks: [
      ['nb', 0, 1, 0, 1000],
      ['reps', 0, 1, 600, 1300],
    ],
  },
  {
    dur: 2000,
    tracks: [
      ['merge', 0, 1, 0, 1500],
      ['sq', 0, 1, 300, 900],
    ],
  },
  {
    dur: 1800,
    tracks: [
      ['spread', 0, 1, 0, 800],
      ['an', 0, 1, 400, 900],
      ['pr', 0, 1, 700, 1500],
    ],
  },
  { dur: 0, tracks: [] },
  {
    dur: 1600,
    tracks: [
      ['ringFull', 0, 1, 0, 700],
      ['ringLeft', 0, 1, 700, 1600],
    ],
  },
  { dur: 600, tracks: [['focus', 0, 1, 0, 600]] },
  { dur: 600, tracks: [['focus', 1, 0, 0, 600]] },
]
export const CROWD_SETTLE = STEPS.map((s) => s.dur)

const sum = (a, b) => a + b

/** mulberry32: a tiny seeded generator, so the scatters are the same every time. */
function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffled(items, random) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Every spot every dot will ever sit in, from the election. Built once. */
function buildModel(election) {
  const parties = election.standings.map((p) => ({
    id: p.id,
    icon: p.icon,
    color: p.color,
    seats: p.seats,
    votes: p.votes,
    wonLeftover: p.wonLeftover,
  }))
  const meParty = parties.findIndex((p) => p.id === election.me.party.id)
  const random = rng(SEED)

  // Five districts of twenty five-person dots; the leader biggest in every one.
  const districts = dealDistricts(parties.map((p) => p.votes))
  const n = districts.length
  const cell = FULL.w / n
  const tiles = districts.map((_, d) => ({
    x: FULL.x + d * cell,
    y: FULL.y,
    w: cell,
    h: TILE_H,
  }))
  const tileW = (TILE_COLS - 1) * PITCH + 2 * R
  const tileMargin = (cell - tileW) / 2
  const winners = districts.map((counts) => counts.indexOf(Math.max(...counts)))
  const wtaHas = parties.map((_, p) => winners.includes(p))

  // The hundred (your district's real votes) on a 10 by 10 grid, scattered.
  const gridX = (W - ((GRID - 1) * PITCH + 2 * R)) / 2 + R
  const personParties = shuffled(
    parties.flatMap((p, i) => Array(p.votes).fill(i)),
    random,
  )
  {
    const want = ME.gridRow * GRID + ME.gridCol
    const k = personParties.indexOf(meParty)
    ;[personParties[k], personParties[want]] = [personParties[want], personParties[k]]
  }
  const persons = personParties.map((p, i) => ({
    party: p,
    me: i === ME.gridRow * GRID + ME.gridCol,
    x0: gridX + (i % GRID) * PITCH,
    y0: GRID_TOP + R + Math.floor(i / GRID) * PITCH,
  }))

  // The five-person dots: twenty per tile, scattered; the reader forced into place.
  const clusters = []
  districts.forEach((counts, d) => {
    const a = shuffled(
      counts.flatMap((count, p) => Array(count).fill(p)),
      random,
    )
    if (d === ME.district) {
      const want = ME.tileRow * TILE_COLS + ME.tileCol
      const k = a.indexOf(meParty)
      ;[a[k], a[want]] = [a[want], a[k]]
    }
    a.forEach((p, i) => {
      clusters.push({
        party: p,
        district: d,
        me: d === ME.district && i === ME.tileRow * TILE_COLS + ME.tileCol,
        tx: tiles[d].x + tileMargin + R + (i % TILE_COLS) * PITCH,
        ty: TILE_TOP + R + Math.floor(i / TILE_COLS) * PITCH,
      })
    })
  })
  const meCluster = clusters.find((c) => c.me)

  // Each person gathers into one of their party's dots in your district, in
  // groups of about five; the reader's group is the reader's dot.
  parties.forEach((_, p) => {
    const mine = persons.filter((d) => d.party === p)
    const targets = clusters.filter((c) => c.district === ME.district && c.party === p)
    const groups = targets.length
    const base = Math.floor(mine.length / groups)
    const extra = mine.length % groups
    let i = 0
    targets.forEach((c, g) => {
      const size = base + (g < extra ? 1 : 0)
      for (let k = 0; k < size; k += 1, i += 1) mine[i].cluster = c
    })
    const mePerson = mine.find((d) => d.me)
    if (mePerson && mePerson.cluster !== meCluster) {
      const other = mine.find((d) => d.cluster === meCluster)
      other.cluster = mePerson.cluster
      mePerson.cluster = meCluster
    }
  })

  // Columns: each party in order, two dots wide and ten tall, filled from the
  // bottom; a full column is one seat. Partial columns are the leftovers.
  const perCol = COL_WIDE * COL_TALL
  const colCount = parties.map((p) => Math.ceil(p.votes / perCol))
  const totalCols = colCount.reduce(sum, 0)
  const colW = (COL_WIDE - 1) * PITCH + 2 * R
  const colsX = (W - (totalCols * colW + (totalCols - 1) * COL_GAP)) / 2
  const columns = []
  let c = 0
  parties.forEach((party, p) => {
    party.firstCol = c
    for (let k = 0; k < colCount[p]; k += 1, c += 1) {
      const dots = Math.min(perCol, party.votes - k * perCol)
      columns.push({
        x: colsX + c * (colW + COL_GAP),
        dots,
        full: dots === perCol,
        won: dots === perCol || (k === colCount[p] - 1 && party.wonLeftover),
      })
    }
  })
  const colCenter = (col) => col.x + R + ((COL_WIDE - 1) * PITCH) / 2
  parties.forEach((party, p) => {
    const mine = clusters.filter((d) => d.party === p)
    // The reader's dot goes to the top of the party's first column.
    const meAt = mine.indexOf(meCluster)
    if (meAt >= 0) {
      const top = Math.min(mine.length, perCol) - 1
      ;[mine[top], mine[meAt]] = [mine[meAt], mine[top]]
    }
    mine.forEach((d, i) => {
      const col = columns[party.firstCol + Math.floor(i / perCol)]
      const k = i % perCol
      d.cx = col.x + R + (k % COL_WIDE) * PITCH
      d.cy = COL_BOTTOM - R - Math.floor(k / COL_WIDE) * PITCH
    })
  })

  // The five winners: over their districts, then a row, then over the columns
  // they become (each party's seats over its first columns).
  const seatsPR = parties.flatMap((party) =>
    Array.from({ length: party.seats }, (_, k) => ({
      party,
      x: colCenter(columns[party.firstCol + k]),
    })),
  )
  const reps = winners.map((p, i) => {
    const pr = seatsPR[i] ?? null
    const row = W / 2 + (i - (n - 1) / 2) * REP_STEP
    return {
      old: parties[p],
      next: pr?.party ?? null,
      xT: tiles[i].x + cell / 2,
      xRow: row,
      xSeat: pr ? pr.x : row,
    }
  })

  // Rings: around every full column, and dashed around a leftover winner's rows.
  const rings = columns
    .filter((col) => col.won)
    .map((col) => {
      const rows = Math.ceil(col.dots / COL_WIDE)
      const top = COL_BOTTOM - R - (rows - 1) * PITCH - R
      return {
        x: col.x - 4,
        y: top - 4,
        w: colW + 8,
        h: COL_BOTTOM - top + 8,
        dashed: !col.full,
      }
    })

  return { parties, meParty, wtaHas, persons, clusters, meCluster, reps, rings, tiles, n }
}

export default function Crowd({ election, phase = 0 }) {
  const model = useMemo(() => buildModel(election), [election])
  const root = useRef(null)
  const engine = useRef(null)

  useEffect(() => {
    const { parties, wtaHas, persons, clusters, meCluster, reps, rings, tiles, meParty } = model
    const svg = root.current.querySelector('svg')
    const tileEls = [...svg.querySelectorAll('.tiles rect')]
    const personEls = [...svg.querySelectorAll('.persons circle')]
    const clusterEls = [...svg.querySelectorAll('.clusters circle')]
    const ring = svg.querySelector('.ring')
    const repEls = [...svg.querySelectorAll('.rep')].map((g) => ({
      g,
      oldEl: g.querySelector('.old'),
      seatEl: g.querySelector('.seat'),
      newEl: g.querySelector('.new'),
    }))
    const ringEls = [...svg.querySelectorAll('.rings rect')]
    const mePerson = persons.find((d) => d.me)

    const setRect = (el, r) => {
      el.setAttribute('x', r.x)
      el.setAttribute('y', r.y)
      el.setAttribute('width', r.w)
      el.setAttribute('height', r.h)
    }
    const dot = (el, x, y, fill, op) => {
      el.setAttribute('cx', x)
      el.setAttribute('cy', y)
      el.setAttribute('fill-opacity', fill)
      el.setAttribute('stroke-opacity', 1 - fill)
      el.setAttribute('opacity', op)
    }

    const render = (P) => {
      // How filled a party's dots are: hollow while it has no one, filled for
      // its seat; and how strong, stepped back while another party is in focus.
      const filled = (p) => {
        const before = wtaHas[p] ? 1 : 0
        const after = parties[p].seats > 0 ? 1 : 0
        return lerp(1, lerp(before, after, P.pr), P.hollow)
      }
      const strength = (p) => (p === meParty ? 1 : lerp(1, BACK, P.focus))
      const fills = parties.map((_, p) => filled(p))
      const ops = parties.map((_, p) => strength(p))

      // Your district: the full box, shrinking to its tile, growing back to the
      // box. The neighbours: their tiles sliding in, then growing into the box.
      tiles.forEach((t, d) => {
        const el = tileEls[d]
        if (d === ME.district) {
          const z = {
            x: lerp(FULL.x, t.x, P.zoom),
            y: FULL.y,
            w: lerp(FULL.w, t.w, P.zoom),
            h: lerp(FULL.h, t.h, P.zoom),
          }
          setRect(el, {
            x: lerp(z.x, FULL.x, P.merge),
            y: FULL.y,
            w: lerp(z.w, FULL.w, P.merge),
            h: lerp(z.h, FULL.h, P.merge),
          })
          el.setAttribute('opacity', 1)
        } else {
          const side = d < ME.district ? -SLIDE : SLIDE
          const sx = t.x + side * (1 - P.nb)
          setRect(el, {
            x: lerp(sx, FULL.x, P.merge),
            y: FULL.y,
            w: lerp(t.w, FULL.w, P.merge),
            h: lerp(t.h, FULL.h, P.merge),
          })
          el.setAttribute('opacity', P.nb * (1 - P.merge))
        }
      })

      persons.forEach((d, i) => {
        dot(
          personEls[i],
          lerp(d.x0, d.cluster.tx, P.gather),
          lerp(d.y0, d.cluster.ty, P.gather),
          fills[d.party],
          P.show * (1 - P.swap) * ops[d.party],
        )
      })
      clusters.forEach((d, i) => {
        const home = d.district === ME.district
        const side = d.district < ME.district ? -SLIDE : SLIDE
        const tx = home ? d.tx : d.tx + side * (1 - P.nb)
        dot(
          clusterEls[i],
          lerp(tx, d.cx, P.merge),
          lerp(d.ty, d.cy, P.merge),
          fills[d.party],
          (home ? P.swap : P.nb) * ops[d.party],
        )
      })

      // The reader's ring follows their person, then their five-person dot.
      const px = lerp(mePerson.x0, meCluster.tx, P.gather)
      const py = lerp(mePerson.y0, meCluster.ty, P.gather)
      ring.setAttribute('cx', lerp(px, lerp(meCluster.tx, meCluster.cx, P.merge), P.swap))
      ring.setAttribute('cy', lerp(py, lerp(meCluster.ty, meCluster.cy, P.merge), P.swap))
      ring.setAttribute('opacity', P.show)

      reps.forEach((r, i) => {
        const shown = i === ME.district ? P.rep0 : P.reps
        const x = lerp(lerp(r.xT, r.xRow, P.merge), r.xSeat, P.spread)
        const s = 0.4 + 0.6 * shown
        const { g, oldEl, seatEl, newEl } = repEls[i]
        g.setAttribute(
          'transform',
          `translate(${x} ${ICON_TOP + ICON / 2}) scale(${s}) translate(${-ICON / 2} ${-ICON / 2})`,
        )
        g.setAttribute('opacity', shown)
        oldEl.setAttribute('opacity', 1 - P.sq)
        seatEl.setAttribute('opacity', P.sq * (1 - P.an))
        if (newEl) newEl.setAttribute('opacity', P.an)
      })

      ringEls.forEach((el, i) => {
        el.setAttribute('opacity', rings[i].dashed ? P.ringLeft : P.ringFull)
      })
    }

    const eng = createEngine({ start: START, steps: STEPS, render })
    engine.current = eng
    return () => {
      eng.stop()
      engine.current = null
    }
  }, [model])

  // The first phase after a (re)build is a cut, so a deep link opens on its
  // state and a fresh vote starts on the first picture; later ones animate.
  const fresh = useRef(true)
  useEffect(() => {
    fresh.current = true
  }, [model])
  useEffect(() => {
    engine.current?.setPhase(phase, fresh.current)
    fresh.current = false
  }, [phase, model])

  const { parties, persons, clusters, reps, rings, tiles, meParty } = model
  const hollowNow = phase >= 1 && phase < 6
  const me = parties[meParty].color
  return (
    <div className="figure" ref={root}>
      <svg
        className="crowd"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Your district's hundred voters, coloured by party. The biggest party takes the seat and every other voter turns hollow. Zoomed out, your district is one of five, each won by the same party. The five districts merge into one, the voters regroup by party into columns, and the five seats are shared out to match the columns, so everyone's dot fills in."
      >
        <g className="tiles">
          {tiles.map((t, d) => (
            <rect
              key={d}
              className={d === ME.district ? 'box mine' : 'box'}
              x={d === ME.district ? FULL.x : t.x}
              y={FULL.y}
              width={d === ME.district ? FULL.w : t.w}
              height={d === ME.district ? FULL.h : t.h}
              rx={10}
              opacity={d === ME.district ? 1 : 0}
            />
          ))}
        </g>
        <g className="rings">
          {rings.map((r, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={12}
              opacity={0}
              strokeDasharray={r.dashed ? '4 4' : undefined}
            />
          ))}
        </g>
        <g className="persons">
          {persons.map((d, i) => (
            <circle
              key={i}
              r={R}
              cx={d.x0}
              cy={d.y0}
              fill={parties[d.party].color}
              stroke={parties[d.party].color}
              opacity={0}
            />
          ))}
        </g>
        <g className="clusters">
          {clusters.map((d, i) => (
            <circle
              key={i}
              r={R}
              cx={d.tx}
              cy={d.ty}
              fill={parties[d.party].color}
              stroke={parties[d.party].color}
              opacity={0}
            />
          ))}
        </g>
        <circle className="ring" r={RING_R} opacity={0} />
        <g className="reps">
          {reps.map((r, i) => (
            <g key={i} className="rep" opacity={0}>
              <PartyIcon
                party={r.old}
                size={ICON}
                className="old"
                style={{ color: r.old.color }}
              />
              <rect
                className="seat"
                x={SEAT_INSET}
                y={SEAT_INSET}
                width={SEAT}
                height={SEAT}
                rx={4}
                opacity={0}
              />
              {r.next && (
                <PartyIcon
                  party={r.next}
                  size={ICON}
                  className="new"
                  style={{ color: r.next.color }}
                  opacity={0}
                />
              )}
            </g>
          ))}
        </g>
      </svg>
      <p className="legend">
        {phase >= 3 && (
          <span>
            <i className="dot five" aria-hidden="true" /> each dot: about 5 people
          </span>
        )}
        {hollowNow && (
          <span>
            <i
              className="dot"
              aria-hidden="true"
              style={{ background: 'transparent', boxShadow: `inset 0 0 0 2px ${me}` }}
            />{' '}
            no one in the legislature
          </span>
        )}
        <span>
          <i
            className="dot me"
            aria-hidden="true"
            style={
              hollowNow
                ? { background: 'transparent', boxShadow: `inset 0 0 0 2px ${me}` }
                : { background: me }
            }
          />{' '}
          {phase >= 3 ? 'you' : 'your vote'}
        </span>
      </p>
    </div>
  )
}
