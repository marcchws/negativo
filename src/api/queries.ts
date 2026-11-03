import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  BookingsResponse, CancelResponse, CheckoutRequest, CheckoutResponse, DemoScenario, DemoState, Me,
  OccupancyResponse, Payment, ScheduleResponse, SessionView,
} from './types'

export const queryClient = new QueryClient({
  defaultOptions: {
    // A failed load shows its own state with Try again; silent retries would hide it for seconds.
    queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})

export const keys = {
  me: ['me'] as const,
  schedule: (day: number) => ['schedule', day] as const,
  occupancy: (day: number) => ['occupancy', day] as const,
  session: (id: string, day: number) => ['session', id, day] as const,
  bookings: ['bookings'] as const,
  payment: (id: string) => ['payment', id] as const,
  demo: ['demo'] as const,
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api<Me>('/api/me') })
export const useSchedule = (day: number) =>
  useQuery({ queryKey: keys.schedule(day), queryFn: () => api<ScheduleResponse>(`/api/schedule?day=${day}`) })
export const useOccupancy = (day: number) =>
  useQuery({ queryKey: keys.occupancy(day), queryFn: () => api<OccupancyResponse>(`/api/occupancy?day=${day}`) })
export const useSession = (id: string | undefined, day: number) =>
  useQuery({ queryKey: keys.session(id ?? '', day), queryFn: () => api<SessionView>(`/api/sessions/${id}?day=${day}`), enabled: !!id })
export const useBookings = () => useQuery({ queryKey: keys.bookings, queryFn: () => api<BookingsResponse>('/api/bookings') })
export const useDemo = () => useQuery({ queryKey: keys.demo, queryFn: () => api<DemoState>('/api/demo') })

/** Pix status by polling, every 2 s while the code waits. */
export const usePayment = (id: string | undefined) =>
  useQuery({
    queryKey: keys.payment(id ?? ''),
    queryFn: () => api<Payment>(`/api/payments/${id}`),
    enabled: !!id,
    refetchInterval: q => (q.state.data?.status === 'waiting' ? 2000 : false),
  })

const useInvalidateAll = () => {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ predicate: q => q.queryKey[0] !== 'payment' })
}

/** Patches one session in every cached schedule and detail; returns a rollback. */
function patchSession(qc: QueryClient, id: string, day: number, patch: Partial<SessionView>) {
  const sk = keys.schedule(day)
  const dk = keys.session(id, day)
  const prevSchedule = qc.getQueryData<ScheduleResponse>(sk)
  const prevDetail = qc.getQueryData<SessionView>(dk)
  if (prevSchedule) qc.setQueryData<ScheduleResponse>(sk, { ...prevSchedule, sessions: prevSchedule.sessions.map(s => (s.id === id ? { ...s, ...patch } : s)) })
  if (prevDetail) qc.setQueryData<SessionView>(dk, { ...prevDetail, ...patch })
  return () => {
    qc.setQueryData(sk, prevSchedule)
    qc.setQueryData(dk, prevDetail)
  }
}

/** Booking with credits or a free session: the schedule shows "Booked" at once and rolls back if the call fails. */
export function useBook() {
  const qc = useQueryClient()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (req: CheckoutRequest) => api<CheckoutResponse>('/api/bookings', { method: 'POST', body: req }),
    onMutate: async req => {
      if (req.item.kind !== 'session') return undefined
      await qc.cancelQueries({ queryKey: keys.schedule(req.item.day) })
      const prevMe = qc.getQueryData<Me>(keys.me)
      const s = qc.getQueryData<SessionView>(keys.session(req.item.sessionId, req.item.day))
      const rollback = patchSession(qc, req.item.sessionId, req.item.day, { status: 'booked', taken: (s?.taken ?? 0) + 1 })
      if (prevMe && s?.credits) qc.setQueryData<Me>(keys.me, { ...prevMe, credits: prevMe.credits - s.credits })
      return () => {
        rollback()
        qc.setQueryData(keys.me, prevMe)
      }
    },
    onError: (_e, _v, rollback) => rollback?.(),
    onSettled: invalidate,
  })
}

export function useCheckout() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (req: CheckoutRequest) => api<CheckoutResponse>('/api/checkout', { method: 'POST', body: req }),
    onSuccess: r => {
      if (r.status === 'confirmed') invalidate()
    },
  })
}

export function useCancelBooking() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: string) => api<CancelResponse>(`/api/bookings/${id}`, { method: 'DELETE' }),
    onSettled: invalidate,
  })
}

/** Joining shows the place in line at once and rolls back if the call fails. */
export function useJoinWaitlist() {
  const qc = useQueryClient()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, day }: { id: string; day: number; waiting: number }) =>
      api<{ id: string; place: number }>(`/api/sessions/${id}/waitlist`, { method: 'POST', body: { day } }),
    onMutate: ({ id, day, waiting }) => patchSession(qc, id, day, { status: 'waiting', place: waiting + 1 }),
    onError: (_e, _v, rollback) => rollback?.(),
    onSettled: invalidate,
  })
}

export function useLeaveWaitlist() {
  const qc = useQueryClient()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ entryId }: { entryId: string; sessionId: string; day: number }) => api<void>(`/api/waitlist/${entryId}`, { method: 'DELETE' }),
    onMutate: ({ sessionId, day }) => patchSession(qc, sessionId, day, { status: 'full', place: undefined }),
    onError: (_e, _v, rollback) => rollback?.(),
    onSettled: invalidate,
  })
}

export function useAcceptOffer() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: string) => api<CheckoutResponse>(`/api/offers/${id}/accept`, { method: 'POST' }),
    onSettled: invalidate,
  })
}

export function useDeclineOffer() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/offers/${id}/decline`, { method: 'POST' }),
    onSettled: invalidate,
  })
}

export const useValidateCoupon = () =>
  useMutation({ mutationFn: (code: string) => api<{ ok: true; code: string; off: number }>('/api/coupons/validate', { method: 'POST', body: { code } }) })

export function useSimulatePix() {
  const qc = useQueryClient()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: string) => api<Payment>(`/api/payments/${id}/simulate`, { method: 'POST' }),
    onSuccess: p => {
      qc.setQueryData(keys.payment(p.id), p)
      invalidate()
    },
  })
}

export function useVerify3ds() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) => api<Payment>(`/api/payments/${id}/3ds`, { method: 'POST', body: { code } }),
    onSuccess: invalidate,
  })
}

export function useSignWaiver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<Me>('/api/waiver', { method: 'POST', body: { name } }),
    onSuccess: me => qc.setQueryData(keys.me, me),
  })
}

export const useRemind = () => useMutation({ mutationFn: (i: number) => api<number[]>(`/api/remind/${i}`, { method: 'POST' }) })

export function useDemoScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: DemoScenario) => api<DemoState>(`/api/demo/${s}`, { method: 'POST' }),
    onSuccess: d => {
      qc.setQueryData(keys.demo, d)
      qc.resetQueries({ predicate: q => q.queryKey[0] !== 'demo' })
    },
  })
}
