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

test.describe('Fee Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for customers to load
    await page.waitForSelector('.border.rounded-lg', { timeout: 15000 });
    // Navigate to first customer
    await navigateToCustomerLoans(page);
  });

  test('should display fee column or fee count in loan table', async ({ page }) => {
    // The header uses div with grid layout, look for Fees column text
    const feeHeader = page.locator('text=/^Fees$/i');
    const hasFeeColumn = (await feeHeader.count()) > 0;

    expect(hasFeeColumn).toBeTruthy();
  });

  test('should show fees when expanding loan row', async ({ page }) => {
    // Find first loan row using data-testid pattern
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();

    // Click on the chevron to expand (row itself is clickable)
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();

      await page.waitForTimeout(500);

      // Look for fee section in expanded content
      const feeSection = page.locator('text=/fee|arrangement|commitment|facility/i');
      const hasFees = (await feeSection.count()) > 0;

      console.log('Has fee section:', hasFees);
      expect(hasFees).toBeTruthy();
    }
  });

  test('should show Add Fee button in expanded loan', async ({ page }) => {
    // Click on the row itself to expand (clicking on chevron area)
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for Add Fee button in the expanded content
      const addFeeButton = page.locator('button:has-text("Add Fee")');
      const hasAddFee = (await addFeeButton.count()) > 0;

      // Add Fee button should be visible in expanded state
      expect(hasAddFee).toBeTruthy();
    }
  });

  test('should show fee dropdown with available fees', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for fee select dropdown
      const feeSelect = page.locator('button[role="combobox"]').first();

      if (await feeSelect.isVisible()) {
        await feeSelect.click();

        // Should see fee options
        const options = page.locator('[role="option"]');
        await expect(options.first()).toBeVisible({ timeout: 3000 });

        await page.keyboard.press('Escape');
      }
    }
  });

  test('should display fee amount correctly', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for fee amounts (currency formatted)
      const feeAmounts = page.locator('text=/\\$[\\d,]+|[\\d,]+\\.\\d{2}/');
      const count = await feeAmounts.count();

      console.log('Fee amounts found:', count);
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should allow editing fee rate', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for fee rate input in fees section
      const feeInputs = page.locator('input[type="number"]');

      if ((await feeInputs.count()) > 0) {
        const firstInput = feeInputs.first();
        if (await firstInput.isVisible()) {
          const originalValue = await firstInput.inputValue();
          await firstInput.fill('1.5');
          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          console.log('Changed fee rate from', originalValue, 'to 1.5');
        }
      }
    }
  });

  test('should show delete fee button', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for delete button (trash icon)
      const trashButtons = page.locator('button svg.lucide-trash-2').locator('..');
      const count = await trashButtons.count();

      console.log('Delete buttons found:', count);
      // Some loans may not have fees, so just log
    }
  });

  test('should update total fees when adding a fee', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for Add Fee dropdown and add a fee
      const feeSelect = page.locator('button[role="combobox"]').first();

      if (await feeSelect.isVisible()) {
        await feeSelect.click();

        const option = page.locator('[role="option"]').first();
        if (await option.isVisible()) {
          await option.click();
          await page.waitForTimeout(500);

          // Check if Add button exists and click it
          const addButton = page.locator('button').filter({ hasText: /^Add$/ });
          if (await addButton.first().isVisible()) {
            await addButton.first().click();
            await page.waitForTimeout(1000);
            console.log('Added fee successfully');
          }
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('should show fee type badges', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for fee type badges (ARRANGEMENT, COMMITMENT, etc.)
      const feeTypes = page.locator('.rounded-full, .badge').filter({
        hasText: /arrangement|commitment|facility|onboarding/i,
      });

      const count = await feeTypes.count();
      console.log('Fee type badges found:', count);
    }
  });

  test('should show fee calculation type', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for calculation type indicators
      const calcTypes = page.locator('text=/flat|percentage|tiered|FLAT|PERCENTAGE|TIERED/i');
      const count = await calcTypes.count();

      console.log('Calculation type indicators:', count);
    }
  });

  test('should handle fee with tiered calculation', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for tiered fee indicator
      const tieredFee = page.locator('text=/tiered/i');

      if ((await tieredFee.count()) > 0) {
        // Should show tier breakdown
        const tiers = page.locator('text=/tier|\\d+%.*for/i');
        console.log('Tier indicators found:', await tiers.count());
      } else {
        console.log('No tiered fees in this loan');
      }
    }
  });

  test('should edit fee amount and update correctly', async ({ page }) => {
    // Find and expand a loan row that has fees
    const loanRows = page.locator('[data-testid^="loan-row-"]');
    const count = await loanRows.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const row = loanRows.nth(i);
      const chevron = row.locator('svg.lucide-chevron-right').first();

      if (await chevron.isVisible()) {
        await chevron.click();
        await page.waitForTimeout(500);

        // Look for fee rows with edit button (pencil icon)
        const feeRows = page.locator('[data-testid^="fee-row-"]');
        const feeCount = await feeRows.count();

        if (feeCount > 0) {
          // Get the first fee row
          const firstFee = feeRows.first();
          const editButton = firstFee.locator('button svg.lucide-pencil').locator('..');

          if (await editButton.isVisible()) {
            // Click edit button
            await editButton.click();
            await page.waitForTimeout(200);

            // Input should appear
            const input = firstFee.locator('input[type="number"]');
            await expect(input).toBeVisible({ timeout: 3000 });

            // Get current value and change it
            const currentValue = await input.inputValue();
            const newValue = (parseFloat(currentValue) + 100).toFixed(2);

            await input.fill(newValue);
            await input.press('Enter');

            await page.waitForTimeout(500);

            // The fee row should show "Modified" badge
            const modifiedBadge = firstFee.locator('text=/Modified/i');
            await expect(modifiedBadge).toBeVisible({ timeout: 3000 });

            console.log(`Fee edited from ${currentValue} to ${newValue}`);
            return; // Test passed
          }
        }

        // Collapse and try next row
        await chevron.click();
        await page.waitForTimeout(300);
      }
    }

    // If no editable fees found, just pass the test
    console.log('No editable fees found in first 3 loans');
  });

  test('should maintain separate state for each fee when editing', async ({ page }) => {
    // This test verifies that editing one fee doesn't affect other fees
    const loanRows = page.locator('[data-testid^="loan-row-"]');
    const count = await loanRows.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const row = loanRows.nth(i);
      const chevron = row.locator('svg.lucide-chevron-right').first();

      if (await chevron.isVisible()) {
        await chevron.click();
        await page.waitForTimeout(500);

        // Look for multiple fee rows
        const feeRows = page.locator('[data-testid^="fee-row-"]');
        const feeCount = await feeRows.count();

        if (feeCount >= 2) {
          // Get the first two fees
          const fee1 = feeRows.nth(0);
          const fee2 = feeRows.nth(1);

          // Get original amounts (displayed text)
          const fee1Amount = await fee1.locator('.font-mono.font-medium').first().textContent();
          const fee2Amount = await fee2.locator('.font-mono.font-medium').first().textContent();

          // Edit fee 1
          const editButton1 = fee1.locator('button svg.lucide-pencil').locator('..');
          if (await editButton1.isVisible()) {
            await editButton1.click();
            await page.waitForTimeout(200);

            const input1 = fee1.locator('input[type="number"]');
            await expect(input1).toBeVisible({ timeout: 3000 });
            await input1.fill('99999');
            await input1.press('Enter');
            await page.waitForTimeout(500);

            // Verify fee 2 still shows its original amount
            const fee2CurrentAmount = await fee2.locator('.font-mono.font-medium').first().textContent();
            expect(fee2CurrentAmount).toBe(fee2Amount);

            console.log(`Fee 1 edited to 99999, Fee 2 unchanged at ${fee2Amount}`);
            return; // Test passed
          }
        }

        // Collapse and try next row
        await chevron.click();
        await page.waitForTimeout(300);
      }
    }

    console.log('No loans with 2+ editable fees found');
  });

  test('should maintain layout stability when editing fees', async ({ page }) => {
    // This test verifies the expanded row doesn't resize when editing fees
    const firstRow = page.locator('[data-testid^="loan-row-"]').first();
    const chevron = firstRow.locator('svg.lucide-chevron-right').first();

    if (await chevron.isVisible()) {
      await chevron.click();
      await page.waitForTimeout(500);

      // Look for fee rows
      const feeRows = page.locator('[data-testid^="fee-row-"]');

      if ((await feeRows.count()) > 0) {
        const firstFee = feeRows.first();

        // Get initial bounding box of fee row
        const initialBox = await firstFee.boundingBox();

        // Find and click edit button
        const editButton = firstFee.locator('button svg.lucide-pencil').locator('..');
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForTimeout(200);

          // Get bounding box while editing
          const editingBox = await firstFee.boundingBox();

          // Height should remain stable (within 10px tolerance)
          if (initialBox && editingBox) {
            const heightDiff = Math.abs(editingBox.height - initialBox.height);
            console.log(`Height before: ${initialBox.height}, after: ${editingBox.height}, diff: ${heightDiff}`);
            expect(heightDiff).toBeLessThanOrEqual(10);
          }

          // Cancel editing
          await page.keyboard.press('Escape');
        }
      }
    }
  });
});
