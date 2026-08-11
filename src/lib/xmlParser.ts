import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import {
  CapFloorDetails,
  Currency,
  DayCountConvention,
  FixedLeg,
  FloatingIndex,
  FloatingLeg,
  FxForwardDetails,
  FxOptionDetails,
  GenericSwapLeg,
  IndexTenor,
  IRSwapTrade,
  PaymentFrequency,
  ProductType,
  RangeAccrualDetails,
  SnowRangeDetails,
  TarnDetails,
  SnowballDetails,
  ResetType,
  SwaptionDetails,
} from '../types';
import {
  calculateCapFloorValuation,
  calculateFxForwardValuation,
  calculateFxOptionValuation,
  calculateMarkToMarket,
  calculateSwaptionValuation,
  calculateTenorYears,
  getEstimatedParRate,
} from './financialMath';

/**
 * Generates ISO 20022 / FpML 5.11 compliant XML representation for any derivative product
 */
export function generateIRSwapXml(trade: Partial<IRSwapTrade>): string {
  const productType: ProductType = trade.productType || 'IRS';
  const tradeId = trade.tradeId || `${productType}-PENDING`;
  const tradeDate = trade.tradeDate || new Date().toISOString().split('T')[0];
  const effectiveDate = trade.effectiveDate || '2026-08-01';
  const maturityDate = trade.maturityDate || '2031-08-01';

  let productXmlNode: any = {};

  if (productType === 'IRS') {
    const isDualFloating = trade.leg1?.legType === 'FLOATING' && trade.leg2?.legType === 'FLOATING';

    if (isDualFloating && trade.leg1 && trade.leg2) {
      productXmlNode = {
        swap: {
          swapStream: [
            {
              '@_id': 'FloatingLeg1',
              payerPartyReference: trade.leg1.direction === 'PAY_FIXED' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
              receiverPartyReference: trade.leg1.direction === 'PAY_FIXED' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
              calculationPeriodDates: {
                effectiveDate: { unadjustedDate: effectiveDate },
                terminationDate: { unadjustedDate: maturityDate },
              },
              paymentDates: {
                paymentFrequency: {
                  periodMultiplier: (trade.leg1.frequency || '3M').replace(/\D/g, '') || '3',
                  period: 'M',
                },
              },
              resetDates: {
                resetFrequency: {
                  periodMultiplier: (trade.leg1.indexTenor || '1M').replace(/\D/g, '') || '1',
                  period: 'M',
                },
                resetType: trade.leg1.resetType || 'ADVANCE',
              },
              calculationPeriodAmount: {
                calculation: {
                  notionalSchedule: {
                    notionalStepSchedule: {
                      initialValue: trade.leg1.notional,
                      currency: trade.leg1.currency,
                    },
                  },
                  floatingRateCalculation: {
                    floatingRateIndex: trade.leg1.index || 'SOFR',
                    indexTenor: {
                      periodMultiplier: (trade.leg1.indexTenor || '1M').replace(/\D/g, '') || '1',
                      period: 'M',
                    },
                    spreadRate: ((trade.leg1.spreadBps || 0) / 10000).toFixed(6),
                  },
                  dayCountFraction: trade.leg1.dayCount,
                },
              },
            },
            {
              '@_id': 'FloatingLeg2',
              payerPartyReference: trade.leg2.direction === 'PAY_FIXED' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
              receiverPartyReference: trade.leg2.direction === 'PAY_FIXED' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
              calculationPeriodDates: {
                effectiveDate: { unadjustedDate: effectiveDate },
                terminationDate: { unadjustedDate: maturityDate },
              },
              paymentDates: {
                paymentFrequency: {
                  periodMultiplier: (trade.leg2.frequency || '3M').replace(/\D/g, '') || '3',
                  period: 'M',
                },
              },
              resetDates: {
                resetFrequency: {
                  periodMultiplier: (trade.leg2.indexTenor || '3M').replace(/\D/g, '') || '3',
                  period: 'M',
                },
                resetType: trade.leg2.resetType || 'ARREARS',
              },
              calculationPeriodAmount: {
                calculation: {
                  notionalSchedule: {
                    notionalStepSchedule: {
                      initialValue: trade.leg2.notional,
                      currency: trade.leg2.currency,
                    },
                  },
                  floatingRateCalculation: {
                    floatingRateIndex: trade.leg2.index || 'SOFR',
                    indexTenor: {
                      periodMultiplier: (trade.leg2.indexTenor || '3M').replace(/\D/g, '') || '3',
                      period: 'M',
                    },
                    spreadRate: ((trade.leg2.spreadBps || 0) / 10000).toFixed(6),
                  },
                  dayCountFraction: trade.leg2.dayCount,
                },
              },
            },
          ],
        },
      };
    } else {
      const fixedLeg: FixedLeg = trade.fixedLeg || {
        direction: 'PAY_FIXED',
        notional: 10000000,
        currency: 'USD',
        fixedRate: 3.85,
        dayCount: '30/360',
        frequency: '6M',
        businessDayConvention: 'MODFOLLOWING',
      };

      const floatingLeg: FloatingLeg = trade.floatingLeg || {
        direction: 'RECEIVE_FIXED',
        notional: 10000000,
        currency: 'USD',
        index: 'SOFR',
        indexTenor: '3M',
        resetType: 'ADVANCE',
        spreadBps: 0,
        dayCount: 'ACT/360',
        frequency: '3M',
        businessDayConvention: 'MODFOLLOWING',
      };

      productXmlNode = {
        swap: {
          swapStream: [
            {
              '@_id': 'FixedLeg',
              payerPartyReference: fixedLeg.direction === 'PAY_FIXED' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
              receiverPartyReference: fixedLeg.direction === 'PAY_FIXED' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
              calculationPeriodDates: {
                effectiveDate: { unadjustedDate: effectiveDate },
                terminationDate: { unadjustedDate: maturityDate },
              },
              paymentDates: {
                paymentFrequency: {
                  periodMultiplier: fixedLeg.frequency.replace(/\D/g, '') || '6',
                  period: fixedLeg.frequency.includes('M') ? 'M' : 'Y',
                },
              },
              calculationPeriodAmount: {
                calculation: {
                  notionalSchedule: {
                    notionalStepSchedule: {
                      initialValue: fixedLeg.notional,
                      currency: fixedLeg.currency,
                    },
                  },
                  fixedRateSchedule: {
                    initialValue: (fixedLeg.fixedRate / 100).toFixed(6),
                  },
                  dayCountFraction: fixedLeg.dayCount,
                },
              },
            },
            {
              '@_id': 'FloatingLeg',
              payerPartyReference: floatingLeg.direction === 'PAY_FIXED' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
              receiverPartyReference: floatingLeg.direction === 'PAY_FIXED' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
              calculationPeriodDates: {
                effectiveDate: { unadjustedDate: effectiveDate },
                terminationDate: { unadjustedDate: maturityDate },
              },
              paymentDates: {
                paymentFrequency: {
                  periodMultiplier: floatingLeg.frequency.replace(/\D/g, '') || '3',
                  period: 'M',
                },
              },
              resetDates: {
                resetFrequency: {
                  periodMultiplier: floatingLeg.indexTenor.replace(/\D/g, '') || '3',
                  period: 'M',
                },
                resetType: floatingLeg.resetType || 'ADVANCE',
              },
              calculationPeriodAmount: {
                calculation: {
                  notionalSchedule: {
                    notionalStepSchedule: {
                      initialValue: floatingLeg.notional,
                      currency: floatingLeg.currency,
                    },
                  },
                  floatingRateCalculation: {
                    floatingRateIndex: floatingLeg.index,
                    indexTenor: {
                      periodMultiplier: floatingLeg.indexTenor.replace(/\D/g, '') || '3',
                      period: 'M',
                    },
                    spreadRate: (floatingLeg.spreadBps / 10000).toFixed(6),
                  },
                  dayCountFraction: floatingLeg.dayCount,
                },
              },
            },
          ],
        },
      };
    }
  } else if (productType === 'CAP_FLOOR') {
    const details: CapFloorDetails = trade.capFloorDetails || {
      capFloorType: 'CAP',
      direction: 'BUY',
      strikeRate: 4.0,
      underlyingIndex: 'SOFR',
      indexTenor: '3M',
      currency: 'USD',
      notional: 10000000,
      premiumAmount: 125000,
      paymentFrequency: '3M',
      dayCount: 'ACT/360',
    };

    productXmlNode = {
      capFloor: {
        capFloorStream: {
          payerPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
          receiverPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          calculationPeriodAmount: {
            calculation: {
              notionalSchedule: {
                notionalStepSchedule: {
                  initialValue: details.notional,
                  currency: details.currency,
                },
              },
              floatingRateCalculation: {
                floatingRateIndex: details.underlyingIndex,
                indexTenor: {
                  periodMultiplier: details.indexTenor.replace(/\D/g, '') || '3',
                  period: 'M',
                },
                capRateSchedule: details.capFloorType === 'CAP' ? { initialValue: (details.strikeRate / 100).toFixed(6) } : undefined,
                floorRateSchedule: details.capFloorType === 'FLOOR' ? { initialValue: (details.strikeRate / 100).toFixed(6) } : undefined,
              },
              dayCountFraction: details.dayCount,
            },
          },
        },
        premium: {
          payerPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
          receiverPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
          paymentAmount: {
            currency: details.currency,
            amount: details.premiumAmount,
          },
        },
      },
    };
  } else if (productType === 'SWAPTION') {
    const details: SwaptionDetails = trade.swaptionDetails || {
      swaptionType: 'PAYER',
      direction: 'BUY',
      strikeRate: 3.75,
      optionExpiryDate: '2027-08-01',
      underlyingMaturityDate: '2032-08-01',
      underlyingTenorYears: 5,
      settlementType: 'CASH',
      currency: 'USD',
      notional: 10000000,
      premiumAmount: 250000,
      underlyingFloatingIndex: 'SOFR',
    };

    productXmlNode = {
      swaption: {
        buyerPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
        sellerPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
        swaptionType: details.swaptionType,
        settlementType: details.settlementType,
        premium: {
          paymentAmount: {
            currency: details.currency,
            amount: details.premiumAmount,
          },
        },
        optionExpiryDate: details.optionExpiryDate,
        underlyingSwap: {
          fixedRate: (details.strikeRate / 100).toFixed(6),
          floatingRateIndex: details.underlyingFloatingIndex,
          notional: details.notional,
          currency: details.currency,
          underlyingMaturityDate: details.underlyingMaturityDate,
        },
      },
    };
  } else if (productType === 'FX_FORWARD') {
    const details: FxForwardDetails = trade.fxForwardDetails || {
      currencyPair: 'EUR/USD',
      direction: 'BUY_BASE',
      baseCurrency: 'EUR',
      counterCurrency: 'USD',
      baseAmount: 10000000,
      counterAmount: 10850000,
      forwardRate: 1.085,
      spotRate: 1.082,
      settlementDate: '2026-12-01',
    };

    productXmlNode = {
      fxSingleLeg: {
        exchangedCurrency1: {
          payerPartyReference: details.direction === 'BUY_BASE' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
          receiverPartyReference: details.direction === 'BUY_BASE' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
          paymentAmount: {
            currency: details.baseCurrency,
            amount: details.baseAmount,
          },
        },
        exchangedCurrency2: {
          payerPartyReference: details.direction === 'BUY_BASE' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
          receiverPartyReference: details.direction === 'BUY_BASE' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
          paymentAmount: {
            currency: details.counterCurrency,
            amount: details.counterAmount,
          },
        },
        valueDate: details.settlementDate,
        dealtRate: details.forwardRate,
        spotRate: details.spotRate,
      },
    };
  } else if (productType === 'FX_OPTION') {
    const details: FxOptionDetails = trade.fxOptionDetails || {
      optionType: 'CALL',
      direction: 'BUY',
      optionStyle: 'EUROPEAN',
      currencyPair: 'EUR/USD',
      callCurrency: 'EUR',
      callAmount: 10000000,
      putCurrency: 'USD',
      putAmount: 10900000,
      strikePrice: 1.09,
      expiryDate: '2026-11-01',
      expiryCut: '15:00 NY Cut',
      settlementDate: '2026-11-03',
      premiumAmount: 180000,
    };

    productXmlNode = {
      fxOption: {
        buyerPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
        sellerPartyReference: details.direction === 'BUY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
        optionType: details.optionType,
        optionStyle: details.optionStyle,
        currencyPair: details.currencyPair,
        strike: {
          rate: details.strikePrice,
        },
        expiryDate: details.expiryDate,
        expiryCut: details.expiryCut,
        settlementDate: details.settlementDate,
        callCurrencyAmount: {
          currency: details.callCurrency,
          amount: details.callAmount,
        },
        putCurrencyAmount: {
          currency: details.putCurrency,
          amount: details.putAmount,
        },
        premium: {
          paymentAmount: {
            currency: details.putCurrency,
            amount: details.premiumAmount,
          },
        },
      },
    };
  } else if (productType === 'RANGE_ACCRUAL') {
    const details = trade.rangeAccrualDetails || {
      rangeType: 'DUAL_BARRIER' as const,
      direction: 'RECEIVE' as const,
      lowerBarrierRate: 2.50,
      upperBarrierRate: 4.50,
      referenceIndex: 'SOFR' as const,
      accrualCouponRate: 5.25,
      currency: 'USD' as Currency,
      notional: 10000000,
      observationFrequency: 'DAILY_CALENDAR' as const,
      paymentFrequency: '3M' as const,
      dayCount: '30/360' as DayCountConvention,
      fundingLegType: 'FLOATING' as const,
      fundingIndex: 'SOFR' as const,
      fundingTenor: '3M' as const,
      fundingSpreadBps: 0,
      fundingResetType: 'ADVANCE' as const,
      fundingNotional: 10000000,
      fundingDayCount: 'ACT/360' as DayCountConvention,
      fundingPaymentFrequency: '3M' as const,
    };

    productXmlNode = {
      rangeAccrual: {
        payerPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
        receiverPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
        rangeAccrualStream: {
          '@_id': 'Leg1_RangeAccrualStream',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          rangeAccrualCalculation: {
            notionalAmount: {
              currency: details.currency,
              amount: details.notional,
            },
            accrualRate: (details.accrualCouponRate / 100).toFixed(6),
            floatingRateIndex: details.referenceIndex,
            lowerBarrier: (details.lowerBarrierRate / 100).toFixed(6),
            upperBarrier: (details.upperBarrierRate / 100).toFixed(6),
            observationFrequency: details.observationFrequency,
            dayCountFraction: details.dayCount,
          },
        },
        fundingStream: {
          '@_id': 'Leg2_FundingStream',
          payerPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
          receiverPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          paymentDates: {
            paymentFrequency: {
              periodMultiplier: (details.fundingPaymentFrequency || '3M').replace(/\D/g, '') || '3',
              period: 'M',
            },
          },
          resetDates: {
            resetFrequency: {
              periodMultiplier: (details.fundingTenor || '3M').replace(/\D/g, '') || '3',
              period: 'M',
            },
            resetType: details.fundingResetType || 'ADVANCE',
          },
          calculationPeriodAmount: {
            calculation: {
              notionalSchedule: {
                notionalStepSchedule: {
                  initialValue: details.fundingNotional || details.notional,
                  currency: details.currency,
                },
              },
              floatingRateCalculation: {
                floatingRateIndex: details.fundingIndex || 'SOFR',
                indexTenor: {
                  periodMultiplier: (details.fundingTenor || '3M').replace(/\D/g, '') || '3',
                  period: 'M',
                },
                spreadRate: (((details.fundingSpreadBps || 0)) / 10000).toFixed(6),
              },
              dayCountFraction: details.fundingDayCount || 'ACT/360',
            },
          },
        },
      },
    };
  } else if (productType === 'SNOW_RANGE') {
    const details = trade.snowRangeDetails || {
      direction: 'RECEIVE' as const,
      lowerBarrierRate: 2.00,
      upperBarrierRate: 4.75,
      baseCouponRate: 5.50,
      memoryMultiplier: 1.0,
      memoryEnabled: true,
      referenceIndex: 'SOFR' as FloatingIndex,
      currency: 'USD' as Currency,
      notional: 25000000,
      observationFrequency: 'DAILY_CALENDAR' as const,
      paymentFrequency: '3M' as const,
      dayCount: '30/360' as DayCountConvention,
      fundingLegType: 'FLOATING' as const,
      fundingIndex: 'SOFR' as FloatingIndex,
      fundingSpreadBps: 0,
      fundingDayCount: 'ACT/360' as DayCountConvention,
      fundingPaymentFrequency: '3M' as const,
    };

    productXmlNode = {
      snowRangeAccrual: {
        payerPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
        receiverPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
        snowRangeStream: {
          '@_id': 'Leg1_SnowRangeStream',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          snowRangeCalculation: {
            notionalAmount: { currency: details.currency, amount: details.notional },
            baseCouponRate: (details.baseCouponRate / 100).toFixed(6),
            memoryMultiplier: details.memoryMultiplier.toFixed(2),
            memoryEnabled: details.memoryEnabled ? 'true' : 'false',
            lowerBarrier: (details.lowerBarrierRate / 100).toFixed(6),
            upperBarrier: (details.upperBarrierRate / 100).toFixed(6),
            floatingRateIndex: details.referenceIndex,
            observationFrequency: details.observationFrequency,
            dayCountFraction: details.dayCount,
          },
        },
        fundingStream: {
          '@_id': 'Leg2_FundingStream',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          floatingRateCalculation: {
            floatingRateIndex: details.fundingIndex || 'SOFR',
            spreadRate: (((details.fundingSpreadBps || 0)) / 10000).toFixed(6),
          },
          dayCountFraction: details.fundingDayCount || 'ACT/360',
        },
      },
    };
  } else if (productType === 'TARN') {
    const details = trade.tarnDetails || {
      direction: 'RECEIVE' as const,
      targetCapPct: 10.00,
      couponFormulaType: 'INVERSE_FLOATER' as const,
      strikeRate: 6.50,
      leverageFactor: 1.5,
      floorRate: 0.00,
      capRate: 10.00,
      referenceIndex: 'SOFR' as FloatingIndex,
      currency: 'USD' as Currency,
      notional: 25000000,
      paymentFrequency: '3M' as const,
      dayCount: '30/360' as DayCountConvention,
      fundingLegType: 'FLOATING' as const,
      fundingIndex: 'SOFR' as FloatingIndex,
      fundingSpreadBps: 0,
      fundingDayCount: 'ACT/360' as DayCountConvention,
      fundingPaymentFrequency: '3M' as const,
    };

    productXmlNode = {
      targetRedemptionNote: {
        payerPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
        receiverPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
        tarnStream: {
          '@_id': 'Leg1_TarnStream',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          tarnCalculation: {
            notionalAmount: { currency: details.currency, amount: details.notional },
            targetCapPct: (details.targetCapPct / 100).toFixed(6),
            couponFormulaType: details.couponFormulaType,
            strikeRate: (details.strikeRate / 100).toFixed(6),
            leverageFactor: details.leverageFactor.toFixed(2),
            floorRate: (details.floorRate / 100).toFixed(6),
            capRate: (details.capRate / 100).toFixed(6),
            floatingRateIndex: details.referenceIndex,
            dayCountFraction: details.dayCount,
          },
        },
        fundingStream: {
          '@_id': 'Leg2_FundingStream',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          floatingRateCalculation: {
            floatingRateIndex: details.fundingIndex || 'SOFR',
            spreadRate: (((details.fundingSpreadBps || 0)) / 10000).toFixed(6),
          },
          dayCountFraction: details.fundingDayCount || 'ACT/360',
        },
      },
    };
  } else if (productType === 'SNOWBALL') {
    const details = trade.snowballDetails || {
      direction: 'RECEIVE' as const,
      initialCouponRate: 6.00,
      bonusStepRate: 1.50,
      leverageFactor: 1.0,
      floorRate: 0.00,
      capRate: 12.00,
      referenceIndex: 'SOFR' as FloatingIndex,
      currency: 'USD' as Currency,
      notional: 25000000,
      paymentFrequency: '3M' as const,
      dayCount: '30/360' as DayCountConvention,
      fundingLegType: 'FLOATING' as const,
      fundingIndex: 'SOFR' as FloatingIndex,
      fundingSpreadBps: 0,
      fundingDayCount: 'ACT/360' as DayCountConvention,
      fundingPaymentFrequency: '3M' as const,
    };

    productXmlNode = {
      snowballSwap: {
        payerPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
        receiverPartyReference: details.direction === 'PAY' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
        snowballStream: {
          '@_id': 'Leg1_SnowballStream',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          snowballCalculation: {
            notionalAmount: { currency: details.currency, amount: details.notional },
            initialCouponRate: (details.initialCouponRate / 100).toFixed(6),
            bonusStepRate: (details.bonusStepRate / 100).toFixed(6),
            leverageFactor: details.leverageFactor.toFixed(2),
            floorRate: (details.floorRate / 100).toFixed(6),
            capRate: (details.capRate / 100).toFixed(6),
            floatingRateIndex: details.referenceIndex,
            dayCountFraction: details.dayCount,
          },
        },
        fundingStream: {
          '@_id': 'Leg2_FundingStream',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          floatingRateCalculation: {
            floatingRateIndex: details.fundingIndex || 'SOFR',
            spreadRate: (((details.fundingSpreadBps || 0)) / 10000).toFixed(6),
          },
          dayCountFraction: details.fundingDayCount || 'ACT/360',
        },
      },
    };
  } else if (productType === 'BOND') {
    const details = trade.bondDetails || {
      bondType: 'SOVEREIGN' as const,
      isin: 'US912828C478',
      issuer: 'US Treasury',
      couponRate: 4.25,
      couponFrequency: '6M' as const,
      faceValue: 100,
      cleanPrice: 98.50,
      dirtyPrice: 99.20,
      yieldToMaturity: 4.55,
      currency: 'USD' as Currency,
      notional: 10000000,
      dayCount: '30/360' as DayCountConvention,
    };
    productXmlNode = {
      bond: {
        instrumentId: details.isin,
        issuer: details.issuer,
        bondType: details.bondType,
        couponRate: (details.couponRate / 100).toFixed(6),
        couponFrequency: details.couponFrequency,
        faceValue: details.faceValue,
        cleanPrice: details.cleanPrice,
        dirtyPrice: details.dirtyPrice,
        yieldToMaturity: (details.yieldToMaturity / 100).toFixed(6),
        notionalAmount: { currency: details.currency, amount: details.notional },
        dayCountFraction: details.dayCount,
      },
    };
  } else if (productType === 'FRA') {
    const details = trade.fraDetails || {
      fraRate: 3.95,
      fixingIndex: 'SOFR' as FloatingIndex,
      indexTenor: '3M' as IndexTenor,
      fixingDate: effectiveDate,
      paymentDate: effectiveDate,
      settlementType: 'CASH' as const,
      currency: 'USD' as Currency,
      notional: 10000000,
      dayCount: 'ACT/360' as DayCountConvention,
    };
    productXmlNode = {
      fra: {
        fraRate: (details.fraRate / 100).toFixed(6),
        floatingRateIndex: details.fixingIndex,
        indexTenor: details.indexTenor,
        fixingDate: details.fixingDate,
        paymentDate: details.paymentDate,
        settlementType: details.settlementType,
        notionalAmount: { currency: details.currency, amount: details.notional },
        dayCountFraction: details.dayCount,
      },
    };
  } else if (productType === 'DEPOSIT') {
    const details = trade.depositDetails || {
      direction: 'LEND' as const,
      depositRate: 4.10,
      termDays: 90,
      interestAmount: 102500,
      compoundingFrequency: 'NONE' as const,
      currency: 'USD' as Currency,
      notional: 10000000,
      dayCount: 'ACT/360' as DayCountConvention,
    };
    productXmlNode = {
      termDeposit: {
        direction: details.direction,
        depositRate: (details.depositRate / 100).toFixed(6),
        termDays: details.termDays,
        interestAmount: details.interestAmount,
        compoundingFrequency: details.compoundingFrequency,
        notionalAmount: { currency: details.currency, amount: details.notional },
        dayCountFraction: details.dayCount,
      },
    };
  } else if (productType === 'DUAL_DIGITAL') {
    const details = trade.dualDigitalDetails || {
      direction: 'RECEIVE_DIGITAL' as const,
      digitalPayoutAmount: 500000,
      payoutType: 'FIXED_AMOUNT' as const,
      index1: 'SOFR' as FloatingIndex,
      index1Tenor: '3M' as IndexTenor,
      condition1Operator: 'GREATER_THAN' as const,
      trigger1Rate: 4.00,
      index2: 'EURIBOR' as FloatingIndex,
      index2Tenor: '3M' as IndexTenor,
      condition2Operator: 'LESS_THAN' as const,
      trigger2Rate: 3.50,
      impliedCorrelation: 0.75,
      observationType: 'AT_MATURITY' as const,
      currency: 'USD' as Currency,
      notional: 10000000,
      dayCount: '30/360' as DayCountConvention,
      paymentFrequency: '1Y' as PaymentFrequency,
    };

    productXmlNode = {
      dualDigitalOption: {
        payerPartyReference: details.direction === 'PAY_DIGITAL' ? { '@_href': 'PartyA' } : { '@_href': 'PartyB' },
        receiverPartyReference: details.direction === 'PAY_DIGITAL' ? { '@_href': 'PartyB' } : { '@_href': 'PartyA' },
        dualDigitalLeg: {
          '@_id': 'DualDigital_PayoutLeg',
          calculationPeriodDates: {
            effectiveDate: { unadjustedDate: effectiveDate },
            terminationDate: { unadjustedDate: maturityDate },
          },
          binaryPayout: {
            payoutType: details.payoutType,
            payoutAmount: details.digitalPayoutAmount,
            payoutCurrency: details.currency,
          },
          referenceCondition1: {
            floatingRateIndex: details.index1,
            indexTenor: details.index1Tenor,
            operator: details.condition1Operator,
            triggerRate: (details.trigger1Rate / 100).toFixed(6),
          },
          referenceCondition2: {
            floatingRateIndex: details.index2,
            indexTenor: details.index2Tenor,
            operator: details.condition2Operator,
            triggerRate: (details.trigger2Rate / 100).toFixed(6),
          },
          impliedCorrelation: details.impliedCorrelation,
          observationType: details.observationType,
          notionalAmount: {
            currency: details.currency,
            amount: details.notional,
          },
          dayCountFraction: details.dayCount,
        },
      },
    };
  } else if (productType === 'REPO') {
    const details = trade.repoDetails || {
      repoType: 'CLASSIC_REPO' as const,
      collateralIsin: 'US912828C478',
      collateralDescription: 'US Treasury 10Y Note',
      repoRate: 3.75,
      haircutPct: 2.0,
      purchasePrice: 10000000,
      repurchasePrice: 10008333,
      currency: 'USD' as Currency,
      notional: 10000000,
      dayCount: 'ACT/360' as DayCountConvention,
    };
    productXmlNode = {
      repo: {
        repoType: details.repoType,
        collateralIsin: details.collateralIsin,
        collateralDescription: details.collateralDescription,
        repoRate: (details.repoRate / 100).toFixed(6),
        haircutPct: details.haircutPct,
        purchasePrice: details.purchasePrice,
        repurchasePrice: details.repurchasePrice,
        notionalAmount: { currency: details.currency, amount: details.notional },
        dayCountFraction: details.dayCount,
      },
    };
  }

  const xmlStructure = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    FpML: {
      '@_xmlns': 'http://www.fpml.org/FpML-5/confirmation',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_version': '5-11',
      header: {
        messageId: {
          '@_messageIdScheme': 'http://www.tradingapp.com/msg-id',
          '#text': `MSG-${tradeId}-${Date.now()}`,
        },
        sentBy: 'DERIVATIVES-DESK-SYS',
        sendTo: trade.counterpartyLei || 'LEI-CPTY-99990001',
        creationTimestamp: new Date().toISOString(),
      },
      trade: {
        tradeHeader: {
          tradeId: {
            '@_tradeIdScheme': 'http://www.tradingapp.com/trade-id',
            '#text': tradeId,
          },
          tradeDate,
          traderId: trade.traderId || 'TRADER_DESK_01',
          calculationAgent: trade.calculationAgent || 'CALC_AGENT_SELF',
          clearingHouse: trade.clearingHouse || 'LCH_CLEARNET',
          status: trade.status || 'BOOKED',
          productType,
        },
        ...productXmlNode,
        party: [
          {
            '@_id': 'PartyA',
            partyId: 'OUR_BANK_DESK_LEI',
            partyName: 'Global Capital Markets Desk',
          },
          {
            '@_id': 'PartyB',
            partyId: trade.counterpartyLei || 'CPTY_LEI_DEFAULT',
            partyName: trade.counterpartyName || 'JPMorgan Chase & Co.',
          },
        ],
      },
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });

  return builder.build(xmlStructure);
}

export interface XmlParseResult {
  success: boolean;
  trade?: Partial<IRSwapTrade>;
  errors: string[];
}

/**
 * Parses raw XML string into Trade record for any of the 5 supported derivative products
 */
export function parseIRSwapXml(xmlString: string): XmlParseResult {
  const errors: string[] = [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(xmlString);

    if (!parsed || !parsed.FpML || !parsed.FpML.trade) {
      return {
        success: false,
        errors: ['Invalid FpML XML: Missing root <FpML> or <trade> element.'],
      };
    }

    const tradeNode = parsed.FpML.trade;
    const tradeHeader = tradeNode.tradeHeader || {};
    const parties = Array.isArray(tradeNode.party) ? tradeNode.party : tradeNode.party ? [tradeNode.party] : [];

    const tradeId = tradeHeader.tradeId?.['#text'] || tradeHeader.tradeId || '';
    const tradeDate = tradeHeader.tradeDate || new Date().toISOString().split('T')[0];
    const traderId = tradeHeader.traderId || 'TRADER_DESK_01';
    const calculationAgent = tradeHeader.calculationAgent || 'CALC_AGENT_SELF';

    const partyB = parties.find((p: any) => p['@_id'] === 'PartyB') || parties[1] || {};
    const counterpartyName = partyB.partyName || 'Counterparty Corp';
    const counterpartyLei = partyB.partyId || partyB.partyName || 'CPTY-LEI-9999';

    // Auto-detect Product Type
    let productType: ProductType = (tradeHeader.productType as ProductType) || 'IRS';

    if (tradeNode.swap) productType = 'IRS';
    else if (tradeNode.capFloor) productType = 'CAP_FLOOR';
    else if (tradeNode.swaption) productType = 'SWAPTION';
    else if (tradeNode.rangeAccrual) productType = 'RANGE_ACCRUAL';
    else if (tradeNode.snowRangeAccrual) productType = 'SNOW_RANGE';
    else if (tradeNode.targetRedemptionNote) productType = 'TARN';
    else if (tradeNode.snowballSwap) productType = 'SNOWBALL';
    else if (tradeNode.fxSingleLeg) productType = 'FX_FORWARD';
    else if (tradeNode.fxOption) productType = 'FX_OPTION';
    else if (tradeNode.bond) productType = 'BOND';
    else if (tradeNode.fra) productType = 'FRA';
    else if (tradeNode.termDeposit) productType = 'DEPOSIT';
    else if (tradeNode.repo) productType = 'REPO';

    // Default Legs for backward compatibility
    let fixedLeg: FixedLeg = {
      direction: 'PAY_FIXED',
      notional: 10000000,
      currency: 'USD',
      fixedRate: 3.85,
      dayCount: '30/360',
      frequency: '6M',
      businessDayConvention: 'MODFOLLOWING',
    };

    let floatingLeg: FloatingLeg = {
      direction: 'RECEIVE_FIXED',
      notional: 10000000,
      currency: 'USD',
      index: 'SOFR',
      indexTenor: '3M',
      spreadBps: 0,
      dayCount: 'ACT/360',
      frequency: '3M',
      businessDayConvention: 'MODFOLLOWING',
    };

    let capFloorDetails: CapFloorDetails | undefined;
    let swaptionDetails: SwaptionDetails | undefined;
    let fxForwardDetails: FxForwardDetails | undefined;
    let fxOptionDetails: FxOptionDetails | undefined;
    let rangeAccrualDetails: RangeAccrualDetails | undefined;
    let snowRangeDetails: SnowRangeDetails | undefined;
    let tarnDetails: TarnDetails | undefined;
    let snowballDetails: SnowballDetails | undefined;
    let bondDetails: import('../types').BondDetails | undefined;
    let fraDetails: import('../types').FraDetails | undefined;
    let depositDetails: import('../types').DepositDetails | undefined;
    let repoDetails: import('../types').RepoDetails | undefined;
    let dualDigitalDetails: import('../types').DualDigitalDetails | undefined;

    let effectiveDate = '2026-08-01';
    let maturityDate = '2031-08-01';
    let tenorYears = 5;
    let parRate = 3.85;
    let dv01 = 4500;
    let markToMarket = 0;
    let notionalUsd = 10000000;

    let leg1: GenericSwapLeg | undefined;
    let leg2: GenericSwapLeg | undefined;

    if (productType === 'IRS') {
      const swapNode = tradeNode.swap || {};
      const streams = Array.isArray(swapNode.swapStream) ? swapNode.swapStream : swapNode.swapStream ? [swapNode.swapStream] : [];
      let fixedStream: any = null;
      let floatingStream: any = null;
      let floatingStream2: any = null;

      streams.forEach((s: any) => {
        const calc = s.calculationPeriodAmount?.calculation || {};
        if (calc.fixedRateSchedule) fixedStream = s;
        else if (calc.floatingRateCalculation) {
          if (!floatingStream) floatingStream = s;
          else floatingStream2 = s;
        }
      });

      if (fixedStream && floatingStream) {
        const fixedCalc = fixedStream.calculationPeriodAmount.calculation;
        const fixedNotionalNode = fixedCalc.notionalSchedule?.notionalStepSchedule || {};
        const fixedNotional = parseFloat(fixedNotionalNode.initialValue || '10000000');
        const currency = (fixedNotionalNode.currency || 'USD') as Currency;
        notionalUsd = fixedNotional;

        let fixedRateVal = parseFloat(fixedCalc.fixedRateSchedule?.initialValue || '0.0385');
        if (fixedRateVal < 0.2) fixedRateVal = fixedRateVal * 100;

        const fixedDayCount = (fixedCalc.dayCountFraction || '30/360') as DayCountConvention;
        const calcPeriodDates = fixedStream.calculationPeriodDates || {};
        effectiveDate = calcPeriodDates.effectiveDate?.unadjustedDate || '2026-08-01';
        maturityDate = calcPeriodDates.terminationDate?.unadjustedDate || '2031-08-01';

        const isPayerPartyA = fixedStream.payerPartyReference?.['@_href'] === 'PartyA';
        const payReceive = isPayerPartyA ? 'PAY_FIXED' : 'RECEIVE_FIXED';

        const floatCalc = floatingStream.calculationPeriodAmount.calculation;
        const floatCalcDetail = floatCalc.floatingRateCalculation || {};
        const floatingIndex = (floatCalcDetail.floatingRateIndex || 'SOFR') as FloatingIndex;

        fixedLeg = {
          direction: payReceive,
          notional: fixedNotional,
          currency,
          fixedRate: fixedRateVal,
          dayCount: fixedDayCount,
          frequency: '6M',
          businessDayConvention: 'MODFOLLOWING',
        };

        floatingLeg = {
          direction: payReceive === 'PAY_FIXED' ? 'RECEIVE_FIXED' : 'PAY_FIXED',
          notional: fixedNotional,
          currency,
          index: floatingIndex,
          indexTenor: '3M',
          spreadBps: 0,
          dayCount: 'ACT/360',
          frequency: '3M',
          businessDayConvention: 'MODFOLLOWING',
        };

        tenorYears = calculateTenorYears(effectiveDate, maturityDate);
        const estParRate = getEstimatedParRate(currency, tenorYears);
        const val = calculateMarkToMarket(fixedLeg, floatingLeg, tenorYears, estParRate);
        parRate = val.parRate;
        dv01 = val.dv01;
        markToMarket = val.mtm;
      } else if (floatingStream && floatingStream2) {
        // Dual Floating Leg Basis Swap
        const floatCalc1 = floatingStream.calculationPeriodAmount.calculation;
        const notionalNode1 = floatCalc1.notionalSchedule?.notionalStepSchedule || {};
        const notional1 = parseFloat(notionalNode1.initialValue || '10000000');
        const ccy = (notionalNode1.currency || 'USD') as Currency;
        notionalUsd = notional1;

        const floatDetail1 = floatCalc1.floatingRateCalculation || {};
        const index1 = (floatDetail1.floatingRateIndex || 'SOFR') as FloatingIndex;
        const tenor1 = `${floatDetail1.indexTenor?.periodMultiplier || '1'}${floatDetail1.indexTenor?.period || 'M'}`;
        const isPay1 = floatingStream.payerPartyReference?.['@_href'] === 'PartyA';

        const floatCalc2 = floatingStream2.calculationPeriodAmount.calculation;
        const floatDetail2 = floatCalc2.floatingRateCalculation || {};
        const index2 = (floatDetail2.floatingRateIndex || 'SOFR') as FloatingIndex;
        const tenor2 = `${floatDetail2.indexTenor?.periodMultiplier || '3'}${floatDetail2.indexTenor?.period || 'M'}`;
        const isPay2 = floatingStream2.payerPartyReference?.['@_href'] === 'PartyA';

        const calcDates = floatingStream.calculationPeriodDates || {};
        effectiveDate = calcDates.effectiveDate?.unadjustedDate || '2026-08-01';
        maturityDate = calcDates.terminationDate?.unadjustedDate || '2031-08-01';

        leg1 = {
          legType: 'FLOATING',
          direction: isPay1 ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional: notional1,
          currency: ccy,
          index: index1,
          indexTenor: tenor1 as IndexTenor,
          spreadBps: 0,
          dayCount: (floatCalc1.dayCountFraction || 'ACT/360') as DayCountConvention,
          frequency: tenor1 as PaymentFrequency,
          resetType: floatingStream.resetDates?.resetType || 'ADVANCE',
          businessDayConvention: 'MODFOLLOWING',
        };

        leg2 = {
          legType: 'FLOATING',
          direction: isPay2 ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional: notional1,
          currency: ccy,
          index: index2,
          indexTenor: tenor2 as IndexTenor,
          spreadBps: 12,
          dayCount: (floatCalc2.dayCountFraction || 'ACT/360') as DayCountConvention,
          frequency: tenor2 as PaymentFrequency,
          resetType: floatingStream2.resetDates?.resetType || 'ARREARS',
          businessDayConvention: 'MODFOLLOWING',
        };

        tenorYears = calculateTenorYears(effectiveDate, maturityDate);
      }
    } else if (productType === 'CAP_FLOOR') {
      const capNode = tradeNode.capFloor || {};
      const stream = capNode.capFloorStream || {};
      const calc = stream.calculationPeriodAmount?.calculation || {};
      const notionalNode = calc.notionalSchedule?.notionalStepSchedule || {};

      effectiveDate = stream.calculationPeriodDates?.effectiveDate?.unadjustedDate || '2026-08-01';
      maturityDate = stream.calculationPeriodDates?.terminationDate?.unadjustedDate || '2031-08-01';
      tenorYears = calculateTenorYears(effectiveDate, maturityDate);

      const floatCalc = calc.floatingRateCalculation || {};
      const isCap = !!floatCalc.capRateSchedule;
      const strikeRateVal = parseFloat(floatCalc.capRateSchedule?.initialValue || floatCalc.floorRateSchedule?.initialValue || '0.04') * (parseFloat(floatCalc.capRateSchedule?.initialValue || floatCalc.floorRateSchedule?.initialValue || '0.04') < 0.2 ? 100 : 1);

      const currency = (notionalNode.currency || 'USD') as Currency;
      const notional = parseFloat(notionalNode.initialValue || '10000000');
      notionalUsd = notional;
      const premiumAmount = parseFloat(capNode.premium?.paymentAmount?.amount || '125000');
      const isBuy = stream.receiverPartyReference?.['@_href'] === 'PartyA';

      capFloorDetails = {
        capFloorType: isCap ? 'CAP' : 'FLOOR',
        direction: isBuy ? 'BUY' : 'SELL',
        strikeRate: strikeRateVal,
        underlyingIndex: (floatCalc.floatingRateIndex || 'SOFR') as FloatingIndex,
        indexTenor: '3M',
        currency,
        notional,
        premiumAmount,
        paymentFrequency: '3M',
        dayCount: 'ACT/360',
      };

      const estMarketRate = getEstimatedParRate(currency, tenorYears);
      const val = calculateCapFloorValuation(
        capFloorDetails.capFloorType,
        capFloorDetails.direction,
        capFloorDetails.strikeRate,
        notional,
        currency,
        tenorYears,
        estMarketRate,
        premiumAmount
      );
      parRate = val.parRate;
      dv01 = val.dv01;
      markToMarket = val.mtm;
    } else if (productType === 'SWAPTION') {
      const swNode = tradeNode.swaption || {};
      const isBuy = swNode.buyerPartyReference?.['@_href'] === 'PartyA';
      const swaptionType = swNode.swaptionType || 'PAYER';
      const premiumAmount = parseFloat(swNode.premium?.paymentAmount?.amount || '250000');
      const currency = (swNode.premium?.paymentAmount?.currency || 'USD') as Currency;

      const undSwap = swNode.underlyingSwap || {};
      const strikeRateVal = parseFloat(undSwap.fixedRate || '0.0375') * (parseFloat(undSwap.fixedRate || '0.0375') < 0.2 ? 100 : 1);
      const notional = parseFloat(undSwap.notional || '10000000');
      notionalUsd = notional;
      effectiveDate = tradeDate;
      const optionExpiryDate = swNode.optionExpiryDate || '2027-08-01';
      maturityDate = undSwap.underlyingMaturityDate || '2032-08-01';
      tenorYears = calculateTenorYears(optionExpiryDate, maturityDate);

      swaptionDetails = {
        swaptionType: swaptionType as 'PAYER' | 'RECEIVER',
        direction: isBuy ? 'BUY' : 'SELL',
        strikeRate: strikeRateVal,
        optionExpiryDate,
        underlyingMaturityDate: maturityDate,
        underlyingTenorYears: tenorYears,
        settlementType: (swNode.settlementType || 'CASH') as 'CASH' | 'PHYSICAL',
        currency,
        notional,
        premiumAmount,
        underlyingFloatingIndex: (undSwap.floatingRateIndex || 'SOFR') as FloatingIndex,
      };

      const estMarketRate = getEstimatedParRate(currency, tenorYears);
      const val = calculateSwaptionValuation(
        swaptionDetails.swaptionType,
        swaptionDetails.direction,
        swaptionDetails.strikeRate,
        notional,
        currency,
        tenorYears,
        estMarketRate,
        premiumAmount
      );
      parRate = val.parRate;
      dv01 = val.dv01;
      markToMarket = val.mtm;
    } else if (productType === 'FX_FORWARD') {
      const fxNode = tradeNode.fxSingleLeg || {};
      const ccy1 = fxNode.exchangedCurrency1?.paymentAmount || {};
      const ccy2 = fxNode.exchangedCurrency2?.paymentAmount || {};

      const baseCurrency = (ccy1.currency || 'EUR') as Currency;
      const counterCurrency = (ccy2.currency || 'USD') as Currency;
      const baseAmount = parseFloat(ccy1.amount || '10000000');
      const counterAmount = parseFloat(ccy2.amount || '10850000');
      notionalUsd = baseAmount;

      const isBuyBase = fxNode.exchangedCurrency1?.receiverPartyReference?.['@_href'] === 'PartyA';
      const forwardRate = parseFloat(fxNode.dealtRate || '1.0850');
      const spotRate = parseFloat(fxNode.spotRate || '1.0820');
      effectiveDate = tradeDate;
      maturityDate = fxNode.valueDate || '2026-12-01';

      fxForwardDetails = {
        currencyPair: `${baseCurrency}/${counterCurrency}`,
        direction: isBuyBase ? 'BUY_BASE' : 'SELL_BASE',
        baseCurrency,
        counterCurrency,
        baseAmount,
        counterAmount,
        forwardRate,
        spotRate,
        settlementDate: maturityDate,
      };

      tenorYears = calculateTenorYears(tradeDate, maturityDate);
      const val = calculateFxForwardValuation(
        fxForwardDetails.direction,
        baseAmount,
        forwardRate,
        spotRate,
        baseCurrency,
        counterCurrency
      );
      parRate = forwardRate;
      dv01 = val.dv01;
      markToMarket = val.mtm;
    } else if (productType === 'FX_OPTION') {
      const fxOptNode = tradeNode.fxOption || {};
      const isBuy = fxOptNode.buyerPartyReference?.['@_href'] === 'PartyA';
      const callNode = fxOptNode.callCurrencyAmount || {};
      const putNode = fxOptNode.putCurrencyAmount || {};

      const callCurrency = (callNode.currency || 'EUR') as Currency;
      const putCurrency = (putNode.currency || 'USD') as Currency;
      const callAmount = parseFloat(callNode.amount || '10000000');
      const putAmount = parseFloat(putNode.amount || '10900000');
      notionalUsd = callAmount;

      const strikePrice = parseFloat(fxOptNode.strike?.rate || '1.0900');
      const premiumAmount = parseFloat(fxOptNode.premium?.paymentAmount?.amount || '180000');
      effectiveDate = tradeDate;
      maturityDate = fxOptNode.settlementDate || '2026-11-03';

      fxOptionDetails = {
        optionType: (fxOptNode.optionType || 'CALL') as 'CALL' | 'PUT',
        direction: isBuy ? 'BUY' : 'SELL',
        optionStyle: (fxOptNode.optionStyle || 'EUROPEAN') as 'EUROPEAN' | 'AMERICAN',
        currencyPair: fxOptNode.currencyPair || `${callCurrency}/${putCurrency}`,
        callCurrency,
        callAmount,
        putCurrency,
        putAmount,
        strikePrice,
        expiryDate: fxOptNode.expiryDate || '2026-11-01',
        expiryCut: fxOptNode.expiryCut || '15:00 NY Cut',
        settlementDate: maturityDate,
        premiumAmount,
      };

      tenorYears = calculateTenorYears(tradeDate, maturityDate);
      const val = calculateFxOptionValuation(
        fxOptionDetails.optionType,
        fxOptionDetails.direction,
        strikePrice,
        callAmount,
        putAmount,
        premiumAmount,
        callCurrency
      );
      parRate = strikePrice;
      dv01 = val.dv01;
      markToMarket = val.mtm;
    } else if (productType === 'RANGE_ACCRUAL') {
      const rangeNode = tradeNode.rangeAccrual || {};
      const stream = rangeNode.rangeAccrualStream || {};
      const calc = stream.rangeAccrualCalculation || {};

      effectiveDate = stream.calculationPeriodDates?.effectiveDate?.unadjustedDate || '2026-08-01';
      maturityDate = stream.calculationPeriodDates?.terminationDate?.unadjustedDate || '2028-08-01';
      tenorYears = calculateTenorYears(effectiveDate, maturityDate);

      const lowerBarrierRate = parseFloat(calc.lowerBarrier || '0.025') * (parseFloat(calc.lowerBarrier || '0.025') < 0.2 ? 100 : 1);
      const upperBarrierRate = parseFloat(calc.upperBarrier || '0.045') * (parseFloat(calc.upperBarrier || '0.045') < 0.2 ? 100 : 1);
      const accrualCouponRate = parseFloat(calc.accrualRate || '0.0525') * (parseFloat(calc.accrualRate || '0.0525') < 0.2 ? 100 : 1);
      const currency = (calc.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(calc.notionalAmount?.amount || '10000000');
      notionalUsd = notional;
      const isPay = rangeNode.payerPartyReference?.['@_href'] === 'PartyA';

      const fundingNode = rangeNode.fundingStream;
      const fundingCalc = fundingNode?.calculationPeriodAmount?.calculation;
      const fundingFloatingCalc = fundingCalc?.floatingRateCalculation;

      const fundingIndex = (fundingFloatingCalc?.floatingRateIndex || 'SOFR') as FloatingIndex;
      const fundingSpreadBps = Math.round(parseFloat(fundingFloatingCalc?.spreadRate || '0') * 10000);
      const fundingDayCount = (fundingCalc?.dayCountFraction || 'ACT/360') as DayCountConvention;

      rangeAccrualDetails = {
        rangeType: 'DUAL_BARRIER',
        direction: isPay ? 'PAY' : 'RECEIVE',
        lowerBarrierRate,
        upperBarrierRate,
        accrualCouponRate,
        referenceIndex: (calc.floatingRateIndex || 'SOFR') as FloatingIndex,
        currency,
        notional,
        observationFrequency: (calc.observationFrequency || 'DAILY_BUSINESS') as any,
        paymentFrequency: '3M',
        dayCount: (calc.dayCountFraction || '30/360') as DayCountConvention,
        fundingLegType: 'FLOATING',
        fundingDirection: isPay ? 'RECEIVE' : 'PAY',
        fundingIndex,
        fundingTenor: '3M',
        fundingSpreadBps,
        fundingFixedRate: 3.85,
        fundingResetType: (fundingNode?.resetDates?.resetType || 'ADVANCE') as ResetType,
        fundingNotional: parseFloat(fundingCalc?.notionalSchedule?.notionalStepSchedule?.initialValue || String(notional)),
        fundingDayCount,
        fundingPaymentFrequency: '3M',
      };

      parRate = accrualCouponRate;
      dv01 = 5200;
      markToMarket = 0;
    } else if (productType === 'SNOW_RANGE') {
      const srNode = tradeNode.snowRangeAccrual || {};
      const stream = srNode.snowRangeStream || {};
      const calc = stream.snowRangeCalculation || {};

      effectiveDate = stream.calculationPeriodDates?.effectiveDate?.unadjustedDate || '2026-08-01';
      maturityDate = stream.calculationPeriodDates?.terminationDate?.unadjustedDate || '2031-08-01';
      tenorYears = calculateTenorYears(effectiveDate, maturityDate);

      const baseCouponRate = parseFloat(calc.baseCouponRate || '0.0550') * (parseFloat(calc.baseCouponRate || '0.0550') < 0.2 ? 100 : 1);
      const lowerBarrierRate = parseFloat(calc.lowerBarrier || '0.0200') * (parseFloat(calc.lowerBarrier || '0.0200') < 0.2 ? 100 : 1);
      const upperBarrierRate = parseFloat(calc.upperBarrier || '0.0475') * (parseFloat(calc.upperBarrier || '0.0475') < 0.2 ? 100 : 1);
      const currency = (calc.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(calc.notionalAmount?.amount || '25000000');
      notionalUsd = notional;
      const isPay = srNode.payerPartyReference?.['@_href'] === 'PartyA';

      snowRangeDetails = {
        direction: isPay ? 'PAY' : 'RECEIVE',
        lowerBarrierRate,
        upperBarrierRate,
        baseCouponRate,
        memoryMultiplier: parseFloat(calc.memoryMultiplier || '1.0'),
        memoryEnabled: calc.memoryEnabled !== 'false',
        referenceIndex: (calc.floatingRateIndex || 'SOFR') as FloatingIndex,
        currency,
        notional,
        observationFrequency: (calc.observationFrequency || 'DAILY_CALENDAR') as any,
        paymentFrequency: '3M',
        dayCount: (calc.dayCountFraction || '30/360') as DayCountConvention,
        fundingLegType: 'FLOATING',
        fundingIndex: 'SOFR',
        fundingSpreadBps: 0,
        fundingDayCount: 'ACT/360',
        fundingPaymentFrequency: '3M',
      };
      parRate = baseCouponRate;
      dv01 = 5500;
      markToMarket = 0;
    } else if (productType === 'TARN') {
      const tarnNode = tradeNode.targetRedemptionNote || {};
      const stream = tarnNode.tarnStream || {};
      const calc = stream.tarnCalculation || {};

      effectiveDate = stream.calculationPeriodDates?.effectiveDate?.unadjustedDate || '2026-08-01';
      maturityDate = stream.calculationPeriodDates?.terminationDate?.unadjustedDate || '2031-08-01';
      tenorYears = calculateTenorYears(effectiveDate, maturityDate);

      const targetCapPct = parseFloat(calc.targetCapPct || '0.1000') * (parseFloat(calc.targetCapPct || '0.1000') < 0.2 ? 100 : 1);
      const strikeRate = parseFloat(calc.strikeRate || '0.0650') * (parseFloat(calc.strikeRate || '0.0650') < 0.2 ? 100 : 1);
      const currency = (calc.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(calc.notionalAmount?.amount || '25000000');
      notionalUsd = notional;
      const isPay = tarnNode.payerPartyReference?.['@_href'] === 'PartyA';

      tarnDetails = {
        direction: isPay ? 'PAY' : 'RECEIVE',
        targetCapPct,
        couponFormulaType: (calc.couponFormulaType || 'INVERSE_FLOATER') as any,
        strikeRate,
        leverageFactor: parseFloat(calc.leverageFactor || '1.5'),
        floorRate: parseFloat(calc.floorRate || '0.0') * (parseFloat(calc.floorRate || '0.0') < 0.2 ? 100 : 1),
        capRate: parseFloat(calc.capRate || '0.10') * (parseFloat(calc.capRate || '0.10') < 0.2 ? 100 : 1),
        referenceIndex: (calc.floatingRateIndex || 'SOFR') as FloatingIndex,
        currency,
        notional,
        paymentFrequency: '3M',
        dayCount: (calc.dayCountFraction || '30/360') as DayCountConvention,
        fundingLegType: 'FLOATING',
        fundingIndex: 'SOFR',
        fundingSpreadBps: 0,
        fundingDayCount: 'ACT/360',
        fundingPaymentFrequency: '3M',
      };
      parRate = strikeRate;
      dv01 = 6000;
      markToMarket = 0;
    } else if (productType === 'SNOWBALL') {
      const sbNode = tradeNode.snowballSwap || {};
      const stream = sbNode.snowballStream || {};
      const calc = stream.snowballCalculation || {};

      effectiveDate = stream.calculationPeriodDates?.effectiveDate?.unadjustedDate || '2026-08-01';
      maturityDate = stream.calculationPeriodDates?.terminationDate?.unadjustedDate || '2031-08-01';
      tenorYears = calculateTenorYears(effectiveDate, maturityDate);

      const initialCouponRate = parseFloat(calc.initialCouponRate || '0.0600') * (parseFloat(calc.initialCouponRate || '0.0600') < 0.2 ? 100 : 1);
      const bonusStepRate = parseFloat(calc.bonusStepRate || '0.0150') * (parseFloat(calc.bonusStepRate || '0.0150') < 0.2 ? 100 : 1);
      const currency = (calc.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(calc.notionalAmount?.amount || '25000000');
      notionalUsd = notional;
      const isPay = sbNode.payerPartyReference?.['@_href'] === 'PartyA';

      snowballDetails = {
        direction: isPay ? 'PAY' : 'RECEIVE',
        initialCouponRate,
        bonusStepRate,
        leverageFactor: parseFloat(calc.leverageFactor || '1.0'),
        floorRate: parseFloat(calc.floorRate || '0.0') * (parseFloat(calc.floorRate || '0.0') < 0.2 ? 100 : 1),
        capRate: parseFloat(calc.capRate || '0.12') * (parseFloat(calc.capRate || '0.12') < 0.2 ? 100 : 1),
        referenceIndex: (calc.floatingRateIndex || 'SOFR') as FloatingIndex,
        currency,
        notional,
        paymentFrequency: '3M',
        dayCount: (calc.dayCountFraction || '30/360') as DayCountConvention,
        fundingLegType: 'FLOATING',
        fundingIndex: 'SOFR',
        fundingSpreadBps: 0,
        fundingDayCount: 'ACT/360',
        fundingPaymentFrequency: '3M',
      };
      parRate = initialCouponRate;
      dv01 = 5800;
      markToMarket = 0;
    } else if (productType === 'BOND') {
      const bNode = tradeNode.bond || {};
      const currency = (bNode.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(bNode.notionalAmount?.amount || '10000000');
      notionalUsd = notional;
      const couponRate = parseFloat(bNode.couponRate || '0.0425') * (parseFloat(bNode.couponRate || '0.0425') < 0.2 ? 100 : 1);
      const cleanPrice = parseFloat(bNode.cleanPrice || '98.50');
      const dirtyPrice = parseFloat(bNode.dirtyPrice || '99.20');
      const YTM = parseFloat(bNode.yieldToMaturity || '0.0455') * (parseFloat(bNode.yieldToMaturity || '0.0455') < 0.2 ? 100 : 1);

      bondDetails = {
        bondType: (bNode.bondType || 'SOVEREIGN') as any,
        isin: bNode.instrumentId || 'US912828C478',
        issuer: bNode.issuer || 'US Treasury',
        couponRate,
        couponFrequency: (bNode.couponFrequency || '6M') as PaymentFrequency,
        faceValue: parseFloat(bNode.faceValue || '100'),
        cleanPrice,
        dirtyPrice,
        yieldToMaturity: YTM,
        currency,
        notional,
        dayCount: (bNode.dayCountFraction || '30/360') as DayCountConvention,
      };
      parRate = YTM;
      dv01 = Math.round(notional * 0.00045);
      markToMarket = Math.round(((cleanPrice - 100) / 100) * notional);
    } else if (productType === 'FRA') {
      const fNode = tradeNode.fra || {};
      const currency = (fNode.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(fNode.notionalAmount?.amount || '10000000');
      notionalUsd = notional;
      const fraRate = parseFloat(fNode.fraRate || '0.0395') * (parseFloat(fNode.fraRate || '0.0395') < 0.2 ? 100 : 1);

      fraDetails = {
        fraRate,
        fixingIndex: (fNode.floatingRateIndex || 'SOFR') as FloatingIndex,
        indexTenor: (fNode.indexTenor || '3M') as IndexTenor,
        fixingDate: fNode.fixingDate || effectiveDate,
        paymentDate: fNode.paymentDate || effectiveDate,
        settlementType: (fNode.settlementType || 'CASH') as any,
        currency,
        notional,
        dayCount: (fNode.dayCountFraction || 'ACT/360') as DayCountConvention,
      };
      parRate = fraRate;
      dv01 = Math.round(notional * 0.000025);
      markToMarket = 0;
    } else if (productType === 'DEPOSIT') {
      const dNode = tradeNode.termDeposit || {};
      const currency = (dNode.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(dNode.notionalAmount?.amount || '10000000');
      notionalUsd = notional;
      const depositRate = parseFloat(dNode.depositRate || '0.0410') * (parseFloat(dNode.depositRate || '0.0410') < 0.2 ? 100 : 1);

      depositDetails = {
        direction: (dNode.direction || 'LEND') as any,
        depositRate,
        termDays: parseInt(dNode.termDays || '90'),
        interestAmount: parseFloat(dNode.interestAmount || '102500'),
        compoundingFrequency: (dNode.compoundingFrequency || 'NONE') as any,
        currency,
        notional,
        dayCount: (dNode.dayCountFraction || 'ACT/360') as DayCountConvention,
      };
      parRate = depositRate;
      dv01 = Math.round(notional * 0.000025);
      markToMarket = 0;
    } else if (productType === 'REPO') {
      const rNode = tradeNode.repo || {};
      const currency = (rNode.notionalAmount?.currency || 'USD') as Currency;
      const purchasePrice = parseFloat(rNode.purchasePrice || rNode.notionalAmount?.amount || '10000000');
      notionalUsd = purchasePrice;
      const repoRate = parseFloat(rNode.repoRate || '0.0375') * (parseFloat(rNode.repoRate || '0.0375') < 0.2 ? 100 : 1);

      repoDetails = {
        repoType: (rNode.repoType || 'CLASSIC_REPO') as any,
        collateralIsin: rNode.collateralIsin || 'US912828C478',
        collateralDescription: rNode.collateralDescription || 'US Treasury 10Y Note',
        repoRate,
        haircutPct: parseFloat(rNode.haircutPct || '2.0'),
        purchasePrice,
        repurchasePrice: parseFloat(rNode.repurchasePrice || '10008333'),
        currency,
        notional: purchasePrice,
        dayCount: (rNode.dayCountFraction || 'ACT/360') as DayCountConvention,
      };
      parRate = repoRate;
      dv01 = Math.round(purchasePrice * 0.000008);
      markToMarket = 0;
    } else if (productType === 'DUAL_DIGITAL') {
      const ddNode = tradeNode.dualDigitalOption || {};
      const leg = ddNode.dualDigitalLeg || {};
      const payoutNode = leg.binaryPayout || {};
      const ref1 = leg.referenceCondition1 || {};
      const ref2 = leg.referenceCondition2 || {};

      effectiveDate = leg.calculationPeriodDates?.effectiveDate?.unadjustedDate || '2026-08-01';
      maturityDate = leg.calculationPeriodDates?.terminationDate?.unadjustedDate || '2031-08-01';
      tenorYears = calculateTenorYears(effectiveDate, maturityDate);

      const currency = (payoutNode.payoutCurrency || leg.notionalAmount?.currency || 'USD') as Currency;
      const notional = parseFloat(leg.notionalAmount?.amount || '10000000');
      notionalUsd = notional;
      const isPay = ddNode.payerPartyReference?.['@_href'] === 'PartyA';

      const trigger1Rate = parseFloat(ref1.triggerRate || '0.0400') * (parseFloat(ref1.triggerRate || '0.0400') < 0.2 ? 100 : 1);
      const trigger2Rate = parseFloat(ref2.triggerRate || '0.0350') * (parseFloat(ref2.triggerRate || '0.0350') < 0.2 ? 100 : 1);

      dualDigitalDetails = {
        direction: isPay ? 'PAY_DIGITAL' : 'RECEIVE_DIGITAL',
        digitalPayoutAmount: parseFloat(payoutNode.payoutAmount || '500000'),
        payoutType: (payoutNode.payoutType || 'FIXED_AMOUNT') as any,
        index1: (ref1.floatingRateIndex || 'SOFR') as FloatingIndex,
        index1Tenor: (ref1.indexTenor || '3M') as IndexTenor,
        condition1Operator: (ref1.operator || 'GREATER_THAN') as any,
        trigger1Rate,
        index2: (ref2.floatingRateIndex || 'EURIBOR') as FloatingIndex,
        index2Tenor: (ref2.indexTenor || '3M') as IndexTenor,
        condition2Operator: (ref2.operator || 'LESS_THAN') as any,
        trigger2Rate,
        impliedCorrelation: parseFloat(leg.impliedCorrelation || '0.75'),
        observationType: (leg.observationType || 'AT_MATURITY') as any,
        currency,
        notional,
        dayCount: (leg.dayCountFraction || '30/360') as DayCountConvention,
        paymentFrequency: '1Y',
      };

      const rate1 = getEstimatedParRate(currency, tenorYears);
      const rate2 = getEstimatedParRate(currency === 'EUR' ? 'USD' : 'EUR', tenorYears);
      const val = calculateDualDigitalValuation(
        dualDigitalDetails.direction,
        dualDigitalDetails.digitalPayoutAmount,
        dualDigitalDetails.payoutType,
        dualDigitalDetails.index1,
        dualDigitalDetails.condition1Operator,
        dualDigitalDetails.trigger1Rate,
        dualDigitalDetails.index2,
        dualDigitalDetails.condition2Operator,
        dualDigitalDetails.trigger2Rate,
        dualDigitalDetails.impliedCorrelation,
        notional,
        tenorYears,
        rate1,
        rate2
      );
      parRate = trigger1Rate;
      dv01 = val.dv01;
      markToMarket = val.mtm;
    }

    const extractedTrade: Partial<IRSwapTrade> = {
      tradeId: tradeId || undefined,
      productType,
      tradeDate,
      effectiveDate,
      maturityDate,
      counterpartyLei,
      counterpartyName,
      traderId,
      calculationAgent,
      status: 'BOOKED',
      fixedLeg,
      floatingLeg,
      leg1,
      leg2,
      capFloorDetails,
      swaptionDetails,
      fxForwardDetails,
      fxOptionDetails,
      rangeAccrualDetails,
      snowRangeDetails,
      tarnDetails,
      snowballDetails,
      bondDetails,
      fraDetails,
      depositDetails,
      repoDetails,
      dualDigitalDetails,
      notionalUsd,
      tenorYears,
      parRate,
      dv01,
      markToMarket,
      rawXml: xmlString,
    };

    return {
      success: true,
      trade: extractedTrade,
      errors: [],
    };
  } catch (err: any) {
    return {
      success: false,
      errors: [`XML Parse Error: ${err.message || 'Malformed XML structure.'}`],
    };
  }
}
