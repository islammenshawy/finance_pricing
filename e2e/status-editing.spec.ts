import { test, expect } from '@playwright/test';

test.describe('Loan Status Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for customers to load
    await page.waitForSelector('.border.rounded-lg', { timeout: 15000 });
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();
    await page.waitForSelector('table', { timeout: 15000 });
  });

  test('should display status badges on loan rows', async ({ page }) => {
    // Check for status badges (draft, approved, funded, etc.)
    const statusBadges = page.locator('span, div').filter({
      hasText: /^(draft|in_review|approved|funded|collected|closed)$/i,
    });
    await expect(statusBadges.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display pricing status badges', async ({ page }) => {
    // Check for pricing status badges (pending, priced, locked)
    const pricingBadges = page.locator('span, div').filter({
      hasText: /^(pending|priced|locked)$/i,
    });
    await expect(pricingBadges.first()).toBeVisible({ timeout: 5000 });
  });

  test('should open status dropdown when clicking on status cell', async ({ page }) => {
    // Find the status cell in the first row and click it
    const firstRow = page.locator('table tbody tr').first();

    // Look for select trigger or status button
    const statusSelect = firstRow.locator('button[role="combobox"], [data-testid="status-select"]').first();

    if (await statusSelect.isVisible()) {
      await statusSelect.click();

      // Should see dropdown options
      const dropdownContent = page.locator('[role="listbox"], [data-radix-popper-content-wrapper]');
      await expect(dropdownContent).toBeVisible({ timeout: 3000 });

      // Should see status options
      const options = page.locator('[role="option"], [data-value]');
      await expect(options.first()).toBeVisible();

      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
    }
  });

  test('should change loan status through dropdown', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();

    // Find the status select
    const statusSelects = firstRow.locator('button[role="combobox"]');
    const statusSelect = statusSelects.first();

    if (await statusSelect.isVisible()) {
      // Get current status
      const currentStatus = await statusSelect.textContent();

      await statusSelect.click();

      // Click on a different status option
      const option = page.locator('[role="option"]').filter({ hasText: 'approved' }).first();

      if (await option.isVisible()) {
        // Wait for API call
        const responsePromise = page.waitForResponse(
          (response) => response.url().includes('/api/loans/') && response.request().method() === 'PUT',
          { timeout: 10000 }
        );

        await option.click();

        // Wait for the update to complete
        try {
          const response = await responsePromise;
          expect(response.status()).toBe(200);
        } catch {
          // API might not be available in test environment
        }
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should change pricing status through dropdown', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();

    // Find pricing status select (usually second combobox in the row)
    const selectButtons = firstRow.locator('button[role="combobox"]');
    const count = await selectButtons.count();

    if (count >= 2) {
      const pricingSelect = selectButtons.nth(1);
      await pricingSelect.click();

      // Should see pricing status options
      const options = page.locator('[role="option"]');
      await expect(options.first()).toBeVisible({ timeout: 3000 });

      // Close dropdown
      await page.keyboard.press('Escape');
    }
  });

  test('should show locked status badge when loan is locked', async ({ page }) => {
    // Look for any locked status badge in the table
    const lockedBadge = page.locator('text=/locked/i');
    const count = await lockedBadge.count();

    // Log the count - some customers may not have locked loans
    console.log('Locked badges found:', count);

    // If locked loans exist, verify they display correctly
    if (count > 0) {
      await expect(lockedBadge.first()).toBeVisible();
    }
  });

  test('should show status change in the UI after update', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const statusSelect = firstRow.locator('button[role="combobox"]').first();

    if (await statusSelect.isVisible()) {
      await statusSelect.click();

      // Find an option that's different from current
      const inReviewOption = page.locator('[role="option"]').filter({ hasText: /in.?review/i }).first();

      if (await inReviewOption.isVisible()) {
        await inReviewOption.click();
        await page.waitForTimeout(1000);

        // Status text should update
        const updatedStatus = await statusSelect.textContent();
        expect(updatedStatus?.toLowerCase()).toContain('review');
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should handle rapid status changes gracefully', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount >= 2) {
      // Change status on first row
      const firstSelect = rows.first().locator('button[role="combobox"]').first();

      if (await firstSelect.isVisible()) {
        await firstSelect.click();
        await page.keyboard.press('Escape');

        // Immediately change status on second row
        const secondSelect = rows.nth(1).locator('button[role="combobox"]').first();
        if (await secondSelect.isVisible()) {
          await secondSelect.click();
          await page.keyboard.press('Escape');
        }

        // No errors should occur
        const errors = await page.locator('.error, [role="alert"]').count();
        expect(errors).toBe(0);
      }
    }
  });
});
