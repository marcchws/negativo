import { Link } from 'react-router'
import { useBookings, useMe, useOccupancy } from '../../api/queries'
import type { SessionView } from '../../api/types'
import { Icon } from '../../components/Icon'
import { at, clockTime, inWords, TODAY } from '../../domain/clock'
import { offerState } from '../../domain/waitlist'
import { useNow } from '../../lib/hooks'
import { openSheet } from '../../store/flow'
import { BusyCard } from './BusyChart'

/** Equinox+'s goal cards: next climb on the one Night surface, credits, and how busy the gym is. */
export function GoalCards({ sessions }: { sessions: SessionView[] }) {
  const me = useMe().data
  const bookings = useBookings().data
  const hours = useOccupancy(TODAY).data?.hours
  const t = useNow(15_000)
  const offer = bookings?.offer
  const next = bookings?.upcoming.find(b => b.day === TODAY)
  const first = me?.persona === 'first'
  const openBoulder = sessions.find(s => s.id === 'ob-2000')

  let nextCard
  if (first) {
    nextCard = (
      <article className="goal night">
        <span className="t-label">First visit</span>
        <div className="big md">Start with Intro to Bouldering</div>
        <div className="small">90 minutes with a coach. Shoes R$ 15 at the desk.</div>
        <div className="row"><Link className="cta" to="/sessions/ib-1830?day=3">See the class</Link></div>
      </article>
    )
  } else if (next) {
    const start = at(TODAY, next.session.start)
    nextCard = (
      <article className="goal night">
        <span className="t-label">Next up · in {inWords(start - t)}</span>
        <div className="big">{next.session.start}</div>
        <div className="small">{next.session.name} · {next.session.room}{next.session.kind === 'ropes' ? ' · belay checked' : ''}</div>
        <div className="row">
          <button className="cta" onClick={() => openSheet({ kind: 'checkin', bookingId: next.id })}>
            <Icon name="qr" size={16} />Check-in code
          </button>
        </div>
      </article>
    )
  } else {
    nextCard = (
      <article className="goal night">
        <span className="t-label">Nothing booked today</span>
        <div className="big md">Climb tonight?</div>
        <div className="small">The 20:00 boulder session has {openBoulder ? openBoulder.capacity - openBoulder.taken : 18} spots.</div>
        <div className="row"><Link className="cta" to="/sessions/ob-2000?day=3">See the session</Link></div>
      </article>
    )
  }

  const left = offer ? offerState(offer.expiresAt, t) : null

  return (
    <section className={`goals ${offer ? 'four' : ''}`} aria-label="Your climbing">
      {offer && left && !left.expired ? (
        <article className="goal offer">
          <span className="t-label"><Icon name="clock" size={12} />Spot opened · confirm in {left.minutesLeft} min</span>
          <div className="big md">{offer.session.name}</div>
          <div className="small">{offer.session.start} today. Confirm by {clockTime(offer.expiresAt)} or it goes to the next in line.</div>
          <button className="btn primary sm" style={{ justifySelf: 'start' }} onClick={() => openSheet({ kind: 'offer' })}>Confirm spot</button>
        </article>
      ) : null}
      {nextCard}
      <article className="goal">
        <span className="t-label">{first || !me?.pass ? 'Passes' : `Credits · ${me.pass.name}`}</span>
        <div className="big">{me?.credits ?? 0} <small>{first || !me?.pass ? 'credits' : 'of 10 left'}</small></div>
        <div className="segs" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < (me?.credits ?? 0) ? 'on' : ''} />)}
        </div>
        <div className="small">
          {me?.credits ? `Valid until ${me.pass?.validUntil ?? '31 Dec'} · ` : 'Buy a pass to book with credits · '}
          <Link to="/passes" className="link whitespace-nowrap">{me?.credits ? 'Top up' : 'See passes'}</Link>
        </div>
      </article>
      {hours ? <BusyCard hours={hours} /> : <div className="goal sk" aria-hidden="true" />}
    </section>
  )
}
