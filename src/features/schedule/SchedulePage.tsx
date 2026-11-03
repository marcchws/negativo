import { Fragment, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMe, useRemind, useSchedule } from '../../api/queries'
import { Scene } from '../../components/Brand'
import { maskIcon } from '../../components/Icon'
import { Photo } from '../../components/Media'
import { clockTime, TODAY, weekday } from '../../domain/clock'
import { type Filter, matchesFilter, type PhotoKey } from '../../domain/sessions'
import { useDay, useNow } from '../../lib/hooks'
import { DayStrip } from '../../app/Shell'
import { GoalCards } from './GoalCards'
import { SessionRow } from './SessionRow'

const FILTERS: [Filter, string][] = [['all', 'All'], ['class', 'Classes'], ['open', 'Open climb'], ['ropes', 'Ropes']]

function Chips() {
  const [params] = useSearchParams()
  const day = useDay()
  const show = (params.get('show') ?? 'all') as Filter
  return (
    <div className="chips" role="group" aria-label="Show">
      {FILTERS.map(([k, l]) => (
        <Link key={k} to={`/?day=${day}${k === 'all' ? '' : `&show=${k}`}`} aria-current={show === k ? 'true' : undefined} replace>
          {l}
        </Link>
      ))}
    </div>
  )
}

function Skeleton() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rowx" aria-hidden="true">
          <span className="sk" style={{ height: 18, width: 44 }} />
          <span className="sk" style={{ height: 72 }} />
          <span style={{ display: 'grid', gap: 8 }}>
            <span className="sk" style={{ height: 12, width: '40%' }} />
            <span className="sk" style={{ height: 18, width: '70%' }} />
            <span className="sk" style={{ height: 12, width: '55%' }} />
          </span>
        </div>
      ))}
      <div className="hidden gap-4 lg:grid" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="sk" style={{ height: 212, borderRadius: 20, marginLeft: 80 }} />)}
      </div>
      <span className="sr-only" role="status">Loading the schedule</span>
    </>
  )
}

const WORKSHOPS: [PhotoKey, string, string, string, string, string][] = [
  ['lead', 'Thursday at 19:00', 'Lead Technique', 'Ropes hall · Rafa Souza', '2 h', 'Intermediate'],
  ['holds', 'Saturday at 10:00', 'Kids Crew', 'Boulder cave · ages 7–12', '60 min', 'Beginner'],
  ['hall', 'Sunday at 09:00', 'Setting day open house', 'New routes on every wall', '3 h', 'All levels'],
]

/** Tempo's rail: photo cards with a date pill, duration and level chips, and Remind me. */
function ThisWeek() {
  const [on, setOn] = useState<number[]>([])
  const remind = useRemind()
  return (
    <>
      <div className="sec-h pad"><h2 className="h-sec">This week at Negativo</h2></div>
      <div className="rail">
        {WORKSHOPS.map(([ph, when, name, sub, dur, lv], i) => {
          const pressed = on.includes(i)
          return (
            <article key={name} className="ws">
              <div className="cover">
                <Photo k={ph} />
                <span className="datep">{when}</span>
                <span className="chips2"><span className="with-icon" style={{ ...maskIcon('clock'), ['--icon-size' as string]: '13px' }}>{dur}</span><span>{lv}</span></span>
              </div>
              <div className="in">
                <b>{name}</b>
                <span className="muted text-[13px]">{sub}</span>
                <button
                  className="remind with-icon"
                  style={maskIcon(pressed ? 'check' : 'bell')}
                  aria-pressed={pressed}
                  aria-label={`${pressed ? "We'll remind you" : 'Remind me'}: ${name}`}
                  onClick={() => {
                    setOn(xs => (pressed ? xs.filter(x => x !== i) : [...xs, i]))
                    remind.mutate(i)
                  }}
                >
                  {pressed ? "We'll remind you" : 'Remind me'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

export function SchedulePage() {
  const day = useDay()
  const [params] = useSearchParams()
  const show = (params.get('show') ?? 'all') as Filter
  const q = useSchedule(day)
  const me = useMe().data
  const t = useNow(30_000)
  const nowLabel = clockTime(t)
  const sessions = q.data?.sessions ?? []
  const visible = sessions.filter(s => matchesFilter(s, show))
  const live = q.isSuccess

  let list
  if (q.isPending) list = <Skeleton />
  else if (q.isError)
    list = (
      <div className="state">
        <Scene name="fallen" />
        <h2>We couldn't load the schedule</h2>
        <p>Check your connection and try again. Your bookings are safe.</p>
        <div className="acts"><button className="btn primary" onClick={() => q.refetch()}>Try again</button></div>
      </div>
    )
  else if (!visible.length)
    list = (
      <div className="state">
        <Photo k="lobby" className="photo" alt="The lobby benches beside the wall" />
        <h2>{day < TODAY ? 'This day has passed' : 'Nothing in this filter'}</h2>
        <p>{day < TODAY ? 'Pick today or a day ahead to book.' : 'Try All, or another day.'}</p>
        <div className="acts"><Link className="btn secondary" to="/">Back to today</Link></div>
      </div>
    )
  else {
    let nowDone = day !== TODAY
    list = visible.map(s => {
      const line = !nowDone && s.start > nowLabel
      if (line) nowDone = true
      return (
        <Fragment key={s.id}>
          {line ? <div className="nowline" role="separator" aria-label={`Now, ${nowLabel}`}><b>{nowLabel}</b><i /></div> : null}
          <SessionRow s={s} me={me} />
        </Fragment>
      )
    })
  }

  // One set of goal cards: above the day strip on a phone, under the date heading at 1440.
  return (
    <>
      <div className="flex flex-col">
        <div className="lg:order-2">{day === TODAY && live ? <GoalCards sessions={sessions} /> : null}</div>
        <div className="lg:hidden"><DayStrip /></div>
        <div className="head-desk pad lg:order-1">
          <h1 className="date-h">
            {day === TODAY ? 'Today' : weekday(day)}, {day} Nov
            <span>{q.isPending ? 'Loading…' : q.isError ? 'Schedule unavailable' : `${visible.length} sessions · open 06:00–23:00`}</span>
          </h1>
          <div className="hidden lg:block"><Chips /></div>
        </div>
        <div className="lg:hidden"><Chips /></div>
      </div>
      <div className="rows">{list}</div>
      {live ? <ThisWeek /> : null}
    </>
  )
}
