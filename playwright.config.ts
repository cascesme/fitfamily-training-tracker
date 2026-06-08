import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  globalTeardown: './tests/e2e/global-teardown.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'], channel: 'chrome' } },
  ],
  webServer: {
    command: 'docker compose -f docker-compose.test.yml up',
    url: 'http://localhost:3000',
    reuseExistingServer: !!process.env.CI,
    timeout: 120000,
  },
})
