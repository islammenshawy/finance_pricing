import { test as base, expect, Page } from '@playwright/test';

/**
 * Custom fixtures for Loan Pricing E2E tests
 */

// Extend base test with custom fixtures
export const test = base.extend<{
  loanPricingPage: Page;
}>({
  loanPricingPage: async ({ page }, use) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="customer-list"], h1:has-text("Customers")');

    await use(page);
  },
});

export { expect };

/**
 * Helper functions for common test operations
 */

export async function selectCustomer(page: Page, customerName: string) {
  // Find and click on a customer card
  const customerCard = page.locator(`text=${customerName}`).first();
  await customerCard.click();

  // Wait for the loans to load
  await page.waitForSelector('[data-testid="loan-table"], table');
}

export async function selectFirstCustomer(page: Page) {
  // Click the first customer in the list
  const firstCustomer = page.locator('[data-testid="customer-card"], .border.rounded-lg').first();
  await firstCustomer.click();

  // Wait for loans to load
  await page.waitForSelector('table', { timeout: 10000 });
}

export async function getLoanRowByNumber(page: Page, loanNumber: string) {
  return page.locator(`tr:has-text("${loanNumber}")`);
}

export async function getTableCellValue(page: Page, rowSelector: string, columnIndex: number) {
  const row = page.locator(rowSelector);
  const cell = row.locator('td').nth(columnIndex);
  return cell.textContent();
}

export async function waitForToast(page: Page, message?: string) {
  if (message) {
    await page.waitForSelector(`text=${message}`, { timeout: 5000 });
  } else {
    await page.waitForSelector('[role="alert"], .toast', { timeout: 5000 });
  }
}

export async function expandLoanRow(page: Page, loanNumber: string) {
  const row = await getLoanRowByNumber(page, loanNumber);
  const expandButton = row.locator('button').first();
  await expandButton.click();
}

export async function selectLoanCheckbox(page: Page, loanNumber: string) {
  const row = await getLoanRowByNumber(page, loanNumber);
  const checkbox = row.locator('input[type="checkbox"]');
  await checkbox.check();
}

export async function selectMultipleLoans(page: Page, loanNumbers: string[]) {
  for (const loanNumber of loanNumbers) {
    await selectLoanCheckbox(page, loanNumber);
  }
}

export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse((response) =>
    typeof urlPattern === 'string'
      ? response.url().includes(urlPattern)
      : urlPattern.test(response.url())
  );
}
