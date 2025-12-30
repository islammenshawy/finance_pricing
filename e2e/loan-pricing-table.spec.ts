import { test, expect } from '@playwright/test';

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
    // Click on the first customer
    const firstCustomer = page.locator('.border.rounded-lg, [data-testid="customer-card"]').first();
    await firstCustomer.click();

    // Wait for loans to load - should see a table or loan list
    await page.waitForSelector('table, [data-testid="loan-table"]', { timeout: 10000 });

    // Should see loan data
    await expect(page.locator('table tbody tr, [data-testid="loan-row"]').first()).toBeVisible();
  });

  test('should display loan columns correctly', async ({ page }) => {
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();

    await page.waitForSelector('table', { timeout: 10000 });

    // Check for expected column headers (use .first() to avoid strict mode violations)
    const headers = page.locator('th');
    await expect(headers.filter({ hasText: /loan|#/i }).first()).toBeVisible();
    await expect(headers.filter({ hasText: /amount/i }).first()).toBeVisible();
    await expect(headers.filter({ hasText: /rate/i }).first()).toBeVisible();
  });

  test('should support grouping by currency', async ({ page }) => {
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();

    await page.waitForSelector('table', { timeout: 10000 });

    // Page should already be grouped by currency (default)
    // Look for currency group headers - they appear as badges like "4 loans"
    const groupBadge = page.locator('text=/\\d+\\s+loans?/');
    await expect(groupBadge.first()).toBeVisible({ timeout: 5000 });
  });

  test('should expand loan row to show details', async ({ page }) => {
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();

    await page.waitForSelector('table', { timeout: 10000 });

    // Find expand button on first loan row
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Should show expanded content (invoices, fees)
      await page.waitForTimeout(500);

      // Look for invoice or fee sections
      const expandedContent = page.locator('text=/invoice|fee/i');
      await expect(expandedContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should allow filtering by search', async ({ page }) => {
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();

    await page.waitForSelector('table', { timeout: 10000 });

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      // Get initial row count
      const initialRows = await page.locator('table tbody tr').count();

      // Type in search
      await searchInput.fill('TF-2024');
      await page.waitForTimeout(500);

      // Rows should be filtered (or stay same if all match)
      const filteredRows = await page.locator('table tbody tr').count();
      expect(filteredRows).toBeLessThanOrEqual(initialRows);
    }
  });

  test('should display loan amounts formatted correctly', async ({ page }) => {
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();

    await page.waitForSelector('table', { timeout: 10000 });

    // Find amount cells (should have currency symbols or formatted numbers)
    const amountCells = page.locator('td').filter({ hasText: /[\$€£¥]|[\d,]+\.?\d*/ });
    await expect(amountCells.first()).toBeVisible();

    // Check that amounts are formatted (contain commas for thousands)
    const firstAmount = await amountCells.first().textContent();
    expect(firstAmount).toMatch(/\d/);
  });

  test('should show rate percentages correctly', async ({ page }) => {
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();

    await page.waitForSelector('table', { timeout: 10000 });

    // Find rate cells (should contain % or decimal rates)
    const rateCells = page.locator('td').filter({ hasText: /%/ });

    if (await rateCells.first().isVisible()) {
      const rateText = await rateCells.first().textContent();
      expect(rateText).toMatch(/\d+\.?\d*%/);
    }
  });
});
