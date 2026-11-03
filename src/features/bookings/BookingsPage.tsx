import { Link, useLocation } from 'react-router'
import { useBookings } from '../../api/queries'
import { Scene } from '../../components/Brand'
import { Icon } from '../../components/Icon'
import { Photo } from '../../components/Media'
import type { ReactNode } from 'react'
import { clockTime, dayLabel, whenShort } from '../../domain/clock'
import { ordinal } from '../../domain/format'
import { offerState } from '../../domain/waitlist'
import { useNow } from '../../lib/hooks'
import { openSheet } from '../../store/flow'

function Head({ past }: { past: boolean }) {
  return (
    <>
      <h1 className="h-page hidden lg:block" style={{ fontSize: 48 }}>Bookings</h1>
      <h1 className="sr-only lg:hidden">Bookings</h1>
      <nav className="seg" aria-label="Show">
        <Link to="/bookings" aria-current={past ? undefined : 'page'} replace>Upcoming</Link>
        <Link to="/bookings/past" aria-current={past ? 'page' : undefined} replace>Past</Link>
      </nav>
    </>
  )
}

function Rows({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

export function BookingsPage() {
  const past = useLocation().pathname.endsWith('/past')
  const q = useBookings()
  const t = useNow(15_000)
  if (q.isPending)
    return (
      <>
        <Head past={past} />
        <div className="grid gap-3 p-4 lg:px-0" aria-busy="true">
          {[0, 1].map(i => <span key={i} className="sk" style={{ height: 84 }} />)}
          <span className="sr-only" role="status">Loading your bookings</span>
        </div>
      </>
    )
  if (q.isError)
    return (
      <>
        <Head past={past} />
        <div className="state">
          <Scene name="fallen" />
          <h2>We couldn't load your bookings</h2>
          <p>Check your connection and try again.</p>
          <div className="acts"><button className="btn primary" onClick={() => q.refetch()}>Try again</button></div>
        </div>
      </>
    )
  const { upcoming, waitlist, offer, past: history } = q.data

  if (past)
    return (
      <>
        <Head past />
        {history.length ? (
          <Rows>
            {history.map(p => (
              <div key={p.id} className="bk">
                <Photo k={p.session.photo} square />
                <div>
                  <span className="t-label">{p.when}</span>
                  <b>{p.session.name}</b>
                  <span className={`pill ${p.outcome === 'Checked in' ? 'ok' : 'wait'}`}>
                    <Icon name={p.outcome === 'Checked in' ? 'check' : 'refund'} size={12} />{p.outcome}
                  </span>
                </div>
              </div>
            ))}
          </Rows>
        ) : (
          <div className="state">
            <Scene name="blank" />
            <h2>No past climbs yet</h2>
            <p>Your first visit will show here.</p>
          </div>
        )}
      </>
    )

  const live = offer ? offerState(offer.expiresAt, t) : null
  if (!upcoming.length && !waitlist.length && !(offer && live && !live.expired))
    return (
      <>
        <Head past={false} />
        <div className="state">
          <Photo k="hall" className="photo" alt="The bouldering hall with climbers on the wall" />
          <h2>No climbs booked</h2>
          <p>Pick a class or an open-climb slot. First visit? Start with Intro to Bouldering.</p>
          <div className="acts"><Link className="btn primary" to="/">See the schedule</Link></div>
        </div>
      </>
    )

  return (
    <>
      <Head past={false} />
      <Rows>
        {offer && live && !live.expired ? (
          <div className="bk offer">
            <Photo k={offer.session.photo} square />
            <div>
              <span className="t-label">Spot opened · {live.minutesLeft} min left</span>
              <b>{offer.session.name}</b>
              <span className="muted text-[13px]">Today · {offer.session.start} · confirm by {clockTime(offer.expiresAt)}</span>
            </div>
            <div className="acts"><button className="btn primary sm" onClick={() => openSheet({ kind: 'offer' })}>Confirm spot</button></div>
          </div>
        ) : null}
        {upcoming.map(b => (
          <div key={b.id} className="bk">
            <Photo k={b.session.photo} square />
            <div>
              <span className="t-label">{dayLabel(b.day)} · {b.session.start}</span>
              <b>{b.session.name}</b>
              <span className="muted text-[13px]">{b.session.room}{b.session.coach ? ` · ${b.session.coach.name}` : ''}</span>
              <br />
              {b.free ? (
                <span className="pill ok"><Icon name="refund" size={12} />Free cancel until {whenShort(b.freeCancelUntil)}</span>
              ) : (
                <span className="pill hot"><Icon name="clock" size={12} />No refund window passed</span>
              )}
            </div>
            <div className="acts">
              <button className="btn secondary sm" onClick={() => openSheet({ kind: 'checkin', bookingId: b.id })}><Icon name="qr" size={16} />Code</button>
              <button className="btn secondary sm" onClick={() => openSheet({ kind: 'cancel', bookingId: b.id })}>Cancel</button>
            </div>
          </div>
        ))}
        {waitlist.filter(w => w.sessionId !== offer?.sessionId || !live || live.expired).map(w => (
          <div key={w.id} className="bk">
            <Photo k={w.session.photo} square />
            <div>
              <span className="t-label">{dayLabel(w.day)} · {w.session.start}</span>
              <b>{w.session.name}</b>
              <span className="pill hot"><Icon name="queue" size={12} />Waitlist · {ordinal(w.place)}</span>
            </div>
            <div className="acts"><Link className="btn secondary sm" to={`/sessions/${w.sessionId}?day=${w.day}`}>View</Link></div>
          </div>
        ))}
      </Rows>
    </>
  )
}
