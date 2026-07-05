import { test, expect } from '@playwright/test';

/**
 * Happy-path smoke: sign in, run the standalone setup wizard end to end,
 * and confirm we land on the newly created venue's detail page.
 */
test('standalone wizard creates a venue and lands on detail', async ({ page }) => {
  await page.goto('/login');

  // Credentials are prefilled by the login form; just submit.
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  // Enter the wizard.
  await page.goto('/setup');
  await expect(page.getByRole('heading', { name: 'Setup wizard' })).toBeVisible();

  // Step 0 — choose the standalone path.
  await page.getByRole('button', { name: /Standalone venue/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // Client step.
  const stamp = Date.now();
  await page.getByLabel('Name').fill('Playwright Client');
  await page.getByLabel('Email').fill(`pw+${stamp}@example.test`);
  await page.getByRole('button', { name: 'Next' }).click();

  // Venue step.
  await page.getByLabel('Venue name').fill('Playwright Bistro');
  await page.getByRole('button', { name: 'Next' }).click();

  // Review → finish.
  await expect(page.getByRole('heading', { name: /Review/ })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  // Landed on the created venue detail.
  await expect(page).toHaveURL(/\/venues\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Playwright Bistro' })).toBeVisible();
});
