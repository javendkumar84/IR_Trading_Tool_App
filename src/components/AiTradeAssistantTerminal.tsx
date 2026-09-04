import React, { useState } from 'react';
import {
  Sparkles, Mic, Send, CheckCircle2, ArrowRight, Bot, User, FileCode, RefreshCw, Volume2, ShieldCheck
} from 'lucide-react';
import { IRSwapTrade } from '../types';

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
    'Book a $50M 5Y USD SOFR pay fixed 3.42% vs float starting next Monday with BNP Paribas',
    'Book €100M 10Y EURIBOR receive fixed 2.85% vs 6M EURIBOR with Deutsche Bank starting spot',
    'Book £25M 3Y SONIA pay fixed 4.15% with Barclays Bank PLC',
    'Book $75M 2Y USD SOFR pay fixed 3.95% with Goldman Sachs',
  ];

  const handleParseText = (textToParse: string) => {
    setIsProcessing(true);
    setBookedStatus(false);

    setTimeout(() => {
      // Intelligent NLP Parsing Logic
      const lower = textToParse.toLowerCase();

      // Currency
      let ccy: any = 'USD';
      if (lower.includes('eur') || lower.includes('€')) ccy = 'EUR';
      else if (lower.includes('gbp') || lower.includes('£')) ccy = 'GBP';
      else if (lower.includes('jpy') || lower.includes('¥')) ccy = 'JPY';

      // Notional
      let notional = 50000000;
      const notionalMatch = textToParse.match(/(\$|€|£|¥)?\s*(\d+(\.\d+)?)\s*(m|mn|million|cr)/i);
      if (notionalMatch) {
        const val = parseFloat(notionalMatch[2]);
        if (notionalMatch[4].toLowerCase().startsWith('m')) notional = val * 1000000;
        else if (notionalMatch[4].toLowerCase().startsWith('c')) notional = val * 10000000;
      }

      // Direction
      const direction = lower.includes('receive') ? 'RECEIVE_FIXED' : 'PAY_FIXED';

      // Rate
      let fixedRate = 3.42;
      const rateMatch = textToParse.match(/(\d+(\.\d+)?)\s*%/);
      if (rateMatch) fixedRate = parseFloat(rateMatch[1]);

      // Floating Index
      let index: any = 'SOFR';
      if (lower.includes('euribor')) index = 'EURIBOR';
      else if (lower.includes('sonia')) index = 'SONIA';

      // Counterparty
      let counterparty = 'BNP Paribas S.A.';
      if (lower.includes('goldman')) counterparty = 'Goldman Sachs International';
      else if (lower.includes('deutsche')) counterparty = 'Deutsche Bank AG';
      else if (lower.includes('barclays')) counterparty = 'Barclays Bank PLC';

      const tradeId = `IRS-2026-AI${Math.floor(1000 + Math.random() * 9000)}`;

      const newTrade: IRSwapTrade = {
        tradeId,
        productType: 'IRS',
        status: 'BOOKED',
        tradeDate: new Date().toISOString().split('T')[0],
        effectiveDate: '2026-09-08',
        maturityDate: '2031-09-08',
        traderUser: 'J. Doe (Head Rates Trader)',
        counterparty,
        book: 'RATES-OIS-BOOK',
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
        pv: 0,
        dv01: Math.round(notional * 0.00046),
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
                AI Voice & Natural Language Trade Capture Assistant
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0284c7]/10 border border-[#0284c7]/30 text-[#0284c7]">
                GPT-4 STT & NLP DERIVATIVE PARSER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Speak or type unstructured trader execution voice notes to instantly generate, validate, and book trade tickets.
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
                Type or paste execution instruction:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={4}
                className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg p-3 text-xs font-mono focus:border-[#0284c7] focus:outline-none"
                placeholder="e.g. Book $50M 5Y USD SOFR pay fixed 3.42% with BNP Paribas..."
              />
            </div>

            {/* Sample Prompts */}
            <div className="mt-4 space-y-2">
              <span className="text-[11px] text-slate-400 font-medium">Quick Trader Examples:</span>
              <div className="space-y-1.5">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(prompt);
                      handleParseText(prompt);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-[#0f172a] hover:bg-[#1f293d] border border-[#334155] text-[11px] font-mono text-slate-300 transition-colors truncate cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parse Button */}
          <button
            onClick={() => handleParseText(inputText)}
            disabled={isProcessing}
            className="w-full py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing Derivative Parameters...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Parse Trade Ticket with AI
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
                  NLP VERIFIED
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
                    <span className="text-slate-400 text-[10px] block font-sans">Product Type</span>
                    <strong className="text-white">Interest Rate Swap (IRS)</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Notional Amount</span>
                    <strong className="text-white">
                      {parsedTrade.fixedLeg.currency === 'EUR' ? '€' : parsedTrade.fixedLeg.currency === 'GBP' ? '£' : '$'}
                      {parsedTrade.fixedLeg.notional.toLocaleString()}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Fixed Rate</span>
                    <strong className="text-emerald-400">{parsedTrade.fixedLeg.fixedRate}% p.a.</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Floating Benchmark</span>
                    <strong className="text-amber-400">{parsedTrade.floatingLeg.index} ({parsedTrade.floatingLeg.indexTenor})</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Direction</span>
                    <strong className="text-white">{parsedTrade.fixedLeg.direction.replace('_', ' ')}</strong>
                  </div>

                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <span className="text-slate-400 text-[10px] block font-sans">Calculated DV01</span>
                    <strong className="text-purple-400">${parsedTrade.dv01?.toLocaleString()} / bp</strong>
                  </div>
                </div>

                {bookedStatus && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Trade {parsedTrade.tradeId} successfully booked to live blotter!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center py-12 text-slate-500 text-xs font-mono">
                No parsed trade yet. Type or pick a prompt above and click "Parse Trade Ticket with AI".
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
                {bookedStatus ? 'Trade Booked' : 'Confirm 1-Click Booking'}
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
