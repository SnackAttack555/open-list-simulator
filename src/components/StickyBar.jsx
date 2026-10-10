/**
 * The one control on the page.
 *
 * It sits at the bottom of every screen and only ever does the next thing:
 * start, cast, next, next, try another. The page above it is an article — it
 * grows when this is tapped and never shrinks — so there is no Back here. Back
 * is scrolling up, which the thumb already knows how to do.
 *
 * `note` is the one line of context that belongs with the button rather than
 * with the page, e.g. the name about to be voted for.
 */
export default function StickyBar({ note, disabled = false, onClick, children }) {
  return (
    <div className="sticky bottom-0 z-10 mt-auto border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[560px] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {note !== undefined && (
          <p className="mb-2 min-h-7 text-center text-[17px] font-medium" aria-live="polite">
            {note}
          </p>
        )}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--accent)] text-[19px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
        >
          {children}
        </button>
      </div>
    </div>
  )
}
