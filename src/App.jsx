import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_REGION, getRegion, getTheme, getThemes } from './data/index.js'
import {
  castVote,
  fetchResults,
  hasBeenAskedEase,
  hasSeenPrimer,
  hasVoted,
  markEaseAsked,
  markPrimerSeen,
  myVoteIn,
  submitEase,
} from './lib/api.js'
import Start from './screens/Start.jsx'
import Primer from './screens/Primer.jsx'
import Ballot from './screens/Ballot.jsx'
import EaseScale from './screens/EaseScale.jsx'
import Results from './screens/Results.jsx'

const REGION = DEFAULT_REGION

export default function App() {
  const region = getRegion(REGION)
  const themes = getThemes(REGION)

  const [screen, setScreen] = useState('start')
  const [themeId, setThemeId] = useState(null)
  const [selection, setSelection] = useState(null)
  const [voteToken, setVoteToken] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  // True from the moment a ballot is submitted until the tally comes back.
  // Without the ease screen in the way there is nothing else holding the results
  // screen off, and its prefetch would otherwise race the insert it depends on.
  const [casting, setCasting] = useState(false)

  const theme = themeId ? getTheme(themeId, REGION) : null

  // Each screen is its own page as far as the reader is concerned.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const openTheme = (id) => {
    setThemeId(id)
    setVoteToken(null)
    setResults(null)
    setError(null)

    // One ballot per theme per browser. A repeat visitor goes to the results
    // instead of a second ballot — with their original pick restored, so the
    // personal payoff still reads correctly however much the election has grown.
    if (hasVoted(id)) {
      setSelection(myVoteIn(id))
      setScreen('results')
      return
    }

    setSelection(null)
    // The instruction screen, on the first ballot only. Both of its lines are on
    // the ballot too, but there they compete with twenty names and a carousel,
    // and first-timers were missing them. A second visit doesn't need telling.
    if (hasSeenPrimer()) {
      setScreen('ballot')
      return
    }
    markPrimerSeen()
    setScreen('primer')
  }

  const goStart = () => {
    setScreen('start')
    setThemeId(null)
    setSelection(null)
  }

  /**
   * Record the vote the moment it is cast, not after the ease question. Someone
   * who bounces off the ease screen has still voted, and their ballot should count.
   */
  const handleCast = useCallback(async () => {
    // The ease question is a first-impression measure, so it runs once per
    // browser. Everyone after that goes straight from the ballot to the results.
    const ask = !hasBeenAskedEase()
    if (ask) markEaseAsked()
    setCasting(true)
    setScreen(ask ? 'ease' : 'results')
    try {
      // Strictly sequential. Fetching the tally concurrently with the insert lets
      // the read land first, so the voter's own ballot is missing from their own
      // results — and the payoff line ("your vote elected X") gets computed
      // without the vote it is describing. Both requests still happen while the
      // ease question is on screen, so this costs nothing the reader can feel.
      const voted = await castVote({
        themeId,
        listId: selection.listId,
        candidateId: selection.candidateId,
        regionId: REGION,
      })
      setVoteToken(voted?.token ?? null)
      setResults(await fetchResults(themeId, REGION))
    } catch (err) {
      console.error(err)
      setError('We could not reach the vote server, so this ballot may not have counted.')
    } finally {
      setCasting(false)
    }
  }, [themeId, selection])

  const handleEase = useCallback(
    async (value) => {
      setScreen('results')
      if (value == null || !voteToken) return
      try {
        await submitEase({ token: voteToken, ease: value })
      } catch (err) {
        // A missing ease answer is not worth interrupting anyone over.
        console.error(err)
      }
    },
    [voteToken],
  )

  // Covers arriving at the results without having just voted — a repeat visitor
  // sent straight here by their stored ballot — and a slow network behind the
  // ease screen. Never while a ballot is in flight: handleCast owns that fetch,
  // and it has to run after the insert, not alongside it.
  useEffect(() => {
    if (screen !== 'results' || results || !themeId || casting) return
    fetchResults(themeId, REGION)
      .then(setResults)
      .catch(() => setError('We could not load the results.'))
  }, [screen, results, themeId, casting])

  return (
    /* dvh, not `min-h-full`: a percentage min-height resolves against the
       parent's *height*, which is auto here, so it would collapse and the
       ballot's sticky bar would float mid-screen. dvh also tracks mobile
       browser chrome as it hides.

       The reading column is set per screen rather than here, because the ballot
       is the one screen that earns a wide window — it has four cards to show at
       once. Prose stays at phone width everywhere else no matter the monitor. */
    <div className="flex min-h-dvh w-full flex-col">
      {screen === 'start' && <Start region={region} themes={themes} onPick={openTheme} />}

      {screen === 'primer' && theme && (
        <Primer theme={theme} onDone={() => setScreen('ballot')} />
      )}

      {screen === 'ballot' && theme && (
        <Ballot
          theme={theme}
          selection={selection}
          onSelect={setSelection}
          onCast={handleCast}
          onBack={goStart}
        />
      )}

      {screen === 'ease' && <EaseScale onAnswer={handleEase} />}

      {screen === 'results' && theme && (
        <Results
          theme={theme}
          myVote={selection}
          results={results}
          error={error}
          onRestart={goStart}
        />
      )}
    </div>
  )
}
