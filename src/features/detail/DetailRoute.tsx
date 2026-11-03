import { Dialog } from 'radix-ui'
import { useNavigate, useParams } from 'react-router'
import { useSession } from '../../api/queries'
import { Scene } from '../../components/Brand'
import { useDay, useDesktop } from '../../lib/hooks'
import { flow } from '../../store/flow'
import { SchedulePage } from '../schedule/SchedulePage'
import { NotFound } from '../errors/NotFound'
import { SessionDetail } from './SessionDetail'

function DetailBody({ id, day, onClose, inPanel }: { id: string; day: number; onClose: () => void; inPanel: boolean }) {
  const q = useSession(id, day)
  if (q.isPending)
    return (
      <div aria-busy="true">
        <span className="sk" style={{ height: inPanel ? 260 : 300, borderRadius: 0 }} />
        <div className="grid gap-3 p-4">
          <span className="sk" style={{ height: 12, width: '30%' }} />
          <span className="sk" style={{ height: 30, width: '70%' }} />
          <span className="sk" style={{ height: 14, width: '50%' }} />
        </div>
        <span className="sr-only" role="status">Loading the session</span>
      </div>
    )
  if (q.isError)
    return q.error && 'status' in q.error && q.error.status === 404 ? (
      <NotFound />
    ) : (
      <div className="state">
        <Scene name="fallen" />
        <h2>We couldn't load this session</h2>
        <p>Check your connection and try again.</p>
        <div className="acts"><button className="btn primary" onClick={() => q.refetch()}>Try again</button></div>
      </div>
    )
  return <SessionDetail s={q.data} onClose={onClose} inPanel={inPanel} />
}

/** At 390 the class detail is its own screen; from 1024 up it is a side panel over the schedule (Time2book). */
export function DetailRoute() {
  const { id = '' } = useParams()
  const day = useDay()
  const desktop = useDesktop()
  const navigate = useNavigate()
  const close = () => navigate(`/?day=${day}`)
  if (!desktop) return <DetailBody id={id} day={day} onClose={() => navigate(-1)} inPanel={false} />
  return (
    <>
      <SchedulePage />
      <Dialog.Root
        open
        // A sheet opened from the panel takes the first Escape; the panel closes on the next one.
        onOpenChange={open => !open && !flow.get().sheet && close()}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="panel-scrim" />
          <Dialog.Content className="panel" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Session details</Dialog.Title>
            <DetailBody id={id} day={day} onClose={close} inPanel />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
