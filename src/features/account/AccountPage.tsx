import { Link, useNavigate } from 'react-router'
import { useDemo, useDemoScenario, useMe } from '../../api/queries'
import type { DemoScenario } from '../../api/types'
import { Icon } from '../../components/Icon'
import { cardBrand } from '../../domain/cards'
import { toast } from '../../store/toasts'
import { flow } from '../../store/flow'

const SCENARIOS: [DemoScenario, string, string][] = [
  ['member', 'Member', 'Caio, 10-pass, 4 credits'],
  ['first', 'First visit', 'Ana, no waiver, no pass, no belay check'],
  ['nocredits', 'Member with no credits', 'Caio, 0 credits left'],
  ['offer', 'A waitlist spot opens', 'Movement Lab, 24 minutes to confirm'],
  ['slow', 'Slow network', 'Every call takes three times longer'],
  ['error', 'Schedule fails to load', 'The next schedule load fails once'],
  ['reset', 'Reset the demo', 'Back to Caio, nothing changed'],
]

const AFTER: Partial<Record<DemoScenario, [path: string, message: string]>> = {
  first: ['/', "You're Ana now, on her first visit"],
  nocredits: ['/', 'Caio has no credits left'],
  offer: ['/', 'A spot opened in Movement Lab'],
  error: ['/', 'The schedule will fail to load once'],
  reset: ['/', 'Demo reset'],
  member: ['/account', "You're Caio again"],
}

export function AccountPage() {
  const me = useMe().data
  const demo = useDemo().data
  const run = useDemoScenario()
  const navigate = useNavigate()
  const first = me?.persona === 'first'
  return (
    <>
      <h1 className="h-page hidden lg:block" style={{ fontSize: 48 }}>Account</h1>
      <h1 className="sr-only lg:hidden">Account</h1>
      <div className="me">
        <span className={`avatar ${first ? 'rose' : ''}`} aria-hidden="true">{me?.initials}</span>
        <div><b className="text-[18px]">{me?.name ?? ' '}</b><div className="muted text-[13px]">{first ? 'New climber' : `Member since ${me?.since ?? ''}`}</div></div>
      </div>
      <div className="list">
        <div className="line">
          <span><Icon name="waiver" size={18} />Waiver</span>
          {me?.waiverSignedOn
            ? <span className="pill ok"><Icon name="check" size={12} />Signed {me.waiverSignedOn}</span>
            : <span className="pill hot">Sign before your first climb</span>}
        </div>
        <div className="line">
          <span><Icon name="belay" size={18} />Belay check</span>
          {me?.belay
            ? <span className="pill ok"><Icon name="check" size={12} />Passed</span>
            : <Link className="btn secondary sm" to="/sessions/bc-2100?day=3">Book one</Link>}
        </div>
        <div className="line">
          <span><Icon name="passes" size={18} />Pass</span>
          <span className="muted">{me?.pass ? `${me.pass.name} · until ${me.pass.validUntil}` : 'None yet'}</span>
        </div>
        <div className="line">
          <span><Icon name="card" size={18} />Cards</span>
          <span className="muted">{me?.defaultCard ? `${cardBrand(me.defaultCard)} ·· ${me.defaultCard}` : 'None'}</span>
        </div>
        <div className="line">
          <span><Icon name="refund" size={18} />Receipts</span>
          <span className="muted">{first ? 'None yet' : 'Sent to your email'}</span>
        </div>
      </div>
      <h2 className="t-label pad" style={{ marginTop: 24 }}>Demo</h2>
      <p className="muted pad text-[13px]" style={{ marginTop: 4 }}>Switch who is signed in, or make things go wrong on purpose. Nothing here is real.</p>
      <div className="list">
        {SCENARIOS.map(([k, label, sub]) => {
          const on = (k === 'member' && me?.persona === 'member' && !!me) || (k === 'first' && first) || (k === 'slow' && demo?.slow)
          return (
            <button
              key={k}
              className="line"
              aria-pressed={k === 'slow' ? !!demo?.slow : undefined}
              disabled={run.isPending}
              onClick={() =>
                run.mutate(k, {
                  onSuccess: d => {
                    flow.reset()
                    if (k === 'slow') return toast(d.slow ? 'Slow network on: every call takes 3 times longer' : 'Slow network off')
                    const [path, msg] = AFTER[k] ?? ['/', '']
                    navigate(path)
                    if (msg) toast(msg)
                  },
                })
              }
            >
              <span><span>{label}<span className="sub">{sub}</span></span></span>
              {on ? <Icon name="check" size={18} /> : <Icon name="chevron" size={18} />}
            </button>
          )
        })}
      </div>
    </>
  )
}
