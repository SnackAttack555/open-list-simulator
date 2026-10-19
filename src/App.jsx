import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { PARTIES } from './data.js'
import { runElection } from './election.js'
import { layoutFor, recordRun, runsSoFar, voteFromUrl } from './session.js'
import { buildSections } from './sections.jsx'
import Ballot from './components/Ballot.jsx'
import { Cand, Party } from './components/inline.jsx'

/**
 * One page, read top to bottom like an article. The ballot sits under the
 * intro; casting a vote reveals the first section of the count, and the one
 * sticky button at the bottom reveals the next step each time. A step is
 * either a new section or, inside a section with several steps, one more line
 * of text and one more layer on its picture. Nothing is ever taken away, so
 * the reader can scroll back up at any point.
 *
 * A newly revealed section scrolls so its heading sits at the top of the
 * screen (the last section is given a full screen of room so that is always
 * possible), and Next stays off until the reader has scrolled to the end of
 * what is on the page.
 *
 * The first election in a browser tab is rigged so the lesson lands (your party
 * comes second, your candidate wins its seat); from the second run on, the
 * neighbors' votes are dealt at random and anything can happen. The run count
 * is the only thing kept, in sessionStorage, so it dies with the tab.
 *
 * For testing: ?v=dogs.snoopy&n=4 opens with that vote cast and four steps
 * shown (steps: 1 wta, 2 district, 3 pr, 4-5 how, 6 party, 7 end). Add &run=2
 * for an unrigged deal.
 */
function fromUrl() {
  const { vote, n, layout } = voteFromUrl()
  return { vote, shown: vote ? Math.max(1, n) : 0, layout }
}

const atBottom = () =>
  window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4

const BAR = 102 // the sticky bar's height
const MARGIN = 24

/** Scroll down so `el` is fully visible above the bar, or top-aligned if it is taller than that. */
function revealScroll(el) {
  const r = el.getBoundingClientRect()
  const top = window.scrollY + r.top - MARGIN
  const bottom = window.scrollY + r.bottom + BAR + MARGIN - window.innerHeight
  const target = Math.min(top, Math.max(bottom, 0))
  window.scrollTo({ top: Math.max(window.scrollY, target), behavior: 'smooth' })
}

/** Bring `el` to the top of the screen, in either direction, so an animation on it is watched. */
function showScroll(el) {
  const r = el.getBoundingClientRect()
  window.scrollTo({ top: window.scrollY + r.top - MARGIN, behavior: 'smooth' })
}

/** Which sections `shown` steps reveal, and how far into the last one. */
function visible(sections, shown) {
  const out = []
  let left = shown
  for (const s of sections) {
    if (left <= 0) break
    const steps = s.steps ?? 1
    out.push({ section: s, phase: Math.min(left, steps) - 1 })
    left -= steps
  }
  return out
}

export default function App() {
  const [start] = useState(fromUrl)
  const [vote, setVote] = useState(start.vote)
  const [layout, setLayout] = useState(start.layout)
  const [shown, setShown] = useState(start.shown)
  const [readToEnd, setReadToEnd] = useState(false)
  const cast = shown > 0

  const election = useMemo(
    () => (cast && layout ? runElection(vote, layout) : null),
    [cast, vote, layout],
  )
  const sections = useMemo(() => (election ? buildSections(election) : []), [election])
  const totalSteps = sections.reduce((n, s) => n + (s.steps ?? 1), 0)
  const done = cast && shown >= totalSteps
  const shownSections = visible(sections, shown)

  // Every step scrolls the new content into view: a new section, or the line a
  // step added inside one. Scroll just far enough to see the bottom of it, but
  // never so far that its top leaves the screen. A step whose picture animates
  // first (`settle`) is two beats: bring the picture to the top of the screen
  // now, and scroll on to the new line once the picture has settled. Compares
  // against the last value rather than a "first run" flag, so StrictMode's
  // double-run of effects in dev doesn't scroll the page on load.
  const refs = useRef([])
  const prevShown = useRef(shown)
  const prevCount = useRef(shownSections.length)
  useEffect(() => {
    if (prevShown.current === shown) return
    prevShown.current = shown
    const count = shownSections.length
    const newSection = prevCount.current !== count
    prevCount.current = count
    const last = shownSections[count - 1]
    const section = refs.current[count - 1]
    if (!section) return
    if (newSection) {
      revealScroll(section)
      return
    }
    const part = section.querySelector('.part:last-of-type')
    const settle = last.section.settle?.(last.phase) ?? 0
    const figure = section.querySelector('.figure')
    if (!settle || !figure) {
      if (part) revealScroll(part)
      return
    }
    showScroll(figure)
    const t = setTimeout(() => part && revealScroll(part), settle + 100)
    return () => clearTimeout(t)
  }, [shown, shownSections])

  // Next wakes up once the bottom of the page has been seen. Re-armed on every
  // step; checked on scroll, on resize, and once after layout in case there is
  // nothing to scroll.
  useEffect(() => {
    if (!cast) return
    setReadToEnd(false)
    const check = () => {
      if (atBottom()) setReadToEnd(true)
    }
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    const raf = requestAnimationFrame(() => requestAnimationFrame(check))
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      cancelAnimationFrame(raf)
    }
  }, [cast, shown])

  const party = vote ? PARTIES.find((p) => p.id === vote.partyId) : null
  const cand = party?.candidates.find((c) => c.id === vote.candidateId)

  const onButton = () => {
    if (done) {
      window.location.assign(window.location.pathname)
    } else if (!cast) {
      const run = runsSoFar() + 1
      recordRun(run)
      setLayout(layoutFor(vote, run))
      setShown(1)
    } else {
      setShown((n) => n + 1)
    }
  }

  const gated = cast && !readToEnd

  return (
    <main className="page">
      <h1>Try a different way to vote</h1>
      <p className="lede">
        You and 99 neighbors are voting for your representative to the state legislature.
      </p>

      {cast ? (
        <p className="receipt">
          You voted for <Cand c={cand} p={party} />, <Party p={party} long />.
        </p>
      ) : (
        <Ballot vote={vote} onChange={setVote} />
      )}

      {shownSections.map(({ section, phase }, i) => (
        <section
          key={section.id}
          className="sec"
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          <h2>{section.title}</h2>
          {section.body(phase)}
        </section>
      ))}

      <div className="bar">
        <button type="button" className="btn" disabled={!cand || gated} onClick={onButton}>
          {!cast ? (
            cand ? (
              `Cast my vote: ${cand.name}`
            ) : (
              'Cast my vote'
            )
          ) : gated ? (
            <>
              <ArrowDown size={20} aria-hidden="true" /> Keep reading
            </>
          ) : done ? (
            'Start over'
          ) : (
            'Next'
          )}
        </button>
      </div>
    </main>
  )
}
