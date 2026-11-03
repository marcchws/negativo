import { useEffect, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router'
import { now, TODAY } from '../domain/clock'

const DESKTOP = '(min-width: 1024px)'

/** From 1024 px up the app copies Open's web schedule; below it is the phone layout. */
export function useDesktop() {
  return useSyncExternalStore(
    cb => {
      const m = window.matchMedia(DESKTOP)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(DESKTOP).matches,
  )
}

/** The demo clock, re-read every `ms`. */
export function useNow(ms = 1000) {
  const [t, setT] = useState(now)
  useEffect(() => {
    const id = window.setInterval(() => setT(now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return t
}

export function useDay() {
  const [params] = useSearchParams()
  const d = Number(params.get('day'))
  return d >= 2 && d <= 8 ? d : TODAY
}
