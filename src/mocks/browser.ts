import { getResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * Some browsers cannot register a service worker (Firefox private windows, some embedded browsers).
 * There the same handlers answer from inside the page, so the demo never opens empty.
 */
function answerInPage() {
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const request = new Request(input, init)
    if (new URL(request.url).pathname.startsWith('/api/')) {
      const res = await getResponse(handlers, request)
      if (res) return res
    }
    return realFetch(input, init)
  }
}

/** The worker runs in production too: it is the demo's only data source. Photos, fonts and map tiles pass through. */
export async function startMocks() {
  try {
    await setupWorker(...handlers).start({
      serviceWorker: { url: '/mockServiceWorker.js' },
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  } catch {
    answerInPage()
  }
}
