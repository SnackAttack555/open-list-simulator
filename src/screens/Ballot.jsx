import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BallotBoxIcon from '../components/BallotBoxIcon.jsx'
import { ballotOrder, partyName } from '../data/index.js'

/**
 * The ballot: one party per card.
 *
 * The card isn't an app convention borrowed for its own sake. Real open-list
 * ballots — Finnish, Brazilian — are laid out in party columns, and you find your
 * party's column before you scan its candidates. A card *is* a column.
 *
 * Two layouts, chosen by CSS rather than by measuring the window, so there is no
 * flash of the wrong one on load:
 *
 *   - Narrow (phones): a horizontal scroll-snap carousel. Two things keep it from
 *     hiding the choice — the next card peeks at the right margin so a thumb can
 *     see there is more ballot, and the chip row names every party at once.
 *     Without those, people vote for whoever is on the first card they see.
 *   - Wide (lg and up): every card on screen at once. The chip row and the swipe
 *     hint are then answering a question nobody has, so both disappear — a jump
 *     link to a card you are already looking at is noise.
 *
 * Accessibility: the whole ballot is ONE radio group, not one per card, because
 * a voter gets exactly one mark across the entire ballot. Roving tabindex, arrows
 * move through every candidate in ballot order and drag the carousel along.
 */
export default function Ballot({ theme, selection, onSelect, onCast, onBack }) {
  const scrollerRef = useRef(null)
  const cardRefs = useRef([])
  const rowRefs = useRef([])
  const [activeCard, setActiveCard] = useState(0)
  const [dropping, setDropping] = useState(false)

  // Each list in printed ballot order — alphabetical, so the order carries no
  // hint about who deserves the seat.
  const printedLists = useMemo(
    () => theme.lists.map((list) => ({ ...list, candidates: ballotOrder(list.candidates) })),
    [theme],
  )

  // Flat ballot order, so arrow keys cross card boundaries the way they should.
  const flat = useMemo(
    () =>
      printedLists.flatMap((list, listIndex) =>
        list.candidates.map((cand) => ({
          listId: list.id,
          listIndex,
          candidateId: cand.id,
          name: cand.name,
        })),
      ),
    [printedLists],
  )

  const selectedFlatIndex = selection
    ? flat.findIndex(
        (x) => x.listId === selection.listId && x.candidateId === selection.candidateId,
      )
    : -1

  const selectedList = selection ? printedLists.find((l) => l.id === selection.listId) : null
  const selectedName = selectedFlatIndex >= 0 ? flat[selectedFlatIndex].name : null

  // Which card is centred, for the chip highlight. Cheap rAF-throttled read of
  // scrollLeft rather than an observer per card.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let frame = 0
    const measure = () => {
      frame = 0
      // Compare viewport rects, never offsetLeft against scrollLeft: offsetLeft
      // is measured from the offset parent (the body), so once the app column
      // is centered on a wide window it carries the centering margin and every
      // chip lights one card to the left. Invisible at phone width, where the
      // margin is zero.
      const scrollerRect = scroller.getBoundingClientRect()
      const mid = scrollerRect.left + scrollerRect.width / 2
      let best = 0
      let bestDist = Infinity
      cardRefs.current.forEach((el, i) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        const dist = Math.abs(rect.left + rect.width / 2 - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      setActiveCard(best)
    }
    // Scroll snapping nudges the final position after the last scroll event, so
    // measuring on 'scroll' alone can leave the chip one card behind. Re-measure
    // when scrolling ends, with a timer for engines lacking 'scrollend'.
    let settle = 0
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
      clearTimeout(settle)
      settle = setTimeout(measure, 140)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('scrollend', measure)

    // Re-measure when the container changes size, not only when it scrolls.
    // Crossing the grid/carousel breakpoint rearranges every card without firing
    // a single scroll event, so the highlight would keep pointing at whichever
    // card happened to sit nearest the middle of the *other* layout. Rotating a
    // phone does the same thing.
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)

    measure()
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('scrollend', measure)
      observer.disconnect()
      clearTimeout(settle)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [theme])

  const scrollToCard = useCallback((index) => {
    const scroller = scrollerRef.current
    const el = cardRefs.current[index]
    if (!scroller || !el) return

    // Light the chip now rather than inferring it from scroll events. Tapping a
    // chip is an unambiguous statement of which list you want; waiting for the
    // scroll to report back is what left the wrong chip lit.
    setActiveCard(index)

    // Centre the card, clamped to what the container can actually reach. The
    // first and last cards can't be centred — asking for an out-of-range offset
    // makes the browser clamp it, which otherwise reads as "the scroll failed".
    const centred =
      el.offsetLeft - scroller.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2
    const max = scroller.scrollWidth - scroller.clientWidth
    const left = Math.max(0, Math.min(max, centred))
    const from = scroller.scrollLeft
    scroller.scrollTo({ left, behavior: 'smooth' })

    // Some engines ignore programmatic smooth scrolling on a mandatory-snap
    // container and silently do nothing. If two frames later it hasn't budged
    // at all, jump instead — a carousel that doesn't move is worse than one
    // that moves without easing.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scroller.scrollLeft === from && Math.abs(left - from) > 2) {
          scroller.scrollLeft = left
        }
      })
    })
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

  const noun = theme.noun ?? 'person'

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col lg:max-w-[1140px]">
      <header className="px-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 min-h-11 px-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          ← All elections
        </button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{theme.name}</h1>
      </header>

      {/* Chip row: proves every party exists, and jumps to one. Pointless once
          every card is on screen at the same time. */}
      <nav
        aria-label="Jump to a party"
        className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
      >
        {printedLists.map((list, i) => {
          const isActive = i === activeCard
          const holdsSelection = selection?.listId === list.id
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => scrollToCard(i)}
              aria-label={`Go to the ${partyName(list)}${holdsSelection ? ', holds your vote' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                isActive
                  ? 'border-transparent text-white'
                  : 'border-[var(--line)] bg-white text-[var(--ink-soft)]'
              }`}
              style={isActive ? { backgroundColor: list.color } : undefined}
            >
              <span aria-hidden="true">{list.emoji}</span>
              <span className="whitespace-nowrap">{partyName(list)}</span>
              {holdsSelection && (
                <span aria-hidden="true" className="text-xs">
                  ●
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* The entire instruction. It sits against the ballot rather than up in the
          header because the second sentence is the one idea the whole app exists to
          land, and it has to be readable at the moment of choosing — not recalled
          from a subtitle scrolled off the top. */}
      <p className="mt-3 px-4 text-[15px] leading-snug text-[var(--ink)]">
        Vote for one {noun}. Your vote also counts toward that {noun}&apos;s party.
      </p>

      {/* One radio group spanning every card: one mark for the whole ballot. */}
      <div
        ref={scrollerRef}
        role="radiogroup"
        aria-label={`Candidates in the ${theme.name} election`}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-3 lg:grid lg:grid-cols-2 lg:snap-none lg:gap-4 lg:overflow-x-visible xl:grid-cols-4"
      >
        {printedLists.map((list, listIndex) => (
          <section
            key={list.id}
            ref={(el) => {
              cardRefs.current[listIndex] = el
            }}
            /* 84vw leaves the next card visibly peeking, which is what tells a
               thumb there is more ballot to the right. Irrelevant once the grid
               takes over, where the card just fills its column. */
            className="w-[84vw] max-w-[380px] shrink-0 snap-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm lg:w-auto lg:max-w-none lg:shrink"
          >
            <h2
              className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-white"
              style={{ backgroundColor: list.color }}
            >
              <span aria-hidden="true">{list.emoji}</span>
              {partyName(list)}
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
                         party name in the label instead, or "Snape" arrives with
                         no idea which party it belongs to. */
                      aria-label={`${cand.name}, ${partyName(list)}`}
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

      <p className="px-4 pb-2 text-center text-xs text-[var(--ink-soft)] lg:hidden">
        Swipe to see the other parties
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
