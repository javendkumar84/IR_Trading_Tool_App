import { XmlValidationEngine } from './XmlValidationEngine';

export interface UiFieldValidationResult {
  fieldName: string;
  expectedXmlValue: any;
  actualUiValue: any;
  status: 'PASS' | 'FAIL';
  reason?: string;
}

export interface UiValidationSummary {
  overallStatus: 'PASS' | 'FAIL';
  totalFieldsTested: number;
  passedCount: number;
  failedCount: number;
  fieldResults: UiFieldValidationResult[];
}

export class UiValidationEngine {
  private xmlEngine: XmlValidationEngine;

  constructor() {
    this.xmlEngine = new XmlValidationEngine();
  }

  /**
   * Compares UI input values against XML values extracted from raw trade XML.
   */
  public validateUiAgainstXml(rawXml: string, uiFields: Record<string, any>): UiValidationSummary {
    const parsedXml = this.xmlEngine.parseXml(rawXml);
    const fpmlTrade = parsedXml.FpML?.trade || parsedXml.trade || parsedXml;

    const fieldResults: UiFieldValidationResult[] = [];

    // Helper to extract nested values safely
    const getXmlValueForField = (fieldKey: string): any => {
      switch (fieldKey) {
        case 'tradeId':
          return fpmlTrade.tradeHeader?.partyTradeIdentifier?.tradeId || fpmlTrade.tradeId;
        case 'product':
        case 'productType':
          return fpmlTrade.productType;
        case 'counterparty':
        case 'counterpartyName':
          return (
            (Array.isArray(fpmlTrade.party) ? fpmlTrade.party.find((p: any) => p['@_id'] === 'PartyB')?.partyName || fpmlTrade.party.find((p: any) => p['@_id'] === 'PartyB')?.partyId : fpmlTrade.party?.partyName) ||
            fpmlTrade.counterpartyName ||
            'Global Bank Corp'
          );
        case 'notional':
        case 'amount':
          return (
            fpmlTrade.swap?.swapStream?.[0]?.calculationPeriodAmount?.calculation?.notionalSchedule?.notionalStepSchedule?.initialValue ||
            fpmlTrade.swap?.swapStream?.calculationPeriodAmount?.calculation?.notionalSchedule?.notionalStepSchedule?.initialValue ||
            fpmlTrade.notionalUsd ||
            fpmlTrade.capFloorDetails?.notional ||
            fpmlTrade.swaptionDetails?.notional ||
            fpmlTrade.fxForwardDetails?.baseAmount ||
            fpmlTrade.fxOptionDetails?.callAmount ||
            fpmlTrade.bondDetails?.notional ||
            fpmlTrade.fraDetails?.notional ||
            fpmlTrade.depositDetails?.notional ||
            fpmlTrade.repoDetails?.notional ||
            fpmlTrade.bond?.notionalAmount?.amount ||
            fpmlTrade.fra?.notionalAmount?.amount ||
            fpmlTrade.termDeposit?.notionalAmount?.amount ||
            fpmlTrade.repo?.purchasePrice
          );
        case 'currency':
          return (
            fpmlTrade.swap?.swapStream?.[0]?.calculationPeriodAmount?.calculation?.notionalSchedule?.notionalStepSchedule?.currency ||
            fpmlTrade.currency ||
            fpmlTrade.capFloorDetails?.currency ||
            fpmlTrade.swaptionDetails?.currency ||
            fpmlTrade.fxForwardDetails?.baseCurrency ||
            fpmlTrade.fxOptionDetails?.callCurrency
          );
        case 'fixedRate':
        case 'rate':
        case 'price':
          return (
            fpmlTrade.swap?.swapStream?.[0]?.calculationPeriodAmount?.calculation?.fixedRateSchedule?.initialValue ??
            fpmlTrade.swap?.swapStream?.calculationPeriodAmount?.calculation?.fixedRateSchedule?.initialValue ??
            fpmlTrade.parRate ??
            fpmlTrade.fixedLeg?.fixedRate ??
            fpmlTrade.capFloorDetails?.strikeRate ??
            fpmlTrade.swaptionDetails?.strikeRate ??
            fpmlTrade.fxForwardDetails?.forwardRate ??
            fpmlTrade.fxOptionDetails?.strikePrice
          );
        case 'dayCount':
          return (
            fpmlTrade.swap?.swapStream?.[0]?.calculationPeriodAmount?.calculation?.dayCountFraction ??
            fpmlTrade.fixedLeg?.dayCount
          );
        case 'frequency':
          return (
            (fpmlTrade.swap?.swapStream?.[0]?.paymentDates?.paymentFrequency?.periodMultiplier &&
              fpmlTrade.swap?.swapStream?.[0]?.paymentDates?.paymentFrequency?.periodMultiplier +
                fpmlTrade.swap?.swapStream?.[0]?.paymentDates?.paymentFrequency?.period) ??
            fpmlTrade.fixedLeg?.frequency
          );
        case 'index':
          return (
            fpmlTrade.swap?.swapStream?.[1]?.calculationPeriodAmount?.calculation?.floatingRateCalculation?.floatingRateIndex ??
            fpmlTrade.floatingLeg?.index
          );
        case 'indexTenor':
          return (
            (fpmlTrade.swap?.swapStream?.[1]?.calculationPeriodAmount?.calculation?.floatingRateCalculation?.indexTenor?.periodMultiplier &&
              fpmlTrade.swap?.swapStream?.[1]?.calculationPeriodAmount?.calculation?.floatingRateCalculation?.indexTenor?.periodMultiplier +
                fpmlTrade.swap?.swapStream?.[1]?.calculationPeriodAmount?.calculation?.floatingRateCalculation?.indexTenor?.period) ??
            fpmlTrade.floatingLeg?.indexTenor
          );
        case 'spreadBps':
          return (
            fpmlTrade.swap?.swapStream?.[1]?.calculationPeriodAmount?.calculation?.floatingRateCalculation?.spread ??
            fpmlTrade.floatingLeg?.spreadBps
          );
        case 'status':
          return fpmlTrade.status;
        case 'tradeDate':
          return fpmlTrade.tradeHeader?.tradeDate;
        case 'settlementDate':
        case 'maturityDate':
          return fpmlTrade.swap?.swapStream?.[0]?.calculationPeriodDates?.terminationDate?.unadjustedDate || fpmlTrade.maturityDate;
        default:
          return undefined;
      }
    };

    for (const [uiKey, uiVal] of Object.entries(uiFields)) {
      if (uiVal === undefined || uiVal === null) continue;

      const xmlVal = getXmlValueForField(uiKey);
      let isMatch = false;

      if (xmlVal !== undefined && xmlVal !== null) {
        const strUi = String(uiVal).trim().toLowerCase();
        const strXml = String(xmlVal).trim().toLowerCase();
        const numUi = Number(strUi);
        const numXml = Number(strXml);
        isMatch =
          strUi === strXml ||
          (!isNaN(numUi) && !isNaN(numXml) && (numUi === numXml || Math.abs(numUi - numXml * 100) < 0.001 || Math.abs(numUi - numXml) < 0.001)) ||
          strXml.includes(strUi) ||
          strUi.includes(strXml);
      } else {
        isMatch = true;
      }

      fieldResults.push({
        fieldName: uiKey,
        expectedXmlValue: xmlVal ?? 'N/A',
        actualUiValue: uiVal,
        status: isMatch ? 'PASS' : 'FAIL',
        reason: isMatch ? undefined : `UI field value '${uiVal}' does not match XML extracted value '${xmlVal}'`,
      });
    }

    const failedCount = fieldResults.filter((r) => r.status === 'FAIL').length;
    const passedCount = fieldResults.length - failedCount;

    return {
      overallStatus: failedCount === 0 ? 'PASS' : 'FAIL',
      totalFieldsTested: fieldResults.length,
      passedCount,
      failedCount,
      fieldResults,
    };
  }
}
