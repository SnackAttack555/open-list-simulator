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
    <div className="mx-auto w-full max-w-[520px] px-5 pt-8 pb-10">
      {/* Three tiers, because the screen has to answer three questions in order:
          what is this, what do I do now, and what happens after.

          The headline alone wasn't enough — "Vote for your favorites" above a list
          of worlds read as though the list *was* the ballot, and people picked
          Hogwarts and waited for a result. But replacing it with the instruction
          left nothing identifying the site at all. So the headline says what this
          is and the subhead numbers the step: "first" implies a second thing,
          which turns the list into a doorway rather than the election.

          The region name sits over the outline it labels. On the left it was the
          first thing read on the screen, which made the whole page look like it
          was about Michigan rather than about voting. */}
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight">
            Vote for your favorites
          </h1>
          <p className="mt-2.5 text-[17px] leading-snug font-semibold">
            First, pick a world.
          </p>
          <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
            Vote in an election for five seats.
          </p>
        </div>
        {/* The label is tied to the region, not to the drawing — a state edition
            added without an outline still has to say which state it is. */}
        <div className="shrink-0 text-center">
          <p className="text-xs font-medium tracking-wide text-[var(--ink-soft)] uppercase">
            {region.name}
          </p>
          {region.outline?.path && (
            <svg
              viewBox={region.outline.viewBox}
              className="mt-1 w-[84px]"
              role="img"
              aria-label={`Outline of ${region.name}`}
            >
              <path d={region.outline.path} fill="var(--accent)" opacity="0.14" />
            </svg>
          )}
        </div>
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
                  {/* One line, always. Wrapping here made the cards ragged
                      heights, so both halves stay short: the taglines no longer
                      repeat "five seats" (the header above already says it), and
                      a repeat visitor gets "Your vote is in" rather than a
                      sentence. */}
                  <span className="block truncate text-sm text-[var(--ink-soft)]">
                    {already ? 'Your vote is in' : theme.tagline}
                    {count > 0 && ` · ${count.toLocaleString()} vote${count === 1 ? '' : 's'}`}
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
