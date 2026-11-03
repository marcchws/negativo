import type { SessionTemplate } from './sessions'

export const GEAR = { shoes: 15, harness: 10 } as const
export type Gear = { shoes: boolean; harness: boolean }
export type PayMethod = 'credits' | 'pix' | 'card'

export interface Pass {
  id: 'single' | 'ten' | 'month'
  name: string
  price: number
  per: string
  sub: string
  credits: number
  badge?: string
}

export const PASSES: Pass[] = [
  { id: 'single', name: 'Single entry', price: 70, per: 'R$ 70 a visit', sub: 'One open climb or class', credits: 1 },
  { id: 'ten', name: '10-pass', price: 560, per: 'R$ 56 a visit', sub: '10 credits · valid 6 months', credits: 10, badge: 'Save 20%' },
  { id: 'month', name: 'Monthly unlimited', price: 329, per: 'R$ 329 a month', sub: 'Every open climb, 4 classes', credits: 0 },
]
export const passById = (id: string) => PASSES.find(p => p.id === id)

/** Credits a session costs: 2 for a ropes class, 0 for the free belay check, 1 for the rest. Null: cash only. */
export const creditCost = (s: Pick<SessionTemplate, 'credits'>) => s.credits

export const canPayWithCredits = (s: Pick<SessionTemplate, 'credits'>, balance: number) =>
  s.credits !== null && s.credits > 0 && balance >= s.credits

/** Harness rental only makes sense on ropes; the boulder wall has no harness. */
export const gearAllowed = (s: Pick<SessionTemplate, 'kind' | 'category'>) => ({
  shoes: s.category !== 'Safety',
  harness: s.kind === 'ropes',
})

// ---------- coupons ----------

export const COUPONS: Record<string, { off: number; firstVisitOnly?: boolean; expiredOn?: string }> = {
  FIRSTWALL: { off: 20, firstVisitOnly: true },
  EXPIRED10: { off: 10, expiredOn: '31 Oct' },
}

export type CouponResult = { ok: true; code: string; off: number } | { ok: false; message: string }

export function validateCoupon(raw: string, ctx: { firstVisit: boolean }): CouponResult {
  const code = raw.trim().toUpperCase()
  if (!code) return { ok: false, message: 'Enter a code.' }
  const c = COUPONS[code]
  if (!c) return { ok: false, message: "We don't know that code. Check the spelling." }
  if (c.expiredOn) return { ok: false, message: `This code expired on ${c.expiredOn}.` }
  if (c.firstVisitOnly && !ctx.firstVisit) return { ok: false, message: `${code} is for a first visit only.` }
  return { ok: true, code, off: c.off }
}

// ---------- totals ----------

export type Item =
  | { kind: 'session'; session: Pick<SessionTemplate, 'name' | 'credits' | 'cash' | 'kind' | 'category'>; day: number }
  | { kind: 'pass'; pass: Pass }

export interface Totals {
  lines: { label: string; amount: number }[]
  credits: number
  subtotal: number
  off: number
  total: number
}

export function totals(input: {
  item: Item
  method: PayMethod
  gear: Gear
  shoeSize: number
  coupon: { code: string; off: number } | null
  firstVisit: boolean
}): Totals {
  const { item, method, gear } = input
  const lines: Totals['lines'] = []
  let credits = 0
  if (item.kind === 'pass') {
    lines.push({ label: item.pass.name, amount: item.pass.price })
  } else {
    const s = item.session
    const byCredits = method === 'credits' && s.credits !== null && s.credits > 0
    if (byCredits) credits = s.credits ?? 0
    else if (s.cash > 0) lines.push({ label: input.firstVisit ? `${s.name}, first visit` : s.name, amount: s.cash })
    const allowed = gearAllowed(s)
    if (gear.shoes && allowed.shoes) lines.push({ label: `Climbing shoes, size ${input.shoeSize}`, amount: GEAR.shoes })
    if (gear.harness && allowed.harness) lines.push({ label: 'Harness', amount: GEAR.harness })
  }
  const subtotal = lines.reduce((a, l) => a + l.amount, 0)
  const off = input.coupon && subtotal ? Math.min(subtotal, input.coupon.off) : 0
  return { lines, credits, subtotal, off, total: subtotal - off }
}
