import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_REGION, getRegion, getTheme, getThemes } from './data/index.js'
import { castVote, fetchResults, submitEase } from './lib/api.js'
import Start from './screens/Start.jsx'
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

  const theme = themeId ? getTheme(themeId, REGION) : null

  // Each screen is its own page as far as the reader is concerned.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const openTheme = (id) => {
    setThemeId(id)
    setSelection(null)
    setVoteToken(null)
    setResults(null)
    setError(null)
    setScreen('ballot')
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
    setScreen('ease')
    try {
      const [voted] = await Promise.all([
        castVote({
          themeId,
          listId: selection.listId,
          candidateId: selection.candidateId,
          regionId: REGION,
        }),
        // Prefetch while the ease question is on screen so results feel instant.
        fetchResults(themeId, REGION).then(setResults),
      ])
      setVoteToken(voted?.token ?? null)
    } catch (err) {
      console.error(err)
      setError('We could not reach the vote server, so this ballot may not have counted.')
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

  // Results were prefetched during the ease screen; this covers a slow network.
  useEffect(() => {
    if (screen !== 'results' || results || !themeId) return
    fetchResults(themeId, REGION)
      .then(setResults)
      .catch(() => setError('We could not load the results.'))
  }, [screen, results, themeId])

  return (
    /* dvh, not `min-h-full`: a percentage min-height resolves against the
       parent's *height*, which is auto here, so it would collapse and the
       ballot's sticky bar would float mid-screen. dvh also tracks mobile
       browser chrome as it hides. */
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col">
      {screen === 'start' && <Start region={region} themes={themes} onPick={openTheme} />}

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
