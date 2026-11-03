import { createStore } from './store'

export interface ToastItem {
  id: number
  message: string
  undo?: () => void
}

export const toasts = createStore<{ items: ToastItem[] }>(() => ({ items: [] }))
let seq = 0

export function toast(message: string, undo?: () => void) {
  const item = { id: ++seq, message, undo }
  // One at a time: a new toast replaces the last, so they never stack over the tabs.
  toasts.set({ items: [item] })
}

export const dismissToast = (id: number) => toasts.set(s => ({ items: s.items.filter(t => t.id !== id) }))
