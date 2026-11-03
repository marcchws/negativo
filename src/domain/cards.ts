/** The demo's saved cards. The last four digits decide what the mocked bank does. */
export const DEMO_CARDS = [
  { last4: '4242', brand: 'Visa', hint: 'Works' },
  { last4: '9995', brand: 'Visa', hint: 'Asks your bank to verify' },
  { last4: '0002', brand: 'Mastercard', hint: 'Your bank declines it' },
  { last4: '1111', brand: 'Visa', hint: 'Expired 10/26' },
] as const

export type CardOutcome = 'approved' | 'requires-3ds' | 'declined' | 'expired'

export const cardOutcome = (last4: string): CardOutcome =>
  last4 === '9995' ? 'requires-3ds' : last4 === '0002' ? 'declined' : last4 === '1111' ? 'expired' : 'approved'

export const cardBrand = (last4: string) => DEMO_CARDS.find(c => c.last4 === last4)?.brand ?? 'Visa'

export const cardFailure = (last4: string, outcome: CardOutcome) =>
  outcome === 'declined'
    ? { title: 'Card declined', detail: `Your bank declined the ${cardBrand(last4)} ending ${last4}. Nothing was charged. Try Pix or another card.` }
    : outcome === 'expired'
      ? { title: 'This card has expired', detail: `The ${cardBrand(last4)} ending ${last4} expired in 10/26. Update it or choose another way to pay.` }
      : null

/** The 3-D Secure mock: any six digits pass except 000000. */
export const OTP_FAIL = '000000'
export const OTP_TRIES = 3

export type CardForm = { number: string; expiry: string; cvc: string }
export type CardErrors = Partial<Record<keyof CardForm, string>>

/** Validates a new card against the demo month (November 2026); a card that ran out before it is refused. */
export function validateCard(f: CardForm, today = { month: 11, year: 26 }): CardErrors {
  const err: CardErrors = {}
  const digits = f.number.replace(/\D/g, '')
  if (digits.length < 15 || digits.length > 16) err.number = 'Enter the 16 digits on the card.'
  const m = /^(0[1-9]|1[0-2])\/(\d\d)$/.exec(f.expiry.trim())
  if (!m) err.expiry = 'Use MM/YY.'
  else {
    const month = Number(m[1])
    const year = Number(m[2])
    if (year < today.year || (year === today.year && month < today.month)) err.expiry = 'This card has expired.'
  }
  if (!/^\d{3,4}$/.test(f.cvc.trim())) err.cvc = '3 or 4 digits.'
  return err
}
