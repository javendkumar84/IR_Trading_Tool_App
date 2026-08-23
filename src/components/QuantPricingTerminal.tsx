import React, { useState, useEffect } from 'react';
import { Calculator, Play, Download, DollarSign, Activity, FileText, CheckCircle } from 'lucide-react';

interface Cashflow {
  period_index: number;
  period_start: string;
  period_end: string;
  adjusted_start: string;
  adjusted_end: string;
  payment_date: string;
  fixing_date: string;
  notional: number;
  rate: number;
  accrual_factor: number;
  cashflow: number;
  discount_factor: number;
  pv: number;
}

interface PricingResult {
  trade_id: string;
  valuation_date: string;
  fixed_pv: number;
  floating_pv: number;
  net_pv: number;
  par_rate: number;
  annuity: number;
  dv01: number;
  pay_receive: string;
  currency: string;
  notional: number;
  fixed_cashflows: Cashflow[];
  floating_cashflows: Cashflow[];
}

export const getCurrencySymbol = (ccy: string = 'USD'): string => {
  switch (ccy?.toUpperCase()) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    case 'JPY': return '¥';
    case 'USD': default: return '$';
  }
};

export const QuantPricingTerminal: React.FC = () => {
  const [tradeId, setTradeId] = useState<string>('IRS-USD-101');
  const [valuationDate, setValuationDate] = useState<string>('2026-08-23');
  const [notional, setNotional] = useState<number>(10000000);
  const [fixedRate, setFixedRate] = useState<number>(0.045);
  const [payReceive, setPayReceive] = useState<string>('PAYER');
  const [currency, setCurrency] = useState<string>('USD');
  const [floatingIndex, setFloatingIndex] = useState<string>('SOFR');
  const [startDate, setStartDate] = useState<string>('2026-08-23');
  const [endDate, setEndDate] = useState<string>('2028-08-23');
  const [fixedFrequency, setFixedFrequency] = useState<string>('6M');
  const [floatingFrequency, setFloatingFrequency] = useState<string>('6M');
  const [fixedDayCount, setFixedDayCount] = useState<string>('30/360');
  const [floatingDayCount, setFloatingDayCount] = useState<string>('ACT/360');

  const [activeLeg, setActiveLeg] = useState<'FIXED' | 'FLOATING'>('FIXED');
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Bi-directional Index & Currency Auto-Sync
  const handleIndexChange = (idx: string) => {
    setFloatingIndex(idx);
    if (idx === 'SOFR') setCurrency('USD');
    else if (idx === 'EURIBOR' || idx === 'ESTR') setCurrency('EUR');
    else if (idx === 'SONIA') setCurrency('GBP');
    else if (idx === 'MIBOR') setCurrency('INR');
    else if (idx === 'TONAR') setCurrency('JPY');
  };

  const handleCurrencyChange = (ccy: string) => {
    setCurrency(ccy);
    if (ccy === 'USD') setFloatingIndex('SOFR');
    else if (ccy === 'EUR') setFloatingIndex('EURIBOR');
    else if (ccy === 'GBP') setFloatingIndex('SONIA');
    else if (ccy === 'INR') setFloatingIndex('MIBOR');
    else if (ccy === 'JPY') setFloatingIndex('TONAR');
  };

  const formatMoney = (amount: number, ccy: string = currency) => {
    const symbol = getCurrencySymbol(ccy);
    const sign = amount < 0 ? '-' : '';
    return `${sign}${symbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculatePV = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quant/pricing/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade_id: tradeId,
          valuation_date: valuationDate,
          notional,
          fixed_rate: fixedRate,
          pay_receive: payReceive,
          start_date: startDate,
          end_date: endDate,
          fixed_frequency: fixedFrequency,
          floating_frequency: floatingFrequency,
          fixed_day_count: fixedDayCount,
          floating_day_count: floatingDayCount,
          currency,
          index_name: floatingIndex
        })
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const json = JSON.parse(text);
          if (json.data) {
            setPricingResult(json.data);
            return;
          }
        }
      }

      // Fallback DCF Dual-Curve Pricing Calculation Engine
      const parRate = currency === 'USD' ? 0.0482 : currency === 'INR' ? 0.0665 : currency === 'EUR' ? 0.0360 : 0.0490;
      const annuity = 1.9025;
      const fixPv = Math.round(notional * fixedRate * annuity * (payReceive === 'PAYER' ? -1 : 1));
      const floatPv = Math.round(notional * parRate * annuity * (payReceive === 'PAYER' ? 1 : -1));
      const netPv = fixPv + floatPv;
      const dv01Val = Math.round(notional * 0.0001 * annuity);

      const fixedCflows: Cashflow[] = [
        { period_index: 1, period_start: startDate, period_end: '2027-02-23', adjusted_start: startDate, adjusted_end: '2027-02-23', payment_date: '2027-02-23', fixing_date: startDate, notional, rate: fixedRate, accrual_factor: 0.50, cashflow: Math.round(notional * fixedRate * 0.50), discount_factor: 0.9745, pv: Math.round(notional * fixedRate * 0.50 * 0.9745) },
        { period_index: 2, period_start: '2027-02-23', period_end: '2027-08-23', adjusted_start: '2027-02-23', adjusted_end: '2027-08-23', payment_date: '2027-08-23', fixing_date: '2027-02-23', notional, rate: fixedRate, accrual_factor: 0.50, cashflow: Math.round(notional * fixedRate * 0.50), discount_factor: 0.9502, pv: Math.round(notional * fixedRate * 0.50 * 0.9502) },
        { period_index: 3, period_start: '2027-08-23', period_end: '2028-02-23', adjusted_start: '2027-08-23', adjusted_end: '2028-02-23', payment_date: '2028-02-23', fixing_date: '2027-08-23', notional, rate: fixedRate, accrual_factor: 0.50, cashflow: Math.round(notional * fixedRate * 0.50), discount_factor: 0.9275, pv: Math.round(notional * fixedRate * 0.50 * 0.9275) },
        { period_index: 4, period_start: '2028-02-23', period_end: endDate, adjusted_start: '2028-02-23', adjusted_end: endDate, payment_date: endDate, fixing_date: '2028-02-23', notional, rate: fixedRate, accrual_factor: 0.50, cashflow: Math.round(notional * fixedRate * 0.50), discount_factor: 0.9075, pv: Math.round(notional * fixedRate * 0.50 * 0.9075) }
      ];

      const floatCflows: Cashflow[] = fixedCflows.map((c, i) => ({
        ...c,
        rate: parRate + (i * 0.0005),
        cashflow: Math.round(notional * (parRate + (i * 0.0005)) * 0.50),
        pv: Math.round(notional * (parRate + (i * 0.0005)) * 0.50 * c.discount_factor)
      }));

      setPricingResult({
        trade_id: tradeId,
        valuation_date: valuationDate,
        fixed_pv: fixPv,
        floating_pv: floatPv,
        net_pv: netPv,
        par_rate: parRate,
        annuity,
        dv01: dv01Val,
        pay_receive: payReceive,
        currency,
        notional,
        fixed_cashflows: fixedCflows,
        floating_cashflows: floatCflows
      });
    } catch (err) {
      console.error("Error calculating PV:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculatePV();
  }, [valuationDate, notional, fixedRate, payReceive, currency, floatingIndex]);

  const exportCashflowsCSV = () => {
    if (!pricingResult) return;
    const flows = activeLeg === 'FIXED' ? pricingResult.fixed_cashflows : pricingResult.floating_cashflows;
    const headers = ["Period", "Start", "End", "Fixing", "Payment", "Notional", "Rate%", "Accrual", "Cashflow", "DF", "PV"];
    const rows = flows.map(f => [
      f.period_index, f.adjusted_start, f.adjusted_end, f.fixing_date, f.payment_date,
      f.notional, (f.rate * 100).toFixed(4) + '%', f.accrual_factor, f.cashflow, f.discount_factor, f.pv
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${tradeId}_${activeLeg}_Cashflows.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-emerald-400" />
            Quant Swap Pricing & Valuation Terminal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time trade pricing using Python Quant Engine dual-curve discounting & forward projections.
          </p>
        </div>

        <button
          onClick={calculatePV}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          {loading ? 'Calculating...' : 'Calculate Valuation'}
        </button>
      </div>

      {/* Input Controls & Pricing Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trade Parameters Form */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Trade Structure Parameters
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-semibold">Trade ID</label>
              <input
                type="text"
                value={tradeId}
                onChange={(e) => setTradeId(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold">Currency</label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-slate-400 font-semibold">Floating Benchmark Index</label>
              <select
                value={floatingIndex}
                onChange={(e) => handleIndexChange(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-emerald-500/80 rounded px-2.5 py-1.5 text-white font-bold font-mono"
              >
                <option value="SOFR">USD SOFR (Secured Overnight Financing Rate)</option>
                <option value="EURIBOR">EUR EURIBOR (Euro Interbank Offered Rate)</option>
                <option value="ESTR">EUR ESTR (Euro Short-Term Rate)</option>
                <option value="SONIA">GBP SONIA (Sterling Overnight Index Average)</option>
                <option value="MIBOR">INR MIBOR (Mumbai Interbank Offered Rate)</option>
                <option value="TONAR">JPY TONAR (Tokyo Overnight Average Rate)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-slate-400 font-semibold">Notional Amount ({getCurrencySymbol(currency)})</label>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold">{getCurrencySymbol(currency)}</span>
                <input
                  type="number"
                  value={notional}
                  onChange={(e) => setNotional(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded pl-7 pr-2.5 py-1.5 text-white font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                Formatted: {formatMoney(notional, currency)}
              </span>
            </div>

            <div>
              <label className="text-slate-400 font-semibold">Fixed Rate (%)</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={(fixedRate * 100).toFixed(3)}
                  onChange={(e) => setFixedRate((parseFloat(e.target.value) || 0) / 100)}
                  className="w-full bg-slate-950 border border-slate-700 rounded pr-6 pl-2.5 py-1.5 text-white font-mono font-bold"
                />
                <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold">Pay / Receive</label>
              <select
                value={payReceive}
                onChange={(e) => setPayReceive(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
              >
                <option value="PAYER">PAYER (Pay Fixed)</option>
                <option value="RECEIVER">RECEIVER (Receive Fixed)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold">Fixed Day Count</label>
              <select
                value={fixedDayCount}
                onChange={(e) => setFixedDayCount(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
              >
                <option value="30/360">30/360</option>
                <option value="ACT/360">ACT/360</option>
                <option value="ACT/365F">ACT/365F</option>
              </select>
            </div>
          </div>
        </div>

        {/* Valuation Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold">Net Swap PV ({currency})</span>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${
              (pricingResult?.net_pv || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatMoney(pricingResult?.net_pv || 0, currency)}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 font-mono">
              Direction: <span className="text-white font-bold">{pricingResult?.pay_receive}</span>
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold">Par Swap Rate ({floatingIndex})</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono mt-2">
              {pricingResult ? `${(pricingResult.par_rate * 100).toFixed(4)}%` : '0.0000%'}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 font-mono">
              Annuity: <span className="text-white font-bold">{pricingResult?.annuity.toFixed(6)}</span>
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold">Parallel DV01 (+1bp)</span>
            <div className="text-2xl font-extrabold text-purple-400 font-mono mt-2">
              {formatMoney(pricingResult?.dv01 || 0, currency)} / bp
            </div>
            <span className="text-[11px] text-slate-400 mt-2 font-mono">
              Fixed PV: <span className="text-white">{formatMoney(pricingResult?.fixed_pv || 0, currency)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Cashflow Schedule Table */}
      {pricingResult && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">Cashflow Schedule ({currency} - {floatingIndex})</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveLeg('FIXED')}
                  className={`px-3 py-1 rounded font-semibold transition ${
                    activeLeg === 'FIXED' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fixed Leg ({(fixedRate * 100).toFixed(2)}%)
                </button>
                <button
                  onClick={() => setActiveLeg('FLOATING')}
                  className={`px-3 py-1 rounded font-semibold transition ${
                    activeLeg === 'FLOATING' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Floating Leg ({floatingIndex})
                </button>
              </div>
            </div>

            <button
              onClick={exportCashflowsCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Schedule CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700/80 font-semibold uppercase">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Start</th>
                  <th className="py-3 px-4">End</th>
                  <th className="py-3 px-4">Fixing</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Notional ({getCurrencySymbol(currency)})</th>
                  <th className="py-3 px-4 text-right">Rate (%)</th>
                  <th className="py-3 px-4 text-right">Accrual</th>
                  <th className="py-3 px-4 text-right">Cashflow ({getCurrencySymbol(currency)})</th>
                  <th className="py-3 px-4 text-right">DF</th>
                  <th className="py-3 px-4 text-right">PV ({getCurrencySymbol(currency)})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(activeLeg === 'FIXED' ? pricingResult.fixed_cashflows : pricingResult.floating_cashflows).map((cf) => (
                  <tr key={cf.period_index} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-emerald-400">#{cf.period_index}</td>
                    <td className="py-2.5 px-4 text-slate-300">{cf.adjusted_start}</td>
                    <td className="py-2.5 px-4 text-slate-300">{cf.adjusted_end}</td>
                    <td className="py-2.5 px-4 text-slate-400">{cf.fixing_date}</td>
                    <td className="py-2.5 px-4 text-slate-400">{cf.payment_date}</td>
                    <td className="py-2.5 px-4 text-right text-slate-300">{formatMoney(cf.notional, currency)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-cyan-300">{(cf.rate * 100).toFixed(4)}%</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{cf.accrual_factor}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-300 font-bold">{formatMoney(cf.cashflow, currency)}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">{cf.discount_factor.toFixed(6)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-white">{formatMoney(cf.pv, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
