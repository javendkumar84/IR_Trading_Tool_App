import React, { useState } from 'react';
import {
  Sparkles, Mic, Send, CheckCircle2, ArrowRight, Bot, User, FileCode, RefreshCw, Volume2, ShieldCheck, Flame, ShieldAlert, Layers
} from 'lucide-react';
import { IRSwapTrade, ProductType } from '../types';

interface AiTradeAssistantTerminalProps {
  onTradeBooked?: (trade: IRSwapTrade) => void;
  onOpenBlotter?: () => void;
}

export const AiTradeAssistantTerminal: React.FC<AiTradeAssistantTerminalProps> = ({
  onTradeBooked,
  onOpenBlotter,
}) => {
  const [inputText, setInputText] = useState<string>('Book a $50M 5Y USD SOFR pay fixed 3.42% vs float starting next Monday with BNP Paribas');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedTrade, setParsedTrade] = useState<IRSwapTrade | null>(null);
  const [bookedStatus, setBookedStatus] = useState<boolean>(false);

  const samplePrompts = [
    { label: 'IRS Swap', text: 'Book a $50M 5Y USD SOFR pay fixed 3.42% vs float with BNP Paribas' },
    { label: 'Swaption', text: 'Book a $25M 1Yx5Y Payer Swaption strike 3.85% premium $125k with Goldman Sachs' },
    { label: 'Cap / Floor', text: 'Book a €50M 3Y EURIBOR Cap strike 3.50% premium 45 bps with Barclays Bank' },
    { label: 'FRA Trade', text: 'Book a $30M 3x6 FRA fixed 4.10% vs 3M SOFR with Citigroup' },
    { label: 'Bond', text: 'Book a $10M 10Y US Treasury Bond yield 4.25% coupon 4.0% with JPMorgan' },
    { label: 'Range Accrual', text: 'Book a $15M 5Y Range Accrual 3.5% - 4.5% SOFR Corridor with Deutsche Bank' },
  ];

  const handleParseText = (textToParse: string) => {
    setIsProcessing(true);
    setBookedStatus(false);

    setTimeout(() => {
      const lower = textToParse.toLowerCase();

      // 1. Detect Product Type
      let detectedProductType: ProductType = 'IRS';
      if (lower.includes('swaption') || lower.includes('payer swaption') || lower.includes('receiver swaption')) {
        detectedProductType = 'SWAPTION';
      } else if (lower.includes('cap') || lower.includes('floor') || lower.includes('caplet') || lower.includes('floorlet')) {
        detectedProductType = 'CAP_FLOOR';
      } else if (lower.includes('fra') || lower.includes('forward rate agreement') || lower.includes('3x6') || lower.includes('6x12')) {
        detectedProductType = 'FRA';
      } else if (lower.includes('bond') || lower.includes('treasury') || lower.includes('gilt') || lower.includes('bund')) {
        detectedProductType = 'BOND';
      } else if (lower.includes('range accrual') || lower.includes('corridor')) {
        detectedProductType = 'RANGE_ACCRUAL';
      } else if (lower.includes('snow range') || lower.includes('snowrange')) {
        detectedProductType = 'SNOW_RANGE';
      } else if (lower.includes('tarn') || lower.includes('target redemption')) {
        detectedProductType = 'TARN';
      } else if (lower.includes('snowball')) {
        detectedProductType = 'SNOWBALL';
      } else if (lower.includes('dual digital')) {
        detectedProductType = 'DUAL_DIGITAL';
      } else if (lower.includes('fx forward') || lower.includes('forward points')) {
        detectedProductType = 'FX_FORWARD';
      } else if (lower.includes('fx option')) {
        detectedProductType = 'FX_OPTION';
      } else if (lower.includes('deposit')) {
        detectedProductType = 'DEPOSIT';
      } else if (lower.includes('repo')) {
        detectedProductType = 'REPO';
      }

      // 2. Currency
      let ccy: any = 'USD';
      if (lower.includes('eur') || lower.includes('€')) ccy = 'EUR';
      else if (lower.includes('gbp') || lower.includes('£')) ccy = 'GBP';
      else if (lower.includes('jpy') || lower.includes('¥')) ccy = 'JPY';
      else if (lower.includes('inr') || lower.includes('₹')) ccy = 'INR';

      // 3. Notional
      let notional = 50000000;
      const notionalMatch = textToParse.match(/(\$|€|£|¥|₹)?\s*(\d+(\.\d+)?)\s*(m|mn|million|cr|k)/i);
      if (notionalMatch) {
        const val = parseFloat(notionalMatch[2]);
        const unit = notionalMatch[4].toLowerCase();
        if (unit.startsWith('m')) notional = val * 1000000;
        else if (unit.startsWith('c')) notional = val * 10000000; // 1 Cr = 10M
        else if (unit.startsWith('k')) notional = val * 1000;
      }

      // 4. Direction
      const direction = (lower.includes('receive') || lower.includes('sell')) ? 'RECEIVE_FIXED' : 'PAY_FIXED';

      // 5. Rate / Strike / Yield
      let fixedRate = 3.42;
      const rateMatch = textToParse.match(/(\d+(\.\d+)?)\s*%/);
      if (rateMatch) fixedRate = parseFloat(rateMatch[1]);
      else {
        const strikeMatch = textToParse.match(/strike\s*(\d+(\.\d+)?)/i);
        if (strikeMatch) fixedRate = parseFloat(strikeMatch[1]);
      }

      // 6. Floating Index
      let index: any = 'SOFR';
      if (lower.includes('euribor')) index = 'EURIBOR';
      else if (lower.includes('sonia')) index = 'SONIA';
      else if (lower.includes('mibor')) index = 'MIBOR';

      // 7. Counterparty
      let counterparty = 'BNP Paribas S.A.';
      if (lower.includes('goldman')) counterparty = 'Goldman Sachs International';
      else if (lower.includes('deutsche')) counterparty = 'Deutsche Bank AG';
      else if (lower.includes('barclays')) counterparty = 'Barclays Bank PLC';
      else if (lower.includes('jpmorgan') || lower.includes('jpm')) counterparty = 'JPMorgan Chase Bank N.A.';
      else if (lower.includes('citi')) counterparty = 'Citigroup Global Markets';

      // 8. Product-Specific Fields
      let swaptionDetails;
      let capFloorDetails;

      if (detectedProductType === 'SWAPTION') {
        swaptionDetails = {
          swaptionType: lower.includes('receiver') ? 'RECEIVER' : 'PAYER',
          direction: lower.includes('sell') ? 'SELL' : 'BUY',
          strikeRate: fixedRate,
          optionExpiryDate: '2027-09-08',
          underlyingTenor: '5Y' as any,
          settlementType: 'CASH' as any,
          premiumAmount: Math.round(notional * 0.005),
          underlyingIndex: index,
          dayCount: '30/360' as any,
        };
      } else if (detectedProductType === 'CAP_FLOOR') {
        capFloorDetails = {
          capFloorType: lower.includes('floor') ? 'FLOOR' : 'CAP',
          direction: lower.includes('sell') ? 'SELL' : 'BUY',
          strikeRate: fixedRate,
          underlyingIndex: index,
          indexTenor: '3M' as any,
          currency: ccy,
          notional,
          premiumAmount: Math.round(notional * 0.0035),
          paymentFrequency: '3M' as any,
          dayCount: 'ACT/360' as any,
        };
      }

      const pfx = detectedProductType === 'SWAPTION' ? 'SWP' : detectedProductType === 'CAP_FLOOR' ? 'CAP' : detectedProductType === 'FRA' ? 'FRA' : detectedProductType === 'BOND' ? 'BND' : detectedProductType === 'RANGE_ACCRUAL' ? 'RGA' : 'IRS';
      const tradeId = `${pfx}-2026-AI${Math.floor(1000 + Math.random() * 9000)}`;

      const newTrade: IRSwapTrade = {
        tradeId,
        productType: detectedProductType,
        status: 'BOOKED',
        tradeDate: new Date().toISOString().split('T')[0],
        effectiveDate: '2026-09-08',
        maturityDate: '2031-09-08',
        traderUser: 'J. Doe (Head Rates Trader)',
        counterparty,
        book: detectedProductType === 'BOND' ? 'BOND-TRADING-DESK' : detectedProductType === 'SWAPTION' ? 'EXOTICS-DESK' : 'RATES-OIS-BOOK',
        fixedLeg: {
          direction,
          notional,
          currency: ccy,
          fixedRate,
          dayCount: ccy === 'EUR' || ccy === 'USD' ? '30/360' : 'ACT/365',
          frequency: '1Y',
          businessDayConvention: 'MODFOLLOWING',
        },
        floatingLeg: {
          direction: direction === 'PAY_FIXED' ? 'RECEIVE_FIXED' : 'PAY_FIXED',
          notional,
          currency: ccy,
          index,
          indexTenor: index === 'SOFR' || index === 'SONIA' ? '1D' : '6M',
          spreadBps: 0,
          dayCount: 'ACT/360',
          frequency: index === 'SOFR' ? '1Y' : '6M',
          businessDayConvention: 'MODFOLLOWING',
        },
        swaptionDetails,
        capFloorDetails,
        pv: Math.round(notional * 0.0015),
        dv01: Math.round(notional * (detectedProductType === 'FRA' ? 0.0001 : 0.00046)),
      };

      setParsedTrade(newTrade);
      setIsProcessing(false);
    }, 600);
  };

  const handleConfirmBooking = () => {
    if (!parsedTrade) return;
    if (onTradeBooked) onTradeBooked(parsedTrade);
    setBookedStatus(true);
  };

  const getProductTypeLabel = (pType: ProductType) => {
    switch (pType) {
      case 'SWAPTION': return 'Swaption (Option on Swap)';
      case 'CAP_FLOOR': return 'Interest Rate Cap / Floor';
      case 'FRA': return 'Forward Rate Agreement (FRA)';
      case 'BOND': return 'Government / Corporate Bond';
      case 'RANGE_ACCRUAL': return 'Range Accrual Corridor';
      case 'SNOW_RANGE': return 'Snow Range Structured Note';
      case 'TARN': return 'Target Redemption Note (TARN)';
      case 'SNOWBALL': return 'Snowball Swap';
      case 'DUAL_DIGITAL': return 'Dual Digital Option';
      case 'FX_FORWARD': return 'FX Forward';
      case 'FX_OPTION': return 'FX Option';
      case 'DEPOSIT': return 'Money Market Deposit';
      case 'REPO': return 'Repo / Reverse Repo';
      default: return 'Interest Rate Swap (IRS)';
    }
  };

  return (
    <div id="ai-trade-assistant-terminal-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0284c7]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#0284c7]/20 text-[#0284c7] rounded-lg border border-[#0284c7]/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                AI Voice & Multi-Product Natural Language Capture Assistant
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0284c7]/10 border border-[#0284c7]/30 text-[#0284c7]">
                MULTI-PRODUCT INTENT RECOGNITION (14 DERIVATIVES)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supports IRS, Swaptions, Caps/Floors, FRAs, Bonds, Range Accruals, TARNs, and FX Forwards with instant intent classification.
            </p>
          </div>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Prompt & Voice Input Box */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#0284c7]" />
                <h3 className="text-sm font-bold text-white">Trader Natural Language Terminal</h3>
              </div>
              
              {/* Mic Recording Toggle Button */}
              <button
                onClick={() => {
                  setIsRecording(!isRecording);
                  if (!isRecording) {
                    setTimeout(() => {
                      setIsRecording(false);
                      handleParseText(inputText);
                    }, 2500);
                  }
                }}
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-500 text-white border-red-400 animate-pulse'
                    : 'bg-[#0f172a] text-slate-300 border-[#334155] hover:text-white hover:border-[#0284c7]'
                }`}
                title="Simulate Speech-to-Text Recording"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Input Box */}
            <div className="mt-4 space-y-3">
              <label className="text-xs text-slate-300 font-medium block">
                Type or paste execution voice note across any product type:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={4}
                className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg p-3 text-xs font-mono focus:border-[#0284c7] focus:outline-none"
                placeholder="e.g. Book a $25M 1Yx5Y Payer Swaption strike 3.85% with Goldman Sachs..."
              />
            </div>

            {/* Multi-Product Sample Prompts Grid */}
            <div className="mt-4 space-y-2">
              <span className="text-[11px] text-slate-400 font-medium">Try Multi-Product Trader Voice Notes:</span>
              <div className="grid grid-cols-2 gap-2">
                {samplePrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(item.text);
                      handleParseText(item.text);
                    }}
                    className="p-2 rounded-lg bg-[#0f172a] hover:bg-[#1f293d] border border-[#334155] text-[11px] text-left transition-colors cursor-pointer space-y-0.5"
                  >
                    <span className="text-[#0284c7] font-bold block">{item.label}</span>
                    <span className="text-slate-400 font-mono text-[10px] block truncate">"{item.text}"</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parse Button */}
          <button
            onClick={() => handleParseText(inputText)}
            disabled={isProcessing}
            className="w-full py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-4"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Classifying Intent & Extracting Product Attributes...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Parse & Extract Trade Ticket with AI
              </>
            )}
          </button>
        </div>

        {/* Right Col: Parsed Trade Ticket Preview */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#0284c7]" />
                <h3 className="text-sm font-bold text-white">Parsed AI Trade Ticket Preview</h3>
              </div>
              {parsedTrade && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PRODUCT CLASSIFIED: {parsedTrade.productType}
                </span>
              )}
            </div>

            {parsedTrade ? (
              <div className="mt-4 space-y-4">
                {/* Trade Header */}
                <div className="p-3 bg-[#0f172a] rounded-lg border border-[#334155] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">GENERATED TRADE ID</span>
                    <strong className="text-sm font-mono text-white">{parsedTrade.tradeId}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">COUNTERPARTY</span>
                    <strong className="text-xs text-[#0284c7]">{parsedTrade.counterparty}</strong>
                  </div>
                </div>

                {/* Field Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Detected Product Type</span>
                    <strong className="text-[#0284c7] font-bold">{getProductTypeLabel(parsedTrade.productType)}</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Notional Amount</span>
                    <strong className="text-white">
                      {parsedTrade.fixedLeg.currency === 'EUR' ? '€' : parsedTrade.fixedLeg.currency === 'GBP' ? '£' : parsedTrade.fixedLeg.currency === 'INR' ? '₹' : '$'}
                      {parsedTrade.fixedLeg.notional.toLocaleString()}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Fixed Rate / Strike / Yield</span>
                    <strong className="text-emerald-400">{parsedTrade.fixedLeg.fixedRate}% p.a.</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Floating Benchmark</span>
                    <strong className="text-amber-400">{parsedTrade.floatingLeg.index} ({parsedTrade.floatingLeg.indexTenor})</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Assigned Book</span>
                    <strong className="text-white">{parsedTrade.book}</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Calculated DV01</span>
                    <strong className="text-purple-400">${parsedTrade.dv01?.toLocaleString()} / bp</strong>
                  </div>
                </div>

                {/* Additional Product Details Badge */}
                {parsedTrade.swaptionDetails && (
                  <div className="p-3 bg-[#0284c7]/10 border border-[#0284c7]/30 rounded-lg text-xs space-y-1">
                    <span className="text-[#0284c7] font-bold block">Swaption Execution Parameters</span>
                    <div className="text-slate-300 font-mono text-[11px] grid grid-cols-2 gap-2">
                      <span>Type: <strong>{parsedTrade.swaptionDetails.swaptionType}</strong></span>
                      <span>Premium: <strong>${parsedTrade.swaptionDetails.premiumAmount.toLocaleString()}</strong></span>
                      <span>Expiry: <strong>{parsedTrade.swaptionDetails.optionExpiryDate}</strong></span>
                      <span>Underlying: <strong>{parsedTrade.swaptionDetails.underlyingTenor} Swap</strong></span>
                    </div>
                  </div>
                )}

                {parsedTrade.capFloorDetails && (
                  <div className="p-3 bg-[#0284c7]/10 border border-[#0284c7]/30 rounded-lg text-xs space-y-1">
                    <span className="text-[#0284c7] font-bold block">Cap / Floor Parameters</span>
                    <div className="text-slate-300 font-mono text-[11px] grid grid-cols-2 gap-2">
                      <span>Type: <strong>{parsedTrade.capFloorDetails.capFloorType}</strong></span>
                      <span>Premium: <strong>${parsedTrade.capFloorDetails.premiumAmount.toLocaleString()}</strong></span>
                      <span>Strike Rate: <strong>{parsedTrade.capFloorDetails.strikeRate}%</strong></span>
                      <span>Frequency: <strong>{parsedTrade.capFloorDetails.paymentFrequency}</strong></span>
                    </div>
                  </div>
                )}

                {bookedStatus && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Trade {parsedTrade.tradeId} ({parsedTrade.productType}) successfully booked to live blotter!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center py-12 text-slate-500 text-xs font-mono">
                No parsed trade yet. Type or pick a prompt above and click "Parse & Extract Trade Ticket with AI".
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {parsedTrade && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmBooking}
                disabled={bookedStatus}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {bookedStatus ? 'Trade Booked' : `Confirm 1-Click Booking (${parsedTrade.productType})`}
              </button>

              {onOpenBlotter && (
                <button
                  onClick={onOpenBlotter}
                  className="px-4 py-2.5 bg-[#0f172a] hover:bg-[#1f293d] text-slate-300 text-xs font-semibold rounded-lg border border-[#334155] transition-colors cursor-pointer"
                >
                  View Blotter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
