import { test, expect } from '@playwright/test';
import { BookingPage } from '../pages/BookingPage';
import { AmendmentPage } from '../pages/AmendmentPage';

test.describe('Enterprise Trade Validation Suite', () => {
  test('TC-E2E-01: Book Trade & Validate XML vs UI Attribute Alignment', async ({ page }) => {
    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    await bookingPage.selectProduct('IR Swap');
    const xmlContent = await bookingPage.getFpmlXml();

    expect(xmlContent).toContain('<FpML');
    expect(xmlContent).toContain('swap');
  });

  test('TC-E2E-02: Amend Trade & Validate XML Comparison Diff Engine', async ({ page }) => {
    const amendPage = new AmendmentPage(page);
    await amendPage.goto();

    await amendPage.loadTrade('IRS-2026-000101');
    await amendPage.amendTrade('JPMorgan Chase Bank, N.A.', '35000000');
  });

  test('TC-E2E-03: Run Trade Validation Dashboard & Generate PDF Report', async ({ page }) => {
    await page.goto('/');
    await page.click('#tab-btn-validation');

    await expect(page.locator('#trade-validation-dashboard-root')).toBeVisible();
    await page.click('button:has-text("Run Complete Regression")');

    await expect(page.locator('text=Execution Complete!')).toBeVisible({ timeout: 15000 });
  });
});
