import { test as base } from '@playwright/test';
import { BookingPage } from '../pages/BookingPage';
import { AmendmentPage } from '../pages/AmendmentPage';
import { TradeBlotterPage } from '../pages/TradeBlotterPage';
import { XmlValidationEngine } from '../utils/XmlValidationEngine';
import { UiValidationEngine } from '../utils/UiValidationEngine';
import { EvidenceCollector } from '../utils/EvidenceCollector';

type CustomFixtures = {
  bookingPage: BookingPage;
  amendmentPage: AmendmentPage;
  tradeBlotterPage: TradeBlotterPage;
  xmlValidator: XmlValidationEngine;
  uiValidator: UiValidationEngine;
  evidenceCollector: EvidenceCollector;
};

export const test = base.extend<CustomFixtures>({
  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },
  amendmentPage: async ({ page }, use) => {
    await use(new AmendmentPage(page));
  },
  tradeBlotterPage: async ({ page }, use) => {
    await use(new TradeBlotterPage(page));
  },
  xmlValidator: async ({}, use) => {
    await use(new XmlValidationEngine());
  },
  uiValidator: async ({}, use) => {
    await use(new UiValidationEngine());
  },
  evidenceCollector: async ({}, use) => {
    const collector = new EvidenceCollector();
    await use(collector);
  },
});

export { expect } from '@playwright/test';
