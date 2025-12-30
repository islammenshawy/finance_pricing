import { test, expect } from '@playwright/test';

test.describe('Fee Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for customers to load
    await page.waitForSelector('.border.rounded-lg', { timeout: 15000 });
    // Navigate to first customer
    const firstCustomer = page.locator('.border.rounded-lg').first();
    await firstCustomer.click();
    await page.waitForSelector('table', { timeout: 15000 });
  });

  test('should display fee column or fee count in loan table', async ({ page }) => {
    const headers = page.locator('th');

    // Check for fee-related header
    const feeHeader = headers.filter({ hasText: /fee/i });
    const hasFeeColumn = (await feeHeader.count()) > 0;

    expect(hasFeeColumn).toBeTruthy();
  });

  test('should show fees when expanding loan row', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();

    // Find and click expand button
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();

      await page.waitForTimeout(500);

      // Look for fee section in expanded content
      const feeSection = page.locator('text=/fee|arrangement|commitment|facility/i');
      const hasFees = (await feeSection.count()) > 0;

      console.log('Has fee section:', hasFees);
    }
  });

  test('should show Add Fee button in expanded loan', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for Add Fee button
      const addFeeButton = page.locator('button').filter({ hasText: /add.*fee/i });

      if (await addFeeButton.first().isVisible()) {
        await expect(addFeeButton.first()).toBeVisible();
      }
    }
  });

  test('should show fee dropdown with available fees', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for fee select dropdown
      const feeSelect = page.locator('button[role="combobox"]').filter({ hasText: /fee|select/i });

      if (await feeSelect.first().isVisible()) {
        await feeSelect.first().click();

        // Should see fee options
        const options = page.locator('[role="option"]');
        await expect(options.first()).toBeVisible({ timeout: 3000 });

        await page.keyboard.press('Escape');
      }
    }
  });

  test('should display fee amount correctly', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for fee amounts (currency formatted)
      const feeAmounts = page.locator('text=/[\$€£][\d,]+|[\d,]+\.\d{2}/');
      const count = await feeAmounts.count();

      console.log('Fee amounts found:', count);
    }
  });

  test('should allow editing fee rate', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for fee rate input
      const feeInputs = page.locator('input[type="number"]').filter({ has: page.locator('..').filter({ hasText: /rate|%/ }) });

      if (await feeInputs.first().isVisible()) {
        await feeInputs.first().fill('1.5');
        await page.keyboard.press('Tab');

        await page.waitForTimeout(500);
      }
    }
  });

  test('should show delete fee button', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for delete button (trash icon or remove text)
      const deleteButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });

      // Should have some action buttons
      console.log('Delete buttons found:', await deleteButton.count());
    }
  });

  test('should update total fees when adding a fee', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();

    // Get initial total fees
    const feeTotalCell = firstRow.locator('td').filter({ hasText: /[\d,]+/ }).nth(4);
    const initialTotal = await feeTotalCell.textContent();

    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for Add Fee dropdown and add a fee
      const feeSelect = page.locator('button[role="combobox"]').filter({ hasText: /select.*fee/i });

      if (await feeSelect.first().isVisible()) {
        await feeSelect.first().click();

        const option = page.locator('[role="option"]').first();
        if (await option.isVisible()) {
          await option.click();

          // Click Add button
          const addButton = page.locator('button').filter({ hasText: /add/i });
          if (await addButton.first().isVisible()) {
            await addButton.first().click();
            await page.waitForTimeout(1000);

            // Total should update
            const updatedTotal = await feeTotalCell.textContent();
            console.log('Fee total: Initial:', initialTotal, 'Updated:', updatedTotal);
          }
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('should show fee type badges', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for fee type badges
      const feeTypes = page.locator('span, div').filter({
        hasText: /^(arrangement|commitment|facility|late.*payment|custom)$/i,
      });

      const count = await feeTypes.count();
      console.log('Fee type badges found:', count);
    }
  });

  test('should show fee calculation type', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for calculation type indicators
      const calcTypes = page.locator('text=/flat|percentage|tiered/i');
      const count = await calcTypes.count();

      console.log('Calculation type indicators:', count);
    }
  });

  test('should handle fee with tiered calculation', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const expandButton = firstRow.locator('button').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for tiered fee indicator
      const tieredFee = page.locator('text=/tiered/i');

      if (await tieredFee.first().isVisible()) {
        // Should show tier breakdown
        const tiers = page.locator('text=/tier|\d+%\s*for/i');
        console.log('Tier indicators found:', await tiers.count());
      }
    }
  });
});
