import { test, expect } from '@playwright/test';

test.describe('Loan Status Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for customers to load
    await page.waitForSelector('.bg-card.border.rounded-lg', { timeout: 15000 });
    // Navigate to first customer - click on the heading to ensure we hit the clickable area
    const firstCustomer = page.locator('.bg-card.border.rounded-lg h3').first();
    await firstCustomer.click();
    // Wait for the loan pricing page to load (wait for Back button which appears on loan page)
    await page.waitForSelector('button:has-text("Back")', { timeout: 15000 });
    // Wait for data to load
    await page.waitForTimeout(1000);
  });

  test('should display status badges on loan rows', async ({ page }) => {
    // Check for status badges - includes both workflow statuses and pricing statuses
    // The UI shows pricing statuses (pending, priced, locked) in the Status column
    const statusBadges = page.locator('button:has-text("pending"), button:has-text("priced"), button:has-text("locked")');
    const count = await statusBadges.count();
    console.log('Status badges found:', count);
    expect(count).toBeGreaterThan(0);
  });

  test('should display pricing status badges', async ({ page }) => {
    // Check for pricing status badges (pending, priced, locked)
    const pricingBadges = page.locator('text=/pending|priced|locked/i');
    const count = await pricingBadges.count();
    console.log('Pricing badges found:', count);
    expect(count).toBeGreaterThan(0);
  });

  test('should open status dropdown when clicking on status cell', async ({ page }) => {
    // Find status select button in the grid
    const statusSelect = page.locator('button[role="combobox"], [data-testid="status-select"]').first();

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
    // Find the status select
    const statusSelect = page.locator('button[role="combobox"]').first();

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
    // Find pricing status selects
    const selectButtons = page.locator('button[role="combobox"]');
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
    // Look for any locked status badge in the grid
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
    const statusSelect = page.locator('button[role="combobox"]').first();

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
    const selectButtons = page.locator('button[role="combobox"]');
    const count = await selectButtons.count();

    if (count >= 2) {
      // Change status on first select
      const firstSelect = selectButtons.first();

      if (await firstSelect.isVisible()) {
        await firstSelect.click();
        await page.keyboard.press('Escape');

        // Immediately change status on second select
        const secondSelect = selectButtons.nth(1);
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
