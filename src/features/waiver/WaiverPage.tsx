import { useState } from 'react'
import { Checkbox } from 'radix-ui'
import { useNavigate, useParams } from 'react-router'
import { useSession, useSignWaiver } from '../../api/queries'
import { Icon } from '../../components/Icon'
import { Photo } from '../../components/Media'
import { dayLabel } from '../../domain/clock'
import { categoryTone } from '../../domain/sessions'
import { useDay } from '../../lib/hooks'
import { flow } from '../../store/flow'
import { toast } from '../../store/toasts'

/** "Before your first climb": sign once, then on to checkout with shoes on, Pix chosen and FIRSTWALL suggested. */
export function WaiverPage() {
  const { id = '' } = useParams()
  const day = useDay()
  const s = useSession(id, day).data
  const f = flow.use()
  const sign = useSignWaiver()
  const navigate = useNavigate()
  const [agreeError, setAgreeError] = useState(false)

  const submit = () => {
    const name = f.waiverName.trim()
    const nameOk = name.split(/\s+/).length >= 2
    flow.set({ waiverError: nameOk ? null : 'Type your full name, first and last.' })
    setAgreeError(!f.waiverAgreed)
    if (!nameOk || !f.waiverAgreed) return
    sign.mutate(name, {
      onSuccess: () => {
        // The coupon sheet opens pre-filled with the first-visit code; applying it stays the climber's choice.
        flow.set({ waiverError: null, gear: { shoes: true, harness: false }, pay: 'pix', coupon: null, couponInput: 'FIRSTWALL' })
        navigate(`/checkout?session=${id}&day=${day}`, { replace: true })
        toast('Waiver signed. It covers every visit for 12 months.')
      },
      onError: e => flow.set({ waiverError: e.message }),
    })
  }

  return (
    <div className="page2">
      <div>
        <div className="hidden lg:block">
          <button className="back-d" onClick={() => navigate(-1)}><Icon name="back" size={18} />Back</button>
        </div>
        <div className="stepper" role="img" aria-label="Step 1 of 2: the waiver. Step 2 is paying."><i className="on" /><i /></div>
        <div className="pad">
          <h1 className="h-page lg:text-[40px]">Before your first climb</h1>
          <p className="muted" style={{ margin: '6px 0 14px' }}>Sign the waiver once. It covers every visit for 12 months.</p>
        </div>
        <div className="doc" tabIndex={0} role="region" aria-label="Waiver text">
          <h2 className="text-[15px] font-bold">Climbing waiver, Negativo Humaitá</h2>
          <p>Climbing and bouldering carry a risk of injury, including from falls onto the mats. I will follow the coaches' instructions and the rules posted at the wall.</p>
          <p>I will not climb on ropes until I pass a belay check. I will tell the desk about any condition that affects my safety.</p>
          <p>I am 18 or over, or a parent or guardian signs for me. This waiver stays valid for 12 months.</p>
          <p className="muted">Demo text, not a legal document.</p>
        </div>
        <form
          className="pad"
          style={{ display: 'grid', gap: 14, marginTop: 16 }}
          noValidate
          onSubmit={e => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="field">
            <label htmlFor="wname">Full name, as your signature</label>
            <input
              className="input"
              id="wname"
              autoComplete="name"
              value={f.waiverName}
              placeholder="Ana Lima"
              aria-invalid={f.waiverError ? true : undefined}
              aria-describedby={f.waiverError ? 'werr' : undefined}
              onChange={e => flow.set({ waiverName: e.target.value, waiverError: null })}
            />
            {f.waiverError ? <span className="ferr" id="werr"><Icon name="alert" size={14} />{f.waiverError}</span> : null}
          </div>
          <div className="check">
            <Checkbox.Root
              id="agree"
              className="box2"
              checked={f.waiverAgreed}
              aria-invalid={agreeError || undefined}
              aria-describedby={agreeError ? 'aerr' : undefined}
              onCheckedChange={v => {
                flow.set({ waiverAgreed: v === true })
                if (v === true) setAgreeError(false)
              }}
            >
              <Checkbox.Indicator><Icon name="check" size={16} /></Checkbox.Indicator>
            </Checkbox.Root>
            <label htmlFor="agree" className="cursor-pointer">I've read the waiver and I agree to it.</label>
          </div>
          {agreeError ? <span className="ferr" id="aerr"><Icon name="alert" size={14} />Tick the box to agree to the waiver.</span> : null}
          <button className="btn primary wide" type="submit" aria-busy={sign.isPending}>
            {sign.isPending ? <span className="spin" aria-hidden="true" /> : null}Sign and continue
          </button>
        </form>
      </div>
      {s ? (
        <aside className="side hidden lg:block">
          <section className="box" style={{ overflow: 'hidden' }}>
            <Photo k={s.photo} className="h-[190px] w-full object-cover" />
            <div className="price-rows">
              <span className={`cat ${categoryTone(s.category)}`}>{s.category}</span>
              <b className="box-h">{s.name}</b>
              <span className="muted text-[13px]">{dayLabel(s.day)} · {s.start}–{s.end}</span>
            </div>
          </section>
        </aside>
      ) : null}
    </div>
  )
}
