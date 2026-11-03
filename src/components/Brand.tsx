import type { ReactNode } from 'react'
import { LEVELS, type Level } from '../domain/sessions'

/** The symbol: the wall's profile rising, then leaning out past vertical, with one rose hold under the overhang. */
export function Symbol({ size = 32, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill={dark ? '#0C2D24' : '#F7F4EF'} />
      <path d="M12 31V18.5l16-8.5" fill="none" stroke={dark ? '#F7F4EF' : '#0C2D24'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.3 19.6c-.6-1.9 1-3.4 2.8-3.1 1.7.3 2.6 1.9 2 3.4-.5 1.5-2.3 2.1-3.6 1.6-.7-.3-1.1-1-1.2-1.9z" fill="#D9774F" />
    </svg>
  )
}

const HOLD = 'M-5.5 1C-6.8-3.6-2.6-7.2 1.9-6.4c4.1.8 6.3 4.6 4.9 8.4-1.3 3.7-5.5 5.3-8.8 3.9C-3.8 5.1-4.9 3.4-5.5 1z'

/** Level as holds, never colour alone: one, two or three filled out of three. */
export function LevelHolds({ level }: { level: Level }) {
  return (
    <span className="lvl" role="img" aria-label={LEVELS[level]}>
      {[1, 2, 3].map(i => (
        <svg key={i} width="12" height="12" viewBox="-7 -7 14 14" aria-hidden="true">
          <path d={HOLD} fill={level && i <= level ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ))}
    </span>
  )
}

// ---------- "Wall" scenes ----------
// Only for moments a photo cannot show. Each is the symbol's wall leaning out at the overhang's angle:
// forest holds are the climber's route, one rose element marks the moment.

const F = 'var(--color-forest-600)'
const R = 'var(--color-rose-500)'
const I = 'var(--color-stone-900)'
const PALE = 'var(--color-stone-300)'

const Hold = ({ x, y, s = 1, fill, r = 0 }: { x: number; y: number; s?: number; fill: string; r?: number }) => (
  <path transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d={HOLD} fill={fill} />
)

const BOLTS = [[38, 92], [62, 80], [50, 62], [80, 66], [96, 48], [112, 34], [118, 72], [72, 98], [104, 94]] as const

function Wall({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <svg className="scene" viewBox="0 0 160 124" role="img" aria-label={label}>
      <path d="M18 112V40L132 14v98z" fill="var(--color-stone-200)" />
      <path d="M18 40L132 14" stroke={PALE} strokeWidth="2" />
      <path d="M8 112h144" stroke={I} strokeWidth="2" strokeLinecap="round" />
      {BOLTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="var(--color-stone-500)" />)}
      {children}
    </svg>
  )
}

export type SceneName = 'topped' | 'blank' | 'queue' | 'fallen' | 'rope' | 'signed' | 'chalk'

export function Scene({ name }: { name: SceneName }) {
  switch (name) {
    case 'topped':
      return (
        <Wall label="A route of holds up the wall to a rose top hold">
          <Hold x={40} y={94} s={1.1} fill={F} r={10} /><Hold x={60} y={78} fill={F} r={-20} /><Hold x={52} y={60} fill={F} r={30} />
          <Hold x={82} y={64} fill={F} /><Hold x={98} y={46} fill={F} r={-15} /><Hold x={114} y={30} s={1.3} fill={R} r={20} />
          <path d="M112 22l6-10 6 10" fill="none" stroke={I} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Wall>
      )
    case 'blank':
      return <Wall label="A bare wall with only bolt holes" />
    case 'queue':
      return (
        <Wall label="Holds up to an empty dashed slot, the next free spot">
          <Hold x={40} y={94} fill={F} /><Hold x={62} y={80} fill={F} />
          <path transform="translate(80 66)" d={HOLD} fill="none" stroke={R} strokeWidth="2" strokeDasharray="3 3" />
          <Hold x={96} y={48} fill={PALE} /><Hold x={112} y={34} fill={PALE} />
        </Wall>
      )
    case 'fallen':
      return (
        <Wall label="A hold fallen to the mat, the route broken">
          <Hold x={40} y={94} fill={F} /><Hold x={62} y={80} fill={F} /><Hold x={70} y={106} s={1.1} fill={R} r={140} />
          <path d="M80 66l6 6M86 66l-6 6" stroke={I} strokeWidth="2" strokeLinecap="round" />
          <Hold x={96} y={48} fill={PALE} />
        </Wall>
      )
    case 'rope':
      return (
        <Wall label="A rope tied in a figure-eight knot">
          <path d="M100 18v58" stroke={I} strokeWidth="2.2" />
          <circle cx="100" cy="80" r="4" fill="none" stroke={R} strokeWidth="2.4" />
          <circle cx="100" cy="88" r="4" fill="none" stroke={R} strokeWidth="2.4" />
          <path d="M100 92v20" stroke={I} strokeWidth="2.2" />
          <Hold x={44} y={92} fill={F} /><Hold x={58} y={66} fill={F} r={20} /><Hold x={78} y={52} fill={F} />
        </Wall>
      )
    case 'signed':
      return (
        <Wall label="A signed waiver clipped to the wall">
          <rect x="52" y="44" width="48" height="58" rx="4" fill="#fff" stroke={I} strokeWidth="2" />
          <path d="M60 58h32M60 66h24M60 74h28" stroke={PALE} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M60 90c4-6 6-6 8 0s4 6 10-2" fill="none" stroke={F} strokeWidth="2.4" strokeLinecap="round" />
          <Hold x={104} y={40} s={1.1} fill={R} r={20} />
        </Wall>
      )
    case 'chalk':
      return (
        <Wall label="An empty chalk bag at the foot of the wall">
          <path d="M62 70h36l-4 36H66z" fill="#fff" stroke={I} strokeWidth="2" strokeLinejoin="round" />
          <path d="M62 70c6-6 30-6 36 0" fill="none" stroke={I} strokeWidth="2" />
          <path d="M74 88h12" stroke={PALE} strokeWidth="2.4" strokeLinecap="round" />
          <Hold x={110} y={34} fill={R} />
        </Wall>
      )
  }
}
