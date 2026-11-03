import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { confirmationPath } from '../../api/client'
import { useCheckout, usePayment, useSimulatePix } from '../../api/queries'
import type { Payment } from '../../api/types'
import { Scene } from '../../components/Brand'
import { Icon } from '../../components/Icon'
import { Photo, QR } from '../../components/Media'
import { mmss } from '../../domain/clock'
import { brl } from '../../domain/format'
import { PIX_LOW_SECONDS, secondsLeft } from '../../domain/waitlist'
import { useNow } from '../../lib/hooks'
import { flow } from '../../store/flow'
import { toast } from '../../store/toasts'
import { checkoutPath, type Resolved, requestFor, useCheckoutItem } from '../checkout/useItem'
import { NotFound } from '../errors/NotFound'

function Side({ r, amount }: { r: Resolved; amount: number }) {
  return (
    <aside className="side hidden lg:block">
      <section className="box" style={{ overflow: 'hidden' }}>
        <Photo k={r.photo} className="h-[190px] w-full object-cover" />
        <div className="price-rows">
          <b className="box-h">{r.title}</b>
          <span className="muted text-[13px]">{r.sub}</span>
          <div className="tot"><span>Total</span><span>{brl(amount)}</span></div>
        </div>
      </section>
    </aside>
  )
}

function Waiting({ p, r }: { p: Payment; r: Resolved }) {
  const t = useNow(1000)
  const navigate = useNavigate()
  const simulate = useSimulatePix()
  const left = secondsLeft(p.expiresAt, t)
  const paid = p.status === 'paid'

  useEffect(() => {
    if (!paid || !p.confirmation) return
    // A beat on "Paid" so the climber sees the bank's answer before the confirmation replaces it.
    const id = window.setTimeout(() => p.confirmation && navigate(confirmationPath(p.confirmation), { replace: true }), 900)
    return () => window.clearTimeout(id)
  }, [paid, p.confirmation, navigate])

  const timer = (
    <>
      <span className="t-label">Pay {brl(p.amount)} within</span>
      <div className={`timer ${left < PIX_LOW_SECONDS ? 'low' : ''}`} role="timer" aria-label={`${Math.ceil(left / 60)} minutes left`}>{mmss(left)}</div>
    </>
  )
  const qr = <div className="qr"><QR seed={7919} label="Pix QR code for this payment (demo, it pays nothing)" /></div>
  const rest = (
    <>
      <div className={`wait ${paid ? 'paid' : ''}`} role="status">
        {paid ? <><Icon name="check" size={18} />Paid. Confirming your spot…</> : <><span className="pulse" aria-hidden="true" />Waiting for your bank · we'll confirm on its own</>}
      </div>
      <div className="code">
        <span title={p.payload}>{p.payload}</span>
        <button
          className="btn secondary sm"
          onClick={async () => {
            try { await navigator.clipboard.writeText(p.payload) } catch { /* clipboard blocked: the code is still on screen */ }
            toast('Pix code copied')
          }}
        >
          <Icon name="copy" size={16} />Copy code
        </button>
      </div>
      <ol className="steps">
        <li>Open your bank app and choose Pix.</li>
        <li>Scan the code, or paste it with Pix Copia e Cola.</li>
        <li>Confirm {brl(p.amount)} to NEGATIVO DEMO. This screen updates by itself.</li>
      </ol>
      <button className="btn ghost" disabled={paid || simulate.isPending} onClick={() => simulate.mutate(p.id)}>
        Simulate the bank's payment (demo)
      </button>
    </>
  )
  return (
    <div className="page2">
      <div>
        <div className="hidden lg:block">
          <button className="back-d" onClick={() => navigate(checkoutPath(p.item))}><Icon name="back" size={18} />Back</button>
          <h1 className="h-page" style={{ fontSize: 40, marginBottom: 24 }}>Pay with Pix</h1>
        </div>
        <h1 className="sr-only lg:hidden">Pay with Pix</h1>
        <div className="pix lg:hidden">{timer}{qr}{rest}</div>
        <div className="pix-grid hidden lg:grid">{qr}<div className="pix">{timer}{rest}</div></div>
      </div>
      <Side r={r} amount={p.amount} />
    </div>
  )
}

function Expired({ p }: { p: Payment }) {
  const navigate = useNavigate()
  const checkout = useCheckout()
  return (
    <div className="state">
      <Scene name="fallen" />
      <h1 className="h-sec" style={{ marginTop: 8 }}>The Pix code expired</h1>
      <p>Nothing was charged. Your spot is held for 5 more minutes.</p>
      <div className="acts">
        <button
          className="btn primary"
          aria-busy={checkout.isPending}
          onClick={() => {
            flow.set({ pay: 'pix' })
            checkout.mutate(requestFor(p.item), {
              onSuccess: r => r.status === 'pix' && navigate(`/pay/pix/${r.paymentId}`, { replace: true }),
            })
          }}
        >
          {checkout.isPending ? <span className="spin" aria-hidden="true" /> : null}Get a new code
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            flow.set({ pay: 'card', payError: null })
            navigate(checkoutPath(p.item), { replace: true })
          }}
        >
          Pay with a card
        </button>
      </div>
    </div>
  )
}

export function PixPage() {
  const { paymentId } = useParams()
  const q = usePayment(paymentId)
  const t = useNow(1000)
  const res = useCheckoutItem(q.data?.item)
  if (q.isError) return <NotFound />
  if (!q.data || res.status !== 'ready')
    return (
      <div className="pix" aria-busy="true">
        <span className="sk" style={{ width: 220, height: 220, borderRadius: 14 }} />
        <span className="sr-only" role="status">Loading the Pix code</span>
      </div>
    )
  const p = q.data
  const expired = p.status === 'expired' || (p.status === 'waiting' && secondsLeft(p.expiresAt, t) === 0)
  return expired ? <Expired p={p} /> : <Waiting p={p} r={res.r} />
}
