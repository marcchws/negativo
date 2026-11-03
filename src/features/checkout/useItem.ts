import { useSearchParams } from 'react-router'
import { useMe, useSession } from '../../api/queries'
import type { CheckoutItem, CheckoutRequest, SessionView } from '../../api/types'
import { dayLabel } from '../../domain/clock'
import { type Pass, passById, totals } from '../../domain/pricing'
import type { PhotoKey } from '../../domain/sessions'
import { type Flow, flow } from '../../store/flow'

export interface Resolved {
  item: CheckoutItem
  session?: SessionView
  pass?: Pass
  title: string
  sub: string
  photo: PhotoKey
}

/** What is being paid for, from the URL: `?session=lt-1900&day=5` or `?pass=ten`. */
export function useCheckoutItem(fromItem?: CheckoutItem) {
  const [params] = useSearchParams()
  const item: CheckoutItem | null =
    fromItem ??
    (params.get('pass')
      ? { kind: 'pass', passId: params.get('pass') ?? '' }
      : params.get('session')
        ? { kind: 'session', sessionId: params.get('session') ?? '', day: Number(params.get('day') ?? 3) }
        : null)
  const sq = useSession(item?.kind === 'session' ? item.sessionId : undefined, item?.kind === 'session' ? item.day : 3)
  const me = useMe()
  if (!item) return { status: 'missing' as const }
  if (item.kind === 'pass') {
    const pass = passById(item.passId)
    if (!pass) return { status: 'missing' as const }
    const r: Resolved = { item, pass, title: pass.name, sub: pass.sub, photo: 'hall' }
    return { status: me.isSuccess ? ('ready' as const) : ('loading' as const), me: me.data, r }
  }
  if (sq.isError) return { status: 'missing' as const }
  if (!sq.data || !me.data) return { status: 'loading' as const }
  const s = sq.data
  const r: Resolved = { item, session: s, title: s.name, sub: `${dayLabel(s.day)} · ${s.start}–${s.end} · ${s.room}`, photo: s.photo }
  return { status: 'ready' as const, me: me.data, r }
}

export function totalsFor(r: Resolved, f: Pick<Flow, 'pay' | 'gear' | 'shoeSize' | 'coupon'>, firstVisit: boolean) {
  return totals({
    item: r.pass ? { kind: 'pass', pass: r.pass } : { kind: 'session', session: r.session as SessionView, day: r.session?.day ?? 3 },
    method: f.pay,
    gear: f.gear,
    shoeSize: f.shoeSize,
    coupon: f.coupon,
    firstVisit,
  })
}

export const requestFor = (item: CheckoutItem): CheckoutRequest => {
  const f = flow.get()
  return { item, method: f.pay, card: f.card, coupon: f.coupon?.code ?? null, gear: f.gear, shoeSize: f.shoeSize }
}

export const checkoutPath = (item: CheckoutItem) =>
  item.kind === 'pass' ? `/checkout?pass=${item.passId}` : `/checkout?session=${item.sessionId}&day=${item.day}`
