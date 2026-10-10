import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ballotOrder, partyName } from '../data/index.js'

/**
 * The ballot: every party, every candidate, in one column.
 *
 * Real open-list ballots are laid out in party columns and you find your party
 * before you scan its names, so each party is still its own card. The cards
 * stack vertically now rather than swiping sideways — every party is reachable
 * by the scroll the thumb is already doing, and nothing is off the edge.
 *
 * The page's one button lives in the sticky bar below, owned by App. This
 * section reports two things up: which candidate is marked, and whether the
 * reader has scrolled far enough to have seen the last party. The button stays
 * grey until both are true, so nobody votes for the first name they see
 * without knowing there were four parties.
 *
 * One radio group across every card, because a voter gets exactly one mark on
 * the whole ballot. Roving tabindex; arrows walk the whole ballot in order.
 */
export default function Ballot({ theme, selection, onSelect, onSeenAll }) {
  const rowRefs = useRef([])
  const lastCardRef = useRef(null)

  // Printed in alphabetical order so the order carries no hint about who
  // deserves the seat.
  const printedLists = useMemo(
    () => theme.lists.map((list) => ({ ...list, candidates: ballotOrder(list.candidates) })),
    [theme],
  )

  const flat = useMemo(
    () =>
      printedLists.flatMap((list) =>
        list.candidates.map((cand) => ({ listId: list.id, candidateId: cand.id })),
      ),
    [printedLists],
  )

  const selectedFlatIndex = selection
    ? flat.findIndex(
        (x) => x.listId === selection.listId && x.candidateId === selection.candidateId,
      )
    : -1

  // "Seen every party" means the last card has been mostly on screen once.
  // Fires immediately on a tall window where the whole ballot fits.
  useEffect(() => {
    const el = lastCardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      onSeenAll(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onSeenAll(true)
          observer.disconnect()
        }
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onSeenAll])

  const moveFocus = useCallback(
    (nextIndex) => {
      const clamped = (nextIndex + flat.length) % flat.length
      rowRefs.current[clamped]?.focus()
    },
    [flat],
  )

  const onKeyDown = (event, index) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        moveFocus(index + 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        moveFocus(index - 1)
        break
      case 'Home':
        event.preventDefault()
        moveFocus(0)
        break
      case 'End':
        event.preventDefault()
        moveFocus(flat.length - 1)
        break
      default:
        break
    }
  }

  let flatCursor = -1

  return (
    <section className="pt-10" aria-labelledby="ballot-heading">
      <h2 id="ballot-heading" className="text-[26px] leading-tight font-semibold tracking-tight">
        You can vote for one candidate from any party
      </h2>
      <p className="mt-3 text-[18px] leading-snug font-semibold">
        This is a simulation, so it doesn&apos;t matter too much who you vote for.
      </p>

      <div
        role="radiogroup"
        aria-label={`Candidates in the ${theme.name} election`}
        className="mt-6 flex flex-col gap-4"
      >
        {printedLists.map((list, listIndex) => (
          <div
            key={list.id}
            ref={listIndex === printedLists.length - 1 ? lastCardRef : undefined}
            className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-[0_1px_2px_rgba(20,22,26,0.06),0_4px_14px_rgba(20,22,26,0.05)]"
          >
            <h3
              className="flex items-center gap-2 px-4 py-3 text-[18px] font-semibold text-white"
              style={{ backgroundColor: list.color }}
            >
              <span aria-hidden="true">{list.emoji}</span>
              {partyName(list)}
            </h3>
            <ul className="divide-y divide-[var(--line)]">
              {list.candidates.map((cand) => {
                flatCursor += 1
                const index = flatCursor
                const isSelected =
                  selection?.listId === list.id && selection?.candidateId === cand.id
                const tabIndex =
                  selectedFlatIndex >= 0 ? (isSelected ? 0 : -1) : index === 0 ? 0 : -1
                return (
                  <li key={cand.id}>
                    <button
                      ref={(el) => {
                        rowRefs.current[index] = el
                      }}
                      type="button"
                      role="radio"
                      aria-label={`${cand.name}, ${partyName(list)}`}
                      aria-checked={isSelected}
                      tabIndex={tabIndex}
                      onKeyDown={(e) => onKeyDown(e, index)}
                      onClick={() => onSelect({ listId: list.id, candidateId: cand.id })}
                      className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[17px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                      style={isSelected ? { backgroundColor: `${list.color}14` } : undefined}
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors"
                        style={{
                          borderColor: isSelected ? list.color : 'var(--line)',
                          backgroundColor: isSelected ? list.color : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <svg viewBox="0 0 16 16" className="size-3.5 text-white" fill="none">
                            <path
                              d="M3.5 8.5l3 3 6-7"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className={isSelected ? 'font-semibold' : ''}>{cand.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
