import { at } from './clock'

/** Minutes the next in line has to confirm an opened spot. */
export const OFFER_MINUTES = 30
/** The list closes this long before the start. */
export const CLOSES_BEFORE_MS = 3600_000

export const offerExpiry = (openedAt: number) => openedAt + OFFER_MINUTES * 60_000

export const offerState = (expiresAt: number, nowMs: number) => {
  const left = expiresAt - nowMs
  return { expired: left <= 0, minutesLeft: Math.max(0, Math.ceil(left / 60_000)) }
}

export const waitlistOpen = (day: number, start: string, nowMs: number) => at(day, start) - nowMs > CLOSES_BEFORE_MS

// ---------- Pix ----------

/** Brazilian checkouts give a Pix code 30 minutes (Amazon.com.br, Mercado Pago's minimum, read 2026-11-02). */
export const PIX_MINUTES = 30
/** Under this, the countdown turns rose. */
export const PIX_LOW_SECONDS = 120

export const secondsLeft = (expiresAt: number, nowMs: number) => Math.max(0, Math.ceil((expiresAt - nowMs) / 1000))
