import { chromium } from '@playwright/test';

/**
 * Records all API interactions to a HAR file for mock playback
 * Run with: npx playwright test e2e/record-har.ts --project=chromium
 * Or: npx tsx e2e/record-har.ts
 */
async function recordHar() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordHar: {
      path: 'e2e/mocks/api.har',
      urlFilter: '**/api/**',
    },
  });

  const page = await context.newPage();

  console.log('Recording HAR... Perform actions in the browser.');
  console.log('Navigate to http://localhost:4000 and interact with the app.');
  console.log('Press Ctrl+C when done to save the HAR file.\n');

  await page.goto('http://localhost:4000');

  // Wait for user to interact - keep browser open
  await page.waitForTimeout(300000); // 5 minutes

  await context.close();
  await browser.close();

  console.log('\nHAR file saved to e2e/mocks/api.har');
}

recordHar().catch(console.error);
