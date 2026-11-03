import { useSyncExternalStore } from 'react'

/** A tiny external store: state that outlives a screen and that the state presets can seed before the first render. */
export function createStore<T extends object>(initial: () => T) {
  let state = initial()
  const listeners = new Set<() => void>()
  const get = () => state
  const set = (patch: Partial<T> | ((s: T) => Partial<T>)) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
    listeners.forEach(l => l())
  }
  const reset = () => set(initial())
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  function use(): T
  function use<U>(select: (s: T) => U): U
  function use<U>(select?: (s: T) => U) {
    return useSyncExternalStore(subscribe, () => (select ? select(state) : state))
  }
  return { get, set, reset, use }
}
