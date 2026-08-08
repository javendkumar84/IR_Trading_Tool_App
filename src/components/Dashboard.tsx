import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, DollarSign, Activity, BarChart2, Zap, ArrowUpRight, ArrowDownRight,
  Clock, ShieldCheck, FileCode, Layers, Calendar, Filter, Globe, Building, Plus,
  X, CheckCircle2, AlertTriangle, Eye, RefreshCw, PieChart as PieIcon, ShieldAlert
} from 'lucide-react';
import { IRSwapTrade, MarketRateQuote, PositionSummary, TenorDv01Risk, Currency } from '../types';
import { CashflowScheduleModal } from './CashflowScheduleModal';
import { AddCounterpartyModal } from './AddCounterpartyModal';
import { convertCurrency, CURRENCY_SYMBOLS } from '../lib/fxRates';
import { getCounterparties, subscribeCounterparties } from '../lib/counterpartyStore';

interface DashboardProps {
  trades: IRSwapTrade[];
  positions: PositionSummary[];
  tenorRisk: TenorDv01Risk[];
  marketRates: MarketRateQuote[];
  onOpenXmlCapture: () => void;
  onOpenBlotter: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  trades,
  positions,
  tenorRisk,
  marketRates,
  onOpenXmlCapture,
  onOpenBlotter,
}) => {
  const [selectedCashflowTrade, setSelectedCashflowTrade] = useState<IRSwapTrade | null>(null);
  const [showAddCpModal, setShowAddCpModal] = useState(false);

  // Counterparty Master Store State
  const [counterparties, setCounterparties] = useState(getCounterparties());

  useEffect(() => {
    return subscribeCounterparties(() => {
      setCounterparties(getCounterparties());
    });
  }, []);

  // Portfolio View Controls State
  const [portfolioCurrency, setPortfolioCurrency] = useState<Currency>('USD');
  const [selectedCounterparty, setSelectedCounterparty] = useState<string>('ALL'); // 'ALL' or specific Counterparty Name
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');

  // Extract unique counterparties list from booked trades and master store
  const allAvailableCounterparties = useMemo(() => {
    const set = new Set<string>();
    counterparties.forEach((c) => set.add(c.name));
    trades.forEach((t) => {
      if (t.counterpartyName) set.add(t.counterpartyName);
    });
    return Array.from(set);
  }, [trades, counterparties]);

  // Filter Active Trades based on selected counterparty dropdown and product type filter
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (t.status === 'TERMINATED' || t.status === 'MATURED' || t.status === 'CANCELLED') return false;
      
      // Single Counterparty Dropdown Check
      if (selectedCounterparty !== 'ALL' && t.counterpartyName !== selectedCounterparty) {
        return false;
      }
      
      if (selectedProductFilter !== 'ALL' && t.productType !== selectedProductFilter) return false;
      return true;
    });
  }, [trades, selectedCounterparty, selectedProductFilter]);

  // 1. Mark-to-Market (MTM) Total
  const totalMtm = useMemo(() => {
    return filteredTrades.reduce((acc, t) => {
      const origMtm = t.markToMarket || 0;
      const origCcy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
      const convertedMtm = convertCurrency(origMtm, origCcy, portfolioCurrency);
      return acc + convertedMtm;
    }, 0);
  }, [filteredTrades, portfolioCurrency]);

  // 2. Net Rate Sensitivity / DV01 Total
  const totalNetDv01 = useMemo(() => {
    return filteredTrades.reduce((acc, t) => {
      const isPay = t.fixedLeg?.direction === 'PAY_FIXED' || t.capFloorDetails?.direction === 'BUY' || t.swaptionDetails?.direction === 'BUY';
      const sign = isPay ? 1 : -1;
      const origDv01 = (t.dv01 || 0) * sign;
      const origCcy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
      const convertedDv01 = convertCurrency(origDv01, origCcy, portfolioCurrency);
      return acc + convertedDv01;
    }, 0);
  }, [filteredTrades, portfolioCurrency]);

  // 3. Gross Notional Exposure
  const totalGrossNotional = useMemo(() => {
    return filteredTrades.reduce((acc, t) => {
      const ccy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
      const origNotional = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || t.fxForwardDetails?.baseAmount || t.fxOptionDetails?.callAmount || 0;
      const convertedNotional = convertCurrency(origNotional, ccy, portfolioCurrency);
      return acc + convertedNotional;
    }, 0);
  }, [filteredTrades, portfolioCurrency]);

  // 4. FIX: Net Notional Exposure Calculation (Pay vs Receive Directional Netting)
  const totalNetNotional = useMemo(() => {
    return filteredTrades.reduce((acc, t) => {
      // Receiving Fixed / Buying Options = +1 (Long Rate / Net Receiver)
      // Paying Fixed / Selling Options = -1 (Short Rate / Net Payer)
      const isReceiver = 
        t.leg1?.direction === 'RECEIVE_FIXED' || 
        t.fixedLeg?.direction === 'RECEIVE_FIXED' || 
        t.capFloorDetails?.direction === 'BUY' || 
        t.swaptionDetails?.direction === 'BUY' ||
        t.fxForwardDetails?.direction === 'BUY_BASE' ||
        t.fxOptionDetails?.direction === 'BUY';

      const sign = isReceiver ? 1 : -1;
      const ccy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
      const origNotional = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || t.fxForwardDetails?.baseAmount || t.fxOptionDetails?.callAmount || 0;
      const convertedNotional = convertCurrency(origNotional, ccy, portfolioCurrency);

      return acc + (convertedNotional * sign);
    }, 0);
  }, [filteredTrades, portfolioCurrency]);

  // Breakdown by Product
  const productCounts = useMemo(() => {
    return filteredTrades.reduce((acc, t) => {
      const prod = t.productType || 'IRS';
      acc[prod] = (acc[prod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredTrades]);

  // Detailed Counterparty Risk Exposure Summary for Stakeholders
  const counterpartyExposures = useMemo(() => {
    const map: Record<string, { count: number; grossNotional: number; netNotional: number; mtm: number; dv01: number }> = {};
    
    allAvailableCounterparties.forEach((cp) => {
      map[cp] = { count: 0, grossNotional: 0, netNotional: 0, mtm: 0, dv01: 0 };
    });

    trades.filter(t => t.status !== 'TERMINATED' && t.status !== 'MATURED').forEach((t) => {
      const cp = t.counterpartyName || 'Unknown CP';
      const ccy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
      const origNotional = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || t.fxForwardDetails?.baseAmount || t.fxOptionDetails?.callAmount || 0;
      const origMtm = t.markToMarket || 0;
      const origDv01 = t.dv01 || 0;

      const isReceiver = 
        t.leg1?.direction === 'RECEIVE_FIXED' || 
        t.fixedLeg?.direction === 'RECEIVE_FIXED' || 
        t.capFloorDetails?.direction === 'BUY' || 
        t.swaptionDetails?.direction === 'BUY' ||
        t.fxForwardDetails?.direction === 'BUY_BASE' ||
        t.fxOptionDetails?.direction === 'BUY';
      const sign = isReceiver ? 1 : -1;

      const convertedNotional = convertCurrency(origNotional, ccy, portfolioCurrency);
      const convertedMtm = convertCurrency(origMtm, ccy, portfolioCurrency);
      const convertedDv01 = convertCurrency(origDv01 * sign, ccy, portfolioCurrency);

      if (!map[cp]) map[cp] = { count: 0, grossNotional: 0, netNotional: 0, mtm: 0, dv01: 0 };
      map[cp].count += 1;
      map[cp].grossNotional += convertedNotional;
      map[cp].netNotional += (convertedNotional * sign);
      map[cp].mtm += convertedMtm;
      map[cp].dv01 += convertedDv01;
    });

    return Object.entries(map).map(([name, data]) => {
      const storeObj = counterparties.find(c => c.name === name);
      const creditLimitMillion = storeObj?.creditLimitMillions || 500;
      const creditLimitInCcy = convertCurrency(creditLimitMillion * 1000000, 'USD', portfolioCurrency);
      const utilPct = Math.min(100, Math.round((Math.abs(data.mtm) / (creditLimitInCcy || 1)) * 100));

      return {
        name,
        lei: storeObj?.lei || 'N/A',
        country: storeObj?.country || 'Global',
        rating: storeObj?.rating || 'A+',
        creditLimitInCcy,
        utilPct,
        ...data,
      };
    }).sort((a, b) => b.grossNotional - a.grossNotional);
  }, [allAvailableCounterparties, trades, counterparties, portfolioCurrency]);

  // Selected Counterparty Details Object (when dropdown is active)
  const selectedCpDetail = useMemo(() => {
    if (selectedCounterparty === 'ALL') return null;
    return counterpartyExposures.find(c => c.name === selectedCounterparty) || null;
  }, [selectedCounterparty, counterpartyExposures]);

  // Converted Currency Positions Data for Chart & Cards
  const convertedPositions = useMemo(() => {
    const map: Record<string, { currency: string; grossNotional: number; netNotional: number; mtm: number; count: number }> = {};
    
    ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'].forEach((ccy) => {
      map[ccy] = { currency: ccy, grossNotional: 0, netNotional: 0, mtm: 0, count: 0 };
    });

    filteredTrades.forEach((t) => {
      const ccy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
      const origNotional = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || t.fxForwardDetails?.baseAmount || t.fxOptionDetails?.callAmount || 0;
      const origMtm = t.markToMarket || 0;

      const isReceiver = 
        t.leg1?.direction === 'RECEIVE_FIXED' || 
        t.fixedLeg?.direction === 'RECEIVE_FIXED' || 
        t.capFloorDetails?.direction === 'BUY' || 
        t.swaptionDetails?.direction === 'BUY' ||
        t.fxForwardDetails?.direction === 'BUY_BASE' ||
        t.fxOptionDetails?.direction === 'BUY';
      const sign = isReceiver ? 1 : -1;

      const convertedNotional = convertCurrency(origNotional, ccy, portfolioCurrency);
      const convertedMtm = convertCurrency(origMtm, ccy, portfolioCurrency);

      if (!map[ccy]) map[ccy] = { currency: ccy, grossNotional: 0, netNotional: 0, mtm: 0, count: 0 };
      map[ccy].grossNotional += convertedNotional;
      map[ccy].netNotional += (convertedNotional * sign);
      map[ccy].mtm += convertedMtm;
      map[ccy].count += 1;
    });

    return Object.values(map);
  }, [filteredTrades, portfolioCurrency]);

  // Volume history simulation
  const volumeHistory = [
    { date: 'Mon', volumeM: 120, mtmK: -45 },
    { date: 'Tue', volumeM: 185, mtmK: 12 },
    { date: 'Wed', volumeM: 145, mtmK: 80 },
    { date: 'Thu', volumeM: 240, mtmK: 150 },
    { date: 'Fri', volumeM: Math.round(totalGrossNotional / 1000000), mtmK: Math.round(totalMtm / 1000) },
  ];

  const CCY_COLORS: Record<string, string> = {
    USD: '#6366f1',
    EUR: '#10b981',
    GBP: '#f59e0b',
    JPY: '#ec4899',
    CAD: '#3b82f6',
    AUD: '#8b5cf6',
    CHF: '#14b8a6',
  };

  const currSymbol = CURRENCY_SYMBOLS[portfolioCurrency] || portfolioCurrency;

  return (
    <div id="dashboard-view" className="space-y-6 pb-12 font-mono">
      
      {/* PORTFOLIO VIEW CONTROLS & DROPDOWN FILTER BANNER */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-4 shadow-md space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-3">
          
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-950/80 border border-blue-700/60 rounded-xl text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                Executive Portfolio Analytics & Counterparty Risk Dashboard
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800">
                  {portfolioCurrency} REPORTING
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-sans">
                Select a specific Counterparty or view Aggregate Portfolio Analytics
              </p>
            </div>
          </div>

          {/* Add Counterparty Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddCpModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Counterparty
            </button>
          </div>

        </div>

        {/* 3 CONTROL DROPDOWNS: COUNTERPARTY, REPORTING CURRENCY, PRODUCT FILTER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* 1. COUNTERPARTY SELECTION DROPDOWN (REQ #1) */}
          <div className="bg-[#141720] p-3 rounded-lg border border-amber-500/60 shadow-inner">
            <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              Counterparty Filter (Select One)
            </label>
            <select
              value={selectedCounterparty}
              onChange={(e) => setSelectedCounterparty(e.target.value)}
              className="w-full bg-[#1b1e27] border border-amber-500/80 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ALL">ALL COUNTERPARTIES (Aggregate Portfolio View)</option>
              {allAvailableCounterparties.map((cp) => (
                <option key={cp} value={cp}>{cp}</option>
              ))}
            </select>
          </div>

          {/* 2. REPORTING CURRENCY SELECTOR */}
          <div className="bg-[#141720] p-3 rounded-lg border border-blue-500/60 shadow-inner">
            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              Base Reporting Currency
            </label>
            <select
              value={portfolioCurrency}
              onChange={(e) => setPortfolioCurrency(e.target.value as Currency)}
              className="w-full bg-[#1b1e27] border border-blue-500/80 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="USD">USD ($ US Dollar)</option>
              <option value="EUR">EUR (€ Euro)</option>
              <option value="GBP">GBP (£ British Pound)</option>
              <option value="JPY">JPY (¥ Japanese Yen)</option>
              <option value="CAD">CAD (CA$ Canadian Dollar)</option>
              <option value="AUD">AUD (A$ Australian Dollar)</option>
              <option value="CHF">CHF (Swiss Franc)</option>
            </select>
          </div>

          {/* 3. PRODUCT TYPE FILTER */}
          <div className="bg-[#141720] p-3 rounded-lg border border-gray-700 shadow-inner">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              Derivative Product Filter
            </label>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="w-full bg-[#1b1e27] border border-gray-700 rounded p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">ALL DERIVATIVE PRODUCTS</option>
              <option value="IRS">IRS (Interest Rate Swaps)</option>
              <option value="CAP_FLOOR">Cap / Floor Options</option>
              <option value="SWAPTION">Swaption Contracts</option>
              <option value="RANGE_ACCRUAL">Range Accrual Product</option>
              <option value="FX_FORWARD">FX Forward Contracts</option>
              <option value="FX_OPTION">FX Currency Options</option>
            </select>
          </div>

        </div>

      </div>

      {/* SELECTED COUNTERPARTY PROFILE & CREDIT METRICS CARD (Renders when a Counterparty is Selected) */}
      {selectedCpDetail && (
        <div className="bg-[#0f131d] border-2 border-amber-500/80 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-500/40 pb-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  {selectedCpDetail.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                  RATING: {selectedCpDetail.rating}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  {selectedCpDetail.country}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                LEI Code: <strong className="text-gray-200">{selectedCpDetail.lei}</strong> | Credit Limit: <strong className="text-emerald-400">{currSymbol} {(selectedCpDetail.creditLimitInCcy / 1000000).toFixed(1)}M</strong>
              </p>
            </div>

            <button
              onClick={() => setSelectedCounterparty('ALL')}
              className="self-start sm:self-auto px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-gray-700"
            >
              <X className="w-3.5 h-3.5 text-rose-400" /> Reset Counterparty Filter
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            
            <div className="p-3 bg-[#161922] border border-gray-800 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Active Trades</span>
              <div className="text-base font-bold text-white mt-0.5">{selectedCpDetail.count} Trades</div>
            </div>

            <div className="p-3 bg-[#161922] border border-gray-800 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Gross Notional</span>
              <div className="text-base font-bold text-purple-300 mt-0.5">
                {currSymbol} {(selectedCpDetail.grossNotional / 1000000).toFixed(1)}M
              </div>
            </div>

            <div className="p-3 bg-[#161922] border border-gray-800 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Net Notional Exposure</span>
              <div className={`text-base font-bold mt-0.5 ${selectedCpDetail.netNotional >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedCpDetail.netNotional >= 0 ? '+' : ''}{currSymbol} {(selectedCpDetail.netNotional / 1000000).toFixed(1)}M
              </div>
            </div>

            <div className="p-3 bg-[#161922] border border-gray-800 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Mark-to-Market (MTM)</span>
              <div className={`text-base font-bold mt-0.5 ${selectedCpDetail.mtm >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedCpDetail.mtm >= 0 ? '+' : ''}{currSymbol} {selectedCpDetail.mtm.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-[#161922] border border-gray-800 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Net DV01 Risk</span>
              <div className="text-base font-bold text-blue-300 mt-0.5">
                {currSymbol} {Math.abs(selectedCpDetail.dv01).toLocaleString()} / bp
              </div>
            </div>

          </div>

          {/* Credit Limit Utilization Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-bold">Credit Limit Exposure Utilization</span>
              <span className="text-amber-300 font-bold">{selectedCpDetail.utilPct}% Utilized ({currSymbol}{Math.abs(selectedCpDetail.mtm).toLocaleString()} / {currSymbol}{(selectedCpDetail.creditLimitInCcy / 1000000).toFixed(1)}M)</span>
            </div>
            <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${selectedCpDetail.utilPct > 80 ? 'bg-rose-500' : selectedCpDetail.utilPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${selectedCpDetail.utilPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real-time Market Rate Ticker */}
      <div id="market-rate-ticker-bar" className="bg-[#0d0f12] border border-gray-800 rounded-xl p-3 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>Live Derivatives & Benchmark Rates (WS_FEED: ACTIVE)</span>
          </div>
          <span className="text-[11px] font-mono text-gray-500">Auto-updating over WebSockets</span>
        </div>

        <div id="market-rate-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {marketRates.map((q) => {
            const isUp = q.changeBps >= 0;
            return (
              <div
                key={q.symbol}
                className="bg-[#16181d] border border-gray-800 rounded-lg p-2.5 transition-all hover:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300">{q.name}</span>
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold font-mono ${
                      isUp ? 'text-green-400' : 'text-rose-400'
                    }`}
                  >
                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isUp ? '+' : ''}{q.changeBps} bps
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-base font-bold font-mono text-white">{q.rate.toFixed(3)}%</span>
                  <span className="text-[10px] text-gray-500">{q.currency}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 CORE KPI METRIC CARDS (FIXED REQ #2 NET NOTIONAL EXPOSURE) */}
      <div id="kpi-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total MTM */}
        <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Portfolio Mark-to-Market ({portfolioCurrency})</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-semibold font-mono tracking-tight ${totalMtm >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
              {totalMtm >= 0 ? '+' : ''}{currSymbol} {Math.abs(totalMtm).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              MTM valuation across {filteredTrades.length} trades
            </p>
          </div>
        </div>

        {/* KPI 2: Total Net Sensitivity / DV01 */}
        <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Net Rate Sensitivity (DV01)</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold font-mono text-white tracking-tight">
              {currSymbol} {Math.abs(totalNetDv01).toLocaleString()} <span className="text-xs font-normal text-gray-500">/ bp</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Profile: <strong className={totalNetDv01 >= 0 ? 'text-blue-400' : 'text-amber-400'}>
                {totalNetDv01 >= 0 ? 'Net Long Sensitivity' : 'Net Short Sensitivity'}
              </strong>
            </p>
          </div>
        </div>

        {/* KPI 3: Gross Notional Exposure */}
        <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gross Notional Exposure</span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold font-mono text-white tracking-tight">
              {currSymbol} {(totalGrossNotional / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total Sum of Absolute Notionals
            </p>
          </div>
        </div>

        {/* KPI 4: NET NOTIONAL EXPOSURE (FIXED REQ #2) */}
        <div className="bg-[#0d0f12] border-2 border-emerald-500/70 rounded-xl p-5 shadow-lg relative overflow-hidden bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Net Notional Exposure
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${totalNetNotional >= 0 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'}`}>
              {totalNetNotional >= 0 ? 'NET RECEIVER' : 'NET PAYER'}
            </span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold font-mono tracking-tight ${totalNetNotional >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              {totalNetNotional >= 0 ? '+' : ''}{currSymbol} {(Math.abs(totalNetNotional) / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center justify-between">
              <span>Directional Netting</span>
              <strong className="text-white">{((Math.abs(totalNetNotional) / (totalGrossNotional || 1)) * 100).toFixed(1)}% of Gross</strong>
            </p>
          </div>
        </div>

      </div>

      {/* STAKEHOLDER HIGH VISIBILITY SECTION: CURRENCY POSITION & RISK LADDER CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Net Notional Exposure by Currency (REQ #2 FIX) */}
        <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" />
                Net Notional Exposure Breakdown by Currency ({portfolioCurrency})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">
                Directional Net Receiver vs Net Payer Notional by Currency ({currSymbol} Millions)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={convertedPositions} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.6} />
                <XAxis dataKey="currency" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d0f12', borderColor: '#374151', borderRadius: '8px', color: '#f3f4f6' }}
                  formatter={(value: any) => [`${currSymbol} ${(Number(value) / 1000000).toFixed(2)}M`, `Net Directional Notional`]}
                />
                <Bar dataKey="netNotional" radius={[4, 4, 0, 0]}>
                  {convertedPositions.map((entry) => (
                    <Cell key={entry.currency} fill={entry.netNotional >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: DV01 Tenor Bucket Risk Distribution */}
        <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                DV01 Sensitivity Distribution Across Curve Tenors ({portfolioCurrency})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">
                Interest Rate Sensitivity Ladder by Tenor Bucket ({currSymbol} per 1bp shift)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenorRisk} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.6} />
                <XAxis dataKey="tenorBucket" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `${currSymbol}${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d0f12', borderColor: '#374151', borderRadius: '8px', color: '#f3f4f6' }}
                  formatter={(val: any) => [`${currSymbol}${convertCurrency(Number(val), 'USD', portfolioCurrency).toLocaleString()}`, 'DV01']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="payDv01" name="Pay DV01 (Short Rate Risk)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receiveDv01" name="Receive DV01 (Long Rate Risk)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* STAKEHOLDER VISIBILITY ENHANCEMENT: TOP COUNTERPARTIES CREDIT RISK TABLE */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Counterparty Risk Exposure & Credit Limit Breakdown ({portfolioCurrency})
          </h3>
          <span className="text-xs text-gray-500 font-sans">
            Sorted by Gross Notional Exposure
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-[#12141a] border-b border-gray-800 text-gray-400 font-bold uppercase text-[9.5px]">
                <th className="py-3 px-3">Counterparty Institution</th>
                <th className="py-3 px-3">LEI Code</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3 text-center">Trades</th>
                <th className="py-3 px-3 text-right">Gross Notional</th>
                <th className="py-3 px-3 text-right">Net Notional</th>
                <th className="py-3 px-3 text-right">Net MTM</th>
                <th className="py-3 px-3 text-right">Credit Limit</th>
                <th className="py-3 px-3 text-center">Limit Utilized</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-[11px]">
              {counterpartyExposures.map((cp) => (
                <tr key={cp.name} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate max-w-[180px]">{cp.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-400 text-[10px]">{cp.lei}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {cp.rating}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-white">{cp.count}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-purple-300">
                    {currSymbol} {(cp.grossNotional / 1000000).toFixed(1)}M
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${cp.netNotional >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {cp.netNotional >= 0 ? '+' : ''}{currSymbol} {(cp.netNotional / 1000000).toFixed(1)}M
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${cp.mtm >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {cp.mtm >= 0 ? '+' : ''}{currSymbol} {cp.mtm.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-300 font-bold">
                    {currSymbol} {(cp.creditLimitInCcy / 1000000).toFixed(0)}M
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cp.utilPct > 80 ? 'bg-rose-500' : cp.utilPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${cp.utilPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-300">{cp.utilPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setSelectedCounterparty(cp.name)}
                      className="px-2 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Filter CP
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row: Daily Trade Volume & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Volume Chart */}
        <div className="lg:col-span-2 bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Daily Trading Volume Trend ({portfolioCurrency})
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-sans">Weekly trading volume ({currSymbol} Millions) and cumulative MTM</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.6} />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `${currSymbol}${v}M`} />
                <Tooltip contentStyle={{ backgroundColor: '#0d0f12', borderColor: '#374151', borderRadius: '8px', color: '#f3f4f6' }} />
                <Area type="monotone" dataKey="volumeM" name={`Volume (${currSymbol}M)`} stroke="#3b82f6" fillOpacity={1} fill="url(#volGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Active Trade Feed */}
        <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Live Trades Stream ({filteredTrades.length})
              </h3>
              <button
                onClick={onOpenBlotter}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                Full Blotter →
              </button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredTrades.slice(0, 6).map((t) => {
                const prod = t.productType || 'IRS';
                const origCcy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
                const origNotional = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || t.fxForwardDetails?.baseAmount || t.fxOptionDetails?.callAmount || 0;
                
                const convertedNotional = convertCurrency(origNotional, origCcy, portfolioCurrency);
                const convertedMtm = convertCurrency(t.markToMarket || 0, origCcy, portfolioCurrency);

                return (
                  <div
                    key={t.tradeId}
                    className="p-2.5 bg-[#16181d] border border-gray-800 rounded-lg flex items-center justify-between hover:border-gray-700 transition-all text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{t.tradeId}</span>
                        <span className="px-1.5 py-0.5 rounded font-mono font-semibold text-[9px] bg-gray-800 text-amber-300 border border-gray-700">
                          {prod}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[170px]">
                        {t.counterpartyName}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <div className="text-white font-bold">
                          {currSymbol} {(convertedNotional / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-[10px] text-gray-500">
                          MTM: {currSymbol}{convertedMtm.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCashflowTrade(t)}
                        className="p-1 bg-gray-800 hover:bg-blue-900/40 text-blue-400 border border-gray-700 rounded cursor-pointer"
                        title="View Cashflow Schedule"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-800 mt-3 text-center">
            <span className="text-[11px] text-gray-500 flex items-center justify-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              SQLite Database & WebSockets Connected
            </span>
          </div>
        </div>

      </div>

      {/* Cashflow Schedule Modal */}
      {selectedCashflowTrade && (
        <CashflowScheduleModal
          trade={selectedCashflowTrade}
          onClose={() => setSelectedCashflowTrade(null)}
        />
      )}

      {/* Add Counterparty Modal */}
      {showAddCpModal && (
        <AddCounterpartyModal
          onClose={() => setShowAddCpModal(false)}
          onAdded={(newCpName) => {
            setSelectedCounterparty(newCpName);
          }}
        />
      )}

    </div>
  );
};
