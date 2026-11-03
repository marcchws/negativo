import type { PaymentFailure } from '../api/types'
import type { CardForm, CardErrors } from '../domain/cards'
import type { Gear, PayMethod } from '../domain/pricing'
import { createStore } from './store'

export type Sheet =
  | { kind: 'waitlist'; sessionId: string; day: number }
  | { kind: 'offer' }
  | { kind: 'cancel'; bookingId: string }
  | { kind: 'coupon' }
  | { kind: 'card' }
  | { kind: '3ds'; paymentId: string }
  | { kind: 'declined' }
  | { kind: 'checkin'; bookingId: string }

/** The climber's choices on the way to paying, kept while they move between detail, waiver, checkout and Pix. */
export interface Flow {
  sheet: Sheet | null
  pay: PayMethod
  card: string | null
  coupon: { code: string; off: number } | null
  gear: Gear
  shoeSize: number
  payError: (PaymentFailure & { inline: boolean }) | null
  couponInput: string
  couponError: string | null
  otp: string
  otpError: { triesLeft: number } | null
  cardForm: CardForm
  cardErrors: CardErrors
  waiverName: string
  waiverAgreed: boolean
  waiverError: string | null
  passSel: string
}

export const flow = createStore<Flow>(() => ({
  sheet: null,
  pay: 'credits',
  card: null,
  coupon: null,
  gear: { shoes: false, harness: false },
  shoeSize: 41,
  payError: null,
  couponInput: '',
  couponError: null,
  otp: '',
  otpError: null,
  cardForm: { number: '', expiry: '', cvc: '' },
  cardErrors: {},
  waiverName: '',
  waiverAgreed: false,
  waiverError: null,
  passSel: 'ten',
}))

export const openSheet = (sheet: Sheet) => flow.set({ sheet })
export const closeSheet = () => flow.set({ sheet: null })
