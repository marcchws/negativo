import { Link, useRouteError } from 'react-router'
import { Scene, Symbol } from '../../components/Brand'

export function NotFound() {
  return (
    <div className="state">
      <Scene name="fallen" />
      <h1 className="h-sec" style={{ marginTop: 8 }}>This page fell off the wall</h1>
      <p>The link may be old, or the session is no longer on the schedule.</p>
      <div className="acts"><Link className="btn primary" to="/">See the schedule</Link></div>
    </div>
  )
}

/** The error boundary: shown when a screen breaks, with the whole shell gone, so it stands on its own. */
export function ErrorPage() {
  const error = useRouteError()
  if (error instanceof Error) console.error(error)
  return (
    <main className="mx-auto grid min-h-screen max-w-[560px] content-center px-4">
      <div className="mb-2 flex justify-center"><Symbol size={40} /></div>
      <div className="state">
        <Scene name="fallen" />
        <h1 className="h-sec" style={{ marginTop: 8 }}>Something broke on our side</h1>
        <p>Your bookings are safe. Reload the page, or go back to the schedule.</p>
        <div className="acts">
          <button className="btn primary" onClick={() => window.location.reload()}>Reload</button>
          <a className="btn secondary" href="/">See the schedule</a>
        </div>
      </div>
    </main>
  )
}
