import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Loan Pricing E2E tests
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for sequential execution
  reporter: [['html'], ['list']],
  timeout: 30000, // 30 second timeout per test

  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /*
   * Note: Servers should be running before tests.
   * Start with: npm run dev
   *
   * Uncomment below to auto-start servers in CI:
   */
  // webServer: [
  //   {
  //     command: 'npm run dev -w server',
  //     url: 'http://localhost:4000/api/health',
  //     reuseExistingServer: true,
  //     timeout: 60000,
  //   },
  //   {
  //     command: 'npm run dev -w client',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: true,
  //     timeout: 60000,
  //   },
  // ],
});
