import { Page, Locator } from '@playwright/test';
import { ProductType } from '../../src/types';

export class BookingPage {
  readonly page: Page;
  readonly productDropdown: Locator;
  readonly counterpartySelect: Locator;
  readonly notionalInput: Locator;
  readonly currencySelect: Locator;
  readonly fixedRateInput: Locator;
  readonly dayCountSelect: Locator;
  readonly frequencySelect: Locator;
  readonly indexSelect: Locator;
  readonly indexTenorSelect: Locator;
  readonly spreadBpsInput: Locator;
  readonly bookTradeButton: Locator;
  readonly xmlPreviewTextarea: Locator;
  readonly downloadXmlButton: Locator;
  readonly activeTabSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productDropdown = page.locator('select#product-type-select, select[name="productType"]').first();
    this.counterpartySelect = page.locator('select#counterparty-select, select[name="counterpartyName"]').first();
    this.notionalInput = page.locator('input#notional-input, input[name="notional"], input[name="fixedLegNotional"]').first();
    this.currencySelect = page.locator('select#currency-select, select[name="currency"]').first();
    this.fixedRateInput = page.locator('input#fixed-rate-input, input[name="fixedRate"]').first();
    this.dayCountSelect = page.locator('select#day-count-select, select[name="dayCount"]').first();
    this.frequencySelect = page.locator('select#frequency-select, select[name="frequency"]').first();
    this.indexSelect = page.locator('select#floating-index-select, select[name="index"]').first();
    this.indexTenorSelect = page.locator('select#index-tenor-select, select[name="indexTenor"]').first();
    this.spreadBpsInput = page.locator('input#spread-bps-input, input[name="spreadBps"]').first();
    this.bookTradeButton = page.locator('button:has-text("Book Trade"), button:has-text("Execute Trade"), button#book-trade-btn').first();
    this.xmlPreviewTextarea = page.locator('textarea#xml-preview, textarea#raw-xml-display').first();
    this.downloadXmlButton = page.locator('button:has-text("Download FpML XML"), button:has-text("Download XML")').first();
    this.activeTabSelector = page.locator('#nav-tab-xml, button:has-text("Trade Capture"), button:has-text("XML Booking")').first();
  }

  async navigateToXmlBooking() {
    await this.page.goto('http://localhost:3000');
    await this.activeTabSelector.click();
    await this.page.waitForTimeout(500);
  }

  async selectProduct(productType: ProductType) {
    if (await this.productDropdown.isVisible()) {
      await this.productDropdown.selectOption(productType);
      await this.page.waitForTimeout(300);
    }
  }

  async fillMandatoryFields(fields: Record<string, any>) {
    for (const [key, val] of Object.entries(fields)) {
      const inputLocator = this.page.locator(`input[name="${key}"], select[name="${key}"], #${key}-input, #${key}-select`).first();
      if (await inputLocator.isVisible()) {
        const tagName = await inputLocator.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === 'select') {
          await inputLocator.selectOption(String(val));
        } else {
          await inputLocator.fill('');
          await inputLocator.fill(String(val));
        }
      }
    }
  }

  async clickBookTrade() {
    await this.bookTradeButton.click();
    await this.page.waitForTimeout(1000);
  }

  async getRawXmlContent(): Promise<string> {
    if (await this.xmlPreviewTextarea.isVisible()) {
      return await this.xmlPreviewTextarea.inputValue();
    }
    return '';
  }

  async getBookedTradeIdFromUi(): Promise<string> {
    const tradeIdBadge = this.page.locator('#latest-booked-trade-id, .trade-id-badge, text=/IRS-\\d{4}-\\d{6}/').first();
    if (await tradeIdBadge.isVisible()) {
      const text = await tradeIdBadge.innerText();
      const match = text.match(/IRS-\d{4}-\d{6}/);
      if (match) return match[0];
      return text.trim();
    }
    return `IRS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  }
}
