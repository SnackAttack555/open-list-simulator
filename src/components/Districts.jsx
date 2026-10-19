import { useEffect, useMemo, useRef } from 'react'
import { dealDistricts } from '../election.js'
import PartyIcon from './PartyIcon.jsx'

/**
 * Five small districts become one bigger district, in three frames driven by
 * `phase` (0, 1, 2):
 *
 *   0  five fenced districts of twenty voters, coloured by party. The leading
 *      party is the biggest group in every one but never half, and still each
 *      district elected one of theirs (its animal stands above it). Everyone
 *      else is faded: no one of theirs was elected anywhere.
 *   1  the fences go, the hundred dots travel to sit with their own colour
 *      (four bands as wide as their votes) and the five winners gather in a
 *      row over all of them. Still five of the same animal.
 *   2  the five winners become five plain seats, the seats slide out to stand
 *      over the bands in proportion, become the matched animals as they
 *      arrive, every dot comes up to full colour, and a line draws from the
 *      reader's ringed dot to the animal that is now theirs.
 *
 * The picture is eleven numbers in [0, 1]; each frame is a list of tracks
 * [param, from, to, start, end]. Going forward plays the tracks; going back
 * plays them mirrored, so scrolling back up undoes the frame. A change mid
 * animation starts from the current values and never jumps. Reduced motion
 * cuts to each frame's end picture.
 *
 * The per-district deal comes from the election's party totals, so an unrigged
 * run gets its own picture; the leader always leads every district.
 */

export const DISTRICT_SETTLE = [1200, 1800, 1900]

const SEED = 309 // the shuffle that scatters each district; 309 gives an even mix
const DIM = 0.42 // opacity of a dot whose party has no one
const HOLD = 900 // ms to rest on a frame's end picture when crossing more than one

// Geometry in SVG user units, about 1:1 with pixels on a phone.
const BOX = { x: 0.75, y: 0.75, w: 338.5, h: 151.5 }
const ROWS = 5
const R = 5.5
const STEP0 = 14 // dot pitch inside a district, and between rows
const STEP1 = 16.2 // dot pitch across the one big district
const DOTS_TOP = 74
const ICON = 24
const ICON_TOP = 12
const SEAT = 18
const SEAT_INSET = (ICON - SEAT) / 2
const REP_STEP = 32 // pitch of reps standing together
const RING_R = 8
const LINE_Y2 = ICON_TOP + ICON

// The reader: middle district, top row, third dot in.
const ME = { district: 2, row: 0, col: 2 }

const START = {
  rep: 0, // reps shown
  dim: 0, // voters with no one are faded
  fence: 1, // fences shown
  m: 0, // dots merged into bands
  mr: 0, // reps gathered into one row
  sq: 0, // reps are plain squares
  spread: 0, // seats stand over their bands
  an: 0, // squares are the matched animals
  pr: 0, // everyone with a seat is at full strength
  link: 0, // the line from the reader to their rep
}
// [param, from, to, start ms, end ms]; STEPS[k] takes the picture from phase k - 1 to k.
const STEPS = [
  {
    dur: DISTRICT_SETTLE[0],
    tracks: [
      ['rep', 0, 1, 0, 500],
      ['dim', 0, 1, 350, 1200],
    ],
  },
  {
    dur: DISTRICT_SETTLE[1],
    tracks: [
      ['fence', 1, 0, 0, 450],
      ['m', 0, 1, 250, 1500],
      ['mr', 0, 1, 700, 1800],
    ],
  },
  {
    dur: DISTRICT_SETTLE[2],
    tracks: [
      ['sq', 0, 1, 0, 450],
      ['spread', 0, 1, 550, 1400],
      ['an', 0, 1, 950, 1400],
      ['pr', 0, 1, 1100, 1700],
      ['link', 0, 1, 1450, 1900],
    ],
  },
]
const LAST = STEPS.length - 1

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
const lerp = (a, b, t) => a + (b - a) * t
const sum = (a, b) => a + b

/** mulberry32: a tiny seeded generator, so the scatter is the same every time. */
function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Where every dot and rep sits in each frame, from the election. Built once. */
function buildModel(election) {
  const parties = election.standings.map((p) => ({
    id: p.id,
    icon: p.icon,
    color: p.color,
    seats: p.seats,
    votes: p.votes,
  }))
  const districts = dealDistricts(parties.map((p) => p.votes))
  const meParty = parties.findIndex((p) => p.id === election.me.party.id)
  const n = districts.length
  const per = districts[0].reduce(sum, 0)
  const cols = per / ROWS
  const cell = BOX.w / n
  const groupW = (cols - 1) * STEP0 + 2 * R
  const margin0 = (cell - groupW) / 2
  const cols1 = (per * n) / ROWS
  const gridW = (cols1 - 1) * STEP1 + 2 * R
  const pad1 = (BOX.w - gridW) / 2

  // Each district's winner is its biggest group (winner-take-all).
  const winners = districts.map((counts) => counts.indexOf(Math.max(...counts)))
  const wtaHas = parties.map((_, p) => winners.includes(p))

  // Frame 0: each district's twenty, scattered like a neighbourhood, the reader forced in.
  const random = rng(SEED)
  const dots = []
  districts.forEach((counts, d) => {
    const a = counts.flatMap((count, p) => Array(count).fill(p))
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    if (d === ME.district) {
      const want = ME.row * cols + ME.col
      const k = a.indexOf(meParty)
      if (k >= 0) [a[k], a[want]] = [a[want], a[k]]
    }
    a.forEach((p, i) => {
      dots.push({
        party: p,
        me: d === ME.district && i === ME.row * cols + ME.col,
        x0: BOX.x + d * cell + margin0 + (i % cols) * STEP0 + R,
        y0: DOTS_TOP + R + Math.floor(i / cols) * STEP0,
      })
    })
  })

  // Frame 1: one grid filled column by column, one party after another, so each
  // party is a band as wide as its votes; the reader lands on the band's top row.
  const slotX = (k) => BOX.x + pad1 + Math.floor(k / ROWS) * STEP1 + R
  const slotY = (k) => DOTS_TOP + R + (k % ROWS) * STEP0
  let offset = 0
  parties.forEach((party, p) => {
    const mine = dots.filter((d) => d.party === p)
    const slots = mine.map((_, i) => offset + i)
    const meAt = mine.findIndex((d) => d.me)
    if (meAt >= 0) {
      const top = slots.findIndex((k) => k % ROWS === 0)
      if (top >= 0) [slots[top], slots[meAt]] = [slots[meAt], slots[top]]
    }
    mine.forEach((d, i) => {
      d.x1 = slotX(slots[i])
      d.y1 = slotY(slots[i])
    })
    party.cx = slots.length ? slots.map(slotX).reduce(sum, 0) / slots.length : 0
    offset += mine.length
  })
  const meDot = dots.find((d) => d.me)

  // The five reps: each district's winner, then a row, then the proportional
  // seats each standing over its own band.
  const seatsPR = parties.flatMap((party) =>
    Array.from({ length: party.seats }, (_, k) => ({
      party,
      x: party.cx + (k - (party.seats - 1) / 2) * REP_STEP,
    })),
  )
  const reps = winners.map((p, i) => {
    const pr = seatsPR[i] ?? null
    const row = BOX.x + BOX.w / 2 + (i - (n - 1) / 2) * REP_STEP
    return {
      old: parties[p],
      next: pr?.party ?? null,
      xD: BOX.x + (i + 0.5) * cell,
      xRow: row,
      xBlock: pr ? pr.x : row,
    }
  })
  const myRep = reps.findIndex((r) => r.next && r.next.id === parties[meParty].id)

  return { parties, meParty, wtaHas, dots, meDot, reps, myRep, n, cell }
}

const mix = (color, strength) =>
  `color-mix(in srgb, ${color} ${Math.round(strength * 100)}%, var(--paper))`

export default function Districts({ election, phase = 0 }) {
  const model = useMemo(() => buildModel(election), [election])
  const root = useRef(null)
  const engine = useRef(null)

  // Build the engine once per model: it owns every moving attribute.
  useEffect(() => {
    const { parties, wtaHas, dots, meDot, reps, myRep } = model
    const svg = root.current.querySelector('svg')
    const fences = svg.querySelector('.fences')
    const link = svg.querySelector('.link')
    const circles = [...svg.querySelectorAll('.people circle')]
    const ring = svg.querySelector('.ring')
    const repEls = [...svg.querySelectorAll('.rep')].map((g) => ({
      g,
      oldEl: g.querySelector('.old'),
      seatEl: g.querySelector('.seat'),
      newEl: g.querySelector('.new'),
    }))
    const swMe = root.current.querySelector('.sw-me')
    const lgFaded = root.current.querySelector('.lg-faded')
    const lgRep = root.current.querySelector('.lg-rep')

    let P = { ...START }
    const strength = (p) => {
      const before = wtaHas[p] ? 1 : DIM
      const after = parties[p].seats > 0 ? 1 : DIM
      return lerp(1, lerp(before, after, P.pr), P.dim)
    }
    const render = () => {
      fences.setAttribute('opacity', P.fence)
      const ops = parties.map((_, p) => strength(p))
      dots.forEach((d, i) => {
        circles[i].setAttribute('cx', lerp(d.x0, d.x1, P.m))
        circles[i].setAttribute('cy', lerp(d.y0, d.y1, P.m))
        circles[i].setAttribute('opacity', ops[d.party])
      })
      const meX = lerp(meDot.x0, meDot.x1, P.m)
      const meY = lerp(meDot.y0, meDot.y1, P.m)
      ring.setAttribute('cx', meX)
      ring.setAttribute('cy', meY)
      const s = 0.4 + 0.6 * P.rep
      reps.forEach((r, i) => {
        const x = lerp(lerp(r.xD, r.xRow, P.mr), r.xBlock, P.spread)
        r.x = x
        const { g, oldEl, seatEl, newEl } = repEls[i]
        g.setAttribute(
          'transform',
          `translate(${x} ${ICON_TOP + ICON / 2}) scale(${s}) translate(${-ICON / 2} ${-ICON / 2})`,
        )
        g.setAttribute('opacity', P.rep)
        oldEl.setAttribute('opacity', 1 - P.sq)
        seatEl.setAttribute('opacity', P.sq * (1 - P.an))
        if (newEl) newEl.setAttribute('opacity', P.an)
      })
      if (myRep >= 0) {
        const x2 = reps[myRep].x
        const y1 = meY - RING_R - 1.5
        const len = Math.hypot(x2 - meX, LINE_Y2 - y1)
        link.setAttribute('x1', meX)
        link.setAttribute('y1', y1)
        link.setAttribute('x2', x2)
        link.setAttribute('y2', LINE_Y2)
        link.setAttribute('stroke-dasharray', len)
        link.setAttribute('stroke-dashoffset', len * (1 - P.link))
        link.setAttribute('opacity', P.link > 0 ? 1 : 0)
      }
      // The legend shows the reader's dot in its real state.
      swMe.style.background = mix(parties[model.meParty].color, ops[model.meParty])
      lgFaded.hidden = !ops.some((o) => o < 0.97)
      lgRep.hidden = !(myRep >= 0 && P.link > 0)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let target = -1
    let raf = 0
    let timer = 0
    const applyPhase = (k) => {
      P = { ...START }
      for (let i = 0; i <= k; i += 1) for (const tr of STEPS[i].tracks) P[tr[0]] = tr[2]
    }
    const setPhase = (want, snap = false) => {
      const to = Math.max(-1, Math.min(LAST, Math.round(want)))
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      if (snap || reduced) {
        if (snap || Math.abs(to - target) <= 1) {
          target = to
          applyPhase(to)
          render()
          return
        }
        const dir = to > target ? 1 : -1
        const step = () => {
          target += dir
          applyPhase(target)
          render()
          if (target !== to) timer = setTimeout(step, HOLD)
        }
        step()
        return
      }
      if (to === target) return
      const from = { ...P }
      const sched = []
      // Retargeted mid-flight: first finish what the current frame still owes
      // (a short catch-up on every value that is not at that frame's end).
      const owed = { ...START }
      for (let i = 0; i <= target; i += 1) for (const tr of STEPS[i].tracks) owed[tr[0]] = tr[2]
      for (const p of Object.keys(START)) {
        if (from[p] !== owed[p]) sched.push({ p, to: owed[p], t0: 0, t1: 350 })
      }
      let t = 0
      if (to > target) {
        for (let k = target + 1; k <= to; k += 1) {
          for (const tr of STEPS[k].tracks)
            sched.push({ p: tr[0], to: tr[2], t0: t + tr[3], t1: t + tr[4] })
          t += STEPS[k].dur + (k < to ? HOLD : 0)
        }
      } else {
        for (let k = target; k > to; k -= 1) {
          const D = STEPS[k].dur
          for (const tr of STEPS[k].tracks)
            sched.push({ p: tr[0], to: tr[1], t0: t + D - tr[4], t1: t + D - tr[3] })
          t += D + (k > to + 1 ? HOLD : 0)
        }
      }
      const END = t
      target = to
      const evaluate = (now) => {
        for (const p of Object.keys(START)) {
          let v = from[p]
          for (const tr of sched) {
            if (tr.p !== p) continue
            if (now >= tr.t1) v = tr.to
            else if (now > tr.t0) {
              v = lerp(v, tr.to, easeOutExpo(clamp((now - tr.t0) / (tr.t1 - tr.t0))))
              break
            } else break
          }
          P[p] = v
        }
      }
      const t0 = performance.now()
      const frame = (ts) => {
        const now = Math.min(ts - t0, END)
        evaluate(now)
        render()
        if (now < END) raf = requestAnimationFrame(frame)
      }
      evaluate(0)
      render()
      raf = requestAnimationFrame(frame)
    }

    applyPhase(-1)
    render()
    engine.current = {
      setPhase,
      get phase() {
        return target
      },
    }
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      engine.current = null
    }
  }, [model])

  // Play to the asked-for frame, and replay from the start whenever the
  // picture scrolls back into view after leaving it.
  const wanted = useRef(phase)
  wanted.current = phase
  useEffect(() => {
    engine.current?.setPhase(phase)
  }, [phase, model])
  useEffect(() => {
    const el = root.current
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!engine.current) return
        if (entry.isIntersecting) engine.current.setPhase(wanted.current)
        else engine.current.setPhase(-1, true)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [model])

  const { parties, dots, reps, n, cell } = model
  return (
    <div className="figure" ref={root}>
      <svg
        className="districts"
        viewBox={`0 0 ${BOX.w + 2 * BOX.x} ${BOX.h + 2 * BOX.y}`}
        role="img"
        aria-label="Five districts of twenty voters. One party is the biggest group in every district but never half, and still wins every seat, so everyone else is faded. The districts merge into one, the voters regroup by party, and the five seats are shared out to match the groups, so everyone has someone of their own."
      >
        <rect className="box" x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={10} />
        <g className="fences">
          {Array.from({ length: n - 1 }, (_, f) => {
            const x = BOX.x + (f + 1) * cell
            return <line key={f} x1={x} y1={BOX.y} x2={x} y2={BOX.y + BOX.h} />
          })}
        </g>
        <line className="link" opacity={0} />
        <g className="people">
          {dots.map((d, i) => (
            <circle key={i} r={R} cx={d.x0} cy={d.y0} fill={parties[d.party].color} />
          ))}
        </g>
        <circle className="ring" r={RING_R} />
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
        <span className="lg-faded" hidden>
          <i
            className="dot faded"
            aria-hidden="true"
            style={{ background: mix(parties[model.meParty].color, DIM) }}
          />{' '}
          no one in the legislature
        </span>
        <span className="lg-rep" hidden>
          <i className="line-swatch" aria-hidden="true" /> your representative
        </span>
        <span>
          <i className="dot me sw-me" aria-hidden="true" /> your vote
        </span>
      </p>
    </div>
  )
}
