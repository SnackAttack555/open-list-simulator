/**
 * The mark for a won seat: a drawn check, one stroke, so it reads the same
 * inside an SVG picture and beside a name in a list. A ★ glyph was the old
 * mark; a check is what a ballot already taught the reader to look for.
 */
export function CheckPath({ size = 18, stroke = 2.4 }) {
  // Drawn in an 18×18 box and scaled, so the stroke stays proportional.
  const s = size / 18
  return (
    <path
      d={`M${5 * s} ${9.5 * s}l${3 * s} ${3 * s}l${6 * s} ${-7 * s}`}
      fill="none"
      stroke="#fff"
      strokeWidth={stroke * s}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/** A filled square badge with the check in it, for use in HTML. */
export default function SeatCheck({ color, size = 22, className = '' }) {
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <rect width={size} height={size} rx={size * 0.28} fill={color} />
      <g transform={`translate(${(size - size * 0.78) / 2} ${(size - size * 0.78) / 2})`}>
        <CheckPath size={size * 0.78} />
      </g>
    </svg>
  )
}
