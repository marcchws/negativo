import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { flow } from '../../store/flow'
import { Icon } from '../../components/Icon'
import { CancelSheet, CheckinSheet, OfferSheet, WaitlistSheet } from './BookingSheets'
import { CardSheet, CouponSheet, DeclinedSheet, ThreeDSSheet } from './PaySheets'

export function SheetHead({ title }: { title: string }) {
  return (
    <div className="sh">
      <Dialog.Title asChild><h2>{title}</h2></Dialog.Title>
      <Dialog.Close className="icon-btn" aria-label="Close"><Icon name="close" /></Dialog.Close>
    </div>
  )
}

/** Every sheet is a Radix dialog: focus moves in when it opens, and the first Escape closes it. */
export function Sheets() {
  const sheet = flow.use(f => f.sheet)
  let body: ReactNode = null
  switch (sheet?.kind) {
    case 'waitlist': body = <WaitlistSheet sessionId={sheet.sessionId} day={sheet.day} />; break
    case 'offer': body = <OfferSheet />; break
    case 'cancel': body = <CancelSheet bookingId={sheet.bookingId} />; break
    case 'coupon': body = <CouponSheet />; break
    case 'card': body = <CardSheet />; break
    case '3ds': body = <ThreeDSSheet paymentId={sheet.paymentId} />; break
    case 'declined': body = <DeclinedSheet />; break
    case 'checkin': body = <CheckinSheet bookingId={sheet.bookingId} />; break
  }
  return (
    <Dialog.Root open={!!sheet} onOpenChange={open => !open && flow.set({ sheet: null })}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim" />
        <Dialog.Content
          className="sheet"
          aria-describedby={undefined}
          // Focus lands on the field or the one action, not on the close button.
          onOpenAutoFocus={e => {
            const target = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('input:not([type=hidden]), .btn.primary:not(:disabled)')
            if (target) {
              e.preventDefault()
              target.focus()
            }
          }}
        >
          <span className="grab" aria-hidden="true" />
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
