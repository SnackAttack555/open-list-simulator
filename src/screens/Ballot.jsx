import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BallotBoxIcon from '../components/BallotBoxIcon.jsx'

/**
 * The ballot: one party list per card, in a horizontal scroll-snap carousel.
 *
 * The carousel isn't an app convention borrowed for its own sake. Real open-list
 * ballots — Finnish, Brazilian — are laid out in party columns, and you find your
 * party's column before you scan its candidates. A card *is* a column.
 *
 * Two things keep it from hiding the choice: the next card peeks at the right
 * margin so more ballot is visibly there, and the chip row names every list at
 * once. Without those, people vote for whoever is on the first card they see.
 *
 * Accessibility: the whole carousel is ONE radio group, not one per card, because
 * a voter gets exactly one mark across the entire ballot. Roving tabindex, arrows
 * move through every candidate in ballot order and drag the carousel along.
 */
export default function Ballot({ theme, selection, onSelect, onCast, onBack }) {
  const scrollerRef = useRef(null)
  const cardRefs = useRef([])
  const rowRefs = useRef([])
  const [activeCard, setActiveCard] = useState(0)
  const [dropping, setDropping] = useState(false)

  // Flat ballot order, so arrow keys cross card boundaries the way they should.
  const flat = useMemo(
    () =>
      theme.lists.flatMap((list, listIndex) =>
        list.candidates.map((cand) => ({
          listId: list.id,
          listIndex,
          candidateId: cand.id,
          name: cand.name,
        })),
      ),
    [theme],
  )

  const selectedFlatIndex = selection
    ? flat.findIndex(
        (x) => x.listId === selection.listId && x.candidateId === selection.candidateId,
      )
    : -1

  const selectedList = selection ? theme.lists.find((l) => l.id === selection.listId) : null
  const selectedName = selectedFlatIndex >= 0 ? flat[selectedFlatIndex].name : null

  // Which card is centred, for the chip highlight. Cheap rAF-throttled read of
  // scrollLeft rather than an observer per card.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let frame = 0
    const measure = () => {
      frame = 0
      const mid = scroller.scrollLeft + scroller.clientWidth / 2
      let best = 0
      let bestDist = Infinity
      cardRefs.current.forEach((el, i) => {
        if (!el) return
        const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      setActiveCard(best)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    measure()
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [theme])

  const scrollToCard = useCallback((index) => {
    const el = cardRefs.current[index]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  const moveFocus = useCallback(
    (nextIndex) => {
      const clamped = (nextIndex + flat.length) % flat.length
      const target = flat[clamped]
      // preventScroll matters: focus() otherwise does its own instant
      // scroll-into-view, which cancels the smooth scroll we queue next and
      // leaves the carousel parked on the old card with focus off-screen.
      rowRefs.current[clamped]?.focus({ preventScroll: true })
      scrollToCard(target.listIndex)
    },
    [flat, scrollToCard],
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

  const cast = () => {
    if (!selection || dropping) return
    setDropping(true)
    // Let the ballot finish dropping through the slot before the screen changes.
    // Casting a vote should feel like an act, not a page load.
    setTimeout(() => onCast(), 340)
  }

  let flatCursor = -1

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 min-h-11 px-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          ← All elections
        </button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{theme.name}</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Pick your one favorite. {theme.lists.length} lists, 5 seats.
        </p>
      </header>

      {/* Chip row: proves every list exists, and jumps to one. */}
      <nav
        aria-label="Jump to a list"
        className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {theme.lists.map((list, i) => {
          const isActive = i === activeCard
          const holdsSelection = selection?.listId === list.id
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => scrollToCard(i)}
              aria-label={`Go to ${list.name}${holdsSelection ? ', holds your vote' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                isActive
                  ? 'border-transparent text-white'
                  : 'border-[var(--line)] bg-white text-[var(--ink-soft)]'
              }`}
              style={isActive ? { backgroundColor: list.color } : undefined}
            >
              <span aria-hidden="true">{list.emoji}</span>
              <span className="whitespace-nowrap">{list.name}</span>
              {holdsSelection && (
                <span aria-hidden="true" className="text-xs">
                  ●
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* One radio group spanning every card: one mark for the whole ballot. */}
      <div
        ref={scrollerRef}
        role="radiogroup"
        aria-label={`Candidates in the ${theme.name} election`}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-3"
      >
        {theme.lists.map((list, listIndex) => (
          <section
            key={list.id}
            ref={(el) => {
              cardRefs.current[listIndex] = el
            }}
            /* 84vw leaves the next card visibly peeking, which is what tells a
               thumb there is more ballot to the right. */
            className="w-[84vw] max-w-[380px] shrink-0 snap-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm"
          >
            <h2
              className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-white"
              style={{ backgroundColor: list.color }}
            >
              <span aria-hidden="true">{list.emoji}</span>
              {list.name}
            </h2>
            <ul className="divide-y divide-[var(--line)]">
              {list.candidates.map((cand) => {
                flatCursor += 1
                const index = flatCursor
                const isSelected =
                  selection?.listId === list.id && selection?.candidateId === cand.id
                // Roving tabindex: the checked radio owns the tab stop, or the
                // very first one when nothing is checked yet.
                const tabIndex = selectedFlatIndex >= 0 ? (isSelected ? 0 : -1) : index === 0 ? 0 : -1
                return (
                  <li key={cand.id}>
                    <button
                      ref={(el) => {
                        rowRefs.current[index] = el
                      }}
                      type="button"
                      role="radio"
                      /* The card groups these visually; a screen reader gets the
                         list name in the label instead, or "Snape" arrives with
                         no idea which house it belongs to. */
                      aria-label={`${cand.name}, ${list.name}`}
                      aria-checked={isSelected}
                      tabIndex={tabIndex}
                      onKeyDown={(e) => onKeyDown(e, index)}
                      onClick={() => onSelect({ listId: list.id, candidateId: cand.id })}
                      className="flex min-h-14 w-full items-center gap-3 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
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
          </section>
        ))}
      </div>

      <p className="px-4 pb-2 text-center text-xs text-[var(--ink-soft)]">
        Swipe to see the other lists
      </p>

      {/* Sticky bar: the selection survives swiping, so you can wander the whole
          ballot holding your choice. */}
      <div className="sticky bottom-0 mt-auto border-t border-[var(--line)] bg-[var(--paper)]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <p className="mb-2 min-h-5 text-center text-sm" aria-live="polite">
          {selectedName ? (
            <>
              <span className="text-[var(--ink-soft)]">Your vote: </span>
              <span className="font-semibold" style={{ color: selectedList?.color }}>
                {selectedName}
              </span>
            </>
          ) : (
            <span className="text-[var(--ink-soft)]">Tap a name to choose</span>
          )}
        </p>
        <button
          type="button"
          onClick={cast}
          disabled={!selection || dropping}
          className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--accent)] text-lg font-semibold text-white transition-opacity disabled:opacity-35"
        >
          <BallotBoxIcon dropping={dropping} className="size-7" />
          {dropping ? 'Casting…' : 'Cast my vote'}
        </button>
      </div>
    </div>
  )
}
