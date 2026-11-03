import { createBrowserRouter } from 'react-router'
import { AccountPage } from '../features/account/AccountPage'
import { BookingsPage } from '../features/bookings/BookingsPage'
import { CheckoutPage } from '../features/checkout/CheckoutPage'
import { ConfirmedPage, PassActivePage } from '../features/confirmed/ConfirmedPage'
import { DetailRoute } from '../features/detail/DetailRoute'
import { ErrorPage, NotFound } from '../features/errors/NotFound'
import { PassesPage } from '../features/passes/PassesPage'
import { PixPage } from '../features/pix/PixPage'
import { SchedulePage } from '../features/schedule/SchedulePage'
import { WaiverPage } from '../features/waiver/WaiverPage'
import { Shell } from './Shell'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Shell,
    ErrorBoundary: ErrorPage,
    children: [
      { index: true, Component: SchedulePage },
      { path: 'sessions/:id', Component: DetailRoute },
      { path: 'sessions/:id/waiver', Component: WaiverPage },
      { path: 'checkout', Component: CheckoutPage },
      { path: 'pay/pix/:paymentId', Component: PixPage },
      { path: 'confirmed/:bookingId', Component: ConfirmedPage },
      { path: 'pass-active/:passId', Component: PassActivePage },
      { path: 'bookings', Component: BookingsPage },
      { path: 'bookings/past', Component: BookingsPage },
      { path: 'passes', Component: PassesPage },
      { path: 'account', Component: AccountPage },
      { path: '*', Component: NotFound },
    ],
  },
])
