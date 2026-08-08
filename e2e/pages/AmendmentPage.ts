import { Page, Locator } from '@playwright/test';

export class AmendmentPage {
  readonly page: Page;
  readonly navTabAmend: Locator;
  readonly searchTradeInput: Locator;
  readonly selectTradeDropdown: Locator;
  readonly notionalInput: Locator;
  readonly fixedRateInput: Locator;
  readonly counterpartySelect: Locator;
  readonly saveAmendmentButton: Locator;
  readonly amendmentSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navTabAmend = page.locator('#nav-tab-amend, button:has-text("Trade Amendment"), button:has-text("Amend Trade")').first();
    this.searchTradeInput = page.locator('input#amend-search-input, input[placeholder*="Search"]').first();
    this.selectTradeDropdown = page.locator('select#amend-trade-select, select[name="selectedTradeId"]').first();
    this.notionalInput = page.locator('input#amend-notional, input[name="notional"]').first();
    this.fixedRateInput = page.locator('input#amend-rate, input[name="fixedRate"]').first();
    this.counterpartySelect = page.locator('select#amend-counterparty, select[name="counterpartyName"]').first();
    this.saveAmendmentButton = page.locator('button:has-text("Save Amendment"), button#save-amendment-btn').first();
    this.amendmentSuccessMessage = page.locator('.amendment-success-toast, text=/Amendment Saved/i').first();
  }

  async navigateToAmendmentTab() {
    await this.navTabAmend.click();
    await this.page.waitForTimeout(500);
  }

  async selectTradeToAmend(tradeId: string) {
    if (await this.selectTradeDropdown.isVisible()) {
      await this.selectTradeDropdown.selectOption(tradeId);
      await this.page.waitForTimeout(500);
    }
  }

  async applyAmendments(amendments: Record<string, any>) {
    for (const [key, val] of Object.entries(amendments)) {
      const inputLocator = this.page.locator(`input[name="${key}"], select[name="${key}"], #amend-${key}`).first();
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

  async saveAmendment() {
    if (await this.saveAmendmentButton.isVisible()) {
      await this.saveAmendmentButton.click();
      await this.page.waitForTimeout(1000);
    }
  }
}
