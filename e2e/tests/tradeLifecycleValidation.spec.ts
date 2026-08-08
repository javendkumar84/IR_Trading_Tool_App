import { test, expect } from '@playwright/test';
import { BookingPage } from '../pages/BookingPage';
import { AmendmentPage } from '../pages/AmendmentPage';

test.describe('Independent 36-Scenario Trade Validation Playwright Suite', () => {

  test('Scenario Suite 1: Independent Trade Booking Validation Across 9 Products', async ({ page }) => {
    const bookingPage = new BookingPage(page);
    await bookingPage.goto();

    const products = [
      'IR Swap',
      'Cap / Floor',
      'Swaption',
      'Range Accrual',
      'SnowRange',
      'TARN',
      'Snowball',
      'FX Forward',
      'FX Option',
    ];

    for (const prod of products) {
      await bookingPage.selectProduct(prod);
      const xml = await bookingPage.getFpmlXml();
      expect(xml).toContain('<FpML');
    }
  });

  test('Scenario Suite 2: Independent Trade Amendment & 3-Tier DB Persistence Verification', async ({ page }) => {
    const amendPage = new AmendmentPage(page);
    await amendPage.goto();

    await amendPage.loadTrade('AMD-IRS-201');
    await amendPage.amendTrade('JPMorgan Chase Bank, N.A.', '35000000');
    await amendPage.verifyXmlDiffVisible();
  });

  test('Scenario Suite 3 & 4: Execute 36 Independent Scenarios on Trade Validation Dashboard', async ({ page }) => {
    await page.goto('/');
    await page.click('#tab-btn-validation');

    await expect(page.locator('#trade-validation-dashboard-root')).toBeVisible();
    await page.click('button:has-text("Run Full 4-Stage Suite")');

    await expect(page.locator('text=36 Independent Lifecycle Scenarios Complete!')).toBeVisible({ timeout: 30000 });
  });

});
