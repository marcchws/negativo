/** The gym's limit, in climbers on the floor at once. */
export const CAPACITY = 120
export const OPEN_HOUR = 6
export const CLOSE_HOUR = 23

/** Percent of the limit for each hour 06:00–23:00. */
const TUESDAY = [8, 14, 18, 12, 10, 14, 22, 26, 20, 18, 24, 38, 52, 74, 86, 78, 54, 26]

export interface HourLoad {
  hour: number
  percent: number
  climbers: number
  kind: 'measured' | 'now' | 'forecast'
}

export function occupancy(day: number, nowHour: number, today: number): HourLoad[] {
  // Other days shift the curve a little so each reads differently, and stay the same on every load.
  const shift = day === today ? 0 : ((day * 5) % 7) - 3
  return TUESDAY.map((p, i) => {
    const hour = OPEN_HOUR + i
    const percent = Math.min(98, Math.max(4, p + shift * (i % 3)))
    const kind = day < today || (day === today && hour < nowHour) ? 'measured' : day === today && hour === nowHour ? 'now' : 'forecast'
    return { hour, percent, climbers: Math.round((percent * CAPACITY) / 100), kind }
  })
}

export const busyWord = (percent: number) => (percent >= 75 ? 'Busy' : percent >= 45 ? 'Moderate' : 'Quiet')
