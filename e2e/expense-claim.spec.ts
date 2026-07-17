import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

test.describe('Expense Claim Submission', () => {
  let receiptPath: string;

  test.beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-receipt-'));
    receiptPath = join(dir, 'receipt.pdf');
    writeFileSync(receiptPath, '%PDF-1.4 fake receipt content');
  });

  test.afterEach(() => {
    try { unlinkSync(receiptPath); } catch {}
  });

  test('opens the new claim form and shows all required fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.content-grid', { timeout: 30000 });

    await page.getByText('+ New Claim').click();

    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('h2')).toHaveText('Submit New Claim');

    await expect(page.getByText('Amount (HKD)')).toBeVisible();
    await expect(page.getByText('Notes / Description')).toBeVisible();
    await expect(page.getByText('Budget Line')).toBeVisible();
    await expect(page.getByText('Receipt Upload (Drive)')).toBeVisible();

    await expect(page.locator('input[type="number"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('submits a new expense claim successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.content-grid', { timeout: 30000 });

    const initialClaims = await page.locator('.modern-table').first().locator('tbody tr').count();

    await page.getByText('+ New Claim').click();
    await page.waitForSelector('.modal-backdrop', { timeout: 5000 });

    await page.locator('input[type="number"]').fill('42.50');
    await page.locator('input[type="text"]').fill('E2E test claim - office supplies');

    await page.locator('select').selectOption({ index: 1 });

    await page.locator('input[type="file"]').setInputFiles(receiptPath);

    await page.getByText('Save Claim').click();

    await expect(page.locator('.modal-backdrop')).not.toBeVisible({ timeout: 15000 });

    const updatedClaims = await page.locator('.modern-table').first().locator('tbody tr').count();
    expect(updatedClaims).toBeGreaterThan(initialClaims);
  });

  test('validates required budget line selection', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto('/');
    await page.waitForSelector('.content-grid', { timeout: 30000 });

    await page.getByText('+ New Claim').click();
    await page.waitForSelector('.modal-backdrop', { timeout: 5000 });

    await page.locator('input[type="number"]').fill('10.00');
    await page.locator('input[type="text"]').fill('Test');
    await page.locator('input[type="file"]').setInputFiles(receiptPath);

    await page.getByText('Save Claim').click();

    expect(alertMessage).toContain('budget line');
  });
});
