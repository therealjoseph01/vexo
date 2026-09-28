// The VΞXO wordmark, as Vexo draws it (stroked, round caps). `draw` (0..1) animates the strokes on.
export function Wordmark({ className = '', title = 'Vexo', strokeWidth = 9 }) {
  return (
    <svg className={`wordmark ${className}`} viewBox="0 0 272 88" role="img" aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path pathLength="1" d="M10 14 L29 65 Q34 79 39 65 L58 14" />
        <path pathLength="1" d="M78 14 H126" />
        <path pathLength="1" d="M78 43 H126" />
        <path pathLength="1" d="M78 72 H126" />
        <path pathLength="1" d="M146 14 L194 72" />
        <path pathLength="1" d="M194 14 L146 72" />
        <ellipse pathLength="1" cx="237" cy="43" rx="23" ry="29" />
      </g>
    </svg>
  )
}
