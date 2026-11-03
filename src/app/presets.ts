import type { Payment } from '../api/types'
import { now } from '../domain/clock'
import { PIX_MINUTES } from '../domain/waitlist'
import { db, openOffer, seed } from '../mocks/db'
import { flow, type Flow } from '../store/flow'

/**
 * Deep links to every state of the flow: `/?state=card-3ds` seeds the mocked server and the checkout choices,
 * then opens the screen. They let a visitor (or a test) land on any state without clicking through.
 */
type Preset = { path: string; seed?: () => void; flow?: Partial<Flow> }

const first = () => seed('first')
const firstSigned = () => {
  seed('first')
  db.waiverSignedOn = '3 Nov 2026'
}
/** Caio's own Thursday booking would make Thursday's Lead Technique read "already in". */
const freeThursday = () => {
  db.bookings = db.bookings.filter(b => b.id !== 'bk-lt-1900')
  db.taken = {}
}
const payment = (p: Partial<Payment> & Pick<Payment, 'id' | 'method' | 'status'>) => {
  const item = { kind: 'session', sessionId: 'ib-1830', day: 3 } as const
  const gear = { shoes: true, harness: false }
  db.payments[p.id] = {
    amount: 85, expiresAt: now() + PIX_MINUTES * 60_000, triesLeft: 3, confirmation: null, item,
    payload: '00020126580014BR.GOV.BCB.PIX0136negativo-humaita-demo-not-a-real-key5204000053039865405885.005802BR5913NEGATIVO DEMO6014RIO DE JANEIRO',
    request: { item, method: p.method, card: p.method === 'card' ? '9995' : null, coupon: 'FIRSTWALL', gear, shoeSize: 41 },
    ...p,
  }
}
const firstCheckout: Partial<Flow> = { pay: 'pix', gear: { shoes: true, harness: false } }
const memberCard = (card: string): Partial<Flow> => ({ pay: 'card', card, gear: { shoes: false, harness: false } })
const intro = '/checkout?session=ib-1830&day=3'
const lead = '/checkout?session=lt-1900&day=5'

export const PRESETS: Record<string, Preset> = {
  // Schedule
  schedule: { path: '/' },
  'schedule-loading': { path: '/', seed: () => db.hang.add('schedule') },
  'schedule-error': { path: '/', seed: () => { db.demo.scheduleFails = true } },
  'schedule-past-day': { path: '/?day=2' },
  'schedule-thursday': { path: '/?day=5' },
  'schedule-first-visit': { path: '/', seed: first },
  'schedule-spot-offered': { path: '/', seed: openOffer },
  // Class detail
  detail: { path: '/sessions/lt-1900?day=3' },
  'detail-last-spot': { path: '/sessions/ib-1830?day=3', seed: first },
  'detail-full': { path: '/sessions/ml-1930?day=3' },
  'detail-on-waitlist': { path: '/sessions/ml-1930?day=3', seed: () => { db.waitlist = [{ id: 'wl-ml-1930', sessionId: 'ml-1930', day: 3, place: 4 }] } },
  'detail-belay-locked': { path: '/sessions/lt-1900?day=3', seed: first },
  'detail-booked': { path: '/sessions/or-2030?day=3' },
  // Sheets
  'waitlist-join': { path: '/sessions/ml-1930?day=3', flow: { sheet: { kind: 'waitlist', sessionId: 'ml-1930', day: 3 } } },
  'spot-offered': { path: '/', seed: openOffer, flow: { sheet: { kind: 'offer' } } },
  'cancel-free': { path: '/bookings', flow: { sheet: { kind: 'cancel', bookingId: 'bk-lt-1900' } } },
  'cancel-late': { path: '/bookings', flow: { sheet: { kind: 'cancel', bookingId: 'bk-or-2030' } } },
  'check-in': { path: '/', flow: { sheet: { kind: 'checkin', bookingId: 'bk-or-2030' } } },
  // First visit
  waiver: { path: '/sessions/ib-1830/waiver?day=3', seed: first, flow: firstCheckout },
  'waiver-error': { path: '/sessions/ib-1830/waiver?day=3', seed: first, flow: { ...firstCheckout, waiverName: 'Ana', waiverError: 'Type your full name, first and last.' } },
  'checkout-first-visit': { path: intro, seed: firstSigned, flow: { ...firstCheckout, couponInput: 'FIRSTWALL' } },
  'checkout-coupon': { path: intro, seed: firstSigned, flow: { ...firstCheckout, coupon: { code: 'FIRSTWALL', off: 20 } } },
  'coupon-invalid': { path: intro, seed: firstSigned, flow: { ...firstCheckout, sheet: { kind: 'coupon' }, couponInput: 'EXPIRED10', couponError: 'This code expired on 31 Oct.' } },
  // Checkout and pay
  'checkout-credits': { path: lead, seed: freeThursday, flow: { pay: 'credits' } },
  'checkout-no-credits': { path: lead, seed: () => { freeThursday(); db.credits = 1 }, flow: { pay: 'pix' } },
  processing: { path: lead, seed: () => { freeThursday(); db.hang.add('book') }, flow: { pay: 'credits' } },
  'pix-waiting': { path: '/pay/pix/px-demo', seed: () => { firstSigned(); payment({ id: 'px-demo', method: 'pix', status: 'waiting', expiresAt: now() + (PIX_MINUTES * 60 - 139) * 1000 }) }, flow: { ...firstCheckout, coupon: { code: 'FIRSTWALL', off: 20 } } },
  'pix-ending': { path: '/pay/pix/px-demo', seed: () => { firstSigned(); payment({ id: 'px-demo', method: 'pix', status: 'waiting', expiresAt: now() + 74_000 }) }, flow: firstCheckout },
  'pix-expired': { path: '/pay/pix/px-demo', seed: () => { firstSigned(); payment({ id: 'px-demo', method: 'pix', status: 'expired', expiresAt: now() - 1000 }) }, flow: firstCheckout },
  'card-picker': { path: intro, flow: { ...memberCard('4242'), sheet: { kind: 'card' } } },
  'card-declined': {
    path: intro,
    flow: { ...memberCard('0002'), sheet: { kind: 'declined' }, payError: { code: 'declined', title: 'Card declined', detail: 'Your bank declined the Mastercard ending 0002. Nothing was charged. Try Pix or another card.', inline: true } },
  },
  'card-expired': {
    path: intro,
    flow: { ...memberCard('1111'), payError: { code: 'expired', title: 'This card has expired', detail: 'The Visa ending 1111 expired in 10/26. Update it or choose another way to pay.', inline: true } },
  },
  'card-3ds': { path: intro, seed: () => payment({ id: 'cd-demo', method: 'card', status: 'requires-3ds', amount: 90 }), flow: { ...memberCard('9995'), sheet: { kind: '3ds', paymentId: 'cd-demo' } } },
  'card-3ds-wrong': {
    path: intro,
    seed: () => payment({ id: 'cd-demo', method: 'card', status: 'requires-3ds', amount: 90, triesLeft: 2 }),
    flow: { ...memberCard('9995'), sheet: { kind: '3ds', paymentId: 'cd-demo' }, otpError: { triesLeft: 2 } },
  },
  // After
  confirmed: { path: '/confirmed/bk-lt-1900', seed: () => { db.credits = 2 } },
  'confirmed-first-visit': {
    path: '/confirmed/bk-ib-1830',
    seed: () => {
      firstSigned()
      db.bookings.push({ id: 'bk-ib-1830', sessionId: 'ib-1830', day: 3, paid: { credits: 0, amount: 85, method: 'pix' }, gear: { shoes: true, harness: false }, shoeSize: 41, code: 'NGV-7K2M' })
      db.taken['ib-1830@3'] = 1
    },
  },
  bookings: { path: '/bookings' },
  'bookings-with-offer': { path: '/bookings', seed: openOffer },
  'bookings-past': { path: '/bookings/past' },
  'bookings-empty': { path: '/bookings', seed: first },
  // Passes and account
  passes: { path: '/passes' },
  'pass-checkout': { path: '/checkout?pass=ten', flow: { pay: 'pix', passSel: 'ten' } },
  'pass-active': { path: '/pass-active/ten', seed: () => { db.credits = 14; db.pass = { name: '10-pass', validUntil: '2 May 2027' } } },
  account: { path: '/account' },
  'account-first-visit': { path: '/account', seed: first },
  // Global
  'not-found': { path: '/this-wall-does-not-exist' },
  'error-page': { path: '/', seed: () => { crash.armed = true } },
}

/** Arms a render error once, so the error page can be opened like any other state. */
export const crash = { armed: false }

export function applyPreset(search: string) {
  const name = new URLSearchParams(search).get('state')
  const p = name ? PRESETS[name] : undefined
  if (!p) return
  p.seed?.()
  if (p.flow) flow.set(p.flow)
  window.history.replaceState(null, '', p.path)
}
