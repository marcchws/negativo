import { TODAY } from './clock'

export type PhotoKey =
  | 'hall' | 'lobby' | 'boulderA' | 'boulderB' | 'intro' | 'lead'
  | 'overhang' | 'harness' | 'belay' | 'holds'
export type CoachKey = 'marina' | 'rafa'
export type Kind = 'open' | 'lesson' | 'ropes'
export type Category = 'Class' | 'Open climb' | 'Ropes class' | 'Safety'
/** 0 all levels, 1 beginner, 2 intermediate, 3 advanced */
export type Level = 0 | 1 | 2 | 3

export interface Coach {
  name: string
  photo?: CoachKey
  bio: string
}

/** A session on the grid. `credits` is null when it can only be paid in cash (the intro class). */
export interface SessionTemplate {
  id: string
  start: string
  end: string
  duration: string
  kind: Kind
  category: Category
  name: string
  room: 'Boulder cave' | 'Ropes hall'
  coach?: Coach
  level: Level
  capacity: number
  credits: number | null
  cash: number
  photo: PhotoKey
  about: string
}

export interface SessionOnDay extends SessionTemplate {
  day: number
  taken: number
  waiting: number
}

export const LEVELS = ['All levels', 'Beginner', 'Intermediate', 'Advanced'] as const

const MARINA: Coach = { name: 'Marina Teixeira', photo: 'marina', bio: 'Bouldering coach · 6 years on the wall' }
const RAFA: Coach = { name: 'Rafa Souza', photo: 'rafa', bio: 'Ropes coach · 9 years on the wall' }
const JULIA: Coach = { name: 'Júlia Prates', bio: 'Bouldering coach · 6 years on the wall' }

export const SESSIONS: SessionTemplate[] = [
  { id: 'ob-1800', start: '18:00', end: '19:30', duration: '90 min', kind: 'open', category: 'Open climb', name: 'Boulder session', room: 'Boulder cave', level: 0, capacity: 40, credits: 1, cash: 70, photo: 'boulderA',
    about: 'Climb on your own in the Boulder cave. New problems are set every Sunday.' },
  { id: 'ib-1830', start: '18:30', end: '20:00', duration: '90 min', kind: 'lesson', category: 'Class', name: 'Intro to Bouldering', room: 'Boulder cave', coach: MARINA, level: 1, capacity: 10, credits: null, cash: 90, photo: 'intro',
    about: "Your first 90 minutes on the wall. Falling safely, reading a problem, using your feet. You'll finish on the overhang that names the gym." },
  { id: 'lt-1900', start: '19:00', end: '21:00', duration: '2 h', kind: 'ropes', category: 'Ropes class', name: 'Lead Technique', room: 'Ropes hall', coach: RAFA, level: 2, capacity: 8, credits: 2, cash: 140, photo: 'lead',
    about: 'Clipping, resting and falling on lead, on the 14-metre wall. Bring your belay partner or we pair you.' },
  { id: 'ml-1930', start: '19:30', end: '20:45', duration: '75 min', kind: 'lesson', category: 'Class', name: 'Movement Lab', room: 'Boulder cave', coach: JULIA, level: 3, capacity: 12, credits: 1, cash: 70, photo: 'overhang',
    about: "Drills for flagging, heel hooks and dynos on the cave's steepest problems." },
  { id: 'ob-2000', start: '20:00', end: '21:30', duration: '90 min', kind: 'open', category: 'Open climb', name: 'Boulder session', room: 'Boulder cave', level: 0, capacity: 40, credits: 1, cash: 70, photo: 'boulderB',
    about: 'Climb on your own in the Boulder cave. New problems are set every Sunday.' },
  { id: 'or-2030', start: '20:30', end: '22:00', duration: '90 min', kind: 'ropes', category: 'Open climb', name: 'Ropes session', room: 'Ropes hall', level: 0, capacity: 24, credits: 1, cash: 70, photo: 'harness',
    about: 'Top rope and lead on the Ropes hall with your partner. Auto-belays on two lines.' },
  { id: 'bc-2100', start: '21:00', end: '21:45', duration: '45 min', kind: 'ropes', category: 'Safety', name: 'Belay check', room: 'Ropes hall', coach: RAFA, level: 0, capacity: 4, credits: 0, cash: 0, photo: 'belay',
    about: 'A coach watches you tie in, belay and lower. Pass once and every rope session opens to you.' },
]

/** Tonight's counts, as the gym's desk would see them at 17:20. */
const TONIGHT: Record<string, [taken: number, waiting: number]> = {
  'ob-1800': [31, 0], 'ib-1830': [9, 0], 'lt-1900': [5, 0], 'ml-1930': [12, 3],
  'ob-2000': [22, 0], 'or-2030': [12, 0], 'bc-2100': [2, 0],
}

export const sessionTemplate = (id: string) => SESSIONS.find(s => s.id === id)

export const SETTING_DAY = 8

/**
 * The grid repeats every day. Today has hand-set counts; later days get seeded counts so they differ
 * but stay the same on every load. Days before today are past and have nothing to book.
 */
export function sessionsOn(day: number): SessionOnDay[] {
  if (day < TODAY) return []
  // Sunday is setting day: the walls are open, the coaches are setting, so there are no classes.
  const grid = day === SETTING_DAY ? SESSIONS.filter(s => s.category === 'Open climb') : SESSIONS
  return grid.map((s, i) => {
    if (day === TODAY) {
      const [taken, waiting] = TONIGHT[s.id] ?? [0, 0]
      return { ...s, day, taken, waiting }
    }
    const taken = Math.max(1, Math.round((s.capacity * ((day * 7 + i * 13) % 11)) / 11))
    return { ...s, day, taken: Math.min(taken, s.capacity), waiting: taken >= s.capacity ? 1 : 0 }
  })
}

export const sessionOn = (id: string, day: number) => sessionsOn(day).find(s => s.id === id)

/** Rope sessions need a belay check first; the belay check itself is how you get one. */
export const needsBelay = (s: Pick<SessionTemplate, 'kind' | 'category'>) => s.kind === 'ropes' && s.category !== 'Safety'

export type Filter = 'all' | 'class' | 'open' | 'ropes'
export const matchesFilter = (s: SessionTemplate, f: Filter) =>
  f === 'all' ||
  (f === 'class' && s.category === 'Class') ||
  (f === 'open' && s.category === 'Open climb') ||
  (f === 'ropes' && s.kind === 'ropes')

export const categoryTone = (c: Category) => (c === 'Class' ? 'class' : c === 'Open climb' ? 'open' : 'ropes')
