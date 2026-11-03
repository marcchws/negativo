// The demo runs on a fixed evening so "today", "in 3 h 10 min" and the 12-hour windows read the same on every load.
// The clock starts at Tue 3 Nov 2026, 17:20 in Rio and then moves with real time, so countdowns tick.
export const TIME_ZONE = 'America/Sao_Paulo'
export const DEMO_START = Date.parse('2026-11-03T17:20:00-03:00')
export const TODAY = 3

const loadedAt = Date.now()
let offset = 0

export const now = () => DEMO_START + (Date.now() - loadedAt) + offset

/** Moves the demo clock; only the presets use it, to open a state some minutes into a countdown. */
export const shiftClock = (ms: number) => {
  offset += ms
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Epoch ms of a session start: a November 2026 day and an "HH:MM" in Rio (UTC−3, no daylight saving since 2019). */
export const at = (day: number, hhmm: string) => Date.parse(`2026-11-${pad(day)}T${hhmm}:00-03:00`)

const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false })
export const clockTime = (ms: number) => hm.format(ms)

const dayNum = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric' })
/** The November day an instant falls on in Rio. */
export const dayOf = (ms: number) => Number(dayNum.format(ms))

/** "Thu 07:00", or "07:00" when it is today. */
export const whenShort = (ms: number) => (dayOf(ms) === TODAY ? clockTime(ms) : `${shortDay(dayOf(ms))} ${clockTime(ms)}`)

export const WEEK = [
  { day: 2, name: 'Monday' },
  { day: 3, name: 'Tuesday' },
  { day: 4, name: 'Wednesday' },
  { day: 5, name: 'Thursday' },
  { day: 6, name: 'Friday' },
  { day: 7, name: 'Saturday' },
  { day: 8, name: 'Sunday' },
] as const

export const weekday = (day: number) => WEEK.find(w => w.day === day)?.name ?? 'Monday'
export const shortDay = (day: number) => weekday(day).slice(0, 3)
export const dayLabel = (day: number) => (day === TODAY ? 'Today' : `${shortDay(day)} ${day} Nov`)

/** "3 h 10 min", "45 min" */
export const inWords = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

/** "09:41" from seconds left */
export const mmss = (sec: number) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`
