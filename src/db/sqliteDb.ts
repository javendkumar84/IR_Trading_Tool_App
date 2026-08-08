import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { generateIRSwapXml } from '../lib/xmlParser';
import { AuditLogEntry, IRSwapTrade, TradeStatus } from '../types';

const DB_DIR = process.env.SQLITE_DB_DIR || process.cwd();
const DB_FILE_PATH = process.env.SQLITE_DB_PATH || path.join(DB_DIR, 'ir_swap_trades.db');

let dbInstance: Database.Database | null = null;

function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS TradeSequences (
      sequence_name TEXT PRIMARY KEY,
      current_value INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS IRSwapTrades (
      id TEXT PRIMARY KEY,
      trade_id TEXT UNIQUE NOT NULL,
      product_type TEXT NOT NULL DEFAULT 'IRS',
      trade_date TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      maturity_date TEXT NOT NULL,
      counterparty_lei TEXT NOT NULL,
      counterparty_name TEXT NOT NULL,
      trader_id TEXT NOT NULL,
      calculation_agent TEXT NOT NULL,
      status TEXT NOT NULL,
      currency TEXT NOT NULL,
      notional REAL NOT NULL,
      fixed_rate REAL NOT NULL,
      pay_receive TEXT NOT NULL,
      floating_index TEXT NOT NULL,
      floating_tenor TEXT NOT NULL,
      tenor_years REAL NOT NULL,
      dv01 REAL NOT NULL,
      mark_to_market REAL NOT NULL,
      par_rate REAL NOT NULL,
      json_payload TEXT NOT NULL,
      raw_xml TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS TradeVersions (
      version_id TEXT PRIMARY KEY,
      trade_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      json_payload TEXT NOT NULL,
      amended_by TEXT NOT NULL,
      amended_at TEXT NOT NULL,
      amendment_reason TEXT,
      UNIQUE(trade_id, version_number),
      FOREIGN KEY(trade_id) REFERENCES IRSwapTrades(trade_id)
    );

    CREATE TABLE IF NOT EXISTS AuditLogs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      trade_id TEXT NOT NULL,
      details TEXT NOT NULL,
      previous_state TEXT,
      new_state TEXT,
      ip_address TEXT NOT NULL,
      hash TEXT NOT NULL
    );
  `);

  const sequence = db.prepare(
    "SELECT current_value FROM TradeSequences WHERE sequence_name = 'IRS_TRADE_ID'"
  ).get() as { current_value: number } | undefined;

  if (!sequence) {
    db.prepare(
      "INSERT INTO TradeSequences (sequence_name, current_value, updated_at) VALUES ('IRS_TRADE_ID', 100, ?)"
    ).run(new Date().toISOString());
  }

  const tradeCount = db.prepare('SELECT COUNT(*) as count FROM IRSwapTrades').get() as { count: number };
  if (tradeCount.count === 0) {
    seedInitialTrades(db);
  }
}

/**
 * Initializes native SQLite database and tables
 */
export async function getDatabase(): Promise<Database.Database> {
  if (dbInstance) return dbInstance;

  ensureDbDirectory();
  dbInstance = new Database(DB_FILE_PATH);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initializeSchema(dbInstance);

  console.log(`SQLite database ready at ${DB_FILE_PATH}`);
  return dbInstance;
}

/** Returns the on-disk database file path */
export function getDatabasePath(): string {
  return DB_FILE_PATH;
}

/** Native SQLite persists automatically; kept for API compatibility */
export function saveDatabase(_db: Database.Database) {
  // no-op — better-sqlite3 writes directly to disk
}

/**
 * Generates an atomic, unique Trade ID from SQL sequence engine (e.g. IRS-2026-000101)
 */
export async function getNextTradeId(): Promise<string> {
  const db = await getDatabase();

  const allocateId = db.transaction(() => {
    db.prepare(
      "UPDATE TradeSequences SET current_value = current_value + 1, updated_at = ? WHERE sequence_name = 'IRS_TRADE_ID'"
    ).run(new Date().toISOString());

    const row = db.prepare(
      "SELECT current_value FROM TradeSequences WHERE sequence_name = 'IRS_TRADE_ID'"
    ).get() as { current_value: number };

    return row.current_value;
  });

  const nextVal = allocateId();
  const year = new Date().getFullYear();
  const padded = String(nextVal).padStart(6, '0');
  return `IRS-${year}-${padded}`;
}

/**
 * Computes Cryptographic SHA-256 HMAC Integrity Hash for audit records
 */
export function generateAuditHash(
  timestamp: string,
  userId: string,
  action: string,
  tradeId: string,
  details: string,
  newState?: string
): string {
  const secret = 'IRS_SWAP_SECURE_AUDIT_KEY_2026';
  const data = `${timestamp}|${userId}|${action}|${tradeId}|${details}|${newState || ''}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Logs a secure, tamper-proof user action to SQL AuditLogs
 */
export async function logAuditEvent(
  userId: string,
  userName: string,
  action: AuditLogEntry['action'],
  tradeId: string,
  details: string,
  ipAddress: string = '127.0.0.1',
  previousState?: string,
  newState?: string
): Promise<AuditLogEntry> {
  const db = await getDatabase();
  const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();
  const hash = generateAuditHash(timestamp, userId, action, tradeId, details, newState);

  db.prepare(`
    INSERT INTO AuditLogs (id, timestamp, user_id, user_name, action, trade_id, details, previous_state, new_state, ip_address, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, timestamp, userId, userName, action, tradeId, details, previousState || null, newState || null, ipAddress, hash);

  return {
    id,
    timestamp,
    userId,
    userName,
    action,
    tradeId,
    details,
    previousState,
    newState,
    ipAddress,
    hash,
    isHashValid: true,
  };
}

/**
 * Fetches all audit logs with integrity validation check
 */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const db = await getDatabase();
  const rows = db.prepare(`
    SELECT id, timestamp, user_id, user_name, action, trade_id, details, previous_state, new_state, ip_address, hash
    FROM AuditLogs ORDER BY timestamp DESC
  `).all() as Array<{
    id: string;
    timestamp: string;
    user_id: string;
    user_name: string;
    action: AuditLogEntry['action'];
    trade_id: string;
    details: string;
    previous_state: string | null;
    new_state: string | null;
    ip_address: string;
    hash: string;
  }>;

  return rows.map((row) => {
    const computedHash = generateAuditHash(
      row.timestamp,
      row.user_id,
      row.action,
      row.trade_id,
      row.details,
      row.new_state || undefined
    );

    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      tradeId: row.trade_id,
      details: row.details,
      previousState: row.previous_state || undefined,
      newState: row.new_state || undefined,
      ipAddress: row.ip_address,
      hash: row.hash,
      isHashValid: computedHash === row.hash,
    };
  });
}

/**
 * Fetches all trades from SQLite database
 */
export async function getAllTrades(): Promise<IRSwapTrade[]> {
  const db = await getDatabase();
  const rows = db.prepare('SELECT json_payload FROM IRSwapTrades ORDER BY created_at DESC').all() as Array<{ json_payload: string }>;
  return rows.map((row) => JSON.parse(row.json_payload));
}

/**
 * Fetches a single trade by tradeId
 */
export async function getTradeById(tradeId: string): Promise<IRSwapTrade | null> {
  const db = await getDatabase();
  const row = db.prepare('SELECT json_payload FROM IRSwapTrades WHERE trade_id = ?').get(tradeId) as { json_payload: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.json_payload);
}

/**
 * Fetches all versions of a trade
 */
export async function getTradeVersions(tradeId: string): Promise<Array<{version_number: number; amended_at: string; amended_by: string; amendment_reason?: string; json_payload: string; rawXml?: string}>> {
  const db = await getDatabase();
  const rows = db.prepare(`
    SELECT version_number, amended_at, amended_by, amendment_reason, json_payload
    FROM TradeVersions WHERE trade_id = ? ORDER BY version_number ASC
  `).all(tradeId) as Array<{
    version_number: number;
    amended_at: string;
    amended_by: string;
    amendment_reason: string | null;
    json_payload: string;
  }>;

  return rows.map((row) => {
    let rawXml: string | undefined;
    try {
      rawXml = JSON.parse(row.json_payload)?.rawXml;
    } catch {
      rawXml = undefined;
    }

    return {
      version_number: row.version_number,
      amended_at: row.amended_at,
      amended_by: row.amended_by,
      amendment_reason: row.amendment_reason || undefined,
      json_payload: row.json_payload,
      rawXml,
    };
  });
}

export function insertTradeVersion(db: Database.Database, trade: IRSwapTrade, userId: string, reason?: string): number {
  const versionRow = db.prepare(
    'SELECT MAX(version_number) as max_version FROM TradeVersions WHERE trade_id = ?'
  ).get(trade.tradeId) as { max_version: number | null };

  const nextVersion = (versionRow.max_version || 0) + 1;
  const versionId = `VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const jsonPayload = JSON.stringify(trade);

  db.prepare(`
    INSERT INTO TradeVersions (version_id, trade_id, version_number, json_payload, amended_by, amended_at, amendment_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(versionId, trade.tradeId, nextVersion, jsonPayload, userId, new Date().toISOString(), reason);

  return nextVersion;
}

/**
 * Amends a trade and maintains version history
 */
export async function amendTrade(
  tradeId: string,
  amendments: Partial<IRSwapTrade>,
  user: { id: string; name: string },
  reason?: string
): Promise<IRSwapTrade | null> {
  const existing = await getTradeById(tradeId);
  if (!existing) return null;

  if (existing.status === 'MATURED' || existing.status === 'CANCELLED' || existing.status === 'TERMINATED') {
    throw new Error('Cannot amend a trade that is already final.');
  }

  const updatedTrade: IRSwapTrade = {
    ...existing,
    ...amendments,
    updatedAt: new Date().toISOString(),
    status: amendments.status || existing.status,
  };

  return saveTrade(updatedTrade, user, 'AMEND_TRADE');
}

/**
 * Upserts a Trade into SQLite database
 */
export async function saveTrade(trade: IRSwapTrade, user: { id: string; name: string }, action: AuditLogEntry['action'] = 'BOOK_TRADE'): Promise<IRSwapTrade> {
  const db = await getDatabase();
  const existingRow = db.prepare('SELECT json_payload FROM IRSwapTrades WHERE trade_id = ?').get(trade.tradeId) as { json_payload: string } | undefined;
  const previousStateStr = existingRow?.json_payload;

  const rawXml = trade.rawXml || generateIRSwapXml(trade);
  trade.rawXml = rawXml;
  trade.updatedAt = new Date().toISOString();
  trade.productType = trade.productType || 'IRS';

  const jsonPayload = JSON.stringify(trade);
  const currency = trade.fixedLeg?.currency || trade.capFloorDetails?.currency || trade.swaptionDetails?.currency || trade.fxForwardDetails?.baseCurrency || trade.fxOptionDetails?.callCurrency || 'USD';
  const notional = trade.notionalUsd || trade.fixedLeg?.notional || trade.capFloorDetails?.notional || trade.swaptionDetails?.notional || trade.fxForwardDetails?.baseAmount || trade.fxOptionDetails?.callAmount || 10000000;
  const rateOrStrike = trade.parRate || trade.fixedLeg?.fixedRate || trade.capFloorDetails?.strikeRate || trade.swaptionDetails?.strikeRate || trade.fxForwardDetails?.forwardRate || trade.fxOptionDetails?.strikePrice || 0;

  if (previousStateStr) {
    db.prepare(`
      UPDATE IRSwapTrades SET
        product_type = ?, trade_date = ?, effective_date = ?, maturity_date = ?, counterparty_lei = ?, counterparty_name = ?,
        trader_id = ?, calculation_agent = ?, status = ?, currency = ?, notional = ?, fixed_rate = ?,
        pay_receive = ?, floating_index = ?, floating_tenor = ?, tenor_years = ?, dv01 = ?,
        mark_to_market = ?, par_rate = ?, json_payload = ?, raw_xml = ?, updated_at = ?
      WHERE trade_id = ?
    `).run(
      trade.productType, trade.tradeDate, trade.effectiveDate, trade.maturityDate, trade.counterpartyLei, trade.counterpartyName,
      trade.traderId, trade.calculationAgent, trade.status, currency, notional, rateOrStrike,
      trade.fixedLeg?.direction || 'BUY', trade.floatingLeg?.index || 'SOFR', trade.floatingLeg?.indexTenor || '3M', trade.tenorYears || 1, trade.dv01 || 0,
      trade.markToMarket || 0, rateOrStrike, jsonPayload, rawXml, trade.updatedAt, trade.tradeId
    );
  } else {
    db.prepare(`
      INSERT INTO IRSwapTrades (
        id, trade_id, product_type, trade_date, effective_date, maturity_date, counterparty_lei, counterparty_name,
        trader_id, calculation_agent, status, currency, notional, fixed_rate, pay_receive,
        floating_index, floating_tenor, tenor_years, dv01, mark_to_market, par_rate,
        json_payload, raw_xml, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trade.id, trade.tradeId, trade.productType, trade.tradeDate, trade.effectiveDate, trade.maturityDate, trade.counterpartyLei, trade.counterpartyName,
      trade.traderId, trade.calculationAgent, trade.status, currency, notional, rateOrStrike,
      trade.fixedLeg?.direction || 'BUY', trade.floatingLeg?.index || 'SOFR', trade.floatingLeg?.indexTenor || '3M', trade.tenorYears || 1, trade.dv01 || 0,
      trade.markToMarket || 0, rateOrStrike, jsonPayload, rawXml, trade.createdAt, trade.updatedAt
    );
  }

  insertTradeVersion(db, trade, user.id, previousStateStr ? `${action} Version` : 'Initial Booking');

  await logAuditEvent(
    user.id,
    user.name,
    action,
    trade.tradeId,
    `${action} [${trade.productType}] - Notional: ${currency} ${notional.toLocaleString()} @ ${rateOrStrike}`,
    '127.0.0.1',
    previousStateStr,
    jsonPayload
  );

  return trade;
}

/**
 * Updates trade status (e.g. TERMINATED, CONFIRMED, AMENDED)
 */
export async function updateTradeStatus(tradeId: string, newStatus: TradeStatus, user: { id: string; name: string }, reason?: string): Promise<IRSwapTrade | null> {
  const trade = await getTradeById(tradeId);
  if (!trade) return null;

  if (trade.status === 'MATURED' || trade.status === 'CANCELLED' || trade.status === 'TERMINATED') {
    throw new Error('Cannot update a trade that is already final.');
  }

  trade.status = newStatus;

  const actionType: AuditLogEntry['action'] = newStatus === 'TERMINATED' ? 'TERMINATE_TRADE' : 'UPDATE_STATUS';
  return saveTrade(trade, user, actionType);
}

/**
 * Seeds initial realistic portfolio trades across all 5 derivative product types
 */
function seedInitialTrades(db: Database.Database) {
  const initialTrades: IRSwapTrade[] = [
    {
      id: 'id-seed-0',
      tradeId: 'IRS-2026-000101',
      productType: 'IRS',
      tradeDate: '2026-07-28',
      effectiveDate: '2026-07-30',
      maturityDate: '2031-07-30',
      counterpartyName: 'JPMorgan Chase & Co.',
      counterpartyLei: '7H6GLXDRUG7FU57RNE97',
      traderId: 'TRADER_US_RATES',
      calculationAgent: 'CALC_AGENT_SELF',
      status: 'CONFIRMED',
      fixedLeg: { direction: 'PAY_FIXED', notional: 50000000, currency: 'USD', fixedRate: 3.82, dayCount: '30/360', frequency: '6M', businessDayConvention: 'MODFOLLOWING' },
      floatingLeg: { direction: 'RECEIVE_FIXED', notional: 50000000, currency: 'USD', index: 'SOFR', indexTenor: '3M', spreadBps: 0, dayCount: 'ACT/360', frequency: '3M', businessDayConvention: 'MODFOLLOWING' },
      notionalUsd: 50000000,
      tenorYears: 5,
      parRate: 3.85,
      dv01: 22150,
      markToMarket: 75000,
      createdAt: '2026-07-28T10:00:00Z',
      updatedAt: '2026-07-28T10:00:00Z',
    },
    {
      id: 'id-seed-1',
      tradeId: 'CAP-2026-000102',
      productType: 'CAP_FLOOR',
      tradeDate: '2026-07-29',
      effectiveDate: '2026-08-01',
      maturityDate: '2029-08-01',
      counterpartyName: 'Goldman Sachs International',
      counterpartyLei: 'W22LROWP2IHZNBB6K528',
      traderId: 'TRADER_US_RATES',
      calculationAgent: 'CALC_AGENT_SELF',
      status: 'BOOKED',
      fixedLeg: { direction: 'RECEIVE_FIXED', notional: 30000000, currency: 'USD', fixedRate: 4.00, dayCount: '30/360', frequency: '3M', businessDayConvention: 'MODFOLLOWING' },
      floatingLeg: { direction: 'PAY_FIXED', notional: 30000000, currency: 'USD', index: 'SOFR', indexTenor: '3M', spreadBps: 0, dayCount: 'ACT/360', frequency: '3M', businessDayConvention: 'MODFOLLOWING' },
      capFloorDetails: {
        capFloorType: 'CAP',
        direction: 'BUY',
        strikeRate: 4.00,
        underlyingIndex: 'SOFR',
        indexTenor: '3M',
        currency: 'USD',
        notional: 30000000,
        premiumAmount: 185000,
        paymentFrequency: '3M',
        dayCount: 'ACT/360',
      },
      notionalUsd: 30000000,
      tenorYears: 3,
      parRate: 3.85,
      dv01: 6200,
      markToMarket: 12500,
      createdAt: '2026-07-29T11:30:00Z',
      updatedAt: '2026-07-29T11:30:00Z',
    },
    {
      id: 'id-seed-2',
      tradeId: 'SWP-2026-000103',
      productType: 'SWAPTION',
      tradeDate: '2026-07-30',
      effectiveDate: '2026-07-30',
      maturityDate: '2032-08-01',
      counterpartyName: 'BNP Paribas S.A.',
      counterpartyLei: 'R014P6415NTO8P94M023',
      traderId: 'TRADER_EUR_DESK',
      calculationAgent: 'CALC_AGENT_CPTY',
      status: 'CONFIRMED',
      fixedLeg: { direction: 'PAY_FIXED', notional: 20000000, currency: 'EUR', fixedRate: 2.75, dayCount: '30/360', frequency: '1Y', businessDayConvention: 'MODFOLLOWING' },
      floatingLeg: { direction: 'RECEIVE_FIXED', notional: 20000000, currency: 'EUR', index: 'EURIBOR', indexTenor: '6M', spreadBps: 0, dayCount: 'ACT/360', frequency: '6M', businessDayConvention: 'MODFOLLOWING' },
      swaptionDetails: {
        swaptionType: 'PAYER',
        direction: 'BUY',
        strikeRate: 2.75,
        optionExpiryDate: '2027-08-01',
        underlyingMaturityDate: '2032-08-01',
        underlyingTenorYears: 5,
        settlementType: 'CASH',
        currency: 'EUR',
        notional: 20000000,
        premiumAmount: 310000,
        underlyingFloatingIndex: 'EURIBOR',
      },
      notionalUsd: 22000000,
      tenorYears: 5,
      parRate: 2.75,
      dv01: 5800,
      markToMarket: 24000,
      createdAt: '2026-07-30T14:15:00Z',
      updatedAt: '2026-07-30T14:15:00Z',
    },
    {
      id: 'id-seed-3',
      tradeId: 'FXF-2026-000104',
      productType: 'FX_FORWARD',
      tradeDate: '2026-07-31',
      effectiveDate: '2026-07-31',
      maturityDate: '2026-12-01',
      counterpartyName: 'Barclays Bank PLC',
      counterpartyLei: 'G5G3EKP372PF5040W327',
      traderId: 'TRADER_FX_DESK',
      calculationAgent: 'CALC_AGENT_SELF',
      status: 'BOOKED',
      fixedLeg: { direction: 'PAY_FIXED', notional: 15000000, currency: 'EUR', fixedRate: 1.0850, dayCount: 'ACT/360', frequency: '1M', businessDayConvention: 'MODFOLLOWING' },
      floatingLeg: { direction: 'RECEIVE_FIXED', notional: 15000000, currency: 'USD', index: 'SOFR', indexTenor: '1M', spreadBps: 0, dayCount: 'ACT/360', frequency: '1M', businessDayConvention: 'MODFOLLOWING' },
      fxForwardDetails: {
        currencyPair: 'EUR/USD',
        direction: 'BUY_BASE',
        baseCurrency: 'EUR',
        counterCurrency: 'USD',
        baseAmount: 15000000,
        counterAmount: 16275000,
        forwardRate: 1.0850,
        spotRate: 1.0820,
        settlementDate: '2026-12-01',
      },
      notionalUsd: 16275000,
      tenorYears: 0.35,
      parRate: 1.0850,
      dv01: 1500,
      markToMarket: 45000,
      createdAt: '2026-07-31T09:00:00Z',
      updatedAt: '2026-07-31T09:00:00Z',
    },
    {
      id: 'id-seed-4',
      tradeId: 'FXO-2026-000105',
      productType: 'FX_OPTION',
      tradeDate: '2026-08-01',
      effectiveDate: '2026-08-01',
      maturityDate: '2026-11-03',
      counterpartyName: 'Citigroup Inc.',
      counterpartyLei: '6BF0147165T34567M891',
      traderId: 'TRADER_FX_DESK',
      calculationAgent: 'CALC_AGENT_SELF',
      status: 'BOOKED',
      fixedLeg: { direction: 'RECEIVE_FIXED', notional: 10000000, currency: 'EUR', fixedRate: 1.0900, dayCount: 'ACT/360', frequency: '1M', businessDayConvention: 'MODFOLLOWING' },
      floatingLeg: { direction: 'PAY_FIXED', notional: 10000000, currency: 'USD', index: 'SOFR', indexTenor: '1M', spreadBps: 0, dayCount: 'ACT/360', frequency: '1M', businessDayConvention: 'MODFOLLOWING' },
      fxOptionDetails: {
        optionType: 'CALL',
        direction: 'BUY',
        optionStyle: 'EUROPEAN',
        currencyPair: 'EUR/USD',
        callCurrency: 'EUR',
        callAmount: 10000000,
        putCurrency: 'USD',
        putAmount: 10900000,
        strikePrice: 1.0900,
        expiryDate: '2026-11-01',
        expiryCut: '15:00 NY Cut',
        settlementDate: '2026-11-03',
        premiumAmount: 180000,
      },
      notionalUsd: 10900000,
      tenorYears: 0.25,
      parRate: 1.0900,
      dv01: 850,
      markToMarket: 9000,
      createdAt: '2026-08-01T08:00:00Z',
      updatedAt: '2026-08-01T08:00:00Z',
    },
  ];

  const insertTrade = db.prepare(`
    INSERT INTO IRSwapTrades (
      id, trade_id, product_type, trade_date, effective_date, maturity_date, counterparty_lei, counterparty_name,
      trader_id, calculation_agent, status, currency, notional, fixed_rate, pay_receive,
      floating_index, floating_tenor, tenor_years, dv01, mark_to_market, par_rate,
      json_payload, raw_xml, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO AuditLogs (id, timestamp, user_id, user_name, action, trade_id, details, new_state, ip_address, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < initialTrades.length; i++) {
    const fullTrade = initialTrades[i];
    fullTrade.rawXml = generateIRSwapXml(fullTrade);
    const jsonStr = JSON.stringify(fullTrade);

    const currency = fullTrade.fixedLeg?.currency || fullTrade.capFloorDetails?.currency || fullTrade.swaptionDetails?.currency || fullTrade.fxForwardDetails?.baseCurrency || fullTrade.fxOptionDetails?.callCurrency || 'USD';
    const notional = fullTrade.notionalUsd || 10000000;
    const rateOrStrike = fullTrade.parRate || 0;

    insertTrade.run(
      fullTrade.id, fullTrade.tradeId, fullTrade.productType, fullTrade.tradeDate, fullTrade.effectiveDate, fullTrade.maturityDate,
      fullTrade.counterpartyLei, fullTrade.counterpartyName, fullTrade.traderId, fullTrade.calculationAgent,
      fullTrade.status, currency, notional, rateOrStrike,
      fullTrade.fixedLeg?.direction || 'BUY', fullTrade.floatingLeg?.index || 'SOFR', fullTrade.floatingLeg?.indexTenor || '3M', fullTrade.tenorYears,
      fullTrade.dv01, fullTrade.markToMarket, fullTrade.parRate, jsonStr, fullTrade.rawXml, fullTrade.createdAt, fullTrade.updatedAt
    );

    const timestamp = new Date(Date.now() - (4 - i) * 86400000).toISOString();
    const hash = generateAuditHash(timestamp, 'SYS_INIT', 'BOOK_TRADE', fullTrade.tradeId, `Initial Portfolio Seed - ${fullTrade.productType}`, jsonStr);

    insertAudit.run(
      `AUD-SEED-${i}`, timestamp, 'SYS_INIT', 'System Initialization', 'BOOK_TRADE', fullTrade.tradeId,
      `Booked ${fullTrade.productType} (${currency} ${notional.toLocaleString()})`, jsonStr, '127.0.0.1', hash
    );
  }

  db.prepare("UPDATE TradeSequences SET current_value = 106 WHERE sequence_name = 'IRS_TRADE_ID'").run();
}
