// Negativo's own icon set: a 20-unit grid, 1.7 stroke, round caps and joins, one colour (currentColor).
const PATHS = {
  schedule: <><rect x="3.5" y="4.5" width="13" height="12" rx="2" /><path d="M3.5 8.5h13M7 3v3M13 3v3M7 12h2" /></>,
  bookings: <><path d="M8 6h8.5M8 10h8.5M8 14h8.5" /><path d="M3.5 6l1 1 1.8-2M3.5 10l1 1 1.8-2M3.5 14l1 1 1.8-2" /></>,
  passes: <><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h10a1.5 1.5 0 0 1 1.5 1.5V8a2 2 0 0 0 0 4v1.5A1.5 1.5 0 0 1 15 15H5a1.5 1.5 0 0 1-1.5-1.5V12a2 2 0 0 0 0-4z" /><path d="M12 5.5v9" strokeDasharray="1.5 1.8" /></>,
  account: <><circle cx="10" cy="7" r="3" /><path d="M4 16.5c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" /></>,
  boulder: <><path d="M3 16.5h14M4.5 16.5V9l5-4.5 6 3.5v8.5" /><circle cx="8" cy="10" r="1" /><circle cx="12" cy="9.5" r="1" /></>,
  ropes: <><path d="M5 17V3h10v14M10 3v9" /><circle cx="10" cy="13.5" r="1.6" /></>,
  lesson: <><circle cx="6.5" cy="6" r="2" /><path d="M3 15.5c.4-2.4 1.8-4 3.5-4s3.1 1.6 3.5 4M12 5.5h5M12 9h5M12 12.5h3" /></>,
  hold: <><path d="M4.5 11c-1.2-4 2.4-7.2 6.3-6.4 3.6.7 5.5 4 4.3 7.3-1.1 3.2-4.8 4.6-7.7 3.4-1.6-.7-2.5-2.2-2.9-4.3z" /><circle cx="10" cy="10" r="1.4" /></>,
  lock: <><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></>,
  check: <path d="M4.5 10.5l3.5 3.5 7.5-8" />,
  clock: <><circle cx="10" cy="10" r="6.5" /><path d="M10 6.5V10l2.5 1.5" /></>,
  queue: <><circle cx="5" cy="10" r="1.8" /><circle cx="10" cy="10" r="1.8" /><circle cx="15" cy="10" r="1.8" /><path d="M3 15h14" /></>,
  pix: <path d="M10 3.2l3 3-3 3-3-3zM10 10.8l3 3-3 3-3-3zM3.2 10l3-3 3 3-3 3zM10.8 10l3-3 3 3-3 3z" />,
  card: <><rect x="3" y="5" width="14" height="10" rx="1.6" /><path d="M3 8.5h14M6 12.5h3" /></>,
  credit: <><circle cx="10" cy="10" r="6.5" /><path d="M10 6.5v7M7 10h6" /></>,
  coupon: <><path d="M3.5 10.2V4.5a1 1 0 0 1 1-1h5.7l6.3 6.3a1 1 0 0 1 0 1.4l-5.3 5.3a1 1 0 0 1-1.4 0z" /><circle cx="7" cy="7" r="1.2" /></>,
  shoe: <path d="M3 13.5V8.5l3-1 2 2.5 4.5 1 3.5 1.5a1.5 1.5 0 0 1 1 1.4v.6H3zM3 16h14" />,
  harness: <><path d="M5 4.5c0 4 2 6 5 6s5-2 5-6M6.5 9.5L5 16M13.5 9.5L15 16M8 12.5h4" /><circle cx="10" cy="14.5" r="1.4" /></>,
  waiver: <><path d="M5.5 3.5h6l3 3v10h-9z" /><path d="M11.5 3.5v3h3M7.5 13.5c1-1.4 1.6-1.4 2 0s1 1.4 2.5-.5" /></>,
  belay: <><path d="M10 2.5v4" /><circle cx="10" cy="9" r="2.6" /><circle cx="10" cy="14" r="2.6" /><path d="M10 16.6v1" /></>,
  copy: <><rect x="7" y="7" width="9" height="9" rx="1.5" /><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" /></>,
  qr: <><rect x="3.5" y="3.5" width="5" height="5" rx="1" /><rect x="11.5" y="3.5" width="5" height="5" rx="1" /><rect x="3.5" y="11.5" width="5" height="5" rx="1" /><path d="M11.5 11.5h2v2M16.5 11.5v5h-5M14 14.5v2" /></>,
  back: <path d="M12 4.5L6.5 10l5.5 5.5" />,
  chevron: <path d="M8 4.5l5.5 5.5L8 15.5" />,
  close: <path d="M5 5l10 10M15 5L5 15" />,
  info: <><circle cx="10" cy="10" r="6.5" /><path d="M10 9.2v4M10 6.6v.1" /></>,
  alert: <><path d="M10 3.2l7.3 13H2.7z" /><path d="M10 8.5v3.2M10 14v.1" /></>,
  bell: <path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5H4zM8.5 17h3" />,
  filter: <path d="M3.5 5.5h13M6 10h8M8.5 14.5h3" />,
  refund: <><path d="M4.5 9A5.5 5.5 0 1 1 6 14.2" /><path d="M4.5 5v4h4" /></>,
  pin: <><path d="M10 17s5.5-5 5.5-9.2a5.5 5.5 0 0 0-11 0C4.5 12 10 17 10 17z" /><circle cx="10" cy="7.8" r="2" /></>,
  share: <path d="M10 3v10M6.5 6.5L10 3l3.5 3.5M4.5 11v4.5h11V11" />,
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  minus: <path d="M4.5 10h11" />,
  spark: <path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.2 5.2l2.3 2.3M12.5 12.5l2.3 2.3M5.2 14.8l2.3-2.3M12.5 7.5l2.3-2.3" />,
} as const

export type IconName = keyof typeof PATHS

// The same glyphs as CSS masks, for short labels inside cards: drawn by a ::before, the icon adds no box
// beside the words, so the label stays one text run.
const MASKS = {
  bell: '<path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5H4zM8.5 17h3"/>',
  check: '<path d="M4.5 10.5l3.5 3.5 7.5-8"/>',
  clock: '<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/>',
  credit: '<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5v7M7 10h6"/>',
} as const

export type MaskName = keyof typeof MASKS

/** Style for an element with the `with-icon` class: sets the icon its ::before draws. */
export const maskIcon = (name: MaskName) => ({
  ['--icon' as string]: `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='black' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'>${MASKS[name]}</svg>`,
  )}")`,
})

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`ic ${className}`}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}
