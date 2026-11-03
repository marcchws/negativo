import '@fontsource-variable/hanken-grotesk'
import './styles/index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from './api/queries'
import { applyPreset } from './app/presets'
import { router } from './app/router'

// The mocked API must be listening before the first query fires. It loads as its own chunk, beside the app's.
const { startMocks } = await import('./mocks/browser')
await startMocks()
applyPreset(window.location.search)
// The router reads the URL at creation; recreate its history position after a preset rewrote it.
await router.navigate(window.location.pathname + window.location.search, { replace: true })

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
