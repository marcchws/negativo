import { RadioGroup, Switch } from 'radix-ui'
import { useNavigate } from 'react-router'
import { ApiError, confirmationPath } from '../../api/client'
import { useBook, useCheckout } from '../../api/queries'
import type { Me, PaymentFailure } from '../../api/types'
import { Icon, type IconName } from '../../components/Icon'
import { Photo } from '../../components/Media'
import { now, whenShort } from '../../domain/clock'
import { brl, plural } from '../../domain/format'
import { cardBrand } from '../../domain/cards'
import { cancelWindow } from '../../domain/cancel'
import { GEAR, gearAllowed, type PayMethod } from '../../domain/pricing'
import { categoryTone } from '../../domain/sessions'
import { flow, openSheet } from '../../store/flow'
import { NotFound } from '../errors/NotFound'
import { type Resolved, requestFor, totalsFor, useCheckoutItem } from './useItem'

function Methods({ r, me }: { r: Resolved; me: Me }) {
  const pay = flow.use(f => f.pay)
  const card = flow.use(f => f.card)
  const cost = r.session?.credits ?? 0
  const offerCredits = !r.pass && r.session && r.session.credits !== null && cost > 0 && me.persona === 'member'
  const short = offerCredits && me.credits < cost
  const rows: [PayMethod, IconName, string, string, boolean][] = []
  if (offerCredits) rows.push(['credits', 'credit', 'Credits', short ? `Needs ${cost}, you have ${me.credits}` : `${cost} of your ${me.credits} · ${me.pass?.name ?? 'pass'}`, !!short])
  rows.push(['pix', 'pix', 'Pix', 'Instant, from your bank app', false])
  rows.push(['card', 'card', card ? `Card ·· ${card}` : 'Credit or debit card', card ? `${cardBrand(card)} · tap to change` : 'Add a card', false])
  return (
    <div className="methods">
      <RadioGroup.Root
        className="methods"
        aria-label="Pay with"
        value={pay}
        onValueChange={v => {
          flow.set({ pay: v as PayMethod, payError: null })
          if (v === 'card' && !flow.get().card) openSheet({ kind: 'card' })
        }}
      >
        {rows.map(([k, ic, t, sub, disabled]) => (
          <RadioGroup.Item
            key={k}
            value={k}
            className="method"
            disabled={disabled}
            onClick={() => k === 'card' && pay === 'card' && openSheet({ kind: 'card' })}
          >
            <span className="mi"><Icon name={ic} /></span>
            <span><b>{t}</b><span className="sub">{sub}</span></span>
            <span className="radio" aria-hidden="true" />
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {short ? (
        <div className="notice hot">
          <Icon name="credit" size={18} />
          <span><b>Not enough credits</b>Pay this one with Pix or a card, or get a pass and save 20% on every visit.</span>
        </div>
      ) : null}
    </div>
  )
}

function GearBox({ r }: { r: Resolved }) {
  const gear = flow.use(f => f.gear)
  const size = flow.use(f => f.shoeSize)
  const s = r.session
  if (!s) return null
  const allowed = gearAllowed(s)
  if (!allowed.shoes) return null
  const row = (k: 'shoes' | 'harness', icon: IconName, label: string, sub: string, enabled: boolean) => (
    <div className="line">
      <span><Icon name={icon} size={18} /><span>{label}<span className="sub">{sub}</span></span></span>
      <Switch.Root
        className="switch"
        checked={gear[k] && enabled}
        disabled={!enabled}
        aria-label={k === 'shoes' ? 'Rent climbing shoes' : 'Rent a harness'}
        onCheckedChange={v => flow.set(f => ({ gear: { ...f.gear, [k]: v } }))}
      >
        <Switch.Thumb />
      </Switch.Root>
    </div>
  )
  return (
    <section className="box">
      <div className="line"><span className="box-h">Gear</span></div>
      {row('shoes', 'shoe', 'Climbing shoes', `Size ${size} · ${brl(GEAR.shoes)}, at the desk`, true)}
      {row('harness', 'harness', 'Harness', allowed.harness ? `${brl(GEAR.harness)}, at the desk` : 'Not needed on the boulder wall', allowed.harness)}
    </section>
  )
}

export function failureOf(e: unknown): PaymentFailure | null {
  if (e instanceof ApiError && e.status === 402) return e.body as unknown as PaymentFailure
  return null
}

export function CheckoutPage() {
  const res = useCheckoutItem()
  const f = flow.use()
  const navigate = useNavigate()
  const book = useBook()
  const checkout = useCheckout()
  if (res.status === 'missing') return <NotFound />
  if (res.status === 'loading' || !res.me)
    return (
      <div className="ck" aria-busy="true">
        <span className="sk" style={{ height: 108, borderRadius: 14 }} />
        <span className="sk" style={{ height: 160, borderRadius: 14 }} />
        <span className="sr-only" role="status">Loading checkout</span>
      </div>
    )
  const { r, me } = res
  const first = me.persona === 'first'
  const t = totalsFor(r, f, first)
  const s = r.session
  const busy = book.isPending || checkout.isPending
  const creditShort = f.pay === 'credits' && !!s && (s.credits ?? 0) > me.credits
  const unavailable = !!s && (s.status === 'booked' || s.status === 'full' || s.status === 'locked')

  const pay = () => {
    if (busy) return
    flow.set({ payError: null })
    const req = requestFor(r.item)
    if (r.item.kind === 'session' && (f.pay === 'credits' || t.total === 0)) {
      book.mutate(req, {
        onSuccess: res2 => res2.status === 'confirmed' && navigate(confirmationPath(res2.confirmation), { replace: true }),
        onError: e => flow.set({ payError: { code: 'declined', title: "We couldn't book it", detail: e.message, inline: true } }),
      })
      return
    }
    if (f.pay === 'card' && !f.card) return openSheet({ kind: 'card' })
    checkout.mutate(req, {
      onSuccess: res2 => {
        if (res2.status === 'pix') navigate(`/pay/pix/${res2.paymentId}`)
        else if (res2.status === '3ds') flow.set({ sheet: { kind: '3ds', paymentId: res2.paymentId }, otp: '', otpError: null })
        else navigate(confirmationPath(res2.confirmation), { replace: true })
      },
      onError: e => {
        const fail = failureOf(e)
        if (!fail) return flow.set({ payError: { code: 'declined', title: "The payment didn't go through", detail: 'Nothing was charged. Try again in a moment.', inline: true } })
        flow.set({ payError: { ...fail, inline: true }, sheet: fail.code === 'declined' ? { kind: 'declined' } : null })
      },
    })
  }

  const label = busy
    ? 'Processing'
    : t.total === 0 && t.credits
      ? `Confirm · ${plural(t.credits, 'credit')}`
      : t.total === 0
        ? 'Confirm booking'
        : f.pay === 'credits'
          ? `Confirm · ${plural(t.credits, 'credit')}`
          : f.pay === 'pix'
            ? `Pay ${brl(t.total)} with Pix`
            : `Pay ${brl(t.total)}`

  const win = s ? cancelWindow(s.day, s.start, now()) : null

  return (
    <div className="page2">
      <div className="ck">
        <div className="hidden lg:block">
          <button className="back-d" onClick={() => navigate(-1)}><Icon name="back" size={18} />Back</button>
          <h1 className="h-page" style={{ fontSize: 40 }}>{r.pass ? 'Buy a pass' : 'Confirm and pay'}</h1>
        </div>
        <h1 className="sr-only lg:hidden">{r.pass ? 'Buy a pass' : 'Confirm and pay'}</h1>
        {f.payError?.inline ? (
          <div className="notice err" role="alert"><Icon name="alert" size={18} /><span><b>{f.payError.title}</b>{f.payError.detail}</span></div>
        ) : null}
        {unavailable ? (
          <div className="notice hot" role="status"><Icon name="info" size={18} /><span><b>{s?.status === 'booked' ? "You're already in" : 'This one is not open to book'}</b>Go back to the session to see what you can do.</span></div>
        ) : null}
        <section className="box sumc">
          <Photo k={r.photo} square />
          <span>
            <span className={`cat ${r.pass ? 'pass' : categoryTone(s?.category ?? 'Class')}`}>{r.pass ? 'Pass' : s?.category}</span>
            <b>{r.title}</b>
            <span className="muted text-[13px]">{r.sub}</span>
          </span>
        </section>
        <GearBox r={r} />
        <section>
          <h2 className="box-h" style={{ marginBottom: 10 }}>Pay with</h2>
          <Methods r={r} me={me} />
        </section>
        {t.total || f.coupon ? (
          <section className="box">
            <button className="line" onClick={() => flow.set({ sheet: { kind: 'coupon' }, couponInput: f.coupon?.code ?? f.couponInput, couponError: null })}>
              <span>
                <Icon name="coupon" size={18} />
                <span>
                  {f.coupon ? <>Coupon <b>{f.coupon.code}</b></> : 'Add a coupon'}
                  <span className="sub">{f.coupon ? `${brl(t.off)} off` : first ? 'First visit? Try FIRSTWALL' : 'Have a code from the desk?'}</span>
                </span>
              </span>
              {f.coupon ? <span className="pill hot">−{brl(t.off)}</span> : <Icon name="chevron" size={18} />}
            </button>
          </section>
        ) : null}
        {s && win ? (
          win.free ? (
            <div className="notice ok">
              <Icon name="refund" size={18} />
              <span>
                <b>Free cancellation until {whenShort(win.deadline)}</b>
                Full refund or the credit back. After that, pass your spot to the waitlist.
              </span>
            </div>
          ) : (
            <div className="notice hot">
              <Icon name="clock" size={18} />
              <span><b>No refund if you cancel</b>It starts in under 12 hours. You can still pass your spot to the waitlist.</span>
            </div>
          )
        ) : null}
      </div>
      <aside className="side">
        <section className="box">
          <div className="price-rows">
            <h2 className="box-h">Price details</h2>
            {t.credits ? <div><span>{r.title}</span><span>{plural(t.credits, 'credit')}</span></div> : null}
            {t.lines.map(l => <div key={l.label}><span>{l.label}</span><span>{brl(l.amount)}</span></div>)}
            {t.off ? <div className="save"><span>Coupon {f.coupon?.code}</span><span>− {brl(t.off)}</span></div> : null}
            <div className="tot">
              <span>Total</span>
              <span>{brl(t.total)}{t.credits ? ` + ${t.credits} cr` : ''}</span>
            </div>
            {f.pay === 'credits' && t.total ? <p className="legal">Gear is paid at the desk when you pick it up.</p> : null}
          </div>
          <div style={{ padding: '0 16px 16px', display: 'grid', gap: 10 }}>
            <button className="btn primary wide" onClick={pay} disabled={creditShort || unavailable} aria-busy={busy} aria-disabled={busy || undefined}>
              {busy ? <span className="spin" aria-hidden="true" /> : null}
              {label}
            </button>
            <p className="legal">
              By confirming you agree to the booking terms{first && me.waiverSignedOn ? ' and the waiver you signed' : ''}. This is a demo: nothing is charged.
            </p>
          </div>
        </section>
      </aside>
    </div>
  )
}
