import { RadioGroup } from 'radix-ui'
import { useNavigate } from 'react-router'
import { useMe } from '../../api/queries'
import { Photo } from '../../components/Media'
import { brl } from '../../domain/format'
import { PASSES, passById } from '../../domain/pricing'
import { flow } from '../../store/flow'

/** Runna's plan cards over a photo of the hall. */
export function PassesPage() {
  const me = useMe().data
  const sel = flow.use(f => f.passSel)
  const navigate = useNavigate()
  const pass = passById(sel) ?? PASSES[1]
  return (
    <>
      <h1 className="h-page hidden lg:block" style={{ fontSize: 48, marginBottom: 24 }}>Passes</h1>
      <h1 className="sr-only lg:hidden">Passes</h1>
      <div className="pass-hero">
        <Photo k="hall" eager />
        <div>
          <span className="t-label" style={{ color: 'var(--color-rose-300)' }}>{me?.credits ? `${me.credits} credits left` : 'No pass yet'}</span>
          <b>Climb more, pay less a visit</b>
        </div>
      </div>
      <RadioGroup.Root className="plans" aria-label="Passes" value={sel} onValueChange={v => flow.set({ passSel: v })} style={{ marginTop: 16 }}>
        {PASSES.map(p => (
          <RadioGroup.Item key={p.id} value={p.id} className="plan">
            {p.badge ? <span className="badge">{p.badge}</span> : null}
            <span><b>{p.name}</b><span className="muted block text-[13px] mt-0.5">{p.sub}</span></span>
            <span className="per">{p.per}</span>
            <span className="pr">{brl(p.price)}</span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <div className="pad" style={{ marginTop: 16, maxWidth: 420 }}>
        <button
          className="btn primary wide"
          onClick={() => {
            flow.set({ pay: 'pix', coupon: null, payError: null, sheet: null })
            navigate(`/checkout?pass=${pass?.id ?? 'ten'}`)
          }}
        >
          Continue · {brl(pass?.price ?? 0)}
        </button>
        <p className="legal" style={{ marginTop: 8 }}>Credits work for any open climb or class. Ropes classes take 2.</p>
      </div>
    </>
  )
}
