import type { CancelOutcome } from '../domain/cancel'
import type { HourLoad } from '../domain/occupancy'
import type { Gear, PayMethod } from '../domain/pricing'
import type { SessionOnDay, SessionTemplate } from '../domain/sessions'

export type Persona = 'member' | 'first'

export interface Me {
  persona: Persona
  name: string
  initials: string
  since: string | null
  credits: number
  pass: { name: string; validUntil: string } | null
  waiverSignedOn: string | null
  belay: boolean
  /** The card picked by default; null when the climber has none yet. */
  defaultCard: string | null
  cards: string[]
}

/** How a session stands for the signed-in climber. */
export type SessionStatus = 'open' | 'last' | 'full' | 'booked' | 'waiting' | 'locked'

export interface SessionView extends SessionOnDay {
  status: SessionStatus
  place?: number
  bookingId?: string
}

export interface ScheduleResponse {
  day: number
  sessions: SessionView[]
}

export interface Booking {
  id: string
  sessionId: string
  day: number
  paid: { credits: number; amount: number; method: PayMethod | 'free' }
  gear: Gear
  shoeSize: number
  code: string
}

export interface BookingView extends Booking {
  session: SessionTemplate
  freeCancelUntil: number
  free: boolean
}

export interface PastBooking {
  id: string
  sessionId: string
  when: string
  outcome: 'Checked in' | 'Cancelled · credit back'
  session: SessionTemplate
}

export interface WaitlistView {
  id: string
  sessionId: string
  day: number
  place: number
  session: SessionTemplate
}

export interface OfferView {
  id: string
  sessionId: string
  day: number
  expiresAt: number
  credits: number
  session: SessionTemplate & { coachName?: string }
}

export interface BookingsResponse {
  upcoming: BookingView[]
  past: PastBooking[]
  waitlist: WaitlistView[]
  offer: OfferView | null
}

export type CheckoutItem = { kind: 'session'; sessionId: string; day: number } | { kind: 'pass'; passId: string }

export interface CheckoutRequest {
  item: CheckoutItem
  method: PayMethod
  card: string | null
  coupon: string | null
  gear: Gear
  shoeSize: number
}

export type Confirmation = { kind: 'booking'; bookingId: string } | { kind: 'pass'; passId: string }

export type CheckoutResponse =
  | { status: 'confirmed'; confirmation: Confirmation }
  | { status: 'pix'; paymentId: string }
  | { status: '3ds'; paymentId: string }

export interface PaymentFailure {
  code: 'declined' | 'expired' | 'not-verified'
  title: string
  detail: string
}

export interface Payment {
  id: string
  method: 'pix' | 'card'
  status: 'waiting' | 'paid' | 'expired' | 'requires-3ds' | 'failed'
  amount: number
  expiresAt: number
  payload: string
  triesLeft: number
  item: CheckoutItem
  confirmation: Confirmation | null
}

export interface CancelResponse {
  outcome: CancelOutcome
}

export interface OccupancyResponse {
  day: number
  hours: HourLoad[]
}

export type DemoScenario = 'member' | 'first' | 'nocredits' | 'offer' | 'slow' | 'error' | 'reset'

export interface DemoState {
  slow: boolean
  scheduleFails: boolean
}
