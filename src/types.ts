export type ProductType = 'IRS' | 'CAP_FLOOR' | 'SWAPTION' | 'FX_FORWARD' | 'FX_OPTION' | 'RANGE_ACCRUAL' | 'SNOW_RANGE' | 'TARN' | 'SNOWBALL' | 'BOND' | 'FRA' | 'DEPOSIT' | 'REPO' | 'DUAL_DIGITAL';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF';

export type PayReceive = 'PAY_FIXED' | 'RECEIVE_FIXED';

export type DayCountConvention = '30/360' | 'ACT/360' | 'ACT/365' | 'ACT/ACT';

export type PaymentFrequency = '1D' | '1M' | '3M' | '6M' | '1Y';

export type IndexTenor = '1D' | '1M' | '3M' | '6M' | '12M' | '2Y' | '5Y' | '10Y' | '20Y' | '30Y';

export type FloatingIndex = 'SOFR' | 'EURIBOR' | 'SONIA' | 'TONA' | 'LIBOR-3M' | 'CDOR';

export type BusinessCalendar = 'USNY' | 'GBLO' | 'EUTA' | 'JPTO' | 'CATO' | 'AUSY' | 'CHZH' | 'USNY+GBLO' | 'EUTA+GBLO';

export type BusinessDayRollConvention = 'MODFOLLOWING' | 'FOLLOWING' | 'PRECEDING' | 'MODPRECEDING' | 'NONE';

export type TradeStatus = 'DRAFT' | 'BOOKED' | 'CONFIRMED' | 'AMENDED' | 'TERMINATED' | 'MATURED' | 'CANCELLED';

export type LegType = 'FIXED' | 'FLOATING';

export type ResetType = 'ADVANCE' | 'ARREARS';

export interface GenericSwapLeg {
  legType: LegType;
  direction: 'PAY' | 'RECEIVE' | PayReceive;
  notional: number;
  currency: Currency;
  fixedRate?: number; // Percentage, e.g. 3.85 (used if legType === 'FIXED')
  index?: FloatingIndex; // e.g. 'SOFR' (used if legType === 'FLOATING')
  indexTenor?: IndexTenor; // Index Tenor e.g. '1D', '3M', '2Y', '10Y', '20Y', '30Y'
  resetType?: ResetType; // 'ADVANCE' or 'ARREARS'
  spreadBps?: number; // e.g. 5 bps
  dayCount: DayCountConvention;
  frequency: PaymentFrequency;
  businessDayConvention?: BusinessDayRollConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

export interface FixedLeg {
  direction: PayReceive;
  notional: number;
  currency: Currency;
  fixedRate: number; // Percentage, e.g. 3.85
  dayCount: DayCountConvention;
  frequency: PaymentFrequency;
  businessDayConvention: BusinessDayRollConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

export interface FloatingLeg {
  direction: PayReceive; // Opposite of FixedLeg
  notional: number;
  currency: Currency;
  index: FloatingIndex;
  indexTenor: IndexTenor;
  resetType?: ResetType; // 'ADVANCE' or 'ARREARS'
  spreadBps: number; // e.g. 5 bps
  dayCount: DayCountConvention;
  frequency: PaymentFrequency;
  businessDayConvention: BusinessDayRollConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 2: Interest Rate Cap / Floor
export interface CapFloorDetails {
  capFloorType: 'CAP' | 'FLOOR';
  direction: 'BUY' | 'SELL'; // Buy = Long Cap/Floor, Sell = Short Cap/Floor
  strikeRate: number; // e.g. 4.00 (%)
  underlyingIndex: FloatingIndex;
  floatingIndex?: FloatingIndex;
  indexTenor: IndexTenor;
  resetType?: ResetType; // 'ADVANCE' or 'ARREARS'
  currency: Currency;
  notional: number;
  premiumAmount: number; // Premium paid/received in base currency
  paymentFrequency: PaymentFrequency;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 3: Swaption (Option on Interest Rate Swap)
export interface SwaptionDetails {
  swaptionType: 'PAYER' | 'RECEIVER'; // Payer = option to pay fixed; Receiver = option to receive fixed
  direction: 'BUY' | 'SELL'; // Buy = Long Swaption, Sell = Short Swaption
  strikeRate: number; // e.g. 3.75 (%)
  optionExpiryDate: string; // YYYY-MM-DD
  underlyingMaturityDate: string; // YYYY-MM-DD
  underlyingTenorYears: number; // e.g. 5Y
  settlementType: 'CASH' | 'PHYSICAL';
  currency: Currency;
  notional: number;
  premiumAmount: number; // Premium in currency
  underlyingFloatingIndex: FloatingIndex;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 4: FX Forward
export interface FxForwardDetails {
  currencyPair: string; // e.g. 'EUR/USD'
  direction: 'BUY_BASE' | 'SELL_BASE'; // BUY_BASE = buy base (e.g. EUR) / sell counter (e.g. USD)
  baseCurrency: Currency;
  counterCurrency: Currency;
  baseAmount: number;
  counterAmount: number;
  forwardRate: number; // e.g. 1.0850
  spotRate: number; // e.g. 1.0820
  settlementDate: string; // YYYY-MM-DD
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 5: FX Option
export interface FxOptionDetails {
  optionType: 'CALL' | 'PUT'; // Call or Put on Base Currency
  direction: 'BUY' | 'SELL';
  optionStyle: 'EUROPEAN' | 'AMERICAN';
  currencyPair: string; // e.g. 'EUR/USD'
  callCurrency: Currency;
  callAmount: number;
  putCurrency: Currency;
  putAmount: number;
  strikePrice: number; // e.g. 1.0900 or 155.00
  expiryDate: string; // YYYY-MM-DD
  expiryCut: string; // e.g. '15:00 NY Cut'
  settlementDate: string; // YYYY-MM-DD
  premiumAmount: number;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 6: Interest Rate Range Accrual (Leg 1 Structured Range Accrual + Leg 2 Funding Leg)
export interface RangeAccrualDetails {
  // Leg 1: Structured Range Accrual Leg
  rangeType: 'SINGLE_BARRIER' | 'DUAL_BARRIER';
  direction: 'PAY' | 'RECEIVE';
  lowerBarrierRate: number; // e.g. 2.50 (%)
  upperBarrierRate: number; // e.g. 4.50 (%)
  referenceIndex: FloatingIndex;
  accrualCouponRate: number; // e.g. 5.25 (%)
  currency: Currency;
  notional: number;
  observationFrequency: 'DAILY_CALENDAR' | 'DAILY_BUSINESS';
  paymentFrequency: PaymentFrequency;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;

  // Leg 2: Funding Leg (Floating SOFR or Fixed Funding)
  fundingLegType?: LegType;
  fundingDirection?: 'PAY' | 'RECEIVE';
  fundingIndex?: FloatingIndex;
  fundingTenor?: IndexTenor;
  fundingIndexTenor?: IndexTenor;
  fundingSpreadBps?: number;
  fundingFixedRate?: number;
  fundingResetType?: ResetType;
  fundingNotional?: number;
  fundingDayCount?: DayCountConvention;
  fundingPaymentFrequency?: PaymentFrequency;
  fundingAccrualCalendar?: BusinessCalendar;
  fundingPaymentCalendar?: BusinessCalendar;
  fundingAccrualRollConvention?: BusinessDayRollConvention;
  fundingPaymentRollConvention?: BusinessDayRollConvention;
}

// Product 7: SnowRange (Snow Range Accrual with Memory Ratchet)
export interface SnowRangeDetails {
  direction: 'PAY' | 'RECEIVE';
  lowerBarrierRate: number; // e.g. 2.00 (%)
  upperBarrierRate: number; // e.g. 4.75 (%)
  baseCouponRate: number; // e.g. 5.50 (%)
  memoryMultiplier: number; // e.g. 1.0 (100% memory accumulation)
  memoryEnabled: boolean;
  referenceIndex: FloatingIndex;
  currency: Currency;
  notional: number;
  observationFrequency: 'DAILY_CALENDAR' | 'DAILY_BUSINESS';
  paymentFrequency: PaymentFrequency;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;

  // Funding Leg
  fundingLegType?: LegType;
  fundingDirection?: 'PAY' | 'RECEIVE';
  fundingIndex?: FloatingIndex;
  fundingTenor?: IndexTenor;
  fundingSpreadBps?: number;
  fundingFixedRate?: number;
  fundingResetType?: ResetType;
  fundingNotional?: number;
  fundingDayCount?: DayCountConvention;
  fundingPaymentFrequency?: PaymentFrequency;
  fundingAccrualCalendar?: BusinessCalendar;
  fundingPaymentCalendar?: BusinessCalendar;
  fundingAccrualRollConvention?: BusinessDayRollConvention;
  fundingPaymentRollConvention?: BusinessDayRollConvention;
}

// Product 8: TARN (Target Redemption Note / Swap)
export interface TarnDetails {
  direction: 'PAY' | 'RECEIVE';
  targetCapPct: number; // e.g. 10.00 (%) Target Cumulative Cap Trigger
  couponFormulaType: 'INVERSE_FLOATER' | 'RANGE_ACCRUAL' | 'FIXED_STEP';
  strikeRate: number; // e.g. 6.50 (%)
  leverageFactor: number; // e.g. 1.5
  floorRate: number; // e.g. 0.00 (%)
  capRate: number; // e.g. 10.00 (%)
  referenceIndex: FloatingIndex;
  currency: Currency;
  notional: number;
  paymentFrequency: PaymentFrequency;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;

  // Target Knock-Out State Trackers
  targetKnockOutTriggered?: boolean;
  targetKnockOutPeriod?: number;

  // Funding Leg
  fundingLegType?: LegType;
  fundingDirection?: 'PAY' | 'RECEIVE';
  fundingIndex?: FloatingIndex;
  fundingTenor?: IndexTenor;
  fundingSpreadBps?: number;
  fundingFixedRate?: number;
  fundingResetType?: ResetType;
  fundingNotional?: number;
  fundingDayCount?: DayCountConvention;
  fundingPaymentFrequency?: PaymentFrequency;
  fundingAccrualCalendar?: BusinessCalendar;
  fundingPaymentCalendar?: BusinessCalendar;
  fundingAccrualRollConvention?: BusinessDayRollConvention;
  fundingPaymentRollConvention?: BusinessDayRollConvention;
}

// Product 9: Snowball (Snowball Ratchet Structured Swap)
export interface SnowballDetails {
  direction: 'PAY' | 'RECEIVE';
  initialCouponRate: number; // e.g. 6.00 (%)
  bonusStepRate: number; // e.g. 1.50 (%) Annual Ratchet Step
  leverageFactor: number; // e.g. 1.0
  floorRate: number; // e.g. 0.00 (%)
  capRate: number; // e.g. 12.00 (%)
  referenceIndex: FloatingIndex;
  currency: Currency;
  notional: number;
  paymentFrequency: PaymentFrequency;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;

  // Funding Leg
  fundingLegType?: LegType;
  fundingDirection?: 'PAY' | 'RECEIVE';
  fundingIndex?: FloatingIndex;
  fundingTenor?: IndexTenor;
  fundingSpreadBps?: number;
  fundingFixedRate?: number;
  fundingResetType?: ResetType;
  fundingNotional?: number;
  fundingDayCount?: DayCountConvention;
  fundingPaymentFrequency?: PaymentFrequency;
  fundingAccrualCalendar?: BusinessCalendar;
  fundingPaymentCalendar?: BusinessCalendar;
  fundingAccrualRollConvention?: BusinessDayRollConvention;
  fundingPaymentRollConvention?: BusinessDayRollConvention;
}

// Product 10: Fixed Income Bond (Government / Corporate Bond)
export interface BondDetails {
  bondType: 'SOVEREIGN' | 'CORPORATE';
  isin: string; // e.g., US912828C478
  issuer: string; // e.g. US Treasury or Apple Inc.
  couponRate: number; // e.g. 4.25 (%)
  couponFrequency: PaymentFrequency;
  faceValue: number; // e.g. 100 or 1000
  cleanPrice: number; // e.g. 98.50 (% of par)
  dirtyPrice: number; // e.g. 99.20 (% of par including accrued interest)
  yieldToMaturity: number; // e.g. 4.55 (%)
  currency: Currency;
  notional: number; // Principal Amount
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 11: Forward Rate Agreement (FRA)
export interface FraDetails {
  fraRate: number; // Agreed FRA Rate, e.g. 3.95 (%)
  fixingIndex: FloatingIndex;
  floatingIndex?: FloatingIndex;
  indexTenor: IndexTenor;
  fixingDate: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD (FRA settles at start of forward period)
  settlementType: 'CASH' | 'PHYSICAL';
  currency: Currency;
  notional: number;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 12: Cash Term Deposit / Loan
export interface DepositDetails {
  direction: 'LEND' | 'BORROW'; // LEND = Place deposit, BORROW = Take deposit
  depositRate: number; // Interest rate, e.g. 4.10 (%)
  termDays: number; // e.g. 90 days
  interestAmount: number; // Interest accrued over term
  compoundingFrequency: 'NONE' | 'DAILY' | 'ANNUAL';
  currency: Currency;
  notional: number;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 13: Repurchase Agreement (Repo / Reverse Repo)
export interface RepoDetails {
  repoType: 'CLASSIC_REPO' | 'REVERSE_REPO';
  collateralIsin: string; // ISIN of underlying bond collateral
  collateralDescription: string; // e.g. US Treasury 10Y Note
  repoRate: number; // e.g. 3.75 (%)
  haircutPct: number; // Collateral Haircut %, e.g. 2.0 (%)
  purchasePrice: number; // Initial Cash Leg Amount
  repurchasePrice: number; // Final Repurchase Amount (Purchase Price + Repo Interest)
  currency: Currency;
  notional: number;
  dayCount: DayCountConvention;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

// Product 14: Dual Digital Interest Rate Swap / Option
export interface DualDigitalDetails {
  direction: 'PAY_DIGITAL' | 'RECEIVE_DIGITAL';
  digitalPayoutAmount: number; // Fixed Binary Lump-Sum Payout Amount or Digital Coupon Rate (%)
  payoutType: 'FIXED_AMOUNT' | 'COUPON_PERCENT';
  
  // Reference Rate Condition 1 (e.g. SOFR-3M or 5Y Swap Rate)
  index1: FloatingIndex;
  index1Tenor: IndexTenor;
  condition1Operator: 'GREATER_THAN' | 'LESS_THAN';
  trigger1Rate: number; // % e.g. 4.00 (%)
  
  // Reference Rate Condition 2 (e.g. EURIBOR-3M or 10Y Swap Rate)
  index2: FloatingIndex;
  index2Tenor: IndexTenor;
  condition2Operator: 'GREATER_THAN' | 'LESS_THAN';
  trigger2Rate: number; // % e.g. 3.50 (%)

  impliedCorrelation: number; // Implied correlation between Index1 and Index2 (-1.0 to +1.0, e.g. 0.75)
  observationType: 'AT_MATURITY' | 'DAILY_OBSERVATION';
  currency: Currency;
  notional: number;
  dayCount: DayCountConvention;
  paymentFrequency: PaymentFrequency;
  accrualCalendar?: BusinessCalendar;
  paymentCalendar?: BusinessCalendar;
  accrualRollConvention?: BusinessDayRollConvention;
  paymentRollConvention?: BusinessDayRollConvention;
}

export interface MarketDataConfig {
  environment: 'REALTIME' | 'EOD_NY_CLOSE' | 'LON_1600_FIX' | 'TOKYO_CLOSE';
  yieldCurveName: string;
  discountCurveName: string;
  volSurfaceName?: string;
  fxCurveName?: string;
  marketSnapshotTimestamp: string;
  benchmarkRatePct: number;
  impliedVolPct?: number;
}

export interface IRSwapTrade {
  id: string; // Internal SQL primary key or UUID
  tradeId: string; // Unique SQL Sequence Trade ID, e.g., IRS-2026-000101 or TRD-2026-000101
  productType: ProductType; // 'IRS' | 'CAP_FLOOR' | 'SWAPTION' | 'FX_FORWARD' | 'FX_OPTION' | 'RANGE_ACCRUAL' | 'SNOW_RANGE' | 'TARN' | 'SNOWBALL' | 'BOND' | 'FRA' | 'DEPOSIT' | 'REPO' | 'DUAL_DIGITAL'
  tradeDate: string; // YYYY-MM-DD
  effectiveDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  counterpartyLei: string;
  counterpartyName: string;
  traderId: string;
  calculationAgent: string;
  clearingHouse?: string;
  status: TradeStatus;

  // Swap Leg details (populated for IRS or as underlying for Swaption)
  fixedLeg: FixedLeg;
  floatingLeg: FloatingLeg;

  // Generic & Basis Swap Leg Details (Leg 1 & Leg 2 can each be Fixed or Floating)
  leg1?: GenericSwapLeg;
  leg2?: GenericSwapLeg;

  // Multi-Product specific details
  capFloorDetails?: CapFloorDetails;
  swaptionDetails?: SwaptionDetails;
  fxForwardDetails?: FxForwardDetails;
  fxOptionDetails?: FxOptionDetails;
  rangeAccrualDetails?: RangeAccrualDetails;
  snowRangeDetails?: SnowRangeDetails;
  tarnDetails?: TarnDetails;
  snowballDetails?: SnowballDetails;
  bondDetails?: BondDetails;
  fraDetails?: FraDetails;
  depositDetails?: DepositDetails;
  repoDetails?: RepoDetails;
  dualDigitalDetails?: DualDigitalDetails;

  // Market Data Configuration Used
  marketData?: MarketDataConfig;
  valuationModel?: string;
  valuationDate?: string; // YYYY-MM-DD valuation date override
  scheduleDateOverrides?: Record<string, { startDate?: string; endDate?: string; resetStartDate?: string; resetEndDate?: string; payResetDate?: string }>;

  // Market & Risk Analytics
  notionalUsd: number; // Base USD equivalent notional
  dv01: number; // Dollar Value of a Basis Point / Sensitivity
  pv01?: number;
  markToMarket: number; // Current MTM value in base USD
  parRate: number; // Current market par rate or strike (%)
  tenorYears: number; // Maturity - Effective Date in years
  
  rawXml?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'BOOK_TRADE' | 'AMEND_TRADE' | 'UPDATE_STATUS' | 'TERMINATE_TRADE' | 'IMPORT_XML' | 'EXPORT_XML' | 'REVALUATION';
  tradeId: string;
  details: string;
  previousState?: string;
  newState?: string;
  ipAddress: string;
  hash: string; // SHA-256 HMAC integrity hash
  isHashValid?: boolean;
}

export interface PositionSummary {
  currency: Currency;
  tradeCount: number;
  grossNotional: number;
  netNotional: number; // Pay Fixed is negative, Receive Fixed is positive
  totalDv01: number;
  totalMtm: number;
}

export interface TenorDv01Risk {
  tenorBucket: '2Y' | '5Y' | '10Y' | '30Y' | 'OTHER';
  payDv01: number;
  receiveDv01: number;
  netDv01: number;
}

export interface DailyVolumeMetric {
  date: string;
  tradeCount: number;
  totalNotionalUSD: number;
  cumulativeMtmUSD: number;
}

export interface MarketRateQuote {
  symbol: string;
  name: string;
  currency: Currency;
  rate: number;
  changeBps: number;
  updatedAt: string;
}

export type WebSocketEventType = 
  | 'INIT_STATE'
  | 'TRADE_BOOKED'
  | 'TRADE_UPDATED'
  | 'TRADE_TERMINATED'
  | 'MARKET_TICK'
  | 'AUDIT_LOGGED';

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: any;
  timestamp: string;
}

export interface Counterparty {
  id: string;
  name: string;
  lei: string;
  country: string;
  rating: 'AAA' | 'AA+' | 'AA' | 'AA-' | 'A+' | 'A' | 'A-' | 'BBB+' | 'BBB' | 'BBB-';
  creditLimitMillions: number;
}

// ==========================================
// TRADE VALIDATION & PLAYWRIGHT QA SUITE TYPES
// ==========================================

export type ValidationStatus = 'PASS' | 'FAIL' | 'SKIPPED' | 'WARNING';

export interface FieldComparison {
  fieldId: string;
  fieldName: string;
  xmlValue: string;
  uiValue: string;
  status: 'PASS' | 'FAIL';
  timestamp: string;
  remarks?: string;
}

export interface XmlDiffNode {
  path: string;
  nodeName: string;
  type: 'VALUE_MISMATCH' | 'MISSING_NODE' | 'ADDITIONAL_NODE' | 'MATCH';
  originalValue?: string;
  amendedValue?: string;
  expectedValue?: string;
  actualValue?: string;
  status: 'PASS' | 'FAIL';
}

export interface XmlComparisonReport {
  success: boolean;
  status: 'PASS' | 'FAIL';
  totalNodesCompared: number;
  matchingNodes: number;
  mismatchedNodes: number;
  missingNodes: number;
  addedNodes: number;
  differences: XmlDiffNode[];
  summaryText: string;
}

export interface ThreeTierVerification {
  uiVerified: boolean;
  xmlVerified: boolean;
  dbVerified: boolean;
  auditLogVerified: boolean;
  uiDetails: string;
  xmlDetails: string;
  dbDetails: string;
  dbRecordSnapshot?: Record<string, any>;
  status: 'PASS' | 'FAIL';
}

export interface ValidationEvidence {
  bookingScreenshot?: string;
  amendmentBeforeScreenshot?: string;
  amendmentAfterScreenshot?: string;
  maturityScreenshot?: string;
  cancellationScreenshot?: string;
  originalXml?: string;
  amendedXml?: string;
  maturityXml?: string;
  cancelledXml?: string;
  xmlDiffHtml?: string;
  maturityXmlDiffHtml?: string;
  cancellationXmlDiffHtml?: string;
  threeTierSummary?: ThreeTierVerification;
  fieldMatrix: FieldComparison[];
}

export interface TradeValidationItem {
  id: string;
  tradeId: string;
  productType: ProductType;
  scenarioType: 'BOOKING' | 'AMENDMENT' | 'MATURITY' | 'CANCELLATION';
  bookingStatus: ValidationStatus;
  amendmentStatus: ValidationStatus;
  maturityStatus?: ValidationStatus;
  cancellationStatus?: ValidationStatus;
  overallStatus: ValidationStatus;
  durationMs: number;
  timestamp: string;
  fieldComparisons: FieldComparison[];
  xmlComparison?: XmlComparisonReport;
  maturityXmlComparison?: XmlComparisonReport;
  cancellationXmlComparison?: XmlComparisonReport;
  threeTierVerification?: ThreeTierVerification;
  evidence: ValidationEvidence;
  errorDetails?: string;
}

export interface TradeValidationRun {
  runId: string;
  timestamp: string;
  environment: string;
  version: string;
  tester: string;
  totalTrades: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
  results: TradeValidationItem[];
  pdfReportUrl?: string;
}
