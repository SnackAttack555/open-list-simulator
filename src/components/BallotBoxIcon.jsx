import { motion, useReducedMotion } from 'motion/react'

/**
 * A folded ballot dropping into a slotted box. Original artwork — no external asset.
 *
 * `dropping` runs the ballot down through the slot. The point of the button is
 * that casting a vote is a physical act, so the icon performs it rather than
 * just labelling it.
 */
export default function BallotBoxIcon({ dropping = false, className = '' }) {
  const reduced = useReducedMotion()

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Clip so the ballot disappears into the box rather than through it. */}
      <defs>
        <clipPath id="ballot-above-slot">
          <rect x="0" y="0" width="24" height="13.2" />
        </clipPath>
      </defs>

      <g clipPath="url(#ballot-above-slot)">
        <motion.g
          initial={false}
          animate={dropping && !reduced ? { y: 9, opacity: 0.25 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.6, 1] }}
        >
          {/* the ballot, with a mark already on it */}
          <rect x="7" y="1.6" width="10" height="10" rx="1.2" />
          <path d="M9.6 6.6l1.9 1.9L15 4.9" />
        </motion.g>
      </g>

      {/* the box */}
      <path d="M3.2 13.2h17.6v6.6a1.4 1.4 0 0 1-1.4 1.4H4.6a1.4 1.4 0 0 1-1.4-1.4z" />
      {/* the slot */}
      <path d="M8.4 13.2h7.2" strokeWidth="2.4" />
    </svg>
  )
}
