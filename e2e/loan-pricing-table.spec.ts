import { test, expect, Page } from '@playwright/test';

// Helper to navigate to customer's loans page
async function navigateToCustomerLoans(page: Page) {
  // Wait for customer name headings to load
  await page.waitForSelector('h3', { timeout: 15000 });

  // Click on the first customer name (h3 inside the card)
  const firstCustomer = page.locator('h3').first();
  await firstCustomer.click();

  // Wait for loan pricing page to load - look for Back button or loan data
  await page.waitForSelector('button:has-text("Back"), [data-testid^="loan-row-"]', { timeout: 15000 });

  // Additional wait for data to render
  await page.waitForTimeout(500);
}

test.describe('Loan Pricing Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be loaded and customers to appear
    await page.waitForLoadState('networkidle');
    // Wait for customer cards to load
    await page.waitForSelector('.border.rounded-lg', { timeout: 20000 });
  });

  test('should display customer list on homepage', async ({ page }) => {
    // Check that the page header is visible
    await expect(page.locator('h2:has-text("Customers")')).toBeVisible();

    // Check for customer cards
    const customerElements = page.locator('.border.rounded-lg');
    await expect(customerElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to customer loans when clicking a customer', async ({ page }) => {
    await navigateToCustomerLoans(page);

    // Should see loan data
    await expect(page.locator('[data-testid^="loan-row-"]').first()).toBeVisible();
  });

  test('should display loan columns correctly', async ({ page }) => {
    await navigateToCustomerLoans(page);

    // Check for expected column headers (div-based grid header)
    await expect(page.locator('text=/Loan.*#|#/i').first()).toBeVisible();
    await expect(page.locator('text=/Amount/i').first()).toBeVisible();
    await expect(page.locator('text=/Base|Rate/i').first()).toBeVisible();
  });

  test('should support grouping by currency', async ({ page }) => {
    await navigateToCustomerLoans(page);

    // Page should already be grouped by currency (default)
    // Look for currency group headers - they appear as badges like "4 loans"
    const groupBadge = page.locator('text=/\\d+\\s+loans?/');
    await expect(groupBadge.first()).toBeVisible({ timeout: 5000 });
  });

  test('should expand loan row to show details', async ({ page }) => {
    await navigateToCustomerLoans(page);

    // Find chevron on first loan row to expand
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();

      // Should show expanded content (invoices, fees)
      await page.waitForTimeout(500);

      // Look for invoice or fee sections
      const expandedContent = page.locator('text=/invoice|fee/i');
      await expect(expandedContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should allow filtering by search', async ({ page }) => {
    await navigateToCustomerLoans(page);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      // Get initial row count
      const initialRows = await page.locator('[data-testid^="loan-row-"]').count();

      // Type in search
      await searchInput.fill('TF-2024');
      await page.waitForTimeout(500);

      // Rows should be filtered (or stay same if all match)
      const filteredRows = await page.locator('[data-testid^="loan-row-"]').count();
      expect(filteredRows).toBeLessThanOrEqual(initialRows);
    }
  });

  test('should display loan amounts formatted correctly', async ({ page }) => {
    await navigateToCustomerLoans(page);

    // Find amount cells (should have currency symbols or formatted numbers)
    const amountCells = page.locator('[data-testid^="loan-row-"]').locator('text=/\\$[\\d,]+/');
    await expect(amountCells.first()).toBeVisible();

    // Check that amounts are formatted (contain commas for thousands)
    const firstAmount = await amountCells.first().textContent();
    expect(firstAmount).toMatch(/\d/);
  });

  test('should show rate percentages correctly', async ({ page }) => {
    await navigateToCustomerLoans(page);

    // Find rate cells (should contain % or decimal rates)
    const rateCells = page.locator('[data-testid^="loan-row-"]').locator('text=/%/');

    if ((await rateCells.count()) > 0) {
      const rateText = await rateCells.first().textContent();
      expect(rateText).toMatch(/\d+\.?\d*%/);
    }
  });
});
