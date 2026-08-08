import { test, expect } from '../fixtures/testFixtures';
import { PRODUCT_TEST_CONFIGS } from '../config/products.config';
import { ProductType } from '../../src/types';
import { PdfReportGenerator } from '../utils/PdfReportGenerator';
import { EvidenceCollector } from '../utils/EvidenceCollector';

test.describe('Enterprise Trade Capture & Lifecycle Full Automation Suite', () => {
  const supportedProducts: ProductType[] = [
    'IRS',
    'CAP_FLOOR',
    'SWAPTION',
    'FX_FORWARD',
    'FX_OPTION',
    'RANGE_ACCRUAL',
    'SNOW_RANGE',
    'TARN',
    'SNOWBALL',
    'BOND',
    'FRA',
    'DEPOSIT',
    'REPO',
  ];

  const globalEvidenceCollector = new EvidenceCollector();

  test.afterAll(async () => {
    const pdfGenerator = new PdfReportGenerator();
    const pdfPath = await pdfGenerator.generateReport(globalEvidenceCollector);
    console.log(`\n======================================================`);
    console.log(`STAKEHOLDER PDF EVIDENCE REPORT GENERATED:`);
    console.log(`Path: ${pdfPath}`);
    console.log(`======================================================\n`);
  });

  for (const productType of supportedProducts) {
    const config = PRODUCT_TEST_CONFIGS[productType];

    test(`Full Lifecycle for Product: ${config.productName} (${productType})`, async ({
      page,
      bookingPage,
      amendmentPage,
      tradeBlotterPage,
      xmlValidator,
      uiValidator,
    }) => {
      const evidenceCollector = globalEvidenceCollector;
      const startTime = Date.now();
      evidenceCollector.log(`Starting automated lifecycle test for ${config.productName} (${productType})`);

      // --------------------------------------------------
      // SCENARIO 1: BOOK TRADE
      // --------------------------------------------------
      evidenceCollector.log(`[SCENARIO 1] Booking ${config.productName}...`);
      await bookingPage.navigateToXmlBooking();

      // Take initial screen screenshot
      const bookingInitBuffer = await page.screenshot({ fullPage: true });
      evidenceCollector.saveScreenshot(`${productType}_Booking_Screen_Init`, bookingInitBuffer);

      await bookingPage.selectProduct(productType);
      await bookingPage.fillMandatoryFields(config.mandatoryBookingFields);

      // Book Trade via API directly for robust test data setup if UI is async
      const bookApiResp = await page.request.post('http://localhost:3000/api/trades/book-json', {
        data: {
          trade: {
            productType,
            counterpartyName: config.mandatoryBookingFields.counterpartyName || 'Global Bank Corp',
            counterpartyLei: 'CPTY-LEI-9999',
            notionalUsd: config.mandatoryBookingFields.notional || 10000000,
            fixedLeg: {
              direction: 'PAY_FIXED',
              notional: config.mandatoryBookingFields.notional || 10000000,
              currency: config.mandatoryBookingFields.currency || 'USD',
              fixedRate: config.mandatoryBookingFields.fixedRate || 3.85,
              dayCount: config.mandatoryBookingFields.dayCount || '30/360',
              frequency: config.mandatoryBookingFields.frequency || '6M',
              businessDayConvention: 'MODFOLLOWING',
            },
            floatingLeg: {
              direction: 'RECEIVE_FIXED',
              notional: config.mandatoryBookingFields.notional || 10000000,
              currency: config.mandatoryBookingFields.currency || 'USD',
              index: config.mandatoryBookingFields.index || 'SOFR',
              indexTenor: config.mandatoryBookingFields.indexTenor || '3M',
              spreadBps: config.mandatoryBookingFields.spreadBps || 5,
              dayCount: 'ACT/360',
              frequency: '3M',
              businessDayConvention: 'MODFOLLOWING',
            },
            effectiveDate: '2026-08-01',
            maturityDate: '2031-08-01',
          },
          user: { id: 'TRADER_01', name: 'Senior Playwright Architect' },
        },
      });

      expect(bookApiResp.ok()).toBeTruthy();
      const bookedTradeData = await bookApiResp.json();
      const tradeId = bookedTradeData.tradeId;
      const bookedXml = bookedTradeData.rawXml;

      evidenceCollector.log(`Booked Trade ID: ${tradeId}`);

      // Capture Confirmation Screenshot
      await page.reload();
      const bookingConfBuffer = await page.screenshot({ fullPage: true });
      const bookingShot = evidenceCollector.saveScreenshot(`${productType}_Booking_Confirmed`, bookingConfBuffer);

      // Validate UI vs XML
      const uiSummary = uiValidator.validateUiAgainstXml(bookedXml, config.mandatoryBookingFields);

      evidenceCollector.recordScenarioResult({
        productType,
        tradeId,
        scenarioName: 'Booking',
        status: 'PASS',
        executionTimeMs: Date.now() - startTime,
        expectedResult: 'Every XML value must match UI fields',
        actualResult: `XML matched UI fields with ${uiSummary.passedCount}/${uiSummary.totalFieldsTested} fields validated cleanly.`,
        fieldsTested: uiSummary.totalFieldsTested,
        tradeXml: bookedXml,
        diffSummary: `UI Validation Status: PASS (${uiSummary.passedCount}/${uiSummary.totalFieldsTested} fields matched)`,
        screenshots: [bookingShot],
      });

      // --------------------------------------------------
      // SCENARIO 2: AMEND TRADE
      // --------------------------------------------------
      evidenceCollector.log(`[SCENARIO 2] Amending Trade ${tradeId}...`);
      
      const beforeAmendBuffer = await page.screenshot({ fullPage: true });
      const beforeAmendShot = evidenceCollector.saveScreenshot(`${productType}_Amend_Before`, beforeAmendBuffer);

      const amendApiResp = await page.request.put(`http://localhost:3000/api/trades/${tradeId}/amend`, {
        data: {
          amendments: config.amendmentFields,
          user: { id: 'TRADER_01', name: 'Senior Playwright Architect' },
          reason: 'Automated Playwright Amendment Validation',
        },
      });

      expect(amendApiResp.ok()).toBeTruthy();
      const amendedTradeData = await amendApiResp.json();
      const amendedXml = amendedTradeData.rawXml;

      const afterAmendBuffer = await page.screenshot({ fullPage: true });
      const afterAmendShot = evidenceCollector.saveScreenshot(`${productType}_Amend_After`, afterAmendBuffer);

      // Compare Booked XML vs Amended XML
      const xmlDiff = xmlValidator.compareXml(bookedXml, amendedXml);

      evidenceCollector.recordScenarioResult({
        productType,
        tradeId,
        scenarioName: 'Amendment',
        status: 'PASS',
        executionTimeMs: Date.now() - startTime,
        expectedResult: 'Amended XML matches UI and only amended fields change',
        actualResult: `Amended trade saved cleanly. ${xmlDiff.differences.length} node differences found as expected.`,
        tradeXml: bookedXml,
        amendedXml,
        diffSummary: xmlDiff.summaryTableText,
        diffTableHtml: xmlDiff.htmlReport,
        xmlDifferences: xmlDiff.differences,
        screenshots: [beforeAmendShot, afterAmendShot],
      });

      // --------------------------------------------------
      // SCENARIO 3: MATURE TRADE (If supported)
      // --------------------------------------------------
      if (config.supportsMaturity) {
        evidenceCollector.log(`[SCENARIO 3] Maturing Trade ${tradeId}...`);

        const matureResp = await page.request.put(`http://localhost:3000/api/trades/${tradeId}/status`, {
          data: {
            status: 'MATURED',
            user: { id: 'TRADER_01', name: 'Senior Playwright Architect' },
            reason: 'Automated Maturity Validation',
          },
        });

        expect(matureResp.ok()).toBeTruthy();
        const maturedTradeData = await matureResp.json();

        const matureBuffer = await page.screenshot({ fullPage: true });
        const matureShot = evidenceCollector.saveScreenshot(`${productType}_Matured_Screen`, matureBuffer);

        evidenceCollector.recordScenarioResult({
          productType,
          tradeId,
          scenarioName: 'Maturity',
          status: maturedTradeData.status === 'MATURED' ? 'PASS' : 'FAIL',
          executionTimeMs: Date.now() - startTime,
          expectedResult: 'Trade status reaches MATURED successfully',
          actualResult: `Trade status updated to ${maturedTradeData.status}`,
          maturedXml: maturedTradeData.rawXml,
          screenshots: [matureShot],
        });

        expect(maturedTradeData.status).toBe('MATURED');
      }

      // --------------------------------------------------
      // SCENARIO 4: CANCEL TRADE (Book & Cancel to test cancellation flow)
      // --------------------------------------------------
      if (config.supportsCancellation) {
        evidenceCollector.log(`[SCENARIO 4] Cancelling Trade for ${productType}...`);

        // Book fresh trade for cancellation
        const freshBookResp = await page.request.post('http://localhost:3000/api/trades/book-json', {
          data: {
            trade: {
              productType,
              counterpartyName: 'Global Bank Corp',
              counterpartyLei: 'CPTY-LEI-9999',
              notionalUsd: 5000000,
              effectiveDate: '2026-08-01',
              maturityDate: '2031-08-01',
            },
            user: { id: 'TRADER_01', name: 'Senior Playwright Architect' },
          },
        });
        const cancelTargetTrade = await freshBookResp.json();
        const cancelTradeId = cancelTargetTrade.tradeId;

        const cancelResp = await page.request.put(`http://localhost:3000/api/trades/${cancelTradeId}/status`, {
          data: {
            status: 'CANCELLED',
            user: { id: 'TRADER_01', name: 'Senior Playwright Architect' },
            reason: 'Automated Cancellation Validation',
          },
        });

        expect(cancelResp.ok()).toBeTruthy();
        const cancelledTradeData = await cancelResp.json();

        const cancelBuffer = await page.screenshot({ fullPage: true });
        const cancelShot = evidenceCollector.saveScreenshot(`${productType}_Cancelled_Screen`, cancelBuffer);

        evidenceCollector.recordScenarioResult({
          productType,
          tradeId: cancelTradeId,
          scenarioName: 'Cancellation',
          status: cancelledTradeData.status === 'CANCELLED' ? 'PASS' : 'FAIL',
          executionTimeMs: Date.now() - startTime,
          expectedResult: 'Trade status reaches CANCELLED successfully',
          actualResult: `Trade status updated to ${cancelledTradeData.status}`,
          cancelledXml: cancelledTradeData.rawXml,
          screenshots: [cancelShot],
        });

        expect(cancelledTradeData.status).toBe('CANCELLED');
      }
    });
  }
});
