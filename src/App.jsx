import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { DEFAULT_REGION, getRegion, getTheme, getThemes } from './data/index.js'
import { castVote, fetchResults, hasVoted, isFirstRun, myVoteIn } from './lib/api.js'
import { allocate, describeMyVote } from './lib/allocate.js'
import { relabelForFirstRun } from './lib/firstRun.js'
import { resolveTheme } from './lib/variant.js'
import { THEME_PARAM } from './config.js'
import BallotBoxIcon from './components/BallotBoxIcon.jsx'
import StickyBar from './components/StickyBar.jsx'
import Intro from './sections/Intro.jsx'
import Ballot from './sections/Ballot.jsx'
import WinnerTakeAll from './sections/WinnerTakeAll.jsx'
import Proportional from './sections/Proportional.jsx'
import HowSeats from './sections/HowSeats.jsx'
import PartySeats from './sections/PartySeats.jsx'
import Wrap from './sections/Wrap.jsx'

const REGION = DEFAULT_REGION

/**
 * The page is one column that grows.
 *
 * Each tap of the sticky button reveals the next section underneath the one
 * being read and scrolls it into view; nothing above is ever removed, so going
 * back is scrolling up. The order is the argument: vote, see the old system
 * give your side nothing, see the new one give it a seat, then learn why.
 */
const INTRO = 0
const BALLOT = 1
const WTA = 2
const PR = 3
const HOW = 4
const PARTY = 5
const WRAP = 6

export default function App() {
  const reduced = useReducedMotion()
  const region = getRegion(REGION)
  const themes = getThemes(REGION)

  // `?theme=hogwarts` picks the election; anything else is the region's own.
  // Read once: the address bar doesn't change while the page is open.
  const [themeId] = useState(
    () =>
      resolveTheme(window.location.search, themes.map((t) => t.id)) ?? region.sportsTheme.id,
  )
  const theme = getTheme(themeId, REGION)

  // One ballot per election per browser. A repeat visitor starts at the results
  // with their original pick restored.
  const [returning] = useState(() => hasVoted(themeId))
  const [selection, setSelection] = useState(() => myVoteIn(themeId))
  const [stage, setStage] = useState(() => (returning ? WTA : INTRO))
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [casting, setCasting] = useState(false)
  const [seenAll, setSeenAll] = useState(false)
  const [dropping, setDropping] = useState(false)

  // Decided before the vote is stored, so a fresh browser reads as a first run
  // even once its own ballot has been written. See relabelForFirstRun.
  const [firstRun] = useState(() => isFirstRun(themeId))

  const result = useMemo(() => {
    if (!results) return null
    const tallies = firstRun ? relabelForFirstRun(theme, results.tallies, selection) : results.tallies
    return allocate(theme, tallies)
  }, [results, firstRun, theme, selection])
  const mine = useMemo(() => (result ? describeMyVote(result, selection) : null), [result, selection])

  const sectionRefs = useRef({})
  const scrolledTo = useRef(stage)

  // Each newly revealed section scrolls to the top of the window. Not the
  // initial one: a repeat visitor landing on the results should start at the
  // top of the page like anyone else.
  useEffect(() => {
    if (stage === scrolledTo.current) return
    scrolledTo.current = stage
    const el = sectionRefs.current[stage]
    if (!el) return
    const frame = requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [stage, reduced])

  const handleCast = useCallback(async () => {
    if (!selection || dropping) return
    setDropping(true)
    // Let the ballot finish dropping through the slot before the page moves on.
    await new Promise((r) => setTimeout(r, 340))
    setCasting(true)
    setStage(WTA)
    try {
      // Strictly sequential: fetching the tally alongside the insert lets the
      // read land first, and the voter's own ballot goes missing from their
      // own results.
      await castVote({
        themeId,
        listId: selection.listId,
        candidateId: selection.candidateId,
        regionId: REGION,
      })
      setResults(await fetchResults(themeId, REGION))
    } catch (err) {
      console.error(err)
      setError('We could not reach the vote server, so this ballot may not have counted.')
    } finally {
      setCasting(false)
      setDropping(false)
    }
  }, [themeId, selection, dropping])

  // A repeat visitor sent straight to the results. Never while a ballot is in
  // flight: handleCast owns that fetch, and it has to run after the insert.
  useEffect(() => {
    if (stage < WTA || results || casting) return
    fetchResults(themeId, REGION)
      .then(setResults)
      .catch(() => setError('We could not load the results.'))
  }, [stage, results, themeId, casting])

  const nextTheme = themes[(themes.findIndex((t) => t.id === themeId) + 1) % themes.length]
  const tryAnother = () => {
    const url = new URL(window.location.href)
    url.searchParams.set(THEME_PARAM, nextTheme.id)
    window.location.assign(url)
  }

  const selectedName = selection
    ? theme.lists
        .find((l) => l.id === selection.listId)
        ?.candidates.find((c) => c.id === selection.candidateId)?.name
    : null
  const bar = barFor({
    stage,
    result,
    selection,
    selectedName,
    seenAll,
    dropping,
    setStage,
    handleCast,
    tryAnother,
  })

  const ref = (i) => (el) => {
    sectionRefs.current[i] = el
  }

  return (
    /* dvh, not `min-h-full`: a percentage min-height resolves against the
       parent's *height*, which is auto here, so it would collapse and the
       sticky bar would float mid-screen. dvh also tracks mobile browser chrome. */
    <div className="flex min-h-dvh w-full flex-col">
      <main className="mx-auto w-full max-w-[560px] px-5 pb-10">
        {stage >= INTRO && stage < WTA && (
          <div ref={ref(INTRO)}>
            <Intro theme={theme} />
          </div>
        )}

        {stage >= BALLOT && stage < WTA && (
          <div ref={ref(BALLOT)} className="section-in scroll-mt-4">
            <Ballot
              theme={theme}
              selection={selection}
              onSelect={setSelection}
              onSeenAll={setSeenAll}
            />
          </div>
        )}

        {stage >= WTA && (
          <div ref={ref(WTA)} className="section-in scroll-mt-4">
            {/* A repeat visitor lands here with no ballot above them, so the
                page says which election this is and what they chose. */}
            {returning && selectedName && (
              <p className="pt-10 text-[17px] text-[var(--ink-soft)]">
                You already voted in the {theme.name} election, for{' '}
                <strong className="text-[var(--ink)]">{selectedName}</strong>.
              </p>
            )}
            {result ? (
              <WinnerTakeAll result={result} mine={mine} myVote={selection} />
            ) : (
              <p className="pt-12 text-[18px] text-[var(--ink-soft)]">
                {error ?? 'Counting the votes…'}
              </p>
            )}
          </div>
        )}

        {stage >= PR && result && (
          <div ref={ref(PR)} className="section-in scroll-mt-4">
            <Proportional result={result} mine={mine} myVote={selection} />
          </div>
        )}

        {stage >= HOW && result && (
          <div ref={ref(HOW)} className="section-in scroll-mt-4">
            <HowSeats result={result} />
          </div>
        )}

        {stage >= PARTY && result && (
          <div ref={ref(PARTY)} className="section-in scroll-mt-4">
            <PartySeats result={result} myVote={selection} theme={theme} />
          </div>
        )}

        {stage >= WRAP && result && (
          <div ref={ref(WRAP)} className="section-in scroll-mt-4">
            <Wrap result={result} />
          </div>
        )}

      </main>

      <StickyBar note={bar.note} disabled={bar.disabled} onClick={bar.onClick}>
        {bar.icon}
        {bar.label}
      </StickyBar>
    </div>
  )
}

/**
 * What the one button says and does at each stage. Kept together so the whole
 * path reads in one place: Start → Cast → Next → Next → Next → Next → Again.
 */
function barFor({
  stage,
  result,
  selection,
  selectedName,
  seenAll,
  dropping,
  setStage,
  handleCast,
  tryAnother,
}) {
  const next = () => setStage(stage + 1)
  switch (stage) {
    case INTRO:
      return { label: 'Start', onClick: next }
    case BALLOT: {
      const ready = Boolean(selection) && seenAll
      // The instruction lives in the note line, in ink, where it can be
      // read; a greyed-out button is the one place text is hardest to see.
      // Once a name is chosen the button says it, so the note says nothing.
      return {
        note: !seenAll
          ? 'Scroll to see every party'
          : selectedName
            ? null
            : 'Tap a name to choose',
        disabled: !ready || dropping,
        onClick: handleCast,
        icon: <BallotBoxIcon dropping={dropping} className="size-7" />,
        label: dropping
          ? 'Casting…'
          : selectedName && seenAll
            ? `Cast my vote for ${selectedName}`
            : 'Cast my vote',
      }
    }
    case WRAP:
      return { label: 'Try another election', onClick: tryAnother }
    default:
      return { label: 'Next', disabled: !result, onClick: next }
  }
}
