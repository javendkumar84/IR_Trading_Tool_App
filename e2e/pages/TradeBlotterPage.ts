import { Page, Locator } from '@playwright/test';

export class TradeBlotterPage {
  readonly page: Page;
  readonly navTabBlotter: Locator;
  readonly searchInput: Locator;
  readonly productFilterSelect: Locator;
  readonly statusFilterSelect: Locator;
  readonly tradeRows: Locator;
  readonly viewXmlButtons: Locator;
  readonly matureTradeButton: Locator;
  readonly cancelTradeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navTabBlotter = page.locator('#nav-tab-blotter, button:has-text("Trade Blotter")').first();
    this.searchInput = page.locator('input[placeholder*="Search Trade ID"]').first();
    this.productFilterSelect = page.locator('select:has-option("All Products")').first();
    this.statusFilterSelect = page.locator('select:has-option("All Statuses"), select:has-option("BOOKED")').first();
    this.tradeRows = page.locator('table tbody tr');
    this.viewXmlButtons = page.locator('button:has-text("XML"), button:has-text("View FpML")');
    this.matureTradeButton = page.locator('button:has-text("Mature"), button:has-text("Execute Maturity")').first();
    this.cancelTradeButton = page.locator('button:has-text("Cancel"), button:has-text("Cancel Trade")').first();
  }

  async navigateToBlotter() {
    await this.navTabBlotter.click();
    await this.page.waitForTimeout(500);
  }

  async filterByTradeId(tradeId: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill('');
      await this.searchInput.fill(tradeId);
      await this.page.waitForTimeout(300);
    }
  }

  async executeMaturityForTrade(tradeId: string) {
    await this.filterByTradeId(tradeId);
    const matureBtn = this.page.locator(`tr:has-text("${tradeId}") button:has-text("Mature")`).first();
    if (await matureBtn.isVisible()) {
      await matureBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async cancelTrade(tradeId: string) {
    await this.filterByTradeId(tradeId);
    const cancelBtn = this.page.locator(`tr:has-text("${tradeId}") button:has-text("Cancel")`).first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async getTradeStatusFromBlotter(tradeId: string): Promise<string> {
    await this.filterByTradeId(tradeId);
    const statusCell = this.page.locator(`tr:has-text("${tradeId}") td:has-text("BOOKED"), tr:has-text("${tradeId}") td:has-text("AMENDED"), tr:has-text("${tradeId}") td:has-text("MATURED"), tr:has-text("${tradeId}") td:has-text("CANCELLED")`).first();
    if (await statusCell.isVisible()) {
      return (await statusCell.innerText()).trim();
    }
    return 'UNKNOWN';
  }
}
