import React, { useState, useEffect } from 'react';
import { IRSwapTrade, TradeStatus, Currency, DayCountConvention, PaymentFrequency, FloatingIndex, LegType, GenericSwapLeg, IndexTenor, ResetType } from '../types';
import { ChevronDown, ChevronUp, History, Save, X, Layers, Settings, RefreshCw, AlertCircle, CheckCircle2, FileCode, Cpu } from 'lucide-react';
import { getCounterparties } from '../lib/counterpartyStore';
import { generateCashflowSchedule, generateIndependentLeg1Schedule, generateIndependentLeg2Schedule } from '../lib/cashflowGenerator';
import { generateIRSwapXml } from '../lib/xmlParser';
import { PRODUCT_VALUATION_MODELS } from './XmlBooking';

interface TradeAmendmentProps {
  onAmendmentComplete?: (trade: IRSwapTrade) => void;
}

interface TradeVersion {
  version_number: number;
  amended_at: string;
  amended_by: string;
  amendment_reason?: string;
  json_payload: string;
}

export default function TradeAmendment({ onAmendmentComplete }: TradeAmendmentProps) {
  const [tradeId, setTradeId] = useState<string>('');
  const [loadedTrade, setLoadedTrade] = useState<IRSwapTrade | null>(null);
  const [versions, setVersions] = useState<TradeVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<TradeVersion | null>(null);
  const [selectedVersionTrade, setSelectedVersionTrade] = useState<IRSwapTrade | null>(null);
  const [restoredVersionNumber, setRestoredVersionNumber] = useState<number | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [amendmentReason, setAmendmentReason] = useState<string>('');
  const [isAmending, setIsAmending] = useState(false);

  // Amendment form state
  const [amendments, setAmendments] = useState<Partial<IRSwapTrade>>({});

  // Leg 1 State for Amendment
  const [leg1Type, setLeg1Type] = useState<LegType>('FIXED');
  const [leg1Direction, setLeg1Direction] = useState<'PAY' | 'RECEIVE'>('PAY');
  const [leg1Currency, setLeg1Currency] = useState<Currency>('USD');
  const [leg1Notional, setLeg1Notional] = useState<number>(25000000);
  const [leg1FixedRate, setLeg1FixedRate] = useState<number>(3.85);
  const [leg1Index, setLeg1Index] = useState<FloatingIndex>('SOFR');
  const [leg1IndexTenor, setLeg1IndexTenor] = useState<IndexTenor>('3M');
  const [leg1ResetType, setLeg1ResetType] = useState<ResetType>('ADVANCE');
  const [leg1SpreadBps, setLeg1SpreadBps] = useState<number>(0);
  const [leg1DayCount, setLeg1DayCount] = useState<DayCountConvention>('30/360');
  const [leg1Freq, setLeg1Freq] = useState<PaymentFrequency>('6M');

  // Leg 2 State for Amendment
  const [leg2Type, setLeg2Type] = useState<LegType>('FLOATING');
  const [leg2Direction, setLeg2Direction] = useState<'PAY' | 'RECEIVE'>('RECEIVE');
  const [leg2Currency, setLeg2Currency] = useState<Currency>('USD');
  const [leg2Notional, setLeg2Notional] = useState<number>(25000000);
  const [leg2FixedRate, setLeg2FixedRate] = useState<number>(3.85);
  const [leg2Index, setLeg2Index] = useState<FloatingIndex>('SOFR');
  const [leg2IndexTenor, setLeg2IndexTenor] = useState<IndexTenor>('1M');
  const [leg2ResetType, setLeg2ResetType] = useState<ResetType>('ADVANCE');
  const [leg2SpreadBps, setLeg2SpreadBps] = useState<number>(0);
  const [leg2DayCount, setLeg2DayCount] = useState<DayCountConvention>('ACT/360');
  const [leg2Freq, setLeg2Freq] = useState<PaymentFrequency>('3M');

  // Trade Header State for Amendment
  const [counterpartyName, setCounterpartyName] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [maturityDate, setMaturityDate] = useState<string>('');
  const [valuationModel, setValuationModel] = useState<string>('');

  // Pending amendment changes & preview state
  const [hasPendingAmendmentChanges, setHasPendingAmendmentChanges] = useState<boolean>(false);
  const [previewAmendedTrade, setPreviewAmendedTrade] = useState<IRSwapTrade | null>(null);

  const applyAmendmentChanges = (tradeBase?: IRSwapTrade) => {
    const base = tradeBase || loadedTrade;
    if (!base) return;

    const updatedLeg1: GenericSwapLeg = {
      legType: leg1Type,
      direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
      notional: leg1Notional,
      currency: leg1Currency,
      fixedRate: leg1Type === 'FIXED' ? leg1FixedRate : undefined,
      index: leg1Type === 'FLOATING' ? leg1Index : undefined,
      indexTenor: leg1Type === 'FLOATING' ? leg1IndexTenor : undefined,
      resetType: leg1Type === 'FLOATING' ? leg1ResetType : undefined,
      spreadBps: leg1Type === 'FLOATING' ? leg1SpreadBps : undefined,
      dayCount: leg1DayCount,
      frequency: leg1Freq,
      businessDayConvention: 'MODFOLLOWING',
    };

    const updatedLeg2: GenericSwapLeg = {
      legType: leg2Type,
      direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
      notional: leg2Notional,
      currency: leg2Currency,
      fixedRate: leg2Type === 'FIXED' ? leg2FixedRate : undefined,
      index: leg2Type === 'FLOATING' ? leg2Index : undefined,
      indexTenor: leg2Type === 'FLOATING' ? leg2IndexTenor : undefined,
      resetType: leg2Type === 'FLOATING' ? leg2ResetType : undefined,
      spreadBps: leg2Type === 'FLOATING' ? leg2SpreadBps : undefined,
      dayCount: leg2DayCount,
      frequency: leg2Freq,
      businessDayConvention: 'MODFOLLOWING',
    };

    const amendedTradeObj: IRSwapTrade = {
      ...base,
      ...amendments,
      counterpartyName,
      effectiveDate,
      maturityDate,
      valuationModel: valuationModel || base.valuationModel,
      leg1: updatedLeg1,
      leg2: updatedLeg2,
      fixedLeg: {
        direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional: leg1Notional,
        currency: leg1Currency,
        fixedRate: leg1FixedRate,
        dayCount: leg1DayCount,
        frequency: leg1Freq,
        businessDayConvention: 'MODFOLLOWING',
      },
      floatingLeg: {
        direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional: leg2Notional,
        currency: leg2Currency,
        index: leg2Index,
        indexTenor: leg2IndexTenor,
        resetType: leg2ResetType,
        spreadBps: leg2SpreadBps,
        dayCount: leg2DayCount,
        frequency: leg2Freq,
        businessDayConvention: 'MODFOLLOWING',
      },
    };

    setPreviewAmendedTrade(amendedTradeObj);
    setHasPendingAmendmentChanges(false);
  };

  const currentVersion = versions.length + 1;
  const [tradeAction, setTradeAction] = useState<'amend' | 'mature' | 'terminate' | 'cancel'>('amend');

  const populateFormFromTrade = (trade: IRSwapTrade) => {
    setLoadedTrade(trade);
    setCounterpartyName(trade.counterpartyName || '');
    setEffectiveDate(trade.effectiveDate || '');
    setMaturityDate(trade.maturityDate || '');
    const productModels = PRODUCT_VALUATION_MODELS[trade.productType || 'IRS'] || [];
    setValuationModel(trade.valuationModel || (productModels[0]?.id || ''));

    // Populate Leg 1
    if (trade.leg1) {
      setLeg1Type(trade.leg1.legType || 'FIXED');
      setLeg1Direction(trade.leg1.direction === 'PAY_FIXED' ? 'PAY' : trade.leg1.direction === 'RECEIVE_FIXED' ? 'RECEIVE' : (trade.leg1.direction as any) || 'PAY');
      setLeg1Currency(trade.leg1.currency || 'USD');
      setLeg1Notional(trade.leg1.notional || trade.notionalUsd || 25000000);
      setLeg1FixedRate(trade.leg1.fixedRate || trade.parRate || 3.85);
      setLeg1Index(trade.leg1.index || 'SOFR');
      setLeg1IndexTenor(trade.leg1.indexTenor || '3M');
      setLeg1ResetType(trade.leg1.resetType || 'ADVANCE');
      setLeg1SpreadBps(trade.leg1.spreadBps || 0);
      setLeg1DayCount(trade.leg1.dayCount || '30/360');
      setLeg1Freq(trade.leg1.frequency || '6M');
    } else if (trade.fixedLeg) {
      setLeg1Type('FIXED');
      setLeg1Direction(trade.fixedLeg.direction === 'PAY_FIXED' ? 'PAY' : 'RECEIVE');
      setLeg1Currency(trade.fixedLeg.currency || 'USD');
      setLeg1Notional(trade.fixedLeg.notional || trade.notionalUsd || 25000000);
      setLeg1FixedRate(trade.fixedLeg.fixedRate || 3.85);
      setLeg1DayCount(trade.fixedLeg.dayCount || '30/360');
      setLeg1Freq(trade.fixedLeg.frequency || '6M');
    }

    // Populate Leg 2
    if (trade.leg2) {
      setLeg2Type(trade.leg2.legType || 'FLOATING');
      setLeg2Direction(trade.leg2.direction === 'PAY_FIXED' ? 'PAY' : trade.leg2.direction === 'RECEIVE_FIXED' ? 'RECEIVE' : (trade.leg2.direction as any) || 'RECEIVE');
      setLeg2Currency(trade.leg2.currency || trade.fixedLeg?.currency || 'USD');
      setLeg2Notional(trade.leg2.notional || trade.floatingLeg?.notional || 25000000);
      setLeg2FixedRate(trade.leg2.fixedRate || 3.85);
      setLeg2Index(trade.leg2.index || 'SOFR');
      setLeg2IndexTenor(trade.leg2.indexTenor || '1M');
      setLeg2ResetType(trade.leg2.resetType || 'ADVANCE');
      setLeg2SpreadBps(trade.leg2.spreadBps || 0);
      setLeg2DayCount(trade.leg2.dayCount || 'ACT/360');
      setLeg2Freq(trade.leg2.frequency || '3M');
    } else if (trade.floatingLeg) {
      setLeg2Type('FLOATING');
      setLeg2Direction(trade.floatingLeg.direction === 'PAY_FIXED' ? 'PAY' : 'RECEIVE');
      setLeg2Currency(trade.floatingLeg.currency || 'USD');
      setLeg2Notional(trade.floatingLeg.notional || 25000000);
      setLeg2Index(trade.floatingLeg.index || 'SOFR');
      setLeg2IndexTenor(trade.floatingLeg.indexTenor || '3M');
      setLeg2ResetType(trade.floatingLeg.resetType || 'ADVANCE');
      setLeg2SpreadBps(trade.floatingLeg.spreadBps || 0);
      setLeg2DayCount(trade.floatingLeg.dayCount || 'ACT/360');
      setLeg2Freq(trade.floatingLeg.frequency || '3M');
    }

    setAmendments({});
    clearVersionView();
    setRestoredVersionNumber(null);
    applyAmendmentChanges(trade);
  };

  const loadTrade = async () => {
    if (!tradeId.trim()) {
      setError('Please enter a Trade ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/trades/${tradeId}`);
      if (!response.ok) {
        throw new Error(`Trade not found: ${tradeId}`);
      }

      const trade: IRSwapTrade = await response.json();
      populateFormFromTrade(trade);

      // Load versions
      const versionsResponse = await fetch(`/api/trades/${tradeId}/versions`);
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load trade');
      setLoadedTrade(null);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearVersionView = () => {
    setSelectedVersion(null);
    setSelectedVersionTrade(null);
    setRestoredVersionNumber(null);
  };

  const viewVersion = (version: TradeVersion) => {
    setSelectedVersion(version);
    try {
      const verTrade = JSON.parse(version.json_payload) as IRSwapTrade;
      setSelectedVersionTrade(verTrade);
    } catch {
      setSelectedVersionTrade(null);
    }
  };

  const restoreVersionToAmendment = () => {
    if (!selectedVersionTrade) return;
    populateFormFromTrade(selectedVersionTrade);
    setTradeAction('amend');
    setRestoredVersionNumber(selectedVersion?.version_number || null);
    setSuccess(`Loaded version ${selectedVersion?.version_number} parameters into amend workflow.`);
  };

  const submitAmendment = async () => {
    if (!loadedTrade) return;

    if (!amendmentReason.trim()) {
      setError('Please provide a reason for the amendment');
      return;
    }

    setIsAmending(true);
    setError('');

    try {
      let newStatus: TradeStatus = loadedTrade.status;
      if (tradeAction === 'amend') {
        newStatus = 'AMENDED';
      } else if (tradeAction === 'mature') {
        newStatus = 'MATURED';
      } else if (tradeAction === 'terminate') {
        newStatus = 'TERMINATED';
      } else if (tradeAction === 'cancel') {
        newStatus = 'CANCELLED';
      }

      // Construct Updated Leg 1
      const updatedLeg1: GenericSwapLeg = {
        legType: leg1Type,
        direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional: leg1Notional,
        currency: leg1Currency,
        fixedRate: leg1Type === 'FIXED' ? leg1FixedRate : undefined,
        index: leg1Type === 'FLOATING' ? leg1Index : undefined,
        indexTenor: leg1Type === 'FLOATING' ? leg1IndexTenor : undefined,
        resetType: leg1Type === 'FLOATING' ? leg1ResetType : undefined,
        spreadBps: leg1Type === 'FLOATING' ? leg1SpreadBps : undefined,
        dayCount: leg1DayCount,
        frequency: leg1Freq,
        businessDayConvention: 'MODFOLLOWING',
      };

      // Construct Updated Leg 2
      const updatedLeg2: GenericSwapLeg = {
        legType: leg2Type,
        direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
        notional: leg2Notional,
        currency: leg2Currency,
        fixedRate: leg2Type === 'FIXED' ? leg2FixedRate : undefined,
        index: leg2Type === 'FLOATING' ? leg2Index : undefined,
        indexTenor: leg2Type === 'FLOATING' ? leg2IndexTenor : undefined,
        resetType: leg2Type === 'FLOATING' ? leg2ResetType : undefined,
        spreadBps: leg2Type === 'FLOATING' ? leg2SpreadBps : undefined,
        dayCount: leg2DayCount,
        frequency: leg2Freq,
        businessDayConvention: 'MODFOLLOWING',
      };

      const finalAmendments: Partial<IRSwapTrade> = {
        ...amendments,
        counterpartyName,
        effectiveDate,
        maturityDate,
        status: newStatus,
        leg1: updatedLeg1,
        leg2: updatedLeg2,
        fixedLeg: {
          direction: leg1Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional: leg1Notional,
          currency: leg1Currency,
          fixedRate: leg1FixedRate,
          dayCount: leg1DayCount,
          frequency: leg1Freq,
          businessDayConvention: 'MODFOLLOWING',
        },
        floatingLeg: {
          direction: leg2Direction === 'PAY' ? 'PAY_FIXED' : 'RECEIVE_FIXED',
          notional: leg2Notional,
          currency: leg2Currency,
          index: leg2Index,
          indexTenor: leg2IndexTenor,
          resetType: leg2ResetType,
          spreadBps: leg2SpreadBps,
          dayCount: leg2DayCount,
          frequency: leg2Freq,
          businessDayConvention: 'MODFOLLOWING',
        },
      };

      const response = await fetch(`/api/trades/${loadedTrade.tradeId}/amend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amendments: finalAmendments,
          reason: amendmentReason,
          user: { id: 'TRADER_01', name: 'IR Trader' },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to amend trade');
      }

      const amendedTrade = await response.json();
      setSuccess(`Trade ${tradeAction} successful! Status updated to ${newStatus}. New version recorded.`);
      populateFormFromTrade(amendedTrade);
      setAmendmentReason('');
      setTradeAction('amend');

      if (onAmendmentComplete) {
        onAmendmentComplete(amendedTrade);
      }

      // Reload version history
      const versionsResponse = await fetch(`/api/trades/${loadedTrade.tradeId}/versions`);
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to amend trade');
    } finally {
      setIsAmending(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-[#0d0f12] to-slate-900 rounded-xl shadow-2xl p-6 border border-slate-800 text-xs font-sans">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-mono uppercase tracking-wider">
        <span className="p-2 bg-indigo-950 border border-indigo-700/60 rounded-lg text-indigo-400">📋</span>
        Load & Amend Trade (Leg 1 & Leg 2 Flexible Configuration)
      </h2>

      {/* Load Trade Section */}
      <div className="mb-6 border-b border-slate-800 pb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3 font-mono">1. Load Trade by ID</h3>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={tradeId}
            onChange={(e) => {
              setTradeId(e.target.value);
              setError('');
            }}
            placeholder="Enter Trade ID (e.g., IRS-2026-000101)"
            className="flex-1 px-4 py-2.5 bg-[#16181d] border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={loadTrade}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            {loading ? 'Loading...' : 'Load Trade'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-700/60 rounded-lg text-red-300 font-mono">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-lg text-emerald-300 font-mono">
            {success}
          </div>
        )}
      </div>

      {/* Loaded Trade & Amendment Editor */}
      {loadedTrade && (
        <div className="space-y-6">

          {/* Final Status Warning Alert */}
          {(loadedTrade.status === 'TERMINATED' || loadedTrade.status === 'MATURED' || loadedTrade.status === 'CANCELLED') && (
            <div className="p-3 bg-amber-950/60 border border-amber-700/80 rounded-xl text-amber-300 font-mono text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Notice:</strong> Trade <code className="text-white font-bold">{loadedTrade.tradeId}</code> is currently marked as <strong className="text-rose-400">{loadedTrade.status}</strong>. Amendments on final-state trades require re-activation.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAmendments((prev) => ({ ...prev, status: 'AMENDED' }));
                  setLoadedTrade((prev) => prev ? { ...prev, status: 'AMENDED' } : null);
                  setSuccess(`Trade ${loadedTrade.tradeId} status re-activated to AMENDED for edits.`);
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-sans font-bold text-[11px] transition-all cursor-pointer shadow shrink-0"
              >
                Re-activate for Edits
              </button>
            </div>
          )}

          {/* Header Summary Ribbon */}
          <div className="bg-[#12141a] border border-indigo-900/60 rounded-xl p-4 font-mono">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#16181d] p-2.5 rounded-lg border border-slate-800">
                <p className="text-[10px] text-gray-500 uppercase">Trade ID</p>
                <p className="font-bold text-white text-sm mt-0.5">{loadedTrade.tradeId}</p>
              </div>
              <div className="bg-[#16181d] p-2.5 rounded-lg border border-slate-800">
                <p className="text-[10px] text-gray-500 uppercase">Product Type</p>
                <p className="font-bold text-indigo-400 text-sm mt-0.5">{loadedTrade.productType}</p>
              </div>
              <div className="bg-[#16181d] p-2.5 rounded-lg border border-slate-800">
                <p className="text-[10px] text-gray-500 uppercase">Status</p>
                <p className={`font-bold text-sm mt-0.5 ${loadedTrade.status === 'BOOKED' ? 'text-emerald-400' :
                  loadedTrade.status === 'CONFIRMED' ? 'text-blue-400' :
                    loadedTrade.status === 'AMENDED' ? 'text-amber-400' :
                      'text-rose-400'
                  }`}>{loadedTrade.status}</p>
              </div>
              <div className="bg-[#16181d] p-2.5 rounded-lg border border-slate-800">
                <p className="text-[10px] text-gray-500 uppercase">Version</p>
                <p className="font-bold text-indigo-300 text-sm mt-0.5">v{currentVersion}</p>
              </div>
              <div className="bg-[#16181d] p-2.5 rounded-lg border border-slate-800 sm:col-span-2">
                <p className="text-[10px] text-gray-500 uppercase">Counterparty</p>
                <p className="font-bold text-white text-sm truncate mt-0.5">{counterpartyName}</p>
              </div>
            </div>
          </div>

          {/* Action Selector Bar */}
          <div className="bg-[#12141a] p-4 border border-slate-800 rounded-xl space-y-3 font-mono">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Select Lifecycle Action <span className="text-rose-400">*</span>
              </label>
              {restoredVersionNumber && (
                <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold">
                  Restored from Version v{restoredVersionNumber}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setTradeAction('amend')}
                className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${tradeAction === 'amend' ? 'bg-indigo-600 text-white shadow' : 'bg-[#16181d] text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Amend Trade Fields
              </button>
              <button
                onClick={() => setTradeAction('mature')}
                className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${tradeAction === 'mature' ? 'bg-blue-600 text-white shadow' : 'bg-[#16181d] text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Mark Matured
              </button>
              <button
                onClick={() => setTradeAction('terminate')}
                className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${tradeAction === 'terminate' ? 'bg-amber-600 text-white shadow' : 'bg-[#16181d] text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Terminate Trade
              </button>
              <button
                onClick={() => setTradeAction('cancel')}
                className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${tradeAction === 'cancel' ? 'bg-rose-600 text-white shadow' : 'bg-[#16181d] text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Cancel Trade
              </button>
            </div>
          </div>

          {/* Form Fields for Amending Trade */}
          {tradeAction === 'amend' && (
            <div className="space-y-6">

              {/* Trade General Header Parameters */}
              <div className="bg-[#12141a] p-4 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest font-mono border-b border-slate-800 pb-2">
                  General Trade Parameters
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Counterparty Name</label>
                    <input
                      type="text"
                      value={counterpartyName}
                      onChange={(e) => setCounterpartyName(e.target.value)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Pay / Receive Structure</label>
                    <select
                      value={
                        leg1Type === 'FLOATING' && leg2Type === 'FLOATING'
                          ? (leg1Direction === 'PAY' ? 'PAY_FLOAT_REC_FLOAT' : 'REC_FLOAT_PAY_FLOAT')
                          : (leg1Direction === 'PAY' && leg1Type === 'FIXED' ? 'PAY_FIXED' : leg1Direction === 'PAY' && leg1Type === 'FLOATING' ? 'PAY_FLOAT_REC_FIXED' : 'RECEIVE_FIXED')
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'PAY_FIXED') {
                          setLeg1Type('FIXED');
                          setLeg1Direction('PAY');
                          setLeg2Type('FLOATING');
                          setLeg2Direction('RECEIVE');
                        } else if (val === 'RECEIVE_FIXED') {
                          setLeg1Type('FIXED');
                          setLeg1Direction('RECEIVE');
                          setLeg2Type('FLOATING');
                          setLeg2Direction('PAY');
                        } else if (val === 'PAY_FLOAT_REC_FLOAT') {
                          setLeg1Type('FLOATING');
                          setLeg1Direction('PAY');
                          setLeg2Type('FLOATING');
                          setLeg2Direction('RECEIVE');
                        } else if (val === 'REC_FLOAT_PAY_FLOAT') {
                          setLeg1Type('FLOATING');
                          setLeg1Direction('RECEIVE');
                          setLeg2Type('FLOATING');
                          setLeg2Direction('PAY');
                        } else if (val === 'PAY_FLOAT_REC_FIXED') {
                          setLeg1Type('FLOATING');
                          setLeg1Direction('PAY');
                          setLeg2Type('FIXED');
                          setLeg2Direction('RECEIVE');
                        }
                      }}
                      className="w-full bg-[#16181d] border border-amber-600 rounded p-2 text-sm text-white font-mono font-bold cursor-pointer"
                    >
                      <option value="PAY_FIXED">PAY FIXED / RECEIVE FLOAT (Pay Fixed L1 / Rec Float L2)</option>
                      <option value="RECEIVE_FIXED">RECEIVE FIXED / PAY FLOAT (Rec Fixed L1 / Pay Float L2)</option>
                      <option value="PAY_FLOAT_REC_FLOAT">⚡ PAY FLOAT / RECEIVE FLOAT (Float/Float Basis Swap)</option>
                      <option value="REC_FLOAT_PAY_FLOAT">⚡ RECEIVE FLOAT / PAY FLOAT (Float/Float Basis Swap)</option>
                      <option value="PAY_FLOAT_REC_FIXED">PAY FLOAT / RECEIVE FIXED (Pay Float L1 / Rec Fixed L2)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Effective Date</label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Maturity Date</label>
                    <input
                      type="date"
                      value={maturityDate}
                      onChange={(e) => setMaturityDate(e.target.value)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-4 bg-[#16181d] p-3 rounded-lg border border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-indigo-300 font-mono">Pricing & Valuation Model</label>
                        <p className="text-[11px] text-gray-400 font-sans">Select quantitative pricing model used to revalue this {loadedTrade?.productType} trade.</p>
                      </div>
                    </div>
                    <select
                      value={valuationModel}
                      onChange={(e) => setValuationModel(e.target.value)}
                      className="w-full sm:w-auto bg-[#0d0f12] border border-indigo-600 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      {(PRODUCT_VALUATION_MODELS[loadedTrade?.productType || 'IRS'] || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* LEG 1 CONFIGURATION CARD */}
              <div className="bg-[#12141a] p-4 border border-blue-900/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> Leg 1 Parameters (Fixed or Float)
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400">
                    Configured as: <strong className="text-blue-300">{leg1Type} LEG</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                  {/* Leg 1 Type */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leg 1 Type</label>
                    <select
                      value={leg1Type}
                      onChange={(e) => setLeg1Type(e.target.value as LegType)}
                      className="w-full bg-[#16181d] border border-blue-600 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="FIXED">FIXED RATE LEG</option>
                      <option value="FLOATING">FLOATING INDEX LEG</option>
                    </select>
                  </div>

                  {/* Leg 1 Direction */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Direction</label>
                    <select
                      value={leg1Direction}
                      onChange={(e) => setLeg1Direction(e.target.value as 'PAY' | 'RECEIVE')}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="PAY">PAY</option>
                      <option value="RECEIVE">RECEIVE</option>
                    </select>
                  </div>

                  {/* Leg 1 Currency */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Currency</label>
                    <select
                      value={leg1Currency}
                      onChange={(e) => setLeg1Currency(e.target.value as Currency)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="CHF">CHF (Fr)</option>
                    </select>
                  </div>

                  {/* Leg 1 Notional */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Notional ({leg1Currency})</label>
                    <input
                      type="number"
                      step="100000"
                      value={leg1Notional}
                      onChange={(e) => setLeg1Notional(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  {/* Fixed Rate (if Leg 1 is FIXED) */}
                  {leg1Type === 'FIXED' && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leg 1 Fixed Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={leg1FixedRate}
                        onChange={(e) => setLeg1FixedRate(Number(e.target.value))}
                        className="w-full bg-[#16181d] border border-blue-500 rounded p-2 text-sm text-white font-mono font-bold"
                      />
                    </div>
                  )}

                  {/* Benchmark Index (if Leg 1 is FLOATING) */}
                  {leg1Type === 'FLOATING' && (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 1 Benchmark Index</label>
                        <select
                          value={leg1Index}
                          onChange={(e) => setLeg1Index(e.target.value as FloatingIndex)}
                          className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-mono font-bold"
                        >
                          <option value="SOFR">SOFR</option>
                          <option value="EURIBOR">EURIBOR</option>
                          <option value="SONIA">SONIA</option>
                          <option value="TONA">TONA</option>
                          <option value="LIBOR-3M">LIBOR-3M</option>
                        </select>
                      </div>

                      {/* Leg 1 Index Tenor */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 1 Index Tenor</label>
                        <select
                          value={leg1IndexTenor}
                          onChange={(e) => setLeg1IndexTenor(e.target.value as IndexTenor)}
                          className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-mono font-bold"
                        >
                          <option value="1D">1D (1 Day)</option>
                          <option value="1M">1M (1 Month)</option>
                          <option value="3M">3M (3 Months)</option>
                          <option value="6M">6M (6 Months)</option>
                          <option value="12M">12M (1 Year)</option>
                          <option value="2Y">2Y (2 Years)</option>
                          <option value="5Y">5Y (5 Years)</option>
                          <option value="10Y">10Y (10 Years)</option>
                          <option value="20Y">20Y (20 Years)</option>
                          <option value="30Y">30Y (30 Years)</option>
                        </select>
                      </div>

                      {/* Leg 1 Reset Type */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 1 Reset Type</label>
                        <select
                          value={leg1ResetType}
                          onChange={(e) => setLeg1ResetType(e.target.value as ResetType)}
                          className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-mono font-bold"
                        >
                          <option value="ADVANCE">IN ADVANCE (Start of Period)</option>
                          <option value="ARREARS">IN ARREARS (End of Period)</option>
                        </select>
                      </div>

                      {/* Leg 1 Spread Bps */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Spread (Bps)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leg1SpreadBps}
                          onChange={(e) => setLeg1SpreadBps(Number(e.target.value))}
                          className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono"
                        />
                      </div>
                    </>
                  )}

                  {/* Leg 1 Day Count */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Day Count</label>
                    <select
                      value={leg1DayCount}
                      onChange={(e) => setLeg1DayCount(e.target.value as DayCountConvention)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="30/360">30/360</option>
                      <option value="ACT/360">ACT/360</option>
                      <option value="ACT/365">ACT/365</option>
                      <option value="ACT/ACT">ACT/ACT</option>
                    </select>
                  </div>

                  {/* Leg 1 Payment Frequency */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 1 Frequency</label>
                    <select
                      value={leg1Freq}
                      onChange={(e) => setLeg1Freq(e.target.value as PaymentFrequency)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="1D">Daily (1D)</option>
                      <option value="1M">Monthly (1M)</option>
                      <option value="3M">Quarterly (3M)</option>
                      <option value="6M">Semi-Annually (6M)</option>
                      <option value="1Y">Annually (1Y)</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* LEG 2 CONFIGURATION CARD */}
              <div className="bg-[#12141a] p-4 border border-amber-900/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" /> Leg 2 Parameters (Fixed or Float Basis Swap)
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400">
                    Configured as: <strong className="text-amber-300">{leg2Type} LEG</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                  {/* Leg 2 Type */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Type</label>
                    <select
                      value={leg2Type}
                      onChange={(e) => setLeg2Type(e.target.value as LegType)}
                      className="w-full bg-[#16181d] border border-amber-600 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="FLOATING">FLOATING INDEX LEG</option>
                      <option value="FIXED">FIXED RATE LEG</option>
                    </select>
                  </div>

                  {/* Leg 2 Direction */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Direction</label>
                    <select
                      value={leg2Direction}
                      onChange={(e) => setLeg2Direction(e.target.value as 'PAY' | 'RECEIVE')}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="RECEIVE">RECEIVE</option>
                      <option value="PAY">PAY</option>
                    </select>
                  </div>

                  {/* Leg 2 Currency */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Currency</label>
                    <select
                      value={leg2Currency}
                      onChange={(e) => setLeg2Currency(e.target.value as Currency)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="CHF">CHF (Fr)</option>
                    </select>
                  </div>

                  {/* Leg 2 Notional */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Notional ({leg2Currency})</label>
                    <input
                      type="number"
                      step="100000"
                      value={leg2Notional}
                      onChange={(e) => setLeg2Notional(Number(e.target.value))}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  {/* Fixed Rate (if Leg 2 is FIXED) */}
                  {leg2Type === 'FIXED' && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Leg 2 Fixed Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={leg2FixedRate}
                        onChange={(e) => setLeg2FixedRate(Number(e.target.value))}
                        className="w-full bg-[#16181d] border border-blue-500 rounded p-2 text-sm text-white font-mono font-bold"
                      />
                    </div>
                  )}

                  {/* Benchmark Index (if Leg 2 is FLOATING) */}
                  {leg2Type === 'FLOATING' && (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Benchmark Index</label>
                        <select
                          value={leg2Index}
                          onChange={(e) => setLeg2Index(e.target.value as FloatingIndex)}
                          className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-mono font-bold"
                        >
                          <option value="SOFR">SOFR</option>
                          <option value="EURIBOR">EURIBOR</option>
                          <option value="SONIA">SONIA</option>
                          <option value="TONA">TONA</option>
                          <option value="LIBOR-3M">LIBOR-3M</option>
                        </select>
                      </div>

                      {/* Leg 2 Index Tenor */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Index Tenor</label>
                        <select
                          value={leg2IndexTenor}
                          onChange={(e) => setLeg2IndexTenor(e.target.value as IndexTenor)}
                          className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-mono font-bold"
                        >
                          <option value="1D">1D (1 Day)</option>
                          <option value="1M">1M (1 Month)</option>
                          <option value="3M">3M (3 Months)</option>
                          <option value="6M">6M (6 Months)</option>
                          <option value="12M">12M (1 Year)</option>
                          <option value="2Y">2Y (2 Years)</option>
                          <option value="5Y">5Y (5 Years)</option>
                          <option value="10Y">10Y (10 Years)</option>
                          <option value="20Y">20Y (20 Years)</option>
                          <option value="30Y">30Y (30 Years)</option>
                        </select>
                      </div>

                      {/* Leg 2 Reset Type */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Leg 2 Reset Type</label>
                        <select
                          value={leg2ResetType}
                          onChange={(e) => setLeg2ResetType(e.target.value as ResetType)}
                          className="w-full bg-[#16181d] border border-amber-500 rounded p-2 text-sm text-white font-mono font-bold"
                        >
                          <option value="ADVANCE">IN ADVANCE (Start of Period)</option>
                          <option value="ARREARS">IN ARREARS (End of Period)</option>
                        </select>
                      </div>

                      {/* Leg 2 Spread Bps */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Spread (Bps)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={leg2SpreadBps}
                          onChange={(e) => setLeg2SpreadBps(Number(e.target.value))}
                          className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono"
                        />
                      </div>
                    </>
                  )}

                  {/* Leg 2 Day Count */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Day Count</label>
                    <select
                      value={leg2DayCount}
                      onChange={(e) => setLeg2DayCount(e.target.value as DayCountConvention)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono"
                    >
                      <option value="ACT/360">ACT/360</option>
                      <option value="30/360">30/360</option>
                      <option value="ACT/365">ACT/365</option>
                      <option value="ACT/ACT">ACT/ACT</option>
                    </select>
                  </div>

                  {/* Leg 2 Payment Frequency */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Leg 2 Frequency</label>
                    <select
                      value={leg2Freq}
                      onChange={(e) => setLeg2Freq(e.target.value as PaymentFrequency)}
                      className="w-full bg-[#16181d] border border-slate-700 rounded p-2 text-sm text-white font-mono font-bold"
                    >
                      <option value="1D">Daily (1D)</option>
                      <option value="1M">Monthly (1M)</option>
                      <option value="3M">Quarterly (3M)</option>
                      <option value="6M">Semi-Annually (6M)</option>
                      <option value="1Y">Annually (1Y)</option>
                    </select>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* Action Status Notice */}
          {tradeAction === 'mature' && (
            <div className="p-4 bg-blue-950/40 border border-blue-700/60 rounded-xl text-blue-300 font-mono">
              ✓ Trade status will be updated to <strong>MATURED</strong>.
            </div>
          )}

          {tradeAction === 'terminate' && (
            <div className="p-4 bg-amber-950/40 border border-amber-700/60 rounded-xl text-amber-300 font-mono">
              ✓ Trade status will be updated to <strong>TERMINATED</strong>.
            </div>
          )}

          {tradeAction === 'cancel' && (
            <div className="p-4 bg-rose-950/40 border border-rose-700/60 rounded-xl text-rose-300 font-mono">
              ✓ Trade status will be updated to <strong>CANCELLED</strong>.
            </div>
          )}

          {/* Apply Changes & Recalculate Amendment Schedule Bar */}
          <div className="bg-[#0f1422] border border-indigo-900/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border ${hasPendingAmendmentChanges ? 'bg-amber-950/80 text-amber-400 border-amber-700/80 animate-pulse' : 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80'}`}>
                <RefreshCw className={`w-5 h-5 ${hasPendingAmendmentChanges ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Amendment Schedule Synchronization
                  {hasPendingAmendmentChanges ? (
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] rounded border border-amber-700 font-sans font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" /> Unapplied Changes
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] rounded border border-emerald-700 font-sans font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Schedule Applied
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                  {hasPendingAmendmentChanges
                    ? 'Amended parameters modified (e.g. Fixed Rate, Spread, Notionals). Click Apply Changes to recalculate amendment flow schedule.'
                    : 'Amendment parameters are fully synchronized with the flow schedule preview.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => applyAmendmentChanges()}
              className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg w-full sm:w-auto ${hasPendingAmendmentChanges
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 text-white border border-indigo-400 animate-pulse'
                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80'
                }`}
            >
              <RefreshCw className="w-4 h-4" />
              {hasPendingAmendmentChanges ? '⚡ Apply Changes & Update Schedule' : '✓ Re-Apply Changes'}
            </button>
          </div>

          {/* LIVE AMENDED CASHFLOW SCHEDULE PREVIEW */}
          {previewAmendedTrade && (
            <div className="bg-[#090b10] border border-indigo-900/60 rounded-xl p-4 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Live Amended Cashflow Schedule Preview ({previewAmendedTrade.tradeId})
                </h4>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-bold">
                  {tradeAction.toUpperCase()} PREVIEW
                </span>
              </div>

              {/* Leg 1 & Leg 2 Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#121624] p-3 rounded-lg border border-blue-900/50">
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Leg 1 Parameter Summary</span>
                  <div className="mt-1 space-y-0.5 text-[11px] text-gray-300">
                    <div>Type: <strong className="text-white">{leg1Type}</strong> ({leg1Direction})</div>
                    <div>Notional: <strong className="text-white">${leg1Notional.toLocaleString()} {leg1Currency}</strong></div>
                    {leg1Type === 'FIXED' ? (
                      <div>Fixed Rate: <strong className="text-blue-300 font-bold text-xs">{leg1FixedRate}%</strong></div>
                    ) : (
                      <div>Index: <strong className="text-amber-300">{leg1Index} {leg1IndexTenor}</strong> (+{leg1SpreadBps} bps)</div>
                    )}
                    <div>Freq & DayCount: <strong className="text-white">{leg1Freq} | {leg1DayCount}</strong></div>
                  </div>
                </div>

                <div className="bg-[#121624] p-3 rounded-lg border border-indigo-900/50">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Leg 2 Parameter Summary</span>
                  <div className="mt-1 space-y-0.5 text-[11px] text-gray-300">
                    <div>Type: <strong className="text-white">{leg2Type}</strong> ({leg2Direction})</div>
                    <div>Notional: <strong className="text-white">${leg2Notional.toLocaleString()} {leg2Currency}</strong></div>
                    {leg2Type === 'FIXED' ? (
                      <div>Fixed Rate: <strong className="text-blue-300 font-bold text-xs">{leg2FixedRate}%</strong></div>
                    ) : (
                      <div>Index: <strong className="text-amber-300">{leg2Index} {leg2IndexTenor}</strong> (+{leg2SpreadBps} bps)</div>
                    )}
                    <div>Freq & DayCount: <strong className="text-white">{leg2Freq} | {leg2DayCount}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Amendment Reason Box */}
          <div className="bg-[#12141a] p-4 border border-slate-800 rounded-xl space-y-2 font-mono">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              Amendment Audit Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
              placeholder="Provide reason for trade parameter modification..."
              className="w-full bg-[#16181d] border border-slate-700 rounded-lg p-3 text-sm text-white font-mono placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={submitAmendment}
            disabled={isAmending}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            {isAmending ? 'Saving Amendment...' : `Submit ${tradeAction.toUpperCase()} & Record Version`}
          </button>

          {/* Version History Drawer */}
          <div className="bg-[#12141a] border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="flex items-center justify-between w-full font-bold text-indigo-300 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Audit Trail & Version History ({versions.length} versions)
              </span>
              {showVersions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showVersions && (
              <div className="space-y-3 pt-2">
                {versions.length === 0 ? (
                  <p className="text-gray-500 text-xs">No prior amendments recorded.</p>
                ) : (
                  versions.map((ver) => (
                    <div key={ver.version_number} className="bg-[#16181d] p-3 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-indigo-300">Version v{ver.version_number}</span>
                        <span className="text-gray-500">{new Date(ver.amended_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-300 text-[11px]">Amended by: <strong className="text-white">{ver.amended_by}</strong></p>
                      {ver.amendment_reason && (
                        <p className="text-gray-400 text-[11px]">Reason: <em>"{ver.amendment_reason}"</em></p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => viewVersion(ver)}
                          className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded text-[10px] font-bold cursor-pointer"
                        >
                          View Version Snapshot
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Version Comparison Modal View */}
            {selectedVersionTrade && selectedVersion && (
              <div className="mt-4 p-4 bg-[#0a0b0d] border border-indigo-700/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-indigo-300 text-xs">
                    Snapshot: Version v{selectedVersion.version_number} ({selectedVersionTrade.status})
                  </h5>
                  <div className="flex gap-2">
                    <button
                      onClick={restoreVersionToAmendment}
                      className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold cursor-pointer"
                    >
                      Restore Parameters to Form
                    </button>
                    <button
                      onClick={clearVersionView}
                      className="p-1 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 bg-[#16181d] rounded border border-slate-800">
                    <span className="text-gray-500 block">Leg 1</span>
                    <strong className="text-white">
                      {selectedVersionTrade.leg1?.legType || 'FIXED'} — {selectedVersionTrade.leg1?.currency || 'USD'} {selectedVersionTrade.leg1?.notional?.toLocaleString() || ''}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#16181d] rounded border border-slate-800">
                    <span className="text-gray-500 block">Leg 2</span>
                    <strong className="text-white">
                      {selectedVersionTrade.leg2?.legType || 'FLOATING'} — {selectedVersionTrade.leg2?.index || 'SOFR'} ({selectedVersionTrade.leg2?.indexTenor || '3M'})
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
