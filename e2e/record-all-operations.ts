import { chromium } from '@playwright/test';

/**
 * Automated HAR recording that covers all API operations
 * Runs through the app performing all key actions to capture API responses
 */
async function recordAllOperations() {
  console.log('Starting automated HAR recording...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: {
      path: 'e2e/mocks/api.har',
      urlFilter: '**/api/**',
    },
  });

  const page = await context.newPage();

  try {
    // 1. Load home page - fetches customers
    console.log('1. Loading customers list...');
    await page.goto('http://localhost:4000');
    await page.waitForSelector('h3', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Click first customer - fetches customer with loans
    console.log('2. Loading customer with loans...');
    const firstCustomer = page.locator('h3').first();
    await firstCustomer.click();
    await page.waitForSelector('input[type="checkbox"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 3. Expand a loan to get full details and audit history
    console.log('3. Expanding loan details...');
    const loanRow = page.locator('[class*="cursor-pointer"]').first();
    await loanRow.click();
    await page.waitForTimeout(1500);

    // 4. Select loans for bulk operations
    console.log('4. Selecting loans for bulk operations...');
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < Math.min(3, count); i++) {
      await checkboxes.nth(i).check();
    }
    await page.waitForTimeout(500);

    // 5. Apply bulk rate change - triggers preview calculations
    console.log('5. Applying bulk rate change...');
    const baseRateInput = page.locator('input[placeholder="5.00"]');
    if (await baseRateInput.isVisible()) {
      await baseRateInput.fill('5.50');
      await page.locator('button:has-text("Apply")').first().click();
      await page.waitForTimeout(1500);
    }

    // 6. Add a fee via bulk action
    console.log('6. Adding fee via bulk action...');
    const feeCombobox = page.locator('button[role="combobox"]:has-text("Select fee")');
    if (await feeCombobox.isVisible()) {
      await feeCombobox.click();
      await page.waitForTimeout(500);
      const feeOption = page.locator('[role="option"]').first();
      if (await feeOption.isVisible()) {
        await feeOption.click();
        await page.waitForTimeout(300);
        await page.locator('button:has-text("Add")').click();
        await page.waitForTimeout(1000);
      }
    }

    // 7. Revert changes
    console.log('7. Reverting changes...');
    const revertButton = page.locator('button:has-text("Revert All")');
    if (await revertButton.isVisible()) {
      await revertButton.click();
      await page.waitForTimeout(500);
    }

    // 8. Clear selection
    console.log('8. Clearing selection...');
    await page.locator('button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(500);

    // 9. Use filters
    console.log('9. Testing filters...');
    const currencyFilter = page.locator('button:has-text("Currency")');
    if (await currencyFilter.isVisible()) {
      await currencyFilter.click();
      await page.waitForTimeout(300);
      const usdOption = page.locator('[role="option"]:has-text("USD")');
      if (await usdOption.isVisible()) {
        await usdOption.click();
        await page.waitForTimeout(500);
      }
    }

    // 10. Go back to customer list
    console.log('10. Going back to customer list...');
    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForTimeout(1000);
    }

    // 11. Visit another customer
    console.log('11. Loading another customer...');
    const customers = page.locator('h3');
    const customerCount = await customers.count();
    if (customerCount > 1) {
      await customers.nth(1).click();
      await page.waitForTimeout(2000);
    }

    console.log('\n✓ All operations recorded successfully!');

  } catch (error) {
    console.error('Error during recording:', error);
  }

  await context.close();
  await browser.close();

  console.log('\nHAR file saved to e2e/mocks/api.har');
}

recordAllOperations().catch(console.error);
