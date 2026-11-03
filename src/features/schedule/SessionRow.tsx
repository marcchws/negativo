import { Link } from 'react-router'
import type { Me, SessionView } from '../../api/types'
import { CoachFace, Photo } from '../../components/Media'
import { Icon } from '../../components/Icon'
import { shortDay } from '../../domain/clock'
import { brl, ordinal } from '../../domain/format'
import { categoryTone } from '../../domain/sessions'

function Meter({ s }: { s: SessionView }) {
  const tight = s.capacity - s.taken <= 1
  return (
    <span className={`spots ${tight ? 'tight' : ''}`}>
      <span className="m" aria-hidden="true"><span style={{ width: `${(100 * s.taken) / s.capacity}%` }} /></span>
      <span><span className="sr-only">Spots taken: </span>{s.taken}/{s.capacity}</span>
    </span>
  )
}

const priceLabel = (s: SessionView, me: Me | undefined) => {
  if (s.cash === 0) return 'Free'
  if (s.credits === null || me?.persona === 'first') return brl(s.cash)
  return s.credits === 1 ? '1 credit' : `${s.credits} credits`
}

export function Status({ s, me }: { s: SessionView; me: Me | undefined }) {
  switch (s.status) {
    case 'booked':
      return <><span className="pill ok"><Icon name="check" size={13} />Booked</span><Meter s={s} /></>
    case 'waiting':
      return <span className="pill hot"><Icon name="queue" size={13} />On waitlist · {ordinal(s.place ?? 1)}</span>
    case 'full':
      return <span className="pill wait"><Icon name="queue" size={13} />Full · {s.waiting} waiting</span>
    case 'locked':
      return <><span className="pill hot"><Icon name="lock" size={13} />Belay check first</span><Meter s={s} /></>
    case 'last':
      return <><span className="pill hot"><Icon name="clock" size={13} />1 spot left</span><Meter s={s} /></>
    default: {
      const left = s.capacity - s.taken
      return <><Meter s={s} /><span className="spots">· {left <= 4 ? `${left} left` : priceLabel(s, me)}</span></>
    }
  }
}

const ctaLabel = (s: SessionView) =>
  s.status === 'booked' ? 'Manage' : s.status === 'waiting' ? 'View' : s.status === 'full' ? 'Join waitlist →' : 'Book →'

export function SessionRow({ s, me }: { s: SessionView; me: Me | undefined }) {
  const to = `/sessions/${s.id}?day=${s.day}`
  const booked = s.status === 'booked'
  const tone = categoryTone(s.category)
  return (
    <>
      {/* 390: Open's schedule row */}
      <Link className={`rowx ${booked ? 'booked' : ''}`} to={to}>
        <span className="tm">{s.start}<small>{s.duration}</small></span>
        <Photo k={s.photo} square className="ph" />
        <span>
          <span className={`cat ${tone}`}>{s.category}</span>
          <span className="nm">{s.name}</span>
          <span className="mt">{s.room}{s.coach ? ` · ${s.coach.name}` : ''}</span>
          <span className="st"><Status s={s} me={me} /></span>
        </span>
      </Link>
      {/* 1440: Open's web card, photo on the left half */}
      <div className={`wcard ${booked ? 'booked' : ''}`}>
        <div className="tm">{s.start}<small>{s.end}</small></div>
        <Link className="card-in" to={to}>
          <Photo k={s.photo} />
          <span className="txt">
            <span className={`cat ${tone}`}>{s.category}</span>
            <span className="nm">{s.name}</span>
            <span className="with">
              {s.coach ? `with ${s.coach.name} · ` : ''}{s.room}<br />{shortDay(s.day)} {s.day} Nov · {s.start}–{s.end}
            </span>
            {s.coach?.photo ? <CoachFace k={s.coach.photo} className="coachp" /> : null}
            <span className="foot">
              <span className="left"><Status s={s} me={me} /></span>
              <span className={`btn sm ${booked || s.status === 'waiting' ? 'secondary' : 'outlined'}`}>{ctaLabel(s)}</span>
            </span>
          </span>
        </Link>
      </div>
    </>
  )
}
