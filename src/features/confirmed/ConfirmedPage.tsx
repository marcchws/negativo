import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useBookings, useMe } from '../../api/queries'
import type { BookingView } from '../../api/types'
import { Icon } from '../../components/Icon'
import { Photo, QR } from '../../components/Media'
import { dayLabel } from '../../domain/clock'
import { brl, plural } from '../../domain/format'
import { passById } from '../../domain/pricing'
import { openSheet } from '../../store/flow'
import { NotFound } from '../errors/NotFound'

const pad = (n: number) => String(n).padStart(2, '0')

/** An .ics file the climber's calendar can open; times are written in UTC from the demo's Rio times. */
function calendarHref(b: BookingView) {
  const utc = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number)
    // Rio is UTC−3 all year.
    return `202611${pad(b.day + (h + 3 >= 24 ? 1 : 0))}T${pad((h + 3) % 24)}${pad(m)}00Z`
  }
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Negativo demo//EN', 'BEGIN:VEVENT',
    `UID:${b.id}@negativo.demo`, `DTSTAMP:20261103T202000Z`,
    `DTSTART:${utc(b.session.start)}`, `DTEND:${utc(b.session.end)}`,
    `SUMMARY:${b.session.name} at Negativo`, `LOCATION:${b.session.room}, Negativo Humaitá, Rio de Janeiro`,
    `DESCRIPTION:Check-in code ${b.code}. Arrive 10 minutes early.`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}

function Shell({ photo, big, line, children }: { photo: Parameters<typeof Photo>[0]['k']; big: string; line: string; children: ReactNode }) {
  return (
    <div className="conf">
      <div className="hero">
        <Photo k={photo} eager />
        <div className="t"><h1 className="big">{big}</h1><p>{line}</p></div>
      </div>
      <div className="body">{children}</div>
    </div>
  )
}

/** Open's "Confirmed": a photo hero on a Night gradient, then the Night ticket with the check-in code. */
export function ConfirmedPage() {
  const { bookingId } = useParams()
  const q = useBookings()
  const me = useMe().data
  if (q.isPending) return <div className="sk" style={{ height: 520 }} aria-busy="true" />
  const b = q.data?.upcoming.find(x => x.id === bookingId)
  if (!b) return <NotFound />
  const s = b.session
  return (
    <Shell photo={s.photo} big="You're in" line={`${s.name} · ${dayLabel(b.day)} · ${s.start}`}>
      <div className="ticket">
        <div><small>Check-in code</small><b>{b.code}</b><small>Show it at the desk, or scan at the gate.</small></div>
        <div className="qrmini"><QR seed={4421} n={21} label={`Check-in QR for ${b.code} (demo)`} /></div>
      </div>
      <dl className="policy">
        <dt>When</dt><dd>{dayLabel(b.day)}, {s.start}–{s.end}. Arrive 10 minutes early.</dd>
        <dt>Where</dt><dd>{s.room}, Negativo Humaitá</dd>
        {s.coach ? <><dt>Coach</dt><dd>{s.coach.name}</dd></> : null}
        <dt>Paid</dt>
        <dd>{b.paid.credits ? `${plural(b.paid.credits, 'credit')} · ${me?.credits ?? 0} left` : b.paid.amount ? brl(b.paid.amount) : 'Free'}</dd>
      </dl>
      {b.gear.shoes || b.gear.harness ? (
        <div className="notice ok">
          <Icon name="shoe" size={18} />
          <span>
            <b>{[b.gear.shoes && `Shoes in size ${b.shoeSize}`, b.gear.harness && 'a harness'].filter(Boolean).join(' and ')} will be at the desk.</b>
            {b.paid.method === 'credits' ? 'Pay for them when you pick them up.' : 'Already paid with your booking.'}
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <a className="btn secondary" href={calendarHref(b)} download={`negativo-${s.id}.ics`}><Icon name="schedule" size={18} />Add to calendar</a>
        <button className="btn secondary" onClick={() => openSheet({ kind: 'cancel', bookingId: b.id })}>Manage</button>
      </div>
      <p className="muted text-[14px]">
        {b.free
          ? 'Cancel until 12 hours before for a full refund or the credit back.'
          : "It starts in less than 12 hours, so there's no refund if you cancel. You can still pass your spot to the waitlist."}
      </p>
      <Link className="btn primary wide" to="/">Back to the schedule</Link>
    </Shell>
  )
}

export function PassActivePage() {
  const { passId = '' } = useParams()
  const pass = passById(passId)
  const me = useMe().data
  if (!pass) return <NotFound />
  return (
    <Shell photo="hall" big="Pass active" line={pass.name}>
      <div className="ticket">
        <div>
          <small>{pass.name}</small>
          <b>{pass.id === 'month' ? 'Unlimited' : plural(me?.credits ?? pass.credits, 'credit')}</b>
          <small>{pass.id === 'ten' ? 'On your account until 2 May 2027.' : pass.id === 'month' ? 'Every open climb and 4 classes. Renews on 3 Dec.' : 'One visit, valid for 30 days.'}</small>
        </div>
        <Icon name="passes" size={40} />
      </div>
      <p className="muted text-[14px]">The receipt is in Account. Credits work for any open climb or class; ropes classes take 2.</p>
      <Link className="btn primary wide" to="/">Book a climb</Link>
      <Link className="btn secondary wide" to="/account">See receipts</Link>
    </Shell>
  )
}
