import { useEffect, useState } from 'react'
import { fetchThemeCounts, hasVoted } from '../lib/api.js'
import { DEFAULT_REGION } from '../data/regions.js'

/**
 * Theme picker. Deliberately says almost nothing about proportional
 * representation — the ballot and the results do the teaching. All this screen
 * has to do is get someone to pick a world they already have opinions about.
 */
export default function Start({ region, themes, onPick }) {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    let alive = true
    fetchThemeCounts(DEFAULT_REGION)
      .then((data) => alive && setCounts(data))
      .catch(() => alive && setCounts({}))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="px-5 pt-8 pb-10">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium tracking-wide text-[var(--ink-soft)] uppercase">
            {region.name}
          </p>
          <h1 className="mt-1 text-3xl leading-tight font-semibold tracking-tight">
            Vote for your favorites
          </h1>
          <p className="mt-2 text-[15px] text-[var(--ink-soft)]">
            Five seats are up for election. Pick a world and cast one vote.
          </p>
        </div>
        {region.outline?.path && (
          <svg
            viewBox={region.outline.viewBox}
            className="mt-1 w-[84px] shrink-0"
            role="img"
            aria-label={`Outline of ${region.name}`}
          >
            <path d={region.outline.path} fill="var(--accent)" opacity="0.14" />
          </svg>
        )}
      </header>

      <ul className="mt-7 flex flex-col gap-3">
        {themes.map((theme) => {
          const count = counts?.[theme.id]
          const already = hasVoted(theme.id)
          return (
            <li key={theme.id}>
              <button
                type="button"
                onClick={() => onPick(theme.id)}
                className="flex min-h-20 w-full items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-left shadow-sm transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span aria-hidden="true" className="text-3xl">
                  {theme.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{theme.name}</span>
                  <span className="block text-sm text-[var(--ink-soft)]">
                    {theme.tagline}
                    {count > 0 && ` · ${count.toLocaleString()} voted`}
                    {already && ' · you voted'}
                  </span>
                </span>
                {/* Colour swatches double as a preview of how many lists are on the ballot. */}
                <span aria-hidden="true" className="flex shrink-0 gap-1">
                  {theme.lists.map((list) => (
                    <span
                      key={list.id}
                      className="block size-2.5 rounded-full"
                      style={{ backgroundColor: list.color }}
                    />
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-8 text-center text-xs leading-relaxed text-[var(--ink-soft)]">
        An educational parody. Not affiliated with, endorsed by, or sponsored by any of the
        rights holders named here.
      </p>
    </div>
  )
}
