import { Dialog } from 'radix-ui'
import { useNavigate } from 'react-router'
import { api, confirmationPath } from '../../api/client'
import { queryClient, useAcceptOffer, useBookings, useCancelBooking, useDeclineOffer, useJoinWaitlist, useMe, useSession } from '../../api/queries'
import { Icon } from '../../components/Icon'
import { Photo, QR } from '../../components/Media'
import { clockTime, dayLabel, TODAY } from '../../domain/clock'
import { brl, ordinal, plural } from '../../domain/format'
import { offerState } from '../../domain/waitlist'
import { useNow } from '../../lib/hooks'
import { closeSheet } from '../../store/flow'
import { toast } from '../../store/toasts'
import { SheetHead } from './Sheets'

/** Fresha and Luma: the session photo, how many are ahead, and the three rules. */
export function WaitlistSheet({ sessionId, day }: { sessionId: string; day: number }) {
  const s = useSession(sessionId, day).data
  const me = useMe().data
  const join = useJoinWaitlist()
  if (!s) return <SheetHead title="Join the waitlist" />
  const pay = me?.persona === 'first' || s.credits === null ? brl(s.cash) : plural(s.credits ?? 1, 'credit')
  return (
    <>
      <SheetHead title="Join the waitlist" />
      <div className="art"><Photo k={s.photo} /></div>
      <p><b>{s.name}</b> · {dayLabel(day)} {s.start}. {plural(s.waiting, 'person is', 'people are')} ahead of you.</p>
      <dl className="pol2">
        <dt>If a spot opens</dt><dd>We message you. You have 30 minutes to confirm.</dd>
        <dt>Payment</dt><dd>{pay}, only when you confirm.</dd>
        <dt>Until</dt><dd>The list closes 1 hour before the class.</dd>
      </dl>
      <button
        className="btn primary wide"
        aria-busy={join.isPending}
        onClick={() =>
          !join.isPending &&
          join.mutate(
            { id: s.id, day, waiting: s.waiting },
            {
              onSuccess: entry => {
                closeSheet()
                toast(`You're ${ordinal(entry.place)} in line for ${s.name}`, () => void undoJoin(entry.id))
              },
              onError: () => toast("We couldn't add you to the list. Try again."),
            },
          )
        }
      >
        {join.isPending ? <><span className="spin" aria-hidden="true" />Joining</> : 'Join waitlist'}
      </button>
    </>
  )
}

/** Undo runs after the sheet has closed, so it talks to the API directly instead of through the sheet's hooks. */
const undoJoin = (entryId: string) =>
  api(`/api/waitlist/${entryId}`, { method: 'DELETE' })
    .then(() => queryClient.invalidateQueries())
    .then(() => toast('You left the waitlist'))

/** "Confirm by 17:44 · 24 minutes left", 1 credit, Confirm my spot, and Pass it on. */
export function OfferSheet() {
  const offer = useBookings().data?.offer
  const t = useNow(1000)
  const accept = useAcceptOffer()
  const decline = useDeclineOffer()
  const navigate = useNavigate()
  if (!offer) return <SheetHead title="This offer is gone" />
  const left = offerState(offer.expiresAt, t)
  return (
    <>
      <SheetHead title={`A spot opened in ${offer.session.name}`} />
      <div className="art"><Photo k={offer.session.photo} /></div>
      {left.expired ? (
        <div className="notice err" role="alert"><Icon name="alert" size={18} /><span><b>The 30 minutes ran out</b>The spot went to the next in line. You're still on the list.</span></div>
      ) : (
        <div className="notice hot">
          <Icon name="clock" size={18} />
          <span><b>Confirm by {clockTime(offer.expiresAt)} · {plural(left.minutesLeft, 'minute')} left</b>After that it goes to the next in line.</span>
        </div>
      )}
      <p>{dayLabel(offer.day)} {offer.session.start}–{offer.session.end}{offer.session.coachName ? ` with ${offer.session.coachName}` : ''}. <b>{plural(offer.credits, 'credit')}</b> from your pass.</p>
      {accept.isError ? <div className="notice err" role="alert"><Icon name="alert" size={18} /><span><b>We couldn't confirm it</b>{accept.error.message}</span></div> : null}
      <button
        className="btn primary wide"
        disabled={left.expired}
        aria-busy={accept.isPending}
        onClick={() =>
          !accept.isPending &&
          accept.mutate(offer.id, {
            onSuccess: r => {
              closeSheet()
              if (r.status === 'confirmed') navigate(confirmationPath(r.confirmation))
            },
          })
        }
      >
        {accept.isPending ? <><span className="spin" aria-hidden="true" />Confirming</> : 'Confirm my spot'}
      </button>
      <button
        className="btn secondary wide"
        onClick={() =>
          decline.mutate(offer.id, {
            onSuccess: () => {
              closeSheet()
              toast('Passed on. The next climber gets the spot.')
            },
          })
        }
      >
        Pass it on
      </button>
    </>
  )
}

/** Fresha's two windows with "that's now", Agoda's refund lines. */
export function CancelSheet({ bookingId }: { bookingId: string }) {
  const b = useBookings().data?.upcoming.find(x => x.id === bookingId)
  const me = useMe().data
  const cancel = useCancelBooking()
  const navigate = useNavigate()
  if (!b) return <SheetHead title="This booking is gone" />
  const late = !b.free
  const paidCash = b.paid.amount > 0 && !b.paid.credits
  const back = paidCash ? brl(b.paid.amount) : b.paid.credits ? plural(b.paid.credits, 'credit') : 'Nothing to refund'
  const run = () =>
    !cancel.isPending &&
    cancel.mutate(b.id, {
      onSuccess: ({ outcome }) => {
        closeSheet()
        navigate('/bookings')
        if (outcome.kind === 'credit-back') toast(`Cancelled. ${plural(outcome.credits, 'credit')} back on your ${me?.pass?.name ?? 'pass'}.`)
        else if (outcome.kind === 'refund') toast(`Cancelled. ${brl(outcome.amount)} is on its way back to you.`)
        else toast(`Your spot went to the waitlist. If someone takes it, ${outcome.credits ? 'your credit comes back' : 'you get a refund'}.`)
      },
      onError: () => toast("We couldn't cancel it. Try again."),
    })
  return (
    <>
      <SheetHead title={`Cancel ${b.session.name}?`} />
      <p className="muted text-[14px]" style={{ marginTop: -6 }}>{dayLabel(b.day)} · {b.session.start} · {b.session.room}</p>
      <dl className="pol2">
        <dt className={late ? '' : 'now'}>Until 12 h before</dt>
        <dd className={late ? '' : 'now'}>{paidCash ? 'Full refund' : 'Your credit back'}{late ? '' : ' · that’s now'}</dd>
        <dt className={late ? 'now' : ''}>After that</dt>
        <dd className={late ? 'now' : ''}>No refund. Pass your spot to the waitlist.{late ? ' · that’s now' : ''}</dd>
      </dl>
      {late ? (
        <div className="notice hot">
          <Icon name="info" size={18} />
          <span><b>No refund for this one</b>It starts in less than 12 hours. If someone on the waitlist takes your spot, {paidCash ? 'you get a refund' : 'your credit comes back'}.</span>
        </div>
      ) : (
        <div className="box price-rows" style={{ padding: 14 }}>
          <div><span>Paid</span><span>{back}</span></div>
          <div className="tot"><span>{paidCash ? 'Refund to your Pix or card' : `Back to your ${me?.pass?.name ?? 'pass'}`}</span><span>{back}</span></div>
        </div>
      )}
      <button className={`btn ${late ? 'primary' : 'danger'} wide`} onClick={run} aria-busy={cancel.isPending}>
        {cancel.isPending ? <><span className="spin" aria-hidden="true" />Cancelling</> : late ? 'Pass my spot to the waitlist' : 'Cancel and refund'}
      </button>
      <Dialog.Close className="btn secondary wide">Keep my booking</Dialog.Close>
    </>
  )
}

export function CheckinSheet({ bookingId }: { bookingId: string }) {
  const b = useBookings().data?.upcoming.find(x => x.id === bookingId)
  return (
    <>
      <SheetHead title="Check-in code" />
      {b ? (
        <div className="ticket">
          <div>
            <small>{b.session.name} · {b.day === TODAY ? 'Today' : dayLabel(b.day)} {b.session.start}</small>
            <b style={{ fontSize: 24 }}>{b.code}</b>
            <small>Scan at the gate, or show the desk.</small>
          </div>
          <div className="qrmini lg"><QR seed={911} n={25} label={`Check-in QR for ${b.code} (demo)`} /></div>
        </div>
      ) : (
        <p className="muted">This booking is gone.</p>
      )}
    </>
  )
}
