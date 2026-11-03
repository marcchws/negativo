import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5181' },
  projects: [
    { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // The production build, as Pages serves it, with the service worker in front of the API.
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:5181', reuseExistingServer: true, timeout: 120_000 },
})
