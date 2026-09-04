import React, { useState } from 'react';
import { ShieldAlert, Download, Layers, TrendingUp, Cpu, RefreshCw, BarChart2, Activity, Filter, DollarSign, Calendar, Globe, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Currency, IRSwapTrade, TradeStatus } from '../types';

interface EodRiskDashboardProps {
  trades: IRSwapTrade[];
  onRefresh?: () => void;
}

export const EodRiskDashboard: React.FC<EodRiskDashboardProps> = ({ trades, onRefresh }) => {
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [eodDate, setEodDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());

  // Exchange rates relative to USD (Base = USD)
  const fxRatesToUsd: Record<Currency, number> = {
    USD: 1.0,
    EUR: 1.085,  // 1 EUR = 1.085 USD
    GBP: 1.275,  // 1 GBP = 1.275 USD
    JPY: 0.0067, // 1 JPY = 0.0067 USD
    CAD: 0.735,  // 1 CAD = 0.735 USD
    AUD: 0.655,  // 1 AUD = 0.655 USD
    CHF: 1.135,  // 1 CHF = 1.135 USD
  };

  const currencySymbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
    CHF: 'CHF ',
  };

  // Handle Refresh Click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => {
      setLastRefreshedAt(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 400);
  };

  // Convert USD value to selected display currency
  const convertToDisplayCcy = (valInUsd: number): number => {
    const rateToUsd = fxRatesToUsd[displayCurrency] || 1.0;
    return Math.round(valInUsd / rateToUsd);
  };

  // Compute 1st and 2nd order risk metrics per trade converted to selected currency
  const tradeRiskRows = trades.map((t) => {
    const prod = t.productType || 'IRS';
    const originalCcy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
    const notionalBase = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || 10000000;
    const pvUsd = t.markToMarket || 0;

    // Convert values to selected display currency
    const notionalConverted = convertToDisplayCcy(notionalBase);
    const pvConverted = convertToDisplayCcy(pvUsd);

    // 1st Order Risks
    const dv01DeltaUsd = t.dv01 || Math.round(notionalBase * 0.00025);
    const dv01DeltaConverted = convertToDisplayCcy(dv01DeltaUsd);

    let vegaUsd = 0;
    if (['CAP_FLOOR', 'SWAPTION', 'FX_OPTION', 'RANGE_ACCRUAL', 'SNOW_RANGE', 'TARN', 'SNOWBALL'].includes(prod)) {
      vegaUsd = Math.round(notionalBase * 0.0012 * (t.tenorYears || 3));
    }
    const vegaConverted = convertToDisplayCcy(vegaUsd);

    const thetaUsd = -Math.round((Math.abs(pvUsd) * 0.0005) + (dv01DeltaUsd * 0.4) + 150);
    const thetaConverted = convertToDisplayCcy(thetaUsd);

    // 2nd Order Risks
    const gammaUsd = parseFloat(((dv01DeltaUsd * 0.015) / 10).toFixed(2));
    const gammaConverted = parseFloat((gammaUsd / (fxRatesToUsd[displayCurrency] || 1.0)).toFixed(2));

    let vannaUsd = 0;
    if (['CAP_FLOOR', 'SWAPTION', 'FX_OPTION', 'SNOW_RANGE', 'SNOWBALL'].includes(prod)) {
      vannaUsd = parseFloat((vegaUsd * 0.025).toFixed(2));
    }
    const vannaConverted = parseFloat((vannaUsd / (fxRatesToUsd[displayCurrency] || 1.0)).toFixed(2));

    let volgaUsd = 0;
    if (['CAP_FLOOR', 'SWAPTION', 'FX_OPTION', 'SNOW_RANGE', 'TARN', 'SNOWBALL'].includes(prod)) {
      volgaUsd = parseFloat((vegaUsd * 0.045).toFixed(2));
    }
    const volgaConverted = parseFloat((volgaUsd / (fxRatesToUsd[displayCurrency] || 1.0)).toFixed(2));

    return {
      trade: t,
      tradeId: t.tradeId,
      productType: prod,
      status: t.status as TradeStatus,
      counterpartyName: t.counterpartyName,
      originalCurrency: originalCcy,
      displayCurrency,
      notional: notionalConverted,
      tenorYears: t.tenorYears || 1,
      pv: pvConverted,
      dv01Delta: dv01DeltaConverted,
      vega: vegaConverted,
      theta: thetaConverted,
      gamma: gammaConverted,
      vanna: vannaConverted,
      volga: volgaConverted,
    };
  });

  // Filtered rows by product and status
  const filteredRiskRows = tradeRiskRows.filter((r) => {
    const matchesProd = selectedProductFilter === 'ALL' || r.productType === selectedProductFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || r.status === selectedStatusFilter;
    return matchesProd && matchesStatus;
  });

  // Aggregate Portfolio EOD Summary Stats
  const totalTrades = filteredRiskRows.length;
  const totalPV = filteredRiskRows.reduce((sum, r) => sum + r.pv, 0);
  const totalDv01Delta = filteredRiskRows.reduce((sum, r) => sum + r.dv01Delta, 0);
  const totalVega = filteredRiskRows.reduce((sum, r) => sum + r.vega, 0);
  const totalTheta = filteredRiskRows.reduce((sum, r) => sum + r.theta, 0);
  const totalGamma = filteredRiskRows.reduce((sum, r) => sum + r.gamma, 0);
  const totalVanna = filteredRiskRows.reduce((sum, r) => sum + r.vanna, 0);
  const totalVolga = filteredRiskRows.reduce((sum, r) => sum + r.volga, 0);

  const curSymbol = currencySymbols[displayCurrency] || '$';

  // Badge styling helper for Trade State
  const getTradeStateBadge = (status: TradeStatus) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-blue-950/80 text-blue-300 border-cyan-700/80';
      case 'CONFIRMED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80';
      case 'AMENDED':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/80';
      case 'TERMINATED':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/80';
      case 'MATURED':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80';
      case 'CANCELLED':
        return 'bg-gray-900 text-gray-400 border-gray-700/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'EOD Valuation Date',
      'Trade Reference ID',
      'Product Family',
      'State of Trade (Status)',
      'Counterparty Entity',
      'Reporting Currency',
      'Notional Principal',
      'Tenor (Yrs)',
      'Mark-to-Market PV',
      '1st Order: Delta / DV01',
      '1st Order: Vega',
      '1st Order: Theta (Daily Decay)',
      '2nd Order: Gamma (Convexity)',
      '2nd Order: Vanna (Cross-Sensitivity)',
      '2nd Order: Volga (Vol Curvature)',
    ];

    const rows = filteredRiskRows.map((r) => [
      eodDate,
      r.tradeId,
      r.productType,
      r.status,
      `"${r.counterpartyName}"`,
      r.displayCurrency,
      r.notional,
      r.tenorYears,
      r.pv,
      r.dv01Delta,
      r.vega,
      r.theta,
      r.gamma,
      r.vanna,
      r.volga,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EOD_Risk_Report_${displayCurrency}_${eodDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="eod-risk-dashboard" className="space-y-6 pb-12 font-sans">
      
      {/* Header Banner - Sophisticated Financial Design */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0e121c] to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-950/80 border border-indigo-700/60 rounded-2xl text-indigo-400 shadow-inner">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-white tracking-wide font-sans">
                EOD Valuation & Sensitivities Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-950 text-indigo-300 border border-indigo-700/60 uppercase">
                COB Official Risk Run
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Daily End-Of-Day Portfolio PV, 1st Order Sensitivity (Delta, Vega, Theta), and 2nd Order Convexity (Gamma, Vanna, Volga)
            </p>
          </div>
        </div>

        {/* EOD Controls: Date Picker, Currency Selection & Refresh Button */}
        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow cursor-pointer disabled:opacity-50"
            title="Recalculate & refresh EOD risk values for selected date and filters"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Revaluing...' : 'Refresh EOD Risk'}</span>
          </button>

          {/* EOD Date Picker */}
          <div className="flex items-center gap-2 bg-[#141722] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-mono shadow-inner">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-gray-400 uppercase text-[10px] font-bold">EOD Date:</span>
            <input
              type="date"
              value={eodDate}
              onChange={(e) => {
                setEodDate(e.target.value);
                handleRefresh();
              }}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {/* Currency Selection Dropdown */}
          <div className="flex items-center gap-2 bg-[#141722] border border-indigo-700/80 rounded-xl px-3.5 py-2 text-xs font-mono shadow-inner">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-indigo-300 uppercase text-[10px] font-bold">Risk Ccy:</span>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
              <option value="EUR" className="bg-slate-900 text-white">EUR (€)</option>
              <option value="GBP" className="bg-slate-900 text-white">GBP (£)</option>
              <option value="JPY" className="bg-slate-900 text-white">JPY (¥)</option>
              <option value="CAD" className="bg-slate-900 text-white">CAD (CA$)</option>
              <option value="AUD" className="bg-slate-900 text-white">AUD (A$)</option>
              <option value="CHF" className="bg-slate-900 text-white">CHF (Fr)</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>

      </div>

      {/* Portfolio Executive Risk Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Portfolio PV */}
        <div className="bg-[#0d0f12] p-4 rounded-xl border border-indigo-900/60 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono uppercase font-bold">
            <span>Portfolio EOD PV</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={`text-2xl font-black font-mono ${totalPV >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {curSymbol}{totalPV.toLocaleString()}
          </div>
          <p className="text-[10px] text-amber-300/90 font-mono">
            Valuation Date: <strong>{eodDate}</strong> (COB) | {displayCurrency}
          </p>
        </div>

        {/* 1st Order: Delta / DV01 */}
        <div className="bg-[#0d0f12] p-4 rounded-xl border border-blue-900/60 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-blue-300 font-mono uppercase font-bold">
            <span>1st Order: Delta / DV01</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-300">
            {curSymbol}{totalDv01Delta.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ 1bp</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Portfolio dollar sensitivity per 1 bps parallel yield curve shift
          </p>
        </div>

        {/* 1st Order: Vega & Theta */}
        <div className="bg-[#0d0f12] p-4 rounded-xl border border-purple-900/60 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-purple-300 font-mono uppercase font-bold">
            <span>1st Order: Vega & Theta</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">Vega (1% Vol):</span>
              <span className="text-base font-bold text-purple-300">{curSymbol}{totalVega.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Theta (Decay):</span>
              <span className="text-base font-bold text-rose-400">{curSymbol}{totalTheta.toLocaleString()}/d</span>
            </div>
          </div>
        </div>

        {/* 2nd Order Convexity: Gamma, Vanna, Volga */}
        <div className="bg-[#0d0f12] p-4 rounded-xl border border-amber-900/60 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-mono uppercase font-bold">
            <span>2nd Order Convexity</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="grid grid-cols-3 gap-1 font-mono text-center pt-0.5">
            <div className="bg-[#141722] p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Gamma</span>
              <span className="text-xs font-bold text-amber-300">{totalGamma.toFixed(1)}</span>
            </div>
            <div className="bg-[#141722] p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Vanna</span>
              <span className="text-xs font-bold text-amber-300">{totalVanna.toFixed(1)}</span>
            </div>
            <div className="bg-[#141722] p-1.5 rounded border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Volga</span>
              <span className="text-xs font-bold text-amber-300">{totalVolga.toFixed(1)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Product & State Filter Control Bar */}
      <div className="bg-[#0d0f12] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Product Filter */}
          <div className="flex items-center gap-2 bg-[#16181d] border border-slate-800 rounded-lg px-3 py-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300 uppercase">Product Family:</span>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="bg-transparent text-xs text-indigo-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#16181d] text-white">All Products ({trades.length})</option>
              <option value="IRS" className="bg-[#16181d]">Interest Rate Swap (IRS)</option>
              <option value="CAP_FLOOR" className="bg-[#16181d]">Cap / Floor</option>
              <option value="SWAPTION" className="bg-[#16181d]">Swaption</option>
              <option value="RANGE_ACCRUAL" className="bg-[#16181d]">Range Accrual</option>
              <option value="SNOW_RANGE" className="bg-[#16181d]">SnowRange Accrual</option>
              <option value="TARN" className="bg-[#16181d]">TARN Swap</option>
              <option value="SNOWBALL" className="bg-[#16181d]">Snowball Ratchet</option>
              <option value="BOND" className="bg-[#16181d]">Fixed Income Bond</option>
              <option value="FRA" className="bg-[#16181d]">FRA</option>
              <option value="DEPOSIT" className="bg-[#16181d]">Term Deposit</option>
              <option value="REPO" className="bg-[#16181d]">Repo</option>
              <option value="FX_FORWARD" className="bg-[#16181d]">FX Forward</option>
              <option value="FX_OPTION" className="bg-[#16181d]">FX Option</option>
            </select>
          </div>

          {/* State of Trade Filter */}
          <div className="flex items-center gap-2 bg-[#16181d] border border-slate-800 rounded-lg px-3 py-1.5">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-300 uppercase">State of Trade:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-blue-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#16181d] text-white">All States</option>
              <option value="BOOKED" className="bg-[#16181d] text-blue-400">BOOKED</option>
              <option value="CONFIRMED" className="bg-[#16181d] text-emerald-400">CONFIRMED</option>
              <option value="AMENDED" className="bg-[#16181d] text-amber-400">AMENDED</option>
              <option value="TERMINATED" className="bg-[#16181d] text-rose-400">TERMINATED</option>
              <option value="MATURED" className="bg-[#16181d] text-indigo-400">MATURED</option>
              <option value="CANCELLED" className="bg-[#16181d] text-gray-400">CANCELLED</option>
            </select>
          </div>

        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-sans">
          <span>Last Revalued: <strong className="text-white font-mono">{lastRefreshedAt}</strong></span>
          <span>Showing <strong className="text-white font-mono">{filteredRiskRows.length}</strong> trades in <strong className="text-emerald-400 font-mono">{displayCurrency} ({curSymbol})</strong></span>
        </div>
      </div>

      {/* Main EOD Risk Table - Clean Financial Column Hierarchy */}
      <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Group Header Row */}
              <tr className="bg-[#080a0d] border-b border-slate-800 text-[10px] font-mono uppercase font-bold text-slate-400">
                <th colSpan={4} className="py-2.5 px-4 border-r border-slate-800">Trade Identification, State & Parameters</th>
                <th colSpan={1} className="py-2.5 px-4 border-r border-slate-800 text-right text-emerald-400">Valuation</th>
                <th colSpan={3} className="py-2.5 px-4 border-r border-slate-800 text-right text-blue-400">1st Order Sensitivities</th>
                <th colSpan={3} className="py-2.5 px-4 text-right text-amber-400">2nd Order Convexities</th>
              </tr>
              {/* Sub Column Headers */}
              <tr className="bg-[#0f121a] border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4">Trade Reference ID</th>
                <th className="py-3 px-4">State of Trade</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4 border-r border-slate-800">Notional & Tenor</th>
                <th className="py-3 px-4 text-right text-emerald-400 border-r border-slate-800">Mark-to-Market (PV)</th>
                <th className="py-3 px-4 text-right text-blue-400">Delta / DV01</th>
                <th className="py-3 px-4 text-right text-purple-400">Vega (1% Vol)</th>
                <th className="py-3 px-4 text-right text-rose-400 border-r border-slate-800">Theta (1d Decay)</th>
                <th className="py-3 px-4 text-right text-amber-400">Gamma</th>
                <th className="py-3 px-4 text-right text-amber-400">Vanna</th>
                <th className="py-3 px-4 text-right text-amber-400">Volga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredRiskRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 italic font-sans">
                    No trade records match current EOD risk filters.
                  </td>
                </tr>
              ) : (
                filteredRiskRows.map((r) => (
                  <tr key={r.tradeId} className="hover:bg-slate-800/40 transition-colors">
                    
                    {/* Trade ID & Product */}
                    <td className="py-3 px-4 font-bold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-blue-400">{r.tradeId}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">{r.productType}</span>
                      </div>
                    </td>

                    {/* State of Trade Column */}
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getTradeStateBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>

                    {/* Counterparty */}
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      <div className="truncate max-w-[150px] font-semibold">{r.counterpartyName}</div>
                      <span className="text-[9px] text-slate-500 font-mono">Orig: {r.originalCurrency}</span>
                    </td>

                    {/* Notional & Tenor */}
                    <td className="py-3 px-4 text-white border-r border-slate-800">
                      <div>{curSymbol}{r.notional.toLocaleString()}</div>
                      <div className="text-slate-500 text-[10px]">{r.tenorYears}Y Tenor</div>
                    </td>

                    {/* Present Value (PV) */}
                    <td className={`py-3 px-4 text-right font-bold text-sm border-r border-slate-800 ${r.pv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {curSymbol}{r.pv.toLocaleString()}
                    </td>

                    {/* 1st Order: Delta / DV01 */}
                    <td className="py-3 px-4 text-right font-bold text-blue-300">
                      {curSymbol}{r.dv01Delta.toLocaleString()}
                    </td>

                    {/* 1st Order: Vega */}
                    <td className="py-3 px-4 text-right text-purple-300">
                      {r.vega > 0 ? `${curSymbol}${r.vega.toLocaleString()}` : <span className="text-slate-600">—</span>}
                    </td>

                    {/* 1st Order: Theta */}
                    <td className="py-3 px-4 text-right text-rose-400 border-r border-slate-800">
                      {curSymbol}{r.theta.toLocaleString()}
                    </td>

                    {/* 2nd Order: Gamma */}
                    <td className="py-3 px-4 text-right text-amber-300 font-bold">
                      {r.gamma > 0 ? r.gamma : <span className="text-slate-600">—</span>}
                    </td>

                    {/* 2nd Order: Vanna */}
                    <td className="py-3 px-4 text-right text-amber-300 font-bold">
                      {r.vanna > 0 ? r.vanna : <span className="text-slate-600">—</span>}
                    </td>

                    {/* 2nd Order: Volga */}
                    <td className="py-3 px-4 text-right text-amber-300 font-bold">
                      {r.volga > 0 ? r.volga : <span className="text-slate-600">—</span>}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
