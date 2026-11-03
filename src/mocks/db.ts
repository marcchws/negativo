import type { Booking, DemoState, Me, Payment, Persona } from '../api/types'
import { at, TODAY } from '../domain/clock'
import { offerExpiry } from '../domain/waitlist'

/**
 * The demo's only "server": everything lives in this module's memory and resets on reload.
 * The MSW handlers read and write it; the state presets seed it before the first render.
 */
export interface Db {
  persona: Persona
  credits: number
  pass: Me['pass']
  waiverSignedOn: string | null
  belay: boolean
  defaultCard: string | null
  bookings: Booking[]
  waitlist: { id: string; sessionId: string; day: number; place: number }[]
  offer: { id: string; sessionId: string; day: number; expiresAt: number } | null
  /** Spots this demo took or freed, on top of the seeded counts, keyed "sessionId@day". */
  taken: Record<string, number>
  payments: Record<string, Payment & { request: unknown }>
  remindMe: number[]
  demo: DemoState
  /** Endpoints that never answer, so a preset can hold a loading or processing state. */
  hang: Set<string>
  seq: number
}

const CODES = ['NGV-9Q31', 'NGV-4H72', 'NGV-7K2M', 'NGV-3XPA', 'NGV-8D5R', 'NGV-6TJW', 'NGV-2BLC', 'NGV-5FNE']

function member(): Db {
  return {
    persona: 'member',
    credits: 4,
    pass: { name: '10-pass', validUntil: '31 Dec' },
    waiverSignedOn: '12 Mar 2025',
    belay: true,
    defaultCard: '4242',
    bookings: [
      { id: 'bk-or-2030', sessionId: 'or-2030', day: TODAY, paid: { credits: 1, amount: 0, method: 'credits' }, gear: { shoes: false, harness: false }, shoeSize: 41, code: 'NGV-9Q31' },
      { id: 'bk-lt-1900', sessionId: 'lt-1900', day: 5, paid: { credits: 2, amount: 0, method: 'credits' }, gear: { shoes: false, harness: false }, shoeSize: 41, code: 'NGV-4H72' },
    ],
    waitlist: [],
    offer: null,
    // Tonight's seeded counts already hold Caio's ropes spot; Thursday's do not.
    taken: { 'lt-1900@5': 1 },
    payments: {},
    remindMe: [],
    demo: { slow: false, scheduleFails: false },
    hang: new Set(),
    seq: 1,
  }
}

function firstVisit(): Db {
  return {
    ...member(),
    persona: 'first',
    credits: 0,
    pass: null,
    waiverSignedOn: null,
    belay: false,
    defaultCard: null,
    bookings: [],
    taken: {},
  }
}

export let db: Db = member()

export const seed = (persona: Persona) => {
  const keep = db.demo.slow
  db = persona === 'first' ? firstVisit() : member()
  db.demo.slow = keep
}

/** A spot opened in Movement Lab at 17:14; the climber has until 17:44. */
export const openOffer = () => {
  db.waitlist = [{ id: 'wl-ml-1930', sessionId: 'ml-1930', day: TODAY, place: 4 }]
  db.offer = { id: 'of-ml-1930', sessionId: 'ml-1930', day: TODAY, expiresAt: offerExpiry(at(TODAY, '17:14')) }
}

export const nextId = (prefix: string) => `${prefix}-${db.seq++}`
export const nextCode = () => CODES[db.seq % CODES.length] ?? 'NGV-0000'
