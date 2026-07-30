import { useEffect, useRef } from 'react'
import { PRIMER_MS } from '../config.js'

/**
 * Two seconds of nothing but the instruction, then the ballot arrives on its own.
 *
 * Both of these sentences are already on the ballot screen, and people were
 * missing both — the first because a line of text above a grid of names loses to
 * the names, the second because a carousel that starts flush against the left
 * edge doesn't look like it continues. Giving them a screen with no ballot on it
 * to compete with is the cheapest fix available: nothing to read past, nothing to
 * tap, no decision to make.
 *
 * It is a reminder, never the only carrier of the information — the ballot repeats
 * both lines. That matters for anyone who reads slower than the timer, uses a
 * screen reader, or looks away: missing this screen entirely costs them nothing.
 * A tap anywhere skips it, so a reader on their fifth theme isn't held up.
 */
export default function Primer({ theme, onDone }) {
  // A ref, not the prop, so a re-render can't restart the countdown and strand
  // somebody on this screen.
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const timer = setTimeout(() => done.current(), PRIMER_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <button
      type="button"
      onClick={() => done.current()}
      aria-label="Continue to the ballot"
      className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center px-6 text-center"
    >
      <span className="text-[15px] font-medium tracking-wide text-[var(--ink-soft)] uppercase">
        <span aria-hidden="true">{theme.emoji}</span> {theme.name}
      </span>

      {/* aria-live so this is announced rather than silently replaced when the
          ballot takes over. */}
      <span aria-live="polite" className="mt-5 block">
        <span className="block text-[30px] leading-tight font-semibold tracking-tight">
          Vote for one candidate.
        </span>
        <span className="mt-4 block text-[17px] text-[var(--ink-soft)] lg:hidden">
          Scroll to see more parties.
        </span>
      </span>
    </button>
  )
}
