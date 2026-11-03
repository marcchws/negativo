import { Link, useNavigate } from 'react-router'
import { useBookings, useLeaveWaitlist, useMe } from '../../api/queries'
import type { Me, SessionView } from '../../api/types'
import { LevelHolds } from '../../components/Brand'
import { Icon } from '../../components/Icon'
import { CoachFace, GymMap, Photo } from '../../components/Media'
import { TODAY, weekday } from '../../domain/clock'
import { brl, ordinal } from '../../domain/format'
import { canPayWithCredits } from '../../domain/pricing'
import { categoryTone, LEVELS } from '../../domain/sessions'
import { flow, openSheet } from '../../store/flow'
import { toast } from '../../store/toasts'

/** Sets the checkout's defaults for a session: credits when they cover it, else the saved card, else Pix. */
export function startCheckout(s: SessionView, me: Me | undefined) {
  const first = me?.persona === 'first'
  const pay = !first && canPayWithCredits(s, me?.credits ?? 0) ? 'credits' : !first && me?.defaultCard && s.credits === null ? 'card' : 'pix'
  flow.set(f => ({
    pay,
    card: first ? null : (f.card ?? me?.defaultCard ?? null),
    coupon: null,
    payError: null,
    gear: { shoes: first, harness: false },
    sheet: null,
  }))
}

export const sessionPrice = (s: SessionView, me: Me | undefined) =>
  s.cash === 0 ? 'Free' : s.credits === null || me?.persona === 'first' ? brl(s.cash) : s.credits === 1 ? '1 credit' : `${s.credits} credits`

export function SessionDetail({ s, onClose, inPanel }: { s: SessionView; onClose: () => void; inPanel: boolean }) {
  const me = useMe().data
  const navigate = useNavigate()
  const bookings = useBookings().data
  const leave = useLeaveWaitlist()
  const left = s.capacity - s.taken
  const price = sessionPrice(s, me)
  const tone = categoryTone(s.category)

  const book = () => {
    startCheckout(s, me)
    if (me?.persona === 'first' && !me.waiverSignedOn) navigate(`/sessions/${s.id}/waiver?day=${s.day}`)
    else navigate(`/checkout?session=${s.id}&day=${s.day}`)
  }

  let bar
  switch (s.status) {
    case 'booked':
      bar = (
        <>
          <div className="price"><span className="pill ok"><Icon name="check" size={13} />You're in</span></div>
          <button className="btn secondary wide" onClick={() => s.bookingId && openSheet({ kind: 'cancel', bookingId: s.bookingId })}>Cancel booking</button>
        </>
      )
      break
    case 'waiting': {
      const entry = bookings?.waitlist.find(w => w.sessionId === s.id && w.day === s.day)
      bar = (
        <>
          <div className="price"><b>{ordinal(s.place ?? 1)}</b><span>in line</span></div>
          <button
            className="btn secondary wide"
            disabled={!entry}
            onClick={() => entry && leave.mutate({ entryId: entry.id, sessionId: s.id, day: s.day }, { onSuccess: () => toast('You left the waitlist') })}
          >
            Leave the waitlist
          </button>
        </>
      )
      break
    }
    case 'full':
      bar = (
        <>
          <div className="price"><b>Full</b><span>{s.waiting} waiting</span></div>
          <button className="btn primary wide" onClick={() => openSheet({ kind: 'waitlist', sessionId: s.id, day: s.day })}>Join waitlist →</button>
        </>
      )
      break
    case 'locked':
      bar = (
        <>
          <div className="price"><b>{price}</b><span>after a belay check</span></div>
          <Link className="btn primary wide" to="/sessions/bc-2100?day=3" replace={inPanel}>Book a belay check →</Link>
        </>
      )
      break
    default:
      bar = (
        <>
          <div className="price"><b>{price}</b><span>{left === 1 ? '1 spot left' : `${left} spots left`}</span></div>
          <button className="btn primary wide" onClick={book}>Book →</button>
        </>
      )
  }

  return (
    <article className="detail">
      <div className="hero">
        <Photo k={s.photo} eager />
        <div className="nav">
          <button className="icon-btn on-photo" aria-label={inPanel ? 'Close' : 'Back'} onClick={onClose}>
            <Icon name={inPanel ? 'close' : 'back'} />
          </button>
          <button
            className="icon-btn on-photo"
            aria-label="Copy link to this session"
            onClick={async () => {
              try { await navigator.clipboard.writeText(window.location.href) } catch { /* clipboard blocked: the toast still confirms the intent */ }
              toast('Link copied')
            }}
          >
            <Icon name="share" />
          </button>
        </div>
      </div>
      <div className="head">
        <span className={`cat ${tone}`}>{s.category}</span>
        <h1 id="detail-title">{s.name}</h1>
        <p className="when">{s.day === TODAY ? 'Today' : weekday(s.day).slice(0, 3)} {s.day} Nov · {s.start}–{s.end} · {s.duration}</p>
      </div>
      {/* Scrolls sideways on a phone, so it takes focus for keyboard scrolling. */}
      <div className="facts" role="group" aria-label="Level, room and gear" tabIndex={0}>
        <span className="fact"><LevelHolds level={s.level} />{LEVELS[s.level]}</span>
        <span className="fact"><Icon name={s.kind === 'ropes' ? 'ropes' : 'boulder'} size={16} />{s.room}</span>
        {s.kind !== 'ropes'
          ? <span className="fact"><Icon name="shoe" size={16} />Shoes R$ 15</span>
          : <span className="fact"><Icon name="harness" size={16} />Harness R$ 10</span>}
      </div>
      {s.status === 'locked' ? (
        <div className="lock-card">
          <div>
            <b><Icon name="lock" size={16} />Belay check first</b>
            <p>Rope sessions need a 45-minute belay check with a coach. It's free, and the next one is today at 21:00.</p>
          </div>
          <Photo k="belay" square />
        </div>
      ) : null}
      {s.status === 'waiting' ? (
        <div className="lock-card">
          <div>
            <b><Icon name="queue" size={16} />You're {ordinal(s.place ?? 1)} in line</b>
            <p>We'll message you if a spot opens. You'll have 30 minutes to confirm, and nothing is charged until you do.</p>
          </div>
          <Photo k={s.photo} square />
        </div>
      ) : null}
      <section className="dsec">
        <h2>Spots</h2>
        <div className={`capbig ${left <= 1 && s.status !== 'booked' ? 'tight' : ''}`}>
          <div className="row"><b>{s.taken} of {s.capacity} booked</b><span className="muted">{s.status === 'full' || s.status === 'waiting' ? `${s.waiting} waiting` : `${left} left`}</span></div>
          <div className="m" role="img" aria-label={`${s.taken} of ${s.capacity} spots booked`}><span style={{ width: `${(100 * s.taken) / s.capacity}%` }} /></div>
        </div>
      </section>
      {s.coach ? (
        <section className="dsec">
          <h2>Coach</h2>
          <div className="coach">
            {s.coach.photo
              ? <CoachFace k={s.coach.photo} />
              : <span className="avatar" aria-hidden="true">{s.coach.name.split(' ').map(w => w[0]).join('')}</span>}
            <div><b>{s.coach.name}</b><span className="muted text-[13px]">{s.coach.bio}</span></div>
          </div>
        </section>
      ) : null}
      <section className="dsec"><h2>About</h2><p>{s.about}</p></section>
      <section className="dsec">
        <h2>Location</h2>
        <GymMap />
        <p className="text-[14px]"><b>Negativo Humaitá</b><br /><span className="muted">Humaitá, Rio de Janeiro · lockers and showers</span></p>
      </section>
      <section className="dsec">
        <h2>Cancellation policy</h2>
        <dl className="policy"><dt>Until 12 h before</dt><dd>Full refund, or the credit back</dd><dt>After that</dt><dd>No refund. You can pass your spot to the waitlist.</dd></dl>
      </section>
      <section className="dsec">
        <h2>Waitlist policy</h2>
        <p className="muted text-[14px]">When a spot opens, the next in line has 30 minutes to confirm. Nothing is charged until then.</p>
      </section>
      <div className="book-bar">{bar}</div>
    </article>
  )
}
