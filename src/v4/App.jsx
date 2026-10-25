import { useEffect, useMemo, useRef, useState } from 'react'
import { PARTIES } from '../data.js'
import { runElection } from '../election.js'
import { layoutFor, recordRun, runsSoFar, voteFromUrl } from '../session.js'
import Ballot from '../components/Ballot.jsx'
import { ArrowDown } from 'lucide-react'
import { Cand, Party } from '../components/inline.jsx'
import { buildStory } from './steps.jsx'

/**
 * v4: the count as a scroll story. Intro and ballot as before; casting a vote
 * reveals the story below: one picture stuck to the screen, and a column of
 * text cards scrolling over it. A card becomes the active step as soon as its
 * top rises into the bottom quarter of the screen, so the picture changes
 * while the card is still low and the whole picture is in view. There is no
 * Next button; scrolling is the control, in both directions. Every height is
 * taken from the small viewport (CSS svh, and the pinned picture's box in JS),
 * never from window.innerHeight, so a phone's address bar sliding away does
 * not reflow the cards or move the trigger line under the reader's thumb. A scene marked `fresh` is mounted only while active, so its
 * entrance animation plays again every time the reader returns to it.
 *
 * For testing: ?v=dogs.snoopy&n=4 opens with that vote cast and the fourth
 * step scrolled into view; &run=2 deals the votes unrigged.
 */

/** The scene and phase the picture should show for the active step. */
function sceneState(story, active) {
  if (active < 0) return { scene: null, phases: {} }
  const scene = story.steps[active].scene
  const phases = {}
  for (const sc of story.scenes) {
    const idx = story.steps.map((s, i) => (s.scene === sc.id ? i : -1)).filter((i) => i >= 0)
    const first = idx[0]
    const last = idx[idx.length - 1]
    // A scene's phase defaults to 1 ("shown") so single-step scenes need no
    // phase; before its first step it is 0 ("not yet").
    if (active < first) phases[sc.id] = 0
    else if (active > last) phases[sc.id] = story.steps[last].phase ?? 1
    else phases[sc.id] = story.steps[active].phase ?? 1
  }
  return { scene, phases }
}

export default function App() {
  const [start] = useState(voteFromUrl)
  const [vote, setVote] = useState(start.vote)
  const [layout, setLayout] = useState(start.layout)
  const [active, setActive] = useState(-1)
  const cast = layout !== null

  const election = useMemo(
    () => (cast ? runElection(vote, layout) : null),
    [cast, vote, layout],
  )
  const story = useMemo(() => (election ? buildStory(election) : null), [election])
  const { scene, phases } = story ? sceneState(story, active) : { scene: null, phases: {} }

  // One scroll handler drives both the picture and the active step. The
  // picture is pinned to the screen (position: fixed) while the story is on
  // screen, and parked at the story's top or bottom outside it; a card
  // becomes active once its top rises into the bottom quarter of the screen,
  // and stays active until the next card does, in either direction.
  const storyRef = useRef(null)
  const stepRefs = useRef([])
  const [pin, setPin] = useState({ mode: 'before', left: 0, width: 0 })
  useEffect(() => {
    if (!story) return undefined
    let raf = 0
    const update = () => {
      raf = 0
      const el = storyRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      // The picture's box is 100svh tall: the stable height, bars or no bars.
      const vh = el.querySelector('.graphic')?.offsetHeight || window.innerHeight
      const mode = r.top > 0 ? 'before' : r.bottom < vh ? 'after' : 'fixed'
      setPin((p) =>
        p.mode === mode && p.left === r.left && p.width === r.width
          ? p
          : { mode, left: r.left, width: r.width },
      )
      // A card is active once its top has risen a quarter of the way up the
      // screen, and stays so until the next card gets there. That early, the
      // picture above is still wholly in view while it changes.
      const line = vh * 0.75
      let on = -1
      stepRefs.current.forEach((li, i) => {
        if (!li) return
        const r = (li.querySelector('.card') ?? li).getBoundingClientRect()
        if (r.top < line) on = i
      })
      setActive(on)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(raf)
    }
  }, [story])

  // A deep link jumps to its step once the story exists; a fresh vote stays
  // put, with the cue under the receipt inviting the scroll. The jump is made
  // again after the fonts land and on the first resize, since either can move
  // the card (mobile browser chrome collapses; device emulation kicks in late).
  useEffect(() => {
    if (!story) return undefined
    const n = start.n
    if (n === 0) return undefined
    const go = (behavior) => {
      const li = stepRefs.current[Math.min(n, story.steps.length) - 1]
      const card = li?.querySelector('.card') ?? li
      if (!card) return
      // Park the card on its resting line (scrolly.css: .step padding-top).
      const rest = parseFloat(getComputedStyle(li).paddingTop) || 0
      const top = window.scrollY + card.getBoundingClientRect().top - rest
      window.scrollTo({ top, behavior })
    }
    let cancelled = false
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => !cancelled && go('auto')),
    )
    document.fonts?.ready.then(() => !cancelled && go('auto'))
    const again = () => go('auto')
    window.addEventListener('resize', again, { once: true })
    const stop = setTimeout(() => window.removeEventListener('resize', again), 2000)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearTimeout(stop)
      window.removeEventListener('resize', again)
    }
  }, [story, start.n])

  const party = vote ? PARTIES.find((p) => p.id === vote.partyId) : null
  const cand = party?.candidates.find((c) => c.id === vote.candidateId)

  const castVote = () => {
    const run = runsSoFar() + 1
    recordRun(run)
    setLayout(layoutFor(vote, run))
  }
  const restart = () => window.location.assign(window.location.pathname)

  return (
    <main className="page scrolly">
      <h1>Try a different way to vote</h1>
      <p className="lede">
        You and 99 neighbors are voting for your representative to the state legislature.
      </p>

      {cast ? (
        <>
          <p className="receipt">
            You voted for <Cand c={cand} p={party} />, <Party p={party} long />.
          </p>
          <p className="cue">
            <ArrowDown size={20} aria-hidden="true" /> Keep scrolling
          </p>
        </>
      ) : (
        <Ballot vote={vote} onChange={setVote} />
      )}

      {story && (
        <div
          ref={storyRef}
          className={`story ${pin.mode}`}
          style={{ '--gl': `${pin.left}px`, '--gw': `${pin.width}px` }}
        >
          <div className="graphic" aria-hidden={scene === null}>
            {story.scenes.map((sc) => {
              const on = sc.id === scene
              if (sc.fresh && !on) return null
              return (
                <div key={sc.id} className={`scene ${on ? 'on' : ''}`}>
                  {sc.render(phases[sc.id] ?? 0)}
                </div>
              )
            })}
          </div>
          <ol className="steps">
            {story.steps.map((st, i) => (
              <li
                key={i}
                className={`step ${i === active ? 'on' : ''}`}
                data-i={i}
                ref={(el) => {
                  stepRefs.current[i] = el
                }}
              >
                {st.body && (
                  <div className="card">
                    {st.title && <h2>{st.title}</h2>}
                    {st.body}
                    {i === story.steps.length - 1 && (
                      <button type="button" className="btn" onClick={restart}>
                        Start over
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!cast && (
        <div className="bar">
          <button type="button" className="btn" disabled={!cand} onClick={castVote}>
            {cand ? `Cast my vote: ${cand.name}` : 'Cast my vote'}
          </button>
        </div>
      )}
    </main>
  )
}
