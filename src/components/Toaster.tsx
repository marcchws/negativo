import { Toast } from 'radix-ui'
import { dismissToast, toasts } from '../store/toasts'

export function Toaster() {
  const items = toasts.use(s => s.items)
  return (
    <Toast.Provider duration={4200} swipeDirection="down" label="Notification">
      {items.map(t => (
        <Toast.Root key={t.id} className="toast" onOpenChange={open => !open && dismissToast(t.id)}>
          <Toast.Description>{t.message}</Toast.Description>
          {t.undo ? (
            <Toast.Action altText="Undo" onClick={() => t.undo?.()}>Undo</Toast.Action>
          ) : (
            <Toast.Close>OK</Toast.Close>
          )}
        </Toast.Root>
      ))}
      <Toast.Viewport className="toasts" />
    </Toast.Provider>
  )
}
