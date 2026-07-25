import { EASE_OPTIONS } from '../config.js'

/**
 * One tap between casting a vote and seeing the results.
 *
 * This exists to produce a number worth citing — "93% of people who tried it said
 * the ballot was easy" answers the objection the whole simulator was built to
 * answer. Asked here rather than after the results, because almost nobody
 * answers a survey once they've got what they came for. Skippable, because a
 * forced answer isn't worth having.
 */
export default function EaseScale({ onAnswer }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <p className="text-center text-sm font-medium tracking-wide text-[var(--ink-soft)] uppercase">
          Vote counted
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight">
          How was that ballot?
        </h1>

        <fieldset className="mt-6">
          <legend className="sr-only">How easy was the ballot?</legend>
          <div className="flex flex-col gap-2">
            {EASE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onAnswer(option.value)}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 text-left text-base transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span aria-hidden="true" className="text-2xl">
                  {option.emoji}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() => onAnswer(null)}
          className="mt-4 min-h-11 w-full text-sm text-[var(--ink-soft)] underline underline-offset-4 hover:text-[var(--ink)]"
        >
          Skip, just show me the results
        </button>
      </div>
    </div>
  )
}
