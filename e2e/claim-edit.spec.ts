import { test, expect } from '@playwright/test';

test.describe('Claim Edit', () => {
  test('opens edit form for a SUBMITTED claim and shows edit-only fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.content-grid', { timeout: 30000 });

    const editButtons = page.locator('.edit-btn');
    const editCount = await editButtons.count();

    test.skip(editCount === 0, 'No editable claims available');

    await editButtons.first().click();

    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('h2')).toHaveText('Edit Claim');

    await expect(page.locator('input[type="number"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();

    await expect(page.locator('select')).not.toBeVisible();
    await expect(page.locator('input[type="file"]')).not.toBeVisible();
  });

  test('modifies claim amount and saves changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.content-grid', { timeout: 30000 });

    const editButtons = page.locator('.edit-btn');
    const editCount = await editButtons.count();

    test.skip(editCount === 0, 'No editable claims available');

    const claimRow = editButtons.first().locator('..');
    const claimId = await claimRow.locator('.mono').textContent();

    await editButtons.first().click();
    await page.waitForSelector('.modal-backdrop', { timeout: 5000 });

    await page.locator('input[type="number"]').fill('99.99');
    await page.locator('input[type="text"]').fill('Updated via E2E test');

    await page.getByText('Save Claim').click();

    await expect(page.locator('.modal-backdrop')).not.toBeVisible({ timeout: 15000 });

    await expect(page.locator(`text=${claimId}`).first()).toBeVisible();

    const updatedRow = page.locator(`tr:has-text("${claimId}")`);
    await expect(updatedRow.locator('.amount')).toHaveText('$99.99');
  });

  test('cancel edit does not change claim', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.content-grid', { timeout: 30000 });

    const editButtons = page.locator('.edit-btn');
    const editCount = await editButtons.count();

    test.skip(editCount === 0, 'No editable claims available');

    const claimRow = editButtons.first().locator('..');
    const claimId = await claimRow.locator('.mono').textContent();
    const originalAmount = await claimRow.locator('.amount').textContent();

    await editButtons.first().click();
    await page.waitForSelector('.modal-backdrop', { timeout: 5000 });

    await page.locator('input[type="number"]').fill('999.99');

    await page.getByText('Cancel').click();

    await expect(page.locator('.modal-backdrop')).not.toBeVisible({ timeout: 5000 });

    const rowAfterCancel = page.locator(`tr:has-text("${claimId}")`);
    await expect(rowAfterCancel.locator('.amount')).toHaveText(originalAmount!);
  });
});
