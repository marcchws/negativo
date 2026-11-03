import { at } from './clock'

export const FREE_CANCEL_HOURS = 12
const WINDOW_MS = FREE_CANCEL_HOURS * 3600_000

export interface CancelWindow {
  /** Still before the deadline: full refund, or the credit back. */
  free: boolean
  /** Epoch ms of the last moment a cancel is free. */
  deadline: number
}

export const cancelWindow = (day: number, start: string, nowMs: number): CancelWindow => {
  const deadline = at(day, start) - WINDOW_MS
  return { free: nowMs < deadline, deadline }
}

export type CancelOutcome =
  | { kind: 'credit-back'; credits: number }
  | { kind: 'refund'; amount: number }
  | { kind: 'passed-on'; credits: number; amount: number }

/**
 * Inside 12 hours nothing comes back at once: the spot goes to the waitlist, and the credit or refund
 * returns only if someone takes it. Outside, the climber gets back exactly what they paid.
 */
export const cancelOutcome = (paid: { credits: number; amount: number }, free: boolean): CancelOutcome => {
  if (!free) return { kind: 'passed-on', credits: paid.credits, amount: paid.amount }
  return paid.credits ? { kind: 'credit-back', credits: paid.credits } : { kind: 'refund', amount: paid.amount }
}
