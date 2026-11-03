import { Dialog, RadioGroup } from 'radix-ui'
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, confirmationPath } from '../../api/client'
import { useCheckout, useValidateCoupon, useVerify3ds } from '../../api/queries'
import { Scene } from '../../components/Brand'
import { Icon } from '../../components/Icon'
import { DEMO_CARDS, validateCard } from '../../domain/cards'
import { closeSheet, flow } from '../../store/flow'
import { toast } from '../../store/toasts'
import { failureOf } from '../checkout/CheckoutPage'
import { requestFor, useCheckoutItem } from '../checkout/useItem'
import { SheetHead } from './Sheets'

export function CouponSheet() {
  const f = flow.use()
  const validate = useValidateCoupon()
  const apply = () => {
    const code = f.couponInput.trim().toUpperCase()
    if (!code) return flow.set({ couponError: 'Enter a code.' })
    validate.mutate(code, {
      onSuccess: r => {
        flow.set({ coupon: { code: r.code, off: r.off }, couponError: null, sheet: null })
        toast(`${r.code} applied`)
      },
      onError: e => flow.set({ couponError: e instanceof ApiError && typeof e.body.message === 'string' ? e.body.message : 'Try again in a moment.' }),
    })
  }
  return (
    <>
      <SheetHead title="Add a coupon" />
      <form
        className="grid gap-3.5"
        noValidate
        onSubmit={e => {
          e.preventDefault()
          apply()
        }}
      >
        <div className="field">
          <label htmlFor="cp">Code</label>
          <input
            className="input uppercase"
            id="cp"
            value={f.couponInput}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="FIRSTWALL"
            aria-invalid={f.couponError ? true : undefined}
            aria-describedby={f.couponError ? 'cperr' : undefined}
            onChange={e => flow.set({ couponInput: e.target.value, couponError: null })}
          />
          {f.couponError ? <span className="ferr" id="cperr"><Icon name="alert" size={14} />{f.couponError}</span> : null}
        </div>
        <button className="btn primary wide" type="submit" aria-busy={validate.isPending}>
          {validate.isPending ? <><span className="spin" aria-hidden="true" />Checking</> : 'Apply'}
        </button>
        {f.coupon ? (
          <button type="button" className="btn ghost" onClick={() => flow.set({ coupon: null, couponInput: '', sheet: null })}>Remove {f.coupon.code}</button>
        ) : null}
        <p className="legal">Demo codes: FIRSTWALL (first visit), EXPIRED10.</p>
      </form>
    </>
  )
}

function NewCard() {
  const form = flow.use(f => f.cardForm)
  const err = flow.use(f => f.cardErrors)
  const set = (k: keyof typeof form, v: string) => flow.set(f => ({ cardForm: { ...f.cardForm, [k]: v }, cardErrors: { ...f.cardErrors, [k]: undefined } }))
  const save = () => {
    const errors = validateCard(form)
    flow.set({ cardErrors: errors })
    if (Object.keys(errors).length) return
    const last4 = form.number.replace(/\D/g, '').slice(-4)
    flow.set({ card: last4, pay: 'card', payError: null, sheet: null, cardForm: { number: '', expiry: '', cvc: '' } })
    toast(`Card ·· ${last4} saved`)
  }
  const field = (k: keyof typeof form, id: string, label: string, auto: string) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        className="input"
        id={id}
        inputMode="numeric"
        autoComplete={auto}
        value={form[k]}
        aria-invalid={err[k] ? true : undefined}
        aria-describedby={err[k] ? `${id}-err` : undefined}
        onChange={e => set(k, e.target.value)}
      />
      {err[k] ? <span className="ferr" id={`${id}-err`}><Icon name="alert" size={14} />{err[k]}</span> : null}
    </div>
  )
  return (
    <div className="mt-2 grid gap-2.5">
      {field('number', 'cn', 'Card number', 'cc-number')}
      <div className="row2">
        {field('expiry', 'ce', 'MM/YY', 'cc-exp')}
        {field('cvc', 'cc', 'CVC', 'cc-csc')}
      </div>
      <button type="button" className="btn secondary wide" onClick={save}>Save card</button>
      <p className="legal">Mocked: nothing is sent anywhere. Don't type a real card number.</p>
    </div>
  )
}

export function CardSheet() {
  const card = flow.use(f => f.card)
  return (
    <>
      <SheetHead title="Pay with a card" />
      <RadioGroup.Root
        className="methods"
        aria-label="Saved cards"
        value={card ?? ''}
        onValueChange={v => flow.set({ card: v, pay: 'card', payError: null })}
      >
        {DEMO_CARDS.map(c => (
          <RadioGroup.Item key={c.last4} value={c.last4} className="method">
            <span className="mi"><Icon name="card" /></span>
            <span><b>{c.brand} ·· {c.last4}</b><span className="sub">Demo: {c.hint}</span></span>
            <span className="radio" aria-hidden="true" />
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <details>
        <summary className="cursor-pointer py-1.5 font-bold">Add a new card</summary>
        <NewCard />
      </details>
      <Dialog.Close className="btn primary wide" disabled={!card}>Use this card</Dialog.Close>
    </>
  )
}

/** The bank's own 6-digit screen (3-D Secure), with tries left after a wrong code. */
export function ThreeDSSheet({ paymentId }: { paymentId: string }) {
  const f = flow.use()
  const verify = useVerify3ds()
  const navigate = useNavigate()
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => f.otp[i] ?? '')
  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '')
    if (d.length > 1) {
      // A pasted code fills the boxes from here on.
      const next = (f.otp.slice(0, i) + d).slice(0, 6)
      flow.set({ otp: next, otpError: null })
      boxes.current[Math.min(5, next.length)]?.focus()
      return
    }
    const arr = [...digits]
    arr[i] = d
    flow.set({ otp: arr.join(''), otpError: null })
    if (d) boxes.current[i + 1]?.focus()
  }
  const submit = () => {
    if (verify.isPending) return
    if (f.otp.length < 6) return boxes.current[f.otp.length]?.focus()
    verify.mutate(
      { id: paymentId, code: f.otp },
      {
        onSuccess: p => {
          closeSheet()
          if (p.confirmation) navigate(confirmationPath(p.confirmation), { replace: true })
        },
        onError: e => {
          const fail = failureOf(e)
          if (fail) return flow.set({ sheet: null, payError: { ...fail, inline: true } })
          if (e instanceof ApiError && e.status === 422) flow.set({ otpError: { triesLeft: Number(e.body.triesLeft ?? 0) }, otp: '' })
          boxes.current[0]?.focus()
        },
      },
    )
  }
  return (
    <>
      <SheetHead title="Your bank wants to check it's you" />
      <p className="muted">We sent a 6-digit code to the phone ending 48. This is your bank's screen (3-D Secure), not Negativo's.</p>
      <form
        className="grid gap-3.5"
        noValidate
        onSubmit={e => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="otp" role="group" aria-label="6-digit code" aria-describedby={f.otpError ? 'otperr' : 'otphint'}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { boxes.current[i] = el }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              aria-label={`Digit ${i + 1}`}
              maxLength={1}
              size={1}
              // A dot marks each empty slot of the code.
              placeholder="·"
              value={d}
              aria-invalid={f.otpError ? true : undefined}
              onChange={e => setDigit(i, e.target.value)}
              onPaste={e => {
                e.preventDefault()
                setDigit(i, e.clipboardData.getData('text'))
              }}
              onKeyDown={e => {
                if (e.key === 'Backspace' && !d && i > 0) boxes.current[i - 1]?.focus()
              }}
            />
          ))}
        </div>
        {f.otpError ? (
          <span className="ferr" id="otperr" role="alert"><Icon name="alert" size={14} />That code didn't match. {f.otpError.triesLeft} {f.otpError.triesLeft === 1 ? 'try' : 'tries'} left.</span>
        ) : (
          <span className="legal" id="otphint">Demo: any 6 digits work except 000000.</span>
        )}
        <button className="btn primary wide" type="submit" aria-busy={verify.isPending}>
          {verify.isPending ? <><span className="spin" aria-hidden="true" />Checking</> : 'Confirm payment'}
        </button>
        <button type="button" className="btn ghost" onClick={() => toast('A new code is on its way')}>Send a new code</button>
      </form>
    </>
  )
}

/** Kraken's "Your payment didn't work": the reason, then Pix or another card. */
export function DeclinedSheet() {
  const err = flow.use(f => f.payError)
  const res = useCheckoutItem()
  const checkout = useCheckout()
  const navigate = useNavigate()
  return (
    <>
      <div className="art"><Scene name="fallen" /></div>
      <div className="sh" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <Dialog.Title asChild><h2>Your payment didn't work</h2></Dialog.Title>
      </div>
      <p className="muted text-center">{err?.detail ?? 'Nothing was charged. Try Pix or another card.'}</p>
      <button
        className="btn primary wide"
        aria-busy={checkout.isPending}
        disabled={res.status !== 'ready'}
        onClick={() => {
          if (res.status !== 'ready' || checkout.isPending) return
          flow.set({ pay: 'pix', payError: null })
          checkout.mutate(requestFor(res.r.item), {
            onSuccess: r => {
              closeSheet()
              if (r.status === 'pix') navigate(`/pay/pix/${r.paymentId}`)
            },
          })
        }}
      >
        {checkout.isPending ? <><span className="spin" aria-hidden="true" />Making the code</> : 'Pay with Pix instead'}
      </button>
      <button className="btn secondary wide" onClick={() => flow.set({ sheet: { kind: 'card' } })}>Try another card</button>
    </>
  )
}
