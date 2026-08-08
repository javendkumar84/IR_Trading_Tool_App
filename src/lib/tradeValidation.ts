import { IRSwapTrade, TradeStatus } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates 20-character ISO 17442 Legal Entity Identifier (LEI) format
 */
export function isValidLei(lei: string): boolean {
  if (!lei) return false;
  const leiRegex = /^[A-Z0-9]{20}$/i;
  return leiRegex.test(lei.trim());
}

/**
 * Validates full derivative trade payload for business rule violations
 */
export function validateTradePayload(trade: Partial<IRSwapTrade>): ValidationResult {
  const errors: string[] = [];

  // 1. Counterparty & LEI Validation
  if (!trade.counterpartyName || trade.counterpartyName.trim() === '') {
    errors.push('Counterparty Name is required.');
  }

  if (!trade.counterpartyLei || !isValidLei(trade.counterpartyLei)) {
    errors.push(`Invalid Counterparty LEI format "${trade.counterpartyLei}". Must be a 20-character alphanumeric ISO 17442 code.`);
  }

  // 2. Date Chronology Validation
  if (!trade.effectiveDate || !trade.maturityDate) {
    errors.push('Effective Date and Maturity Date are required.');
  } else {
    const eff = new Date(trade.effectiveDate);
    const mat = new Date(trade.maturityDate);
    if (isNaN(eff.getTime())) errors.push('Invalid Effective Date format.');
    if (isNaN(mat.getTime())) errors.push('Invalid Maturity Date format.');
    if (eff >= mat) {
      errors.push(`Maturity Date (${trade.maturityDate}) must be strictly after Effective Date (${trade.effectiveDate}).`);
    }
  }

  // 3. Notional Validation
  const notional = trade.notionalUsd || trade.fixedLeg?.notional || trade.floatingLeg?.notional || 0;
  if (notional <= 0) {
    errors.push(`Trade Notional must be strictly positive (got $${notional.toLocaleString()}).`);
  }

  // 4. Product-specific Checks
  if (trade.productType === 'CAP_FLOOR' && trade.capFloorDetails) {
    if (trade.capFloorDetails.strikeRate <= 0) {
      errors.push(`Cap/Floor Strike Rate must be positive (got ${trade.capFloorDetails.strikeRate}%).`);
    }
  }

  if (trade.productType === 'RANGE_ACCRUAL' && trade.rangeAccrualDetails) {
    const { lowerBarrierRate, upperBarrierRate } = trade.rangeAccrualDetails;
    if (lowerBarrierRate >= upperBarrierRate) {
      errors.push(`Range Accrual Lower Barrier (${lowerBarrierRate}%) must be lower than Upper Barrier (${upperBarrierRate}%).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates trade lifecycle state transition safety
 */
export function validateStateTransition(currentStatus: TradeStatus, targetStatus: TradeStatus): ValidationResult {
  const terminalStates: TradeStatus[] = ['TERMINATED', 'CANCELLED', 'MATURED'];

  if (terminalStates.includes(currentStatus)) {
    return {
      valid: false,
      errors: [`Illegal State Transition: Trade is in terminal status "${currentStatus}" and cannot be transitioned to "${targetStatus}".`],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}
