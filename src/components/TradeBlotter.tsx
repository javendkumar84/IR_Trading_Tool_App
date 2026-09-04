import React, { useState } from 'react';
import { Search, Filter, Download, FileCode, CheckCircle2, XCircle, Layers, Calendar } from 'lucide-react';
import { IRSwapTrade, TradeStatus } from '../types';
import { CashflowScheduleModal } from './CashflowScheduleModal';

interface TradeBlotterProps {
  trades: IRSwapTrade[];
  traderUser: string;
  onTradeStatusUpdated: (tradeId: string, status: TradeStatus) => void;
  onSelectAuditTrade?: (tradeId: string) => void;
}

export const TradeBlotter: React.FC<TradeBlotterProps> = ({
  trades,
  traderUser,
  onTradeStatusUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedXmlModalTrade, setSelectedXmlModalTrade] = useState<IRSwapTrade | null>(null);
  const [selectedCashflowTrade, setSelectedCashflowTrade] = useState<IRSwapTrade | null>(null);

  // Filtering
  const filteredTrades = trades.filter((t) => {
    const matchesSearch =
      t.tradeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.counterpartyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.traderId.toLowerCase().includes(searchTerm.toLowerCase());

    const tradeProduct = t.productType || 'IRS';
    const matchesProduct = productFilter === 'ALL' || tradeProduct === productFilter;

    const ccy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
    const matchesCcy = currencyFilter === 'ALL' || ccy === currencyFilter;

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesProduct && matchesCcy && matchesStatus;
  });

  // Handle Action Status
  const handleUpdateStatus = async (tradeId: string, newStatus: TradeStatus) => {
    try {
      await fetch(`/api/trades/${tradeId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          user: { id: 'TRADER_01', name: traderUser },
          reason: `Manual Blotter status update to ${newStatus}`,
        }),
      }).catch(() => null);

      onTradeStatusUpdated(tradeId, newStatus);
    } catch (_err) {
      onTradeStatusUpdated(tradeId, newStatus);
    }
  };

  // Export Blotter CSV
  const handleExportCsv = () => {
    const headers = ['Trade ID', 'Product', 'Trade Date', 'Effective', 'Maturity', 'Counterparty', 'Currency', 'Notional', 'Rate/Strike', 'Status', 'DV01', 'MTM'];
    const rows = filteredTrades.map((t) => {
      const prod = t.productType || 'IRS';
      const ccy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
      const notional = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || t.fxForwardDetails?.baseAmount || t.fxOptionDetails?.callAmount || 0;
      const rateOrStrike = t.parRate || t.fixedLeg?.fixedRate || t.capFloorDetails?.strikeRate || t.swaptionDetails?.strikeRate || t.fxForwardDetails?.forwardRate || t.fxOptionDetails?.strikePrice || 0;

      return [
        t.tradeId,
        prod,
        t.tradeDate,
        t.effectiveDate,
        t.maturityDate,
        `"${t.counterpartyName}"`,
        ccy,
        notional,
        rateOrStrike,
        t.status,
        t.dv01,
        t.markToMarket,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Derivatives_Trade_Blotter_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="trade-blotter-container" className="space-y-4 pb-12">
      
      {/* Search & Filter Control Panel */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-4 space-y-3 shadow-md">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Trade ID, Counterparty, Trader..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#16181d] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Filter Dropdowns Bar */}
          <div className="flex items-center gap-2.5 overflow-x-auto flex-wrap">
            
            {/* PRODUCT FILTER */}
            <div className="flex items-center gap-1.5 bg-[#16181d] border border-amber-900/60 rounded-lg px-3 py-1.5">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-300 font-mono">Product:</label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="bg-transparent text-xs text-white font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#16181d] text-white">All Products ({trades.length})</option>
                <option value="IRS" className="bg-[#16181d] text-blue-300">Interest Rate Swap (IRS)</option>
                <option value="CAP_FLOOR" className="bg-[#16181d] text-emerald-300">Cap / Floor</option>
                <option value="SWAPTION" className="bg-[#16181d] text-amber-300">Swaption</option>
                <option value="RANGE_ACCRUAL" className="bg-[#16181d] text-teal-300">Range Accrual</option>
                <option value="SNOW_RANGE" className="bg-[#16181d] text-cyan-300">SnowRange Accrual</option>
                <option value="TARN" className="bg-[#16181d] text-orange-300">TARN Swap</option>
                <option value="SNOWBALL" className="bg-[#16181d] text-indigo-300">Snowball Ratchet</option>
                <option value="BOND" className="bg-[#16181d] text-rose-300">Fixed Income Bond</option>
                <option value="FRA" className="bg-[#16181d] text-lime-300">FRA</option>
                <option value="DEPOSIT" className="bg-[#16181d] text-yellow-300">Term Deposit</option>
                <option value="REPO" className="bg-[#16181d] text-violet-300">Repo</option>
                <option value="FX_FORWARD" className="bg-[#16181d] text-purple-300">FX Forward</option>
                <option value="FX_OPTION" className="bg-[#16181d] text-pink-300">FX Option</option>
              </select>
            </div>

            {/* STATUS FILTER */}
            <div className="flex items-center gap-1.5 bg-[#16181d] border border-blue-900/60 rounded-lg px-3 py-1.5">
              <Filter className="w-4 h-4 text-blue-400 shrink-0" />
              <label className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-white font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#16181d] text-white">All Statuses</option>
                <option value="BOOKED" className="bg-[#16181d] text-blue-400">BOOKED</option>
                <option value="CONFIRMED" className="bg-[#16181d] text-emerald-400">CONFIRMED</option>
                <option value="AMENDED" className="bg-[#16181d] text-amber-400">AMENDED</option>
                <option value="TERMINATED" className="bg-[#16181d] text-rose-400">TERMINATED</option>
                <option value="MATURED" className="bg-[#16181d] text-indigo-400">MATURED</option>
                <option value="CANCELLED" className="bg-[#16181d] text-gray-400">CANCELLED</option>
              </select>
            </div>

            {/* CURRENCY FILTER */}
            <div className="flex items-center gap-1.5 bg-[#16181d] border border-gray-700 rounded-lg px-3 py-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">Currency:</label>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="bg-transparent text-xs text-gray-200 font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#16181d]">All Currencies</option>
                <option value="USD" className="bg-[#16181d]">USD ($)</option>
                <option value="EUR" className="bg-[#16181d]">EUR (€)</option>
                <option value="GBP" className="bg-[#16181d]">GBP (£)</option>
                <option value="JPY" className="bg-[#16181d]">JPY (¥)</option>
                <option value="CAD" className="bg-[#16181d]">CAD ($)</option>
                <option value="AUD" className="bg-[#16181d]">AUD ($)</option>
                <option value="CHF" className="bg-[#16181d]">CHF (Fr)</option>
              </select>
            </div>

            {/* RESET FILTERS */}
            {(productFilter !== 'ALL' || statusFilter !== 'ALL' || currencyFilter !== 'ALL' || searchTerm !== '') && (
              <button
                onClick={() => {
                  setProductFilter('ALL');
                  setStatusFilter('ALL');
                  setCurrencyFilter('ALL');
                  setSearchTerm('');
                }}
                className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                Reset Filters ✕
              </button>
            )}

            {/* EXPORT CSV */}
            <button
              onClick={handleExportCsv}
              className="py-1.5 px-3 bg-[#16181d] hover:bg-gray-800 border border-gray-700 text-blue-400 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Quick Filter Status Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800/80 text-[11px] font-mono overflow-x-auto">
          <span className="text-gray-500 uppercase text-[10px] font-bold shrink-0">Quick Filter by Status:</span>
          {['ALL', 'BOOKED', 'CONFIRMED', 'AMENDED', 'TERMINATED', 'MATURED', 'CANCELLED'].map((st) => {
            const count = st === 'ALL' ? trades.length : trades.filter((t) => t.status === st).length;
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-cyan-600 text-white border-blue-400 shadow'
                    : 'bg-[#16181d] text-gray-400 hover:text-white border-gray-800'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
          <span className="ml-auto text-gray-400 text-[10px] font-sans">
            Showing <strong className="text-white">{filteredTrades.length}</strong> of <strong className="text-gray-300">{trades.length}</strong> trades
          </span>
        </div>

      </div>

      {/* SQL Table */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0a0b0d] border-b border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                <th className="py-3 px-4">Trade ID & Product</th>
                <th className="py-3 px-4">Dates & Tenor</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4">Type / Direction</th>
                <th className="py-3 px-4">Notional Amount</th>
                <th className="py-3 px-4">Rate / Strike / Index</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">DV01 / MTM</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 italic">
                    No trade records matching current blotter filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const prod = t.productType || 'IRS';
                  const ccy = t.fixedLeg?.currency || t.capFloorDetails?.currency || t.swaptionDetails?.currency || t.fxForwardDetails?.baseCurrency || t.fxOptionDetails?.callCurrency || 'USD';
                  const notional = t.notionalUsd || t.fixedLeg?.notional || t.capFloorDetails?.notional || t.swaptionDetails?.notional || t.fxForwardDetails?.baseAmount || t.fxOptionDetails?.callAmount || 0;

                  // Product Colors
                  const prodColorMap: Record<string, string> = {
                    IRS: 'bg-blue-950/80 text-blue-300 border-blue-800',
                    CAP_FLOOR: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
                    SWAPTION: 'bg-amber-950/80 text-amber-300 border-amber-800',
                    RANGE_ACCRUAL: 'bg-teal-950/80 text-teal-300 border-teal-800',
                    SNOW_RANGE: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
                    TARN: 'bg-orange-950/80 text-orange-300 border-orange-800',
                    SNOWBALL: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
                    FX_FORWARD: 'bg-purple-950/80 text-purple-300 border-purple-800',
                    FX_OPTION: 'bg-pink-950/80 text-pink-300 border-pink-800',
                  };

                  return (
                    <tr key={t.tradeId} className="hover:bg-gray-800/40 transition-colors font-mono">
                      
                      {/* Trade ID & Product */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex flex-col gap-1">
                          <span className="text-blue-400">{t.tradeId}</span>
                          <span className={`inline-block w-max px-1.5 py-0.5 rounded text-[9px] font-bold border ${prodColorMap[prod] || 'bg-gray-800 text-gray-300'}`}>
                            {prod}
                          </span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4 text-gray-300 text-[11px]">
                        <div>Eff: {t.effectiveDate}</div>
                        <div className="text-gray-500">Mat: {t.maturityDate} ({t.tenorYears}Y)</div>
                      </td>

                      {/* Counterparty */}
                      <td className="py-3 px-4 font-sans text-gray-200">
                        <div className="font-semibold">{t.counterpartyName}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[140px] font-mono">{t.counterpartyLei}</div>
                      </td>

                      {/* Direction */}
                      <td className="py-3 px-4">
                        {prod === 'IRS' && (
                          <span className="text-gray-200 font-bold">
                            {t.leg1?.legType === 'FLOATING' && t.leg2?.legType === 'FLOATING'
                              ? `⚡ ${t.leg1.direction === 'PAY' || t.leg1.direction === 'PAY_FIXED' ? 'PAY' : 'REC'} ${t.leg1.index || 'FLOAT'} / ${t.leg2.direction === 'PAY' || t.leg2.direction === 'PAY_FIXED' ? 'PAY' : 'REC'} ${t.leg2.index || 'FLOAT'}`
                              : t.leg1?.legType === 'FLOATING' && t.leg2?.legType === 'FIXED'
                              ? `${t.leg1.direction === 'PAY' || t.leg1.direction === 'PAY_FIXED' ? 'PAY' : 'REC'} ${t.leg1.index || 'FLOAT'} / REC FIXED`
                              : (t.fixedLeg?.direction || t.leg1?.direction || 'PAY_FIXED')}
                          </span>
                        )}
                        {prod === 'CAP_FLOOR' && (
                          <span className="text-emerald-300 font-bold">{t.capFloorDetails?.direction} {t.capFloorDetails?.capFloorType}</span>
                        )}
                        {prod === 'SWAPTION' && (
                          <span className="text-amber-300 font-bold">{t.swaptionDetails?.direction} {t.swaptionDetails?.swaptionType}</span>
                        )}
                        {prod === 'FX_FORWARD' && (
                          <span className="text-purple-300 font-bold">{t.fxForwardDetails?.direction} ({t.fxForwardDetails?.currencyPair})</span>
                        )}
                        {prod === 'FX_OPTION' && (
                          <span className="text-pink-300 font-bold">{t.fxOptionDetails?.direction} {t.fxOptionDetails?.optionType} ({t.fxOptionDetails?.currencyPair})</span>
                        )}
                      </td>

                      {/* Notional */}
                      <td className="py-3 px-4 text-white font-bold">
                        {String(ccy) === 'EUR' ? '€' : String(ccy) === 'GBP' ? '£' : String(ccy) === 'INR' ? '₹' : String(ccy) === 'JPY' ? '¥' : '$'}{notional.toLocaleString()}
                      </td>

                      {/* Fixed & Floating Details */}
                      <td className="py-3 px-4 text-gray-200 text-[11px]">
                        {prod === 'IRS' && (
                          <div>
                            {t.leg1?.legType === 'FLOATING' && t.leg2?.legType === 'FLOATING' ? (
                              <>
                                <div>L1: <strong className="text-cyan-400">{t.leg1.index} ({t.leg1.indexTenor || '1M'})</strong> {t.leg1.spreadBps ? `+${t.leg1.spreadBps}bps` : ''}</div>
                                <div className="text-gray-400 text-[10px]">L2: {t.leg2.index} ({t.leg2.indexTenor || '3M'}) {t.leg2.spreadBps ? `+${t.leg2.spreadBps}bps` : ''}</div>
                              </>
                            ) : t.leg1?.legType === 'FLOATING' && t.leg2?.legType === 'FIXED' ? (
                              <>
                                <div>L1 Flt: <strong className="text-cyan-400">{t.leg1.index} ({t.leg1.indexTenor || '3M'})</strong></div>
                                <div className="text-blue-400 text-[10px]">L2 Fix: {((t.leg2.fixedRate || t.fixedLeg?.fixedRate || 0) > 1 ? (t.leg2.fixedRate || t.fixedLeg?.fixedRate || 0) : (t.leg2.fixedRate || t.fixedLeg?.fixedRate || 0) * 100).toFixed(2)}%</div>
                              </>
                            ) : (
                              <>
                                <div>Fix: <strong className="text-blue-400">{((t.fixedLeg?.fixedRate || t.leg1?.fixedRate || 0) > 1 ? (t.fixedLeg?.fixedRate || t.leg1?.fixedRate || 0) : (t.fixedLeg?.fixedRate || t.leg1?.fixedRate || 0) * 100).toFixed(2)}%</strong></div>
                                <div className="text-gray-500 text-[10px]">Flt: {t.floatingLeg?.index || t.leg2?.index} ({t.floatingLeg?.indexTenor || t.leg2?.indexTenor})</div>
                              </>
                            )}
                          </div>
                        )}
                        {prod === 'CAP_FLOOR' && (
                          <div>
                            <div>Strike: <strong className="text-emerald-400">{t.capFloorDetails?.strikeRate}%</strong></div>
                            <div className="text-gray-500 text-[10px]">Prem: ${t.capFloorDetails?.premiumAmount?.toLocaleString()}</div>
                          </div>
                        )}
                        {prod === 'SWAPTION' && (
                          <div>
                            <div>Strike: <strong className="text-amber-400">{t.swaptionDetails?.strikeRate}%</strong></div>
                            <div className="text-gray-500 text-[10px]">Exp: {t.swaptionDetails?.optionExpiryDate}</div>
                          </div>
                        )}
                        {prod === 'FX_FORWARD' && (
                          <div>
                            <div>Fwd Rate: <strong className="text-purple-400">{t.fxForwardDetails?.forwardRate}</strong></div>
                            <div className="text-gray-500 text-[10px]">Spot: {t.fxForwardDetails?.spotRate}</div>
                          </div>
                        )}
                        {prod === 'FX_OPTION' && (
                          <div>
                            <div>Strike: <strong className="text-pink-400">{t.fxOptionDetails?.strikePrice}</strong></div>
                            <div className="text-gray-500 text-[10px]">Exp: {t.fxOptionDetails?.expiryDate}</div>
                          </div>
                        )}
                        {prod === 'RANGE_ACCRUAL' && (
                          <div>
                            <div>Leg 1 Coupon: <strong className="text-teal-400">{t.rangeAccrualDetails?.accrualCouponRate || 5.25}%</strong> ({t.rangeAccrualDetails?.direction || 'RECEIVE'})</div>
                            <div className="text-gray-500 text-[10px]">Leg 2 Funding: {t.rangeAccrualDetails?.fundingIndex || 'SOFR'} + {t.rangeAccrualDetails?.fundingSpreadBps || 0}bps</div>
                          </div>
                        )}
                        {prod === 'SNOW_RANGE' && (
                          <div>
                            <div>Base Coupon: <strong className="text-cyan-400">{t.snowRangeDetails?.baseCouponRate || 5.50}%</strong> ({t.snowRangeDetails?.direction || 'RECEIVE'})</div>
                            <div className="text-gray-500 text-[10px]">Range: [{t.snowRangeDetails?.lowerBarrierRate}% - {t.snowRangeDetails?.upperBarrierRate}%] | Mem: {t.snowRangeDetails?.memoryMultiplier || 1.0}x</div>
                          </div>
                        )}
                        {prod === 'TARN' && (
                          <div>
                            <div>Target Cap: <strong className="text-orange-400">{t.tarnDetails?.targetCapPct || 10.00}%</strong> ({t.tarnDetails?.direction || 'RECEIVE'})</div>
                            <div className="text-gray-500 text-[10px]">Strike: {t.tarnDetails?.strikeRate}% | Leverage: {t.tarnDetails?.leverageFactor || 1.5}x</div>
                          </div>
                        )}
                        {prod === 'SNOWBALL' && (
                          <div>
                            <div>Init Coupon: <strong className="text-indigo-400">{t.snowballDetails?.initialCouponRate || 6.00}%</strong> ({t.snowballDetails?.direction || 'RECEIVE'})</div>
                            <div className="text-gray-500 text-[10px]">Step: +{t.snowballDetails?.bonusStepRate}% | Leverage: {t.snowballDetails?.leverageFactor || 1.0}x</div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'CONFIRMED'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                              : t.status === 'BOOKED'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                              : t.status === 'AMENDED'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      {/* Risk / MTM */}
                      <td className="py-3 px-4 text-right">
                        <div className="text-gray-300">Sens: ${t.dv01?.toLocaleString()}</div>
                        <div className={`text-[11px] font-bold ${t.markToMarket >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                          MTM: ${t.markToMarket?.toLocaleString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          
                          {/* Cashflow Schedule */}
                          <button
                            onClick={() => setSelectedCashflowTrade(t)}
                            className="p-1.5 bg-[#16181d] hover:bg-blue-900/40 text-blue-400 border border-gray-700 rounded cursor-pointer"
                            title="View Cashflow Schedule"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* View XML */}
                          <button
                            onClick={() => setSelectedXmlModalTrade(t)}
                            className="p-1.5 bg-[#16181d] hover:bg-gray-800 text-green-400 border border-gray-700 rounded cursor-pointer"
                            title="View FpML XML"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Confirm */}
                          {t.status === 'BOOKED' && (
                            <button
                              onClick={() => handleUpdateStatus(t.tradeId, 'CONFIRMED')}
                              className="p-1.5 bg-[#16181d] hover:bg-emerald-900/40 text-emerald-300 border border-gray-700 rounded cursor-pointer"
                              title="Confirm Trade"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Terminate */}
                          {t.status !== 'TERMINATED' && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to terminate trade ${t.tradeId}?`)) {
                                  handleUpdateStatus(t.tradeId, 'TERMINATED');
                                }
                              }}
                              className="p-1.5 bg-[#16181d] hover:bg-rose-900/40 text-rose-400 border border-gray-700 rounded cursor-pointer"
                              title="Terminate Trade"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cashflow Schedule Modal */}
      {selectedCashflowTrade && (
        <CashflowScheduleModal
          trade={selectedCashflowTrade}
          onClose={() => setSelectedCashflowTrade(null)}
        />
      )}

      {/* XML Modal */}
      {selectedXmlModalTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0f12] border border-gray-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-green-400" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  FpML XML Payload — {selectedXmlModalTrade.tradeId} [{selectedXmlModalTrade.productType}]
                </h3>
              </div>
              <button
                onClick={() => setSelectedXmlModalTrade(null)}
                className="text-gray-400 hover:text-white font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <pre className="text-xs font-mono text-green-400 bg-[#0a0b0d] p-4 rounded overflow-y-auto max-h-[420px] border border-gray-800 leading-relaxed scrollbar-thin">
              {selectedXmlModalTrade.rawXml}
            </pre>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
              <span className="text-gray-400 font-mono">Counterparty: {selectedXmlModalTrade.counterpartyName}</span>
              <button
                onClick={() => setSelectedXmlModalTrade(null)}
                className="py-1.5 px-4 bg-[#16181d] hover:bg-gray-800 text-white border border-gray-700 rounded font-bold uppercase text-[10px] tracking-widest cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
