import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and displays the dashboard', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30000 });

    await expect(page.locator('h1')).toHaveText('My Finance Dashboard');

    await expect(page.locator('.content-grid')).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Expense Claims')).toBeVisible();
    await expect(page.getByText('Budget Requests')).toBeVisible();

    await expect(page.locator('.modern-table')).toHaveCount(2);

    await expect(page.getByText('+ New Claim')).toBeVisible();
  });

  test('shows loading state initially', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.loader-container')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.loader-container')).not.toBeVisible({ timeout: 30000 });
  });

  test('displays table headers for both sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.content-grid', { timeout: 30000 });

    const claimHeaders = page.locator('section').first().locator('thead th');
    await expect(claimHeaders).toHaveText(['ID', 'Notes', 'Amount', 'Status', 'Action']);

    const requestHeaders = page.locator('section').last().locator('thead th');
    await expect(requestHeaders).toHaveText(['ID', 'Title', 'Submitted', 'Status']);
  });
});
