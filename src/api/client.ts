import type { Confirmation } from './types'

export class ApiError extends Error {
  status: number
  body: Record<string, unknown>
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.message === 'string' ? body.message : `Request failed (${status})`)
    this.status = status
    this.body = body
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError(res.status, data)
  return data as T
}

export const confirmationPath = (c: Confirmation) => (c.kind === 'booking' ? `/confirmed/${c.bookingId}` : `/pass-active/${c.passId}`)
