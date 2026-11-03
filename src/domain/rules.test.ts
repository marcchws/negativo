import { describe, expect, it } from 'vitest'
import { cancelOutcome, cancelWindow } from './cancel'
import { cardFailure, cardOutcome, validateCard } from './cards'
import { at, DEMO_START } from './clock'
import { ordinal } from './format'
import { canPayWithCredits, passById, totals, validateCoupon } from './pricing'
import { sessionOn, sessionTemplate } from './sessions'
import { offerExpiry, offerState, secondsLeft, waitlistOpen } from './waitlist'

const s = (id: string) => {
  const t = sessionTemplate(id)
  if (!t) throw new Error(id)
  return t
}

describe('the 12-hour window', () => {
  it('is closed for tonight at 17:20', () => {
    expect(cancelWindow(3, '20:30', DEMO_START).free).toBe(false)
  })
  it('stays open for Thursday 19:00 until Thursday 07:00', () => {
    const w = cancelWindow(5, '19:00', DEMO_START)
    expect(w.free).toBe(true)
    expect(w.deadline).toBe(at(5, '07:00'))
    expect(cancelWindow(5, '19:00', at(5, '07:00')).free).toBe(false)
    expect(cancelWindow(5, '19:00', at(5, '06:59')).free).toBe(true)
  })
  it('gives the credit back or refunds when free, and passes the spot on when late', () => {
    expect(cancelOutcome({ credits: 2, amount: 0 }, true)).toEqual({ kind: 'credit-back', credits: 2 })
    expect(cancelOutcome({ credits: 0, amount: 85 }, true)).toEqual({ kind: 'refund', amount: 85 })
    expect(cancelOutcome({ credits: 1, amount: 0 }, false).kind).toBe('passed-on')
  })
})

describe('credit costs', () => {
  it('charges 2 for a ropes class, 1 for open climb and classes, nothing for the belay check', () => {
    expect(s('lt-1900').credits).toBe(2)
    expect(s('ob-1800').credits).toBe(1)
    expect(s('ml-1930').credits).toBe(1)
    expect(s('bc-2100').credits).toBe(0)
    expect(s('ib-1830').credits).toBeNull()
  })
  it('refuses credits when the balance is short', () => {
    expect(canPayWithCredits(s('lt-1900'), 1)).toBe(false)
    expect(canPayWithCredits(s('lt-1900'), 2)).toBe(true)
    expect(canPayWithCredits(s('ib-1830'), 10)).toBe(false)
  })
  it('adds gear in cash and takes the coupon off the cash part', () => {
    const t = totals({
      item: { kind: 'session', session: s('ib-1830'), day: 3 },
      method: 'pix', gear: { shoes: true, harness: true }, shoeSize: 41,
      coupon: { code: 'FIRSTWALL', off: 20 }, firstVisit: true,
    })
    // The harness is not offered on the boulder wall, so only the shoes are added.
    expect(t.lines.map(l => l.amount)).toEqual([90, 15])
    expect(t.total).toBe(85)
  })
  it('books with credits and leaves only the gear to pay', () => {
    const t = totals({
      item: { kind: 'session', session: s('lt-1900'), day: 5 },
      method: 'credits', gear: { shoes: false, harness: true }, shoeSize: 41, coupon: null, firstVisit: false,
    })
    expect(t.credits).toBe(2)
    expect(t.total).toBe(10)
  })
  it('prices a pass at its own price', () => {
    const pass = passById('ten')
    if (!pass) throw new Error('ten')
    const t = totals({ item: { kind: 'pass', pass }, method: 'pix', gear: { shoes: false, harness: false }, shoeSize: 41, coupon: null, firstVisit: false })
    expect(t.total).toBe(560)
  })
})

describe('coupons', () => {
  it('takes FIRSTWALL on a first visit only', () => {
    expect(validateCoupon('firstwall', { firstVisit: true })).toEqual({ ok: true, code: 'FIRSTWALL', off: 20 })
    expect(validateCoupon('FIRSTWALL', { firstVisit: false })).toEqual({ ok: false, message: 'FIRSTWALL is for a first visit only.' })
  })
  it('says what to do for expired, unknown and empty codes', () => {
    expect(validateCoupon('EXPIRED10', { firstVisit: true })).toEqual({ ok: false, message: 'This code expired on 31 Oct.' })
    expect(validateCoupon('CLIMB', { firstVisit: true })).toMatchObject({ ok: false, message: expect.stringContaining('spelling') })
    expect(validateCoupon('  ', { firstVisit: true })).toEqual({ ok: false, message: 'Enter a code.' })
  })
})

describe('demo cards', () => {
  it('maps the last four digits to the bank outcome', () => {
    expect(cardOutcome('4242')).toBe('approved')
    expect(cardOutcome('9995')).toBe('requires-3ds')
    expect(cardOutcome('0002')).toBe('declined')
    expect(cardOutcome('1111')).toBe('expired')
    expect(cardFailure('0002', 'declined')?.title).toBe('Card declined')
    expect(cardFailure('4242', 'approved')).toBeNull()
  })
  it('validates a new card inline and refuses dates before November 2026', () => {
    expect(validateCard({ number: '4242 4242 4242 4242', expiry: '11/26', cvc: '123' })).toEqual({})
    expect(validateCard({ number: '4242', expiry: '10/26', cvc: '1' })).toEqual({
      number: 'Enter the 16 digits on the card.', expiry: 'This card has expired.', cvc: '3 or 4 digits.',
    })
    expect(validateCard({ number: '4242424242424242', expiry: '13/27', cvc: '123' }).expiry).toBe('Use MM/YY.')
  })
})

describe('waitlist offers and Pix codes', () => {
  it('gives 30 minutes to confirm and counts down in whole minutes', () => {
    const exp = offerExpiry(at(3, '17:14'))
    expect(exp).toBe(at(3, '17:44'))
    expect(offerState(exp, DEMO_START)).toEqual({ expired: false, minutesLeft: 24 })
    expect(offerState(exp, at(3, '17:44')).expired).toBe(true)
  })
  it('closes the list an hour before the start', () => {
    expect(waitlistOpen(3, '19:30', DEMO_START)).toBe(true)
    expect(waitlistOpen(3, '18:00', DEMO_START)).toBe(false)
  })
  it('never counts below zero', () => {
    expect(secondsLeft(DEMO_START + 74_000, DEMO_START)).toBe(74)
    expect(secondsLeft(DEMO_START, DEMO_START + 5000)).toBe(0)
  })
})

describe('schedule data', () => {
  it('has tonight as the desk sees it and nothing on past days', () => {
    expect(sessionOn('ml-1930', 3)).toMatchObject({ taken: 12, capacity: 12, waiting: 3 })
    expect(sessionOn('ib-1830', 3)).toMatchObject({ taken: 9, capacity: 10 })
    expect(sessionOn('ob-1800', 2)).toBeUndefined()
  })
  it('writes places in line as ordinals', () => {
    expect([1, 2, 3, 4, 11, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '22nd'])
  })
})
