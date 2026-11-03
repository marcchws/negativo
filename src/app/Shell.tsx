import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router'
import { useBookings, useMe } from '../api/queries'
import { Symbol } from '../components/Brand'
import { Icon, type IconName, maskIcon } from '../components/Icon'
import { WEEK, TODAY } from '../domain/clock'
import { plural } from '../domain/format'
import { useDay, useDesktop } from '../lib/hooks'
import { Sheets } from '../features/sheets/Sheets'
import { Toaster } from '../components/Toaster'
import { Footer } from './Footer'
import { crash } from './presets'

const NAV: [to: string, label: string, icon: IconName][] = [
  ['/', 'Schedule', 'schedule'],
  ['/bookings', 'Bookings', 'bookings'],
  ['/passes', 'Passes', 'passes'],
  ['/account', 'Account', 'account'],
]

export function DayStrip() {
  const day = useDay()
  const [params] = useSearchParams()
  const show = params.get('show')
  return (
    <div className="days" role="group" aria-label="Day">
      {WEEK.map(w => (
        <Link
          key={w.day}
          to={`/?day=${w.day}${show ? `&show=${show}` : ''}`}
          className={w.day < TODAY ? 'past' : ''}
          aria-current={w.day === day ? 'date' : undefined}
        >
          <span aria-hidden="true">{w.name[0]}</span>
          <span className="sr-only">{w.name}</span>
          <b>{w.day}</b>
          <span className="sr-only"> November{w.day === TODAY ? ', today' : ''}</span>
          {w.day === TODAY ? <span className="today-dot" /> : <span className="no-dot" />}
        </Link>
      ))}
    </div>
  )
}

/** The member as initials (Equinox+). Read out as "Account", the place the link goes. */
function Avatar() {
  const me = useMe().data
  return (
    <>
      <span className={`avatar ${me?.persona === 'first' ? 'rose' : ''}`} aria-hidden="true">
        {me?.initials ?? ''}
      </span>
      <span className="sr-only">Account{me ? `, ${me.name}` : ''}</span>
    </>
  )
}

const TITLES: [RegExp, string][] = [
  [/^\/bookings/, 'Bookings'],
  [/^\/passes/, 'Passes'],
  [/^\/account/, 'Account'],
  [/^\/checkout/, 'Confirm and pay'],
  [/^\/pay\/pix/, 'Pay with Pix'],
  [/\/waiver$/, 'First visit'],
]

function MobileBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const back = /^\/(checkout|pay)|\/waiver$/.test(pathname)
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Negativo Humaitá'
  return (
    <header className="bar">
      {back ? (
        <button className="icon-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <Icon name="back" />
        </button>
      ) : (
        <Link to="/" aria-label="Negativo, schedule"><Symbol size={32} /></Link>
      )}
      <span className="title">{title}</span>
      <span />
      <Link to="/account"><Avatar /></Link>
    </header>
  )
}

function DesktopTop() {
  const me = useMe().data
  const offer = useBookings().data?.offer
  const home = useMatch('/')
  const detail = useMatch('/sessions/:id')
  const onSchedule = home || detail
  return (
    <header className="top">
      <div className="top-in">
        <Link className="brand" to="/"><Symbol size={32} />Negativo<small>Humaitá</small></Link>
        <div>{onSchedule ? <DayStrip /> : null}</div>
        <nav aria-label="Main">
          {NAV.slice(0, 3).map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className="nv">
              {label}
              {to === '/bookings' && offer ? <span className="dot" aria-label="A spot opened" /> : null}
            </NavLink>
          ))}
          <Link className="credit-btn with-icon" style={maskIcon('credit')} to="/passes">
            {plural(me?.credits ?? 0, 'credit')}
          </Link>
          <Link to="/account" style={{ marginLeft: 8 }}><Avatar /></Link>
        </nav>
      </div>
    </header>
  )
}

function Tabs() {
  const offer = useBookings().data?.offer
  return (
    <nav className="tabs" aria-label="Main">
      {NAV.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end={to === '/'}>
          <Icon name={icon} size={22} />
          {label}
          {to === '/bookings' && offer ? <span className="dot" aria-label="A spot opened" /> : null}
        </NavLink>
      ))}
    </nav>
  )
}

/** Routes that are a step in a flow: on a phone they hide the tabs, and detail and confirmed go full-bleed. */
const FLOW = /^\/(sessions|checkout|pay|confirmed|pass-active)/
const BLEED = /^\/(sessions\/[^/]+$|confirmed|pass-active)/

export function Shell() {
  // Stays armed until a reload, so React's one retry after an error cannot render past it.
  if (crash.armed) throw new Error('The error page, opened on purpose from the demo states')
  const { pathname } = useLocation()
  const desktop = useDesktop()
  const inFlow = FLOW.test(pathname) && !desktop
  const bleed = BLEED.test(pathname) && !desktop
  return (
    <div className={inFlow ? 'no-tabs' : ''}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:bg-surface focus:px-3 focus:py-2 focus:rounded-md">Skip to content</a>
      {bleed ? null : <MobileBar />}
      <DesktopTop />
      <main id="main" className={`app-main ${bleed ? 'flush' : ''}`}>
        <Outlet />
        {inFlow ? null : <Footer />}
      </main>
      {inFlow ? null : <Tabs />}
      <Sheets />
      <Toaster />
      {/* At 1440 the detail is a panel over the schedule, so opening it must not move the schedule. */}
      <ScrollRestoration getKey={l => (window.matchMedia('(min-width: 1024px)').matches && /^\/(sessions\/[^/]+)?$/.test(l.pathname) ? 'schedule' : l.key)} />
    </div>
  )
}
