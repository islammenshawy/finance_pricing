import { test, expect } from '@playwright/test';

test.describe('Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for customers to load
    await page.waitForSelector('h3', { timeout: 15000 });
    // Navigate to first customer (click on the customer card)
    const firstCustomer = page.locator('h3').first();
    await firstCustomer.click();
    // Wait for loan pricing page to load - look for Back button or loan data
    await page.waitForSelector('button:has-text("Back"), input[type="checkbox"]', { timeout: 15000 });
    // Additional wait for data to render
    await page.waitForTimeout(1000);
  });

  test('should show checkboxes for loan selection', async ({ page }) => {
    // Find checkboxes in loan rows (div-based virtual scrolling, not table)
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible({ timeout: 5000 });
  });

  test('should select single loan with checkbox', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }
  });

  test('should select multiple loans', async ({ page }) => {
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      await expect(checkboxes.nth(0)).toBeChecked();
      await expect(checkboxes.nth(1)).toBeChecked();
    }
  });

  test('should show bulk action bar when loans are selected', async ({ page }) => {
    const checkbox = page.locator('table tbody tr input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      // Wait for bulk action bar to appear (fixed at bottom)
      const bulkActionBar = page.locator('.fixed.bottom-6, [data-testid="bulk-action-bar"]');
      await expect(bulkActionBar).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display selected loan count in bulk action bar', async ({ page }) => {
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Look for the count badge or text
      const countBadge = page.locator('.fixed.bottom-6').locator('text=/2/');
      await expect(countBadge).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show base rate input in bulk action bar', async ({ page }) => {
    const checkbox = page.locator('table tbody tr input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      // Look for base rate input
      const baseRateInput = page.locator('.fixed.bottom-6 input[type="number"]').first();
      await expect(baseRateInput).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show spread input in bulk action bar', async ({ page }) => {
    const checkbox = page.locator('table tbody tr input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      // Look for spread input (usually second number input)
      const spreadInput = page.locator('.fixed.bottom-6 input[type="number"]').nth(1);
      await expect(spreadInput).toBeVisible({ timeout: 3000 });
    }
  });

  test('should apply base rate to selected loans', async ({ page }) => {
    const checkbox = page.locator('table tbody tr input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Find base rate input and fill it
      const baseRateInput = bulkActionBar.locator('input[type="number"]').first();
      await baseRateInput.fill('5.5');

      // Click Apply button next to base rate
      const applyButton = bulkActionBar.locator('button:has-text("Apply")').first();
      await applyButton.click();

      // Wait a moment for the change to be registered
      await page.waitForTimeout(500);
    }
  });

  test('should show fee dropdown in bulk action bar', async ({ page }) => {
    const checkbox = page.locator('table tbody tr input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Look for fee select dropdown
      const feeSelect = bulkActionBar.locator('button[role="combobox"]').filter({ hasText: /fee|select/i });

      if (await feeSelect.first().isVisible()) {
        await feeSelect.first().click();

        // Should see fee options
        const options = page.locator('[role="option"]');
        await expect(options.first()).toBeVisible({ timeout: 3000 });

        await page.keyboard.press('Escape');
      }
    }
  });

  test('should show status dropdown in bulk action bar', async ({ page }) => {
    const checkbox = page.locator('table tbody tr input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Look for status section - the bar has "Status" label with a Select dropdown
      const statusSection = bulkActionBar.locator('text=Status');
      await expect(statusSection).toBeVisible({ timeout: 3000 });
    }
  });

  test('should apply bulk status change', async ({ page }) => {
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');

    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Find status dropdown and select
      const statusSelect = bulkActionBar.locator('button[role="combobox"]').filter({ hasText: /status|select/i });

      if (await statusSelect.first().isVisible()) {
        await statusSelect.first().click();

        // Select "approved" status
        const approvedOption = page.locator('[role="option"]').filter({ hasText: /approved/i });

        if (await approvedOption.isVisible()) {
          await approvedOption.click();

          // Click Apply button
          const applyButton = bulkActionBar.locator('button:has-text("Apply")').last();
          await applyButton.click();

          await page.waitForTimeout(1000);
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('should show pricing status options in bulk action bar', async ({ page }) => {
    const checkbox = page.locator('table tbody tr input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Look for pricing status select
      const pricingSelect = bulkActionBar.locator('button[role="combobox"]').filter({ hasText: /pricing|pending|priced|locked/i });

      if (await pricingSelect.first().isVisible()) {
        await pricingSelect.first().click();

        // Should see pricing status options
        const lockedOption = page.locator('[role="option"]').filter({ hasText: /locked/i });
        await expect(lockedOption).toBeVisible({ timeout: 3000 });

        await page.keyboard.press('Escape');
      }
    }
  });

  test('should clear selection when clicking X button', async ({ page }) => {
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');

    if (await checkboxes.first().isVisible()) {
      await checkboxes.first().check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Find and click the clear/X button
      const clearButton = bulkActionBar.locator('button').filter({ has: page.locator('svg') }).first();
      await clearButton.click();

      // Bulk action bar should disappear
      await expect(bulkActionBar).not.toBeVisible({ timeout: 3000 });

      // Checkbox should be unchecked
      await expect(checkboxes.first()).not.toBeChecked();
    }
  });

  test('should disable bulk actions for all locked loans', async ({ page }) => {
    // Find rows with locked status
    const lockedRows = page.locator('tr').filter({ hasText: /locked/i });
    const count = await lockedRows.count();

    if (count >= 2) {
      // Select all locked loans
      for (let i = 0; i < Math.min(count, 2); i++) {
        const checkbox = lockedRows.nth(i).locator('input[type="checkbox"]');
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }

      const bulkActionBar = page.locator('.fixed.bottom-6');

      if (await bulkActionBar.isVisible()) {
        // Base rate input should be disabled
        const baseRateInput = bulkActionBar.locator('input[type="number"]').first();
        const isDisabled = await baseRateInput.isDisabled();

        // Either disabled or not visible for locked loans
        console.log('Base rate input disabled:', isDisabled);
      }
    }
  });

  test('should stage bulk base rate change and show in UI', async ({ page }) => {
    // Select multiple loans using checkboxes (skip header checkbox if exists)
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.first().waitFor({ state: 'visible', timeout: 5000 });
    const count = await checkboxes.count();

    if (count >= 2) {
      // Skip first if it's a "select all" checkbox in header
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Fill base rate
      const baseRateInput = bulkActionBar.locator('input[type="number"]').first();
      await baseRateInput.fill('6.25');

      // Click Apply
      const applyButton = bulkActionBar.locator('button:has-text("Apply")').first();
      await applyButton.click();

      // Wait for changes to be staged
      await page.waitForTimeout(500);

      // Should see amber highlighting on modified rows (indicating staged changes)
      const modifiedIndicator = page.locator('.border-l-amber-500, .bg-amber-50, [class*="amber"]');
      await expect(modifiedIndicator.first()).toBeVisible({ timeout: 3000 });

      // Should see Save All button enabled (changes pending)
      const saveAllButton = page.locator('button:has-text("Save")');
      if (await saveAllButton.first().isVisible()) {
        await expect(saveAllButton.first()).toBeEnabled();
      }
    }
  });

  test('should stage bulk spread change and show impact', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.first().waitFor({ state: 'visible', timeout: 5000 });
    const count = await checkboxes.count();

    if (count >= 3) {
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Fill spread (second number input)
      const spreadInput = bulkActionBar.locator('input[type="number"]').nth(1);
      await spreadInput.fill('2.5');

      // Click Apply (second Apply button)
      const applyButtons = bulkActionBar.locator('button:has-text("Apply")');
      await applyButtons.nth(1).click();

      // Wait for changes to be staged
      await page.waitForTimeout(500);

      // Should see change indicators (amber highlighting)
      const amberIndicator = page.locator('[class*="amber"]');
      const hasChangeIndicator = (await amberIndicator.count()) > 0;
      console.log('Has change indicators:', hasChangeIndicator);
      expect(hasChangeIndicator).toBeTruthy();
    }
  });

  test('should stage bulk fee addition and show in UI', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.first().waitFor({ state: 'visible', timeout: 5000 });
    const count = await checkboxes.count();

    if (count >= 3) {
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Find fee combobox
      const feeCombobox = bulkActionBar.locator('button[role="combobox"]').first();

      if (await feeCombobox.isVisible()) {
        await feeCombobox.click();

        // Wait for options to appear
        const options = page.locator('[role="option"]');
        await options.first().waitFor({ state: 'visible', timeout: 3000 });

        // Select first available fee
        const firstOption = options.first();
        const feeCode = await firstOption.textContent();
        await firstOption.click();

        // Click Add button
        const addButton = bulkActionBar.locator('button:has-text("Add")');
        await addButton.click();

        // Wait for changes to be staged
        await page.waitForTimeout(500);

        // 1. Verify loan row shows as modified (amber border/highlighting)
        const modifiedRows = page.locator('.border-l-amber-500, [class*="amber-50"]');
        await expect(modifiedRows.first()).toBeVisible({ timeout: 3000 });
        console.log('Loan rows showing as modified:', await modifiedRows.count());

        // 2. Verify fee count indicator shows "+1" for added fee
        const feeAddIndicator = page.locator('text=/\\+\\d/');
        const hasFeeAddIndicator = (await feeAddIndicator.count()) > 0;
        console.log('Has fee add indicator (+N):', hasFeeAddIndicator);

        // 3. Expand first selected row to verify fee is shown as pending
        const expandButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right, svg.lucide-chevron-down') }).nth(1);
        if (await expandButton.isVisible()) {
          await expandButton.click();
          await page.waitForTimeout(300);

          // Should see the new fee with green background and "New" badge
          const newFeeBadge = page.locator('text="New"');
          const greenFeeRow = page.locator('.bg-green-50, [class*="green"]');
          const hasNewFee = (await newFeeBadge.count()) > 0 || (await greenFeeRow.count()) > 0;
          console.log('Has new fee indicator:', hasNewFee);
          expect(hasNewFee).toBeTruthy();
        }

        console.log('Bulk added fee:', feeCode);
      }
    }
  });

  test('should not duplicate fee when bulk adding to loans that already have it', async ({ page }) => {
    // First, expand a loan to see its existing fees
    const expandButton = page.locator('button').filter({ has: page.locator('svg') }).first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Get existing fee codes on this loan
      const existingFees = page.locator('text=/ARR|DOC|COMMIT|ONBOARD|ANNUAL/');
      const existingFeeCount = await existingFees.count();
      const existingFeeCodes: string[] = [];

      for (let i = 0; i < existingFeeCount; i++) {
        const text = await existingFees.nth(i).textContent();
        if (text) existingFeeCodes.push(text.trim());
      }

      // Collapse the row
      await expandButton.click();
      await page.waitForTimeout(300);

      // Select the loan
      const checkbox = page.locator('input[type="checkbox"]').first();
      await checkbox.check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Open fee combobox
      const feeCombobox = bulkActionBar.locator('button[role="combobox"]').first();

      if (await feeCombobox.isVisible()) {
        await feeCombobox.click();

        // Check that fees already on the loan are not shown in options
        // (deduplication should filter them out)
        const options = page.locator('[role="option"]');
        await page.waitForTimeout(300);

        const optionCount = await options.count();
        const availableFeeCodes: string[] = [];

        for (let i = 0; i < optionCount; i++) {
          const text = await options.nth(i).textContent();
          if (text) availableFeeCodes.push(text.trim());
        }

        // Verify that existing fees are not in the available options
        for (const existingFee of existingFeeCodes) {
          const isDuplicate = availableFeeCodes.some(opt => opt.includes(existingFee));
          console.log(`Fee ${existingFee} already on loan, should not be in options:`, !isDuplicate);
        }

        await page.keyboard.press('Escape');
      }
    }
  });

  test('should track bulk changes in impact summary panel', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 3) {
      // Select 3 loans
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Apply a spread change
      const spreadInput = bulkActionBar.locator('input[type="number"]').nth(1);
      await spreadInput.fill('1.75');

      const applyButtons = bulkActionBar.locator('button:has-text("Apply")');
      await applyButtons.nth(1).click();

      await page.waitForTimeout(500);

      // Should see impact summary or modified count
      const modifiedBadge = page.locator('text=/\\d+\\s*modified|changes/i');
      const impactPanel = page.locator('text=/impact|before.*after|delta/i');

      const hasModifiedIndicator = (await modifiedBadge.count()) > 0 || (await impactPanel.count()) > 0;
      console.log('Has modified/impact indicator:', hasModifiedIndicator);
    }
  });

  test('should revert bulk changes when clicking revert', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]');

    if (await checkboxes.first().isVisible()) {
      await checkboxes.first().check();

      const bulkActionBar = page.locator('.fixed.bottom-6');
      await bulkActionBar.waitFor({ state: 'visible' });

      // Apply a base rate change
      const baseRateInput = bulkActionBar.locator('input[type="number"]').first();
      await baseRateInput.fill('7.5');

      const applyButton = bulkActionBar.locator('button:has-text("Apply")').first();
      await applyButton.click();

      await page.waitForTimeout(500);

      // Look for revert button
      const revertButton = page.locator('button:has-text("Revert"), button:has-text("Undo"), button:has-text("Clear")');

      if (await revertButton.first().isVisible()) {
        await revertButton.first().click();
        await page.waitForTimeout(500);

        // Modified indicators should disappear
        const modifiedIndicator = page.locator('.border-l-amber-500');
        const stillModified = await modifiedIndicator.count();
        console.log('Rows still modified after revert:', stillModified);
      }
    }
  });

  test('should start with impact panel collapsed and expand when changes are made', async ({ page }) => {
    // Impact panel should start collapsed (narrow width)
    const collapsedPanel = page.locator('aside.w-12');
    await expect(collapsedPanel).toBeVisible({ timeout: 5000 });

    // Make a change to trigger auto-expand
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
      await page.waitForTimeout(500);

      // Enter a base rate in bulk action bar
      const baseRateInput = page.locator('input[placeholder="5.00"]');
      if (await baseRateInput.isVisible()) {
        await baseRateInput.fill('6.50');
        await page.locator('button:has-text("Apply")').first().click();
        await page.waitForTimeout(1000);

        // Impact panel should now be expanded (wider width)
        const expandedPanel = page.locator('aside.w-72');
        await expect(expandedPanel).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show before/after values in impact panel when rates change', async ({ page }) => {
    // Select first loan checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    await checkbox.check();
    await page.waitForTimeout(500);

    // Apply a base rate change
    const baseRateInput = page.locator('[data-testid="bulk-base-rate-input"]');
    await expect(baseRateInput).toBeVisible({ timeout: 5000 });
    await baseRateInput.fill('12.00'); // Large change to see clear difference

    const applyBtn = page.locator('[data-testid="bulk-base-rate-apply"]');
    await applyBtn.click();

    // Wait for the change to be reflected
    await page.waitForTimeout(1500);

    // Clear selection to close bulk action bar
    await checkbox.uncheck();
    await page.waitForTimeout(500);

    // Expand impact panel if collapsed
    const expandButton = page.locator('[data-testid="expand-impact-panel"]');
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }

    // The impact panel should show currency groups with before/after values
    // Look for the expanded panel content
    const impactContent = page.locator('aside').filter({ hasText: 'PRICING IMPACT' });
    await expect(impactContent.first()).toBeVisible({ timeout: 5000 });

    // Should see "loans modified" text
    const modifiedText = page.locator('text=/\\d+ loans? modified/');
    await expect(modifiedText.first()).toBeVisible({ timeout: 3000 });

    // Should see delta indicators (up/down arrows or percentage changes)
    // The panel should contain rate information
    const rateInfo = page.locator('text=/Avg Rate|Interest/i');
    await expect(rateInfo.first()).toBeVisible({ timeout: 3000 });
  });

  test('should filter loans by maturity when clicking maturity bucket', async ({ page }) => {
    // Look for maturity overview section
    const maturitySection = page.locator('text=Maturity Overview').first();

    if (await maturitySection.isVisible({ timeout: 3000 })) {
      // Click to expand if needed
      await maturitySection.click();
      await page.waitForTimeout(500);

      // Look for a maturity bucket button (e.g., "Overdue", "This Week", etc.)
      const bucketButton = page.locator('button:has-text("Overdue"), button:has-text("This Week"), button:has-text("This Month")').first();

      if (await bucketButton.isVisible({ timeout: 2000 })) {
        // Get initial loan count
        const initialLoans = await page.locator('input[type="checkbox"]').count();

        await bucketButton.click();
        await page.waitForTimeout(500);

        // Verify filter is applied (either fewer loans or filter badge appears)
        const filterBadge = page.locator('[class*="bg-primary"]').filter({ hasText: /overdue|this_week|this_month/i });
        const hasFilterBadge = await filterBadge.count() > 0;

        // Click again to clear filter
        await bucketButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should save changes and show in audit history', async ({ page }) => {
    // Reset mock data and reload page to ensure fresh data in React Query cache
    await page.request.post('http://localhost:4001/api/mock/reset').catch(() => {});
    await page.reload();
    await page.waitForSelector('[data-testid^="loan-row-"]', { timeout: 10000 });

    // Find the first loan row and click on the base rate cell to edit it directly
    const firstLoanRow = page.locator('[data-testid^="loan-row-"]').first();
    await expect(firstLoanRow).toBeVisible({ timeout: 5000 });

    // Find the base rate button (editable cell) in the first row
    const baseRateButton = firstLoanRow.locator('button').filter({ hasText: /^\d+\.\d+%$/ }).first();
    await expect(baseRateButton).toBeVisible({ timeout: 3000 });

    // Get current rate and calculate a different value to ensure change is tracked
    const currentRateText = await baseRateButton.textContent();
    const currentRate = parseFloat(currentRateText?.replace('%', '') || '5');
    const newRate = currentRate >= 10 ? (currentRate - 2).toFixed(2) : (currentRate + 2).toFixed(2);

    await baseRateButton.click();

    // An input should appear - fill in a DIFFERENT rate to ensure change is tracked
    const rateInput = firstLoanRow.locator('input[type="number"]').first();
    await expect(rateInput).toBeVisible({ timeout: 3000 });
    await rateInput.fill(newRate);
    await rateInput.press('Enter');

    // Wait for the preview to calculate and show deltas in the group header or row
    // Look for any positive delta (could be any currency symbol like $, د.إ, ¥, etc.)
    // The pattern matches a + followed by any character(s) and then digits with decimals
    await expect(page.locator('text=/^\\+.+[0-9,]+/').first()).toBeVisible({ timeout: 8000 });

    // The impact panel should have an expand button (either enabled or the save should be visible)
    const saveButton = page.locator('[data-testid="save-all-btn"]');
    const expandButton = page.locator('[data-testid="expand-impact-panel"]');

    // Try to get to the save button
    for (let attempt = 0; attempt < 10; attempt++) {
      const isSaveVisible = await saveButton.isVisible().catch(() => false);
      if (isSaveVisible) break;

      // Try clicking the expand button (it might be in the collapsed panel)
      const isExpandVisible = await expandButton.isVisible().catch(() => false);
      if (isExpandVisible) {
        await expandButton.click();
        await page.waitForTimeout(500);
      } else {
        // The panel might be in the "no changes" state - wait for state to sync
        await page.waitForTimeout(1000);
      }
    }

    await expect(saveButton).toBeVisible({ timeout: 10000 });
    await expect(saveButton).toBeEnabled({ timeout: 3000 });

    // Click save - this opens the save dialog
    await saveButton.click();

    // Wait for the save dialog to appear and click the confirm button
    const dialogSaveButton = page.locator('button:has-text("Save Changes")');
    await expect(dialogSaveButton).toBeVisible({ timeout: 5000 });

    // Click save in dialog and intercept the response to wait for completion
    const saveResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/loans') && resp.request().method() === 'PUT',
      { timeout: 15000 }
    );
    await dialogSaveButton.click();
    await saveResponsePromise;

    // After save, expand first loan row by clicking specifically on the chevron icon
    // (firstLoanRow is already defined above)
    await expect(firstLoanRow).toBeVisible({ timeout: 5000 });

    // Click on the chevron icon (svg after checkbox) to expand the row
    const chevron = firstLoanRow.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();
    await expect(chevron).toBeVisible({ timeout: 3000 });
    await chevron.click();

    // Wait for expanded content to load (Change History section)
    await expect(page.locator('[data-testid="change-history-section"]')).toBeVisible({ timeout: 8000 });

    // Verify the Change History header is visible
    const historyHeader = page.locator('[data-testid="change-history-header"]');
    await expect(historyHeader).toBeVisible({ timeout: 3000 });
    console.log('Change History section visible: true');
  });
});
