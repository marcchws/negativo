import { delay, http, HttpResponse } from 'msw'
import type {
  Booking, BookingsResponse, CheckoutRequest, CheckoutResponse, Confirmation, DemoScenario, Me, OccupancyResponse,
  Payment, PaymentFailure, ScheduleResponse, SessionStatus, SessionView,
} from '../api/types'
import { cancelOutcome, cancelWindow } from '../domain/cancel'
import { cardFailure, cardOutcome, OTP_FAIL, OTP_TRIES } from '../domain/cards'
import { at, now, TODAY } from '../domain/clock'
import { occupancy } from '../domain/occupancy'
import { canPayWithCredits, passById, PASSES, totals, validateCoupon } from '../domain/pricing'
import { needsBelay, type SessionOnDay, sessionOn, sessionsOn, sessionTemplate } from '../domain/sessions'
import { PIX_MINUTES } from '../domain/waitlist'
import { db, nextCode, nextId, openOffer, seed } from './db'

// ---------- latency ----------

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** 150–400 ms per call, about 900 ms for payments; the Slow network scenario triples both. */
async function latency(key: string, kind: 'read' | 'pay' = 'read') {
  if (db.hang.has(key)) await delay('infinite')
  const ms = kind === 'pay' ? rand(820, 980) : rand(150, 400)
  await delay(db.demo.slow ? ms * 3 : ms)
}

const fail = (status: number, body: object) => HttpResponse.json(body, { status })

// ---------- views ----------

const key = (id: string, day: number) => `${id}@${day}`

function withDemo(s: SessionOnDay): SessionOnDay {
  const taken = Math.min(s.capacity, s.taken + (db.taken[key(s.id, s.day)] ?? 0))
  return { ...s, taken }
}

function statusOf(s: SessionOnDay): Pick<SessionView, 'status' | 'place' | 'bookingId'> {
  const booking = db.bookings.find(b => b.sessionId === s.id && b.day === s.day)
  if (booking) return { status: 'booked', bookingId: booking.id }
  const wl = db.waitlist.find(w => w.sessionId === s.id && w.day === s.day)
  if (wl) return { status: 'waiting', place: wl.place }
  let status: SessionStatus = 'open'
  if (s.taken >= s.capacity) status = 'full'
  else if (needsBelay(s) && !db.belay) status = 'locked'
  else if (s.capacity - s.taken === 1) status = 'last'
  return { status }
}

const view = (s: SessionOnDay): SessionView => {
  const live = withDemo(s)
  return { ...live, ...statusOf(live) }
}

function me(): Me {
  const first = db.persona === 'first'
  return {
    persona: db.persona,
    name: first ? 'Ana Lima' : 'Caio Ventura',
    initials: first ? 'AL' : 'CV',
    since: first ? null : 'March 2025',
    credits: db.credits,
    pass: db.pass,
    waiverSignedOn: db.waiverSignedOn,
    belay: db.belay,
    defaultCard: db.defaultCard,
    cards: ['4242', '9995', '0002', '1111'],
  }
}

function bookings(): BookingsResponse {
  const t = now()
  const upcoming = db.bookings
    .map(b => {
      const session = sessionTemplate(b.sessionId)
      if (!session) return null
      const w = cancelWindow(b.day, session.start, t)
      return { ...b, session, freeCancelUntil: w.deadline, free: w.free }
    })
    .filter(b => b !== null)
    .sort((a, b) => at(a.day, a.session.start) - at(b.day, b.session.start))
  const past: BookingsResponse['past'] =
    db.persona === 'member'
      ? ([
          ['pa-1', 'ob-1800', 'Sat 31 Oct · 10:00', 'Checked in'],
          ['pa-2', 'ib-1830', 'Tue 27 Oct · 18:30', 'Checked in'],
          ['pa-3', 'lt-1900', 'Thu 22 Oct · 19:00', 'Cancelled · credit back'],
        ] as const).flatMap(([id, sessionId, when, outcome]) => {
          const session = sessionTemplate(sessionId)
          return session ? [{ id, sessionId, when, outcome, session }] : []
        })
      : []
  const waitlist = db.waitlist.flatMap(w => {
    const session = sessionTemplate(w.sessionId)
    return session ? [{ ...w, session }] : []
  })
  const o = db.offer
  const os = o && sessionTemplate(o.sessionId)
  const offer = o && os ? { ...o, credits: os.credits ?? 1, session: { ...os, coachName: os.coach?.name } } : null
  return { upcoming, past, waitlist, offer }
}

// ---------- fulfilment ----------

function book(sessionId: string, day: number, paid: Booking['paid'], req?: Pick<CheckoutRequest, 'gear' | 'shoeSize'>): Confirmation {
  const id = nextId('bk')
  db.bookings.push({ id, sessionId, day, paid, gear: req?.gear ?? { shoes: false, harness: false }, shoeSize: req?.shoeSize ?? 41, code: nextCode() })
  db.credits -= paid.credits
  db.taken[key(sessionId, day)] = (db.taken[key(sessionId, day)] ?? 0) + 1
  db.waitlist = db.waitlist.filter(w => !(w.sessionId === sessionId && w.day === day))
  if (db.offer?.sessionId === sessionId) db.offer = null
  return { kind: 'booking', bookingId: id }
}

function fulfil(req: CheckoutRequest, amount: number, credits: number): Confirmation {
  if (req.item.kind === 'pass') {
    const pass = passById(req.item.passId)
    if (pass?.id === 'ten') { db.credits += 10; db.pass = { name: '10-pass', validUntil: '2 May 2027' } }
    if (pass?.id === 'single') { db.credits += 1; db.pass = db.pass ?? { name: 'Single entry', validUntil: '3 Dec' } }
    if (pass?.id === 'month') db.pass = { name: 'Monthly unlimited', validUntil: '3 Dec' }
    return { kind: 'pass', passId: req.item.passId }
  }
  const method = credits ? 'credits' : amount ? req.method : 'free'
  return book(req.item.sessionId, req.item.day, { credits, amount, method }, req)
}

function priced(req: CheckoutRequest) {
  const firstVisit = db.persona === 'first'
  let item: Parameters<typeof totals>[0]['item'] | null = null
  if (req.item.kind === 'pass') {
    const pass = passById(req.item.passId)
    if (pass) item = { kind: 'pass', pass }
  } else {
    const s = sessionOn(req.item.sessionId, req.item.day)
    if (s) item = { kind: 'session', session: s, day: req.item.day }
  }
  if (!item) return null
  const coupon = req.coupon ? validateCoupon(req.coupon, { firstVisit }) : null
  const t = totals({ item, method: req.method, gear: req.gear, shoeSize: req.shoeSize, coupon: coupon?.ok ? coupon : null, firstVisit })
  return { item, t }
}

const pixPayload = (amount: number) =>
  `00020126580014BR.GOV.BCB.PIX0136negativo-humaita-demo-not-a-real-key520400005303986540${String(amount.toFixed(2)).length}${amount.toFixed(2)}5802BR5913NEGATIVO DEMO6014RIO DE JANEIRO`

function readPayment(id: string) {
  const p = db.payments[id]
  if (p && p.status === 'waiting' && p.method === 'pix' && now() >= p.expiresAt) p.status = 'expired'
  return p
}

const publicPayment = ({ request: _r, ...p }: Payment & { request: unknown }): Payment => p

// ---------- handlers ----------

export const handlers = [
  http.get('/api/me', async () => {
    await latency('me')
    return HttpResponse.json(me())
  }),

  http.get('/api/schedule', async ({ request }) => {
    await latency('schedule')
    // The outage lasts one call, so "Try again" recovers the way a real blip would.
    if (db.demo.scheduleFails) {
      db.demo.scheduleFails = false
      return fail(503, { message: 'Schedule unavailable' })
    }
    const day = Number(new URL(request.url).searchParams.get('day') ?? TODAY)
    const body: ScheduleResponse = { day, sessions: sessionsOn(day).map(view) }
    return HttpResponse.json(body)
  }),

  http.get('/api/occupancy', async ({ request }) => {
    await latency('occupancy')
    const day = Number(new URL(request.url).searchParams.get('day') ?? TODAY)
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(now()))
    const body: OccupancyResponse = { day, hours: occupancy(day, hour, TODAY) }
    return HttpResponse.json(body)
  }),

  http.get('/api/sessions/:id', async ({ params, request }) => {
    await latency('session')
    const day = Number(new URL(request.url).searchParams.get('day') ?? TODAY)
    const s = sessionOn(String(params.id), day)
    if (!s) return fail(404, { message: 'No such session on that day' })
    return HttpResponse.json(view(s))
  }),

  http.get('/api/bookings', async () => {
    await latency('bookings')
    return HttpResponse.json(bookings())
  }),

  /** Books without money changing hands: with credits, or a free session. */
  http.post('/api/bookings', async ({ request }) => {
    const req = (await request.json()) as CheckoutRequest
    await latency('book', 'pay')
    if (req.item.kind !== 'session') return fail(400, { message: 'Only sessions can be booked here' })
    const s = sessionOn(req.item.sessionId, req.item.day)
    if (!s) return fail(404, { message: 'No such session' })
    const cost = s.credits ?? 0
    if (cost && !canPayWithCredits(s, db.credits)) return fail(409, { message: `Needs ${cost}, you have ${db.credits}` })
    const p = priced(req)
    const confirmation = book(s.id, req.item.day, { credits: cost, amount: p?.t.total ?? 0, method: cost ? 'credits' : 'free' }, req)
    const body: CheckoutResponse = { status: 'confirmed', confirmation }
    return HttpResponse.json(body)
  }),

  /** Inside 12 hours the spot goes to the waitlist; outside, the credit or the money comes back. */
  http.delete('/api/bookings/:id', async ({ params }) => {
    await latency('cancel', 'pay')
    const b = db.bookings.find(x => x.id === params.id)
    const s = b && sessionTemplate(b.sessionId)
    if (!b || !s) return fail(404, { message: 'No such booking' })
    const { free } = cancelWindow(b.day, s.start, now())
    const outcome = cancelOutcome({ credits: b.paid.credits, amount: b.paid.amount }, free)
    db.bookings = db.bookings.filter(x => x.id !== b.id)
    db.taken[key(b.sessionId, b.day)] = (db.taken[key(b.sessionId, b.day)] ?? 0) - 1
    if (outcome.kind === 'credit-back') db.credits += outcome.credits
    return HttpResponse.json({ outcome })
  }),

  http.post('/api/sessions/:id/waitlist', async ({ params, request }) => {
    const { day } = (await request.json()) as { day: number }
    await latency('waitlist')
    const s = sessionOn(String(params.id), day)
    if (!s) return fail(404, { message: 'No such session' })
    const entry = { id: nextId('wl'), sessionId: s.id, day, place: s.waiting + 1 }
    db.waitlist.push(entry)
    return HttpResponse.json(entry)
  }),

  http.delete('/api/waitlist/:id', async ({ params }) => {
    await latency('waitlist')
    db.waitlist = db.waitlist.filter(w => w.id !== params.id)
    if (db.offer && !db.waitlist.some(w => w.sessionId === db.offer?.sessionId)) db.offer = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/offers/:id/accept', async ({ params }) => {
    await latency('offer', 'pay')
    const o = db.offer
    if (!o || o.id !== params.id) return fail(404, { message: 'This offer is gone' })
    if (now() >= o.expiresAt) return fail(410, { message: 'The 30 minutes ran out and the spot went to the next in line.' })
    const cost = sessionTemplate(o.sessionId)?.credits ?? 1
    if (db.credits < cost) return fail(409, { message: `Needs ${cost}, you have ${db.credits}` })
    const confirmation = book(o.sessionId, o.day, { credits: cost, amount: 0, method: 'credits' })
    db.offer = null
    const body: CheckoutResponse = { status: 'confirmed', confirmation }
    return HttpResponse.json(body)
  }),

  http.post('/api/offers/:id/decline', async ({ params }) => {
    await latency('offer')
    const o = db.offer
    if (o && o.id === params.id) {
      const sid = o.sessionId
      db.offer = null
      db.waitlist = db.waitlist.filter(w => w.sessionId !== sid)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/passes', async () => {
    await latency('passes')
    return HttpResponse.json(PASSES)
  }),

  http.post('/api/coupons/validate', async ({ request }) => {
    const { code } = (await request.json()) as { code: string }
    await latency('coupon')
    const r = validateCoupon(code, { firstVisit: db.persona === 'first' })
    return r.ok ? HttpResponse.json(r) : fail(422, r)
  }),

  http.post('/api/checkout', async ({ request }) => {
    const req = (await request.json()) as CheckoutRequest
    await latency('checkout', 'pay')
    const p = priced(req)
    if (!p) return fail(404, { message: 'Nothing to pay for' })
    const { t } = p
    if (req.method === 'credits' || t.total === 0) {
      if (t.credits && db.credits < t.credits) return fail(409, { message: `Needs ${t.credits}, you have ${db.credits}` })
      const body: CheckoutResponse = { status: 'confirmed', confirmation: fulfil(req, t.total, t.credits) }
      return HttpResponse.json(body)
    }
    if (req.method === 'pix') {
      const id = nextId('px')
      db.payments[id] = {
        id, method: 'pix', status: 'waiting', amount: t.total, expiresAt: now() + PIX_MINUTES * 60_000,
        payload: pixPayload(t.total), triesLeft: 0, item: req.item, confirmation: null, request: req,
      }
      const body: CheckoutResponse = { status: 'pix', paymentId: id }
      return HttpResponse.json(body)
    }
    const card = req.card ?? ''
    const outcome = cardOutcome(card)
    const failure = cardFailure(card, outcome)
    if (failure) {
      const body: PaymentFailure = { code: outcome === 'declined' ? 'declined' : 'expired', ...failure }
      return fail(402, body)
    }
    if (outcome === 'requires-3ds') {
      const id = nextId('cd')
      db.payments[id] = {
        id, method: 'card', status: 'requires-3ds', amount: t.total, expiresAt: now() + 10 * 60_000,
        payload: '', triesLeft: OTP_TRIES, item: req.item, confirmation: null, request: req,
      }
      const body: CheckoutResponse = { status: '3ds', paymentId: id }
      return HttpResponse.json(body)
    }
    const body: CheckoutResponse = { status: 'confirmed', confirmation: fulfil(req, t.total, 0) }
    return HttpResponse.json(body)
  }),

  /** Pix status, polled by the payment screen. */
  http.get('/api/payments/:id', async ({ params }) => {
    await latency('payment')
    const p = readPayment(String(params.id))
    if (!p) return fail(404, { message: 'No such payment' })
    return HttpResponse.json(publicPayment(p))
  }),

  /** The demo's stand-in for the bank: marks a Pix code as paid. */
  http.post('/api/payments/:id/simulate', async ({ params }) => {
    await latency('payment')
    const p = readPayment(String(params.id))
    if (!p || p.status !== 'waiting') return fail(409, { message: 'This code is no longer waiting' })
    p.status = 'paid'
    const req = p.request as CheckoutRequest
    p.confirmation = fulfil(req, p.amount, 0)
    return HttpResponse.json(publicPayment(p))
  }),

  http.post('/api/payments/:id/3ds', async ({ params, request }) => {
    const { code } = (await request.json()) as { code: string }
    await latency('3ds', 'pay')
    const p = readPayment(String(params.id))
    if (!p || p.status !== 'requires-3ds') return fail(409, { message: 'Nothing to verify' })
    if (code === OTP_FAIL || !/^\d{6}$/.test(code)) {
      p.triesLeft -= 1
      if (p.triesLeft <= 0) {
        p.status = 'failed'
        const body: PaymentFailure = { code: 'not-verified', title: "Your bank couldn't verify the payment", detail: 'Nothing was charged. Try Pix or another card.' }
        return fail(402, body)
      }
      return fail(422, { triesLeft: p.triesLeft })
    }
    p.status = 'paid'
    p.confirmation = fulfil(p.request as CheckoutRequest, p.amount, 0)
    return HttpResponse.json(publicPayment(p))
  }),

  http.post('/api/waiver', async ({ request }) => {
    const { name } = (await request.json()) as { name: string }
    await latency('waiver')
    if (name.trim().split(/\s+/).length < 2) return fail(422, { message: 'Type your full name, first and last.' })
    db.waiverSignedOn = '3 Nov 2026'
    return HttpResponse.json(me())
  }),

  http.post('/api/remind/:i', async ({ params }) => {
    await latency('remind')
    const i = Number(params.i)
    db.remindMe = db.remindMe.includes(i) ? db.remindMe.filter(x => x !== i) : [...db.remindMe, i]
    return HttpResponse.json(db.remindMe)
  }),

  http.get('/api/demo', () => HttpResponse.json(db.demo)),

  http.post('/api/demo/:scenario', ({ params }) => {
    const s = params.scenario as DemoScenario
    if (s === 'member' || s === 'reset') {
      seed('member')
      if (s === 'reset') db.demo.slow = false
    }
    if (s === 'first') seed('first')
    if (s === 'nocredits') { seed('member'); db.credits = 0 }
    if (s === 'offer') { seed('member'); openOffer() }
    if (s === 'slow') db.demo.slow = !db.demo.slow
    if (s === 'error') db.demo.scheduleFails = true
    return HttpResponse.json(db.demo)
  }),
]
