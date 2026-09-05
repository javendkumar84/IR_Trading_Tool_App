import React, { useState, useRef } from 'react';
import {
  Sparkles, Mic, Upload, FileText, CheckCircle2, ArrowRight, Bot, User, FileCode, RefreshCw, Volume2, ShieldCheck, Flame, ShieldAlert, Layers, AlertCircle, Edit3
} from 'lucide-react';
import { IRSwapTrade, ProductType, Currency, DayCountConvention } from '../types';

interface AiTradeAssistantTerminalProps {
  onTradeBooked?: (trade: IRSwapTrade) => void;
  onOpenBlotter?: () => void;
}

export const AiTradeAssistantTerminal: React.FC<AiTradeAssistantTerminalProps> = ({
  onTradeBooked,
  onOpenBlotter,
}) => {
  const [activeTab, setActiveTab] = useState<'VOICE_PROMPT' | 'TERMSHEET_UPLOAD'>('TERMSHEET_UPLOAD');
  const [inputText, setInputText] = useState<string>('Book a $50M 5Y USD SOFR pay fixed 3.42% vs float starting next Monday with BNP Paribas');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedTrade, setParsedTrade] = useState<IRSwapTrade | null>(null);
  const [bookedStatus, setBookedStatus] = useState<boolean>(false);

  // Termsheet upload states
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [termsheetText, setTermsheetText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePrompts = [
    { label: 'IRS Swap', text: 'Book a $50M 5Y USD SOFR pay fixed 3.42% vs float with BNP Paribas' },
    { label: 'Swaption', text: 'Book a $25M 1Yx5Y Payer Swaption strike 3.85% premium $125k with Goldman Sachs' },
    { label: 'Cap / Floor', text: 'Book a €50M 3Y EURIBOR Cap strike 3.50% premium 45 bps with Barclays Bank' },
    { label: 'FRA Trade', text: 'Book a $30M 3x6 FRA fixed 4.10% vs 3M SOFR with Citigroup' },
    { label: 'Bond', text: 'Book a $10M 10Y US Treasury Bond yield 4.25% coupon 4.0% with JPMorgan' },
    { label: 'Range Accrual', text: 'Book a $15M 5Y Range Accrual 3.5% - 4.5% SOFR Corridor with Deutsche Bank' },
  ];

  const sampleTermsheets = [
    {
      name: 'TermSheet_USD_Swaption_GoldmanSachs.pdf',
      text: `CONFIRMATION OF SWAPTION TRANSACTION
Header: ISDA Master Agreement
Date: September 5, 2026
Trade ID: SWP-2026-8841
Product Type: European Payer Swaption
Counterparty: Goldman Sachs International
Notional: USD 25,000,000.00
Swaption Strike Rate: 3.85% p.a.
Option Expiry Date: September 8, 2027 (1Y Expiry)
Underlying Swap Tenor: 5 Years (Maturity Sept 2032)
Floating Benchmark: USD SOFR 1D (OIS)
Fixed Leg Day Count: 30/360
Premium Amount: USD 125,000.00
Settlement: Cash Settled`
    },
    {
      name: 'Termsheet_EUR_Cap_Barclays.xml',
      text: `<?xml version="1.0" encoding="UTF-8"?>
<FpML xmlns="http://www.fpml.org/FpML-5/confirmation">
  <trade>
    <tradeHeader><tradeId>CAP-2026-9012</tradeId></tradeHeader>
    <capFloor>
      <productType>Interest Rate Cap</productType>
      <buyer>J. Doe (Head Rates)</buyer>
      <seller>Barclays Bank PLC</seller>
      <notional><currency>EUR</currency><amount>50000000</amount></notional>
      <capRate>0.0350</capRate>
      <floatingRateIndex>EURIBOR</floatingRateIndex>
      <indexTenor>3M</indexTenor>
      <premium><amount>225000</amount></premium>
      <effectiveDate>2026-09-08</effectiveDate>
      <terminationDate>2029-09-08</terminationDate>
    </capFloor>
  </trade>
</FpML>`
    },
    {
      name: 'Termsheet_US_Treasury_10Y_JPMorgan.txt',
      text: `BOND TRADE EXECUTION SUMMARY
Issuer: United States Department of the Treasury
Security Description: US Treasury 10Y Note 4.00% due Aug 2036
Product Type: BOND
Counterparty: JPMorgan Chase Bank N.A.
Par Value / Notional: USD 10,000,000.00
Execution Yield: 4.25% p.a.
Coupon Rate: 4.00% p.a. (Semi-Annual)
Settlement Date: 2026-09-08
Day Count: ACT/ACT`
    },
    {
      name: 'Termsheet_Range_Accrual_DeutscheBank.html',
      text: `STRUCTURED TERM SHEET: RANGE ACCRUAL NOTE
Issuer: Deutsche Bank AG
Product Type: RANGE_ACCRUAL
Notional: USD 15,000,000.00
Tenor: 5 Years (Maturity 2031-09-08)
Underlying Rate: USD SOFR
Corridor Lower Barrier: 3.50%
Corridor Upper Barrier: 4.50%
Fixed Coupon Rate: 5.25% p.a.
Accrual Formula: Fixed Rate x (Days SOFR in Corridor / Total Days)`
    }
  ];

  const parseTermsheetText = (rawText: string, filename: string) => {
    setIsProcessing(true);
    setBookedStatus(false);
    setUploadedFileName(filename);
    setTermsheetText(rawText);

    setTimeout(() => {
      const lower = rawText.toLowerCase();

      // 1. Product Type
      let pType: ProductType = 'IRS';
      if (lower.includes('swaption') || lower.includes('payer swaption') || lower.includes('receiver swaption')) {
        pType = 'SWAPTION';
      } else if (lower.includes('cap') || lower.includes('floor') || lower.includes('caplet')) {
        pType = 'CAP_FLOOR';
      } else if (lower.includes('fra') || lower.includes('forward rate agreement') || lower.includes('3x6')) {
        pType = 'FRA';
      } else if (lower.includes('bond') || lower.includes('treasury') || lower.includes('gilt')) {
        pType = 'BOND';
      } else if (lower.includes('range_accrual') || lower.includes('range accrual') || lower.includes('corridor')) {
        pType = 'RANGE_ACCRUAL';
      } else if (lower.includes('snow_range') || lower.includes('snowrange')) {
        pType = 'SNOW_RANGE';
      } else if (lower.includes('tarn') || lower.includes('target redemption')) {
        pType = 'TARN';
      } else if (lower.includes('snowball')) {
        pType = 'SNOWBALL';
      }

      // 2. Currency
      let ccy: Currency = 'USD';
      if (lower.includes('eur') || lower.includes('€')) ccy = 'EUR';
      else if (lower.includes('gbp') || lower.includes('£')) ccy = 'GBP';
      else if (lower.includes('jpy') || lower.includes('¥')) ccy = 'JPY';
      else if (lower.includes('inr') || lower.includes('₹')) ccy = 'INR';

      // 3. Notional
      let notional = 50000000;
      const notionalMatch = rawText.match(/(notional|amount|usd|eur|gbp|inr|jpy)\s*:?\s*(\$|€|£|¥|₹)?\s*([\d,]+(\.\d+)?)/i);
      if (notionalMatch) {
        const parsedVal = parseFloat(notionalMatch[3].replace(/,/g, ''));
        if (!isNaN(parsedVal) && parsedVal > 0) notional = parsedVal;
      }

      // 4. Rate / Strike / Yield
      let fixedRate = 3.85;
      const rateMatch = rawText.match(/(strike|rate|yield|coupon)\s*:?\s*(\d+(\.\d+)?)\s*%/i);
      if (rateMatch) {
        fixedRate = parseFloat(rateMatch[2]);
      }

      // 5. Index
      let index: any = 'SOFR';
      if (lower.includes('euribor')) index = 'EURIBOR';
      else if (lower.includes('sonia')) index = 'SONIA';
      else if (lower.includes('mibor')) index = 'MIBOR';

      // 6. Counterparty
      let counterparty = 'Goldman Sachs International';
      if (lower.includes('barclays')) counterparty = 'Barclays Bank PLC';
      else if (lower.includes('deutsche')) counterparty = 'Deutsche Bank AG';
      else if (lower.includes('jpmorgan') || lower.includes('jpm')) counterparty = 'JPMorgan Chase Bank N.A.';
      else if (lower.includes('citi')) counterparty = 'Citigroup Global Markets';
      else if (lower.includes('bnp')) counterparty = 'BNP Paribas S.A.';

      // Product Specific Sub-details
      let swaptionDetails;
      let capFloorDetails;

      if (pType === 'SWAPTION') {
        swaptionDetails = {
          swaptionType: lower.includes('receiver') ? 'RECEIVER' : 'PAYER',
          direction: 'BUY' as any,
          strikeRate: fixedRate,
          optionExpiryDate: '2027-09-08',
          underlyingTenor: '5Y' as any,
          settlementType: 'CASH' as any,
          premiumAmount: Math.round(notional * 0.005),
          underlyingIndex: index,
          dayCount: '30/360' as any,
        };
      } else if (pType === 'CAP_FLOOR') {
        capFloorDetails = {
          capFloorType: lower.includes('floor') ? 'FLOOR' : 'CAP',
          direction: 'BUY' as any,
          strikeRate: fixedRate,
          underlyingIndex: index,
          indexTenor: '3M' as any,
          currency: ccy,
          notional,
          premiumAmount: Math.round(notional * 0.0045),
          paymentFrequency: '3M' as any,
          dayCount: 'ACT/360' as any,
        };
      }

      const pfx = pType === 'SWAPTION' ? 'SWP' : pType === 'CAP_FLOOR' ? 'CAP' : pType === 'FRA' ? 'FRA' : pType === 'BOND' ? 'BND' : pType === 'RANGE_ACCRUAL' ? 'RGA' : 'IRS';
      const tradeId = `${pfx}-2026-TS${Math.floor(1000 + Math.random() * 9000)}`;

      const newTrade: IRSwapTrade = {
        tradeId,
        productType: pType,
        status: 'BOOKED',
        tradeDate: new Date().toISOString().split('T')[0],
        effectiveDate: '2026-09-08',
        maturityDate: pType === 'FRA' ? '2027-03-08' : '2031-09-08',
        traderUser: 'J. Doe (Head Rates Trader)',
        counterparty,
        book: pType === 'BOND' ? 'BOND-TRADING-DESK' : pType === 'SWAPTION' ? 'EXOTICS-DESK' : 'RATES-OIS-BOOK',
        fixedLeg: {
          direction: 'PAY_FIXED',
          notional,
          currency: ccy,
          fixedRate,
          dayCount: ccy === 'EUR' || ccy === 'USD' ? '30/360' : 'ACT/365',
          frequency: '1Y',
          businessDayConvention: 'MODFOLLOWING',
        },
        floatingLeg: {
          direction: 'RECEIVE_FIXED',
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
        dv01: Math.round(notional * (pType === 'FRA' ? 0.0001 : 0.00046)),
      };

      setParsedTrade(newTrade);
      setIsProcessing(false);
    }, 600);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      parseTermsheetText(text || `Termsheet file: ${file.name}\nProduct: Interest Rate Swap`, file.name);
    };
    reader.readAsText(file);
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
      case 'RANGE_ACCRUAL': return 'Range Accrual Corridor Note';
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
                Termsheet Document Upload & AI Trade Capture Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0284c7]/10 border border-[#0284c7]/30 text-[#0284c7]">
                TERMSHEET OCR & REVIEW VERIFICATION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Upload termsheets (PDF / XML / TXT / HTML) or type execution notes to automatically extract, review, and book the trade in its exact product type.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('TERMSHEET_UPLOAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'TERMSHEET_UPLOAD'
                  ? 'bg-[#0284c7] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Termsheet
            </button>
            <button
              onClick={() => setActiveTab('VOICE_PROMPT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'VOICE_PROMPT'
                  ? 'bg-[#0284c7] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Voice / Prompt Input
            </button>
          </div>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Termsheet Upload or Prompt Box */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            {activeTab === 'TERMSHEET_UPLOAD' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#334155] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0284c7]" />
                    <h3 className="text-sm font-bold text-white">Termsheet Document Uploader</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">PDF, XML, TXT, HTML</span>
                </div>

                {/* Dropzone Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#334155] hover:border-[#0284c7] bg-[#0f172a] rounded-xl p-6 text-center cursor-pointer transition-colors space-y-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.xml,.txt,.html,.json,.doc"
                    className="hidden"
                  />
                  <div className="w-12 h-12 bg-[#0284c7]/20 text-[#0284c7] rounded-full flex items-center justify-center mx-auto border border-[#0284c7]/30">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Click to upload Termsheet file or Drag & Drop</span>
                    <span className="text-[10px] text-slate-400">Accepts PDF, XML, FpML, TXT, HTML termsheets</span>
                  </div>
                </div>

                {/* Sample Termsheet Files */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] text-slate-400 font-medium block">Or test sample termsheet files:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {sampleTermsheets.map((st, idx) => (
                      <button
                        key={idx}
                        onClick={() => parseTermsheetText(st.text, st.name)}
                        className="p-2.5 bg-[#0f172a] hover:bg-[#1f293d] border border-[#334155] rounded-lg text-left transition-colors cursor-pointer space-y-1"
                      >
                        <span className="text-xs font-bold text-slate-200 block truncate">{st.name}</span>
                        <span className="text-[10px] font-mono text-[#0284c7] block">Click to parse AI</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#334155] pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#0284c7]" />
                    <h3 className="text-sm font-bold text-white">Trader Natural Language Terminal</h3>
                  </div>
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
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg p-3 text-xs font-mono focus:border-[#0284c7] focus:outline-none"
                  placeholder="e.g. Book a $25M 1Yx5Y Payer Swaption strike 3.85% with Goldman Sachs..."
                />

                <div className="grid grid-cols-2 gap-2">
                  {samplePrompts.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(item.text);
                        handleParseText(item.text);
                      }}
                      className="p-2 rounded-lg bg-[#0f172a] hover:bg-[#1f293d] border border-[#334155] text-[11px] text-left transition-colors cursor-pointer"
                    >
                      <span className="text-[#0284c7] font-bold block">{item.label}</span>
                      <span className="text-slate-400 font-mono text-[10px] block truncate">"{item.text}"</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Extract Button */}
          <button
            onClick={() => {
              if (activeTab === 'TERMSHEET_UPLOAD' && termsheetText) {
                parseTermsheetText(termsheetText, uploadedFileName || 'Uploaded_Termsheet.pdf');
              } else {
                handleParseText(inputText);
              }
            }}
            disabled={isProcessing}
            className="w-full py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-4"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing Termsheet AI Extraction & Intent Classification...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract Termsheet Parameters & Review Trade
              </>
            )}
          </button>
        </div>

        {/* Right Col: Termsheet Review & Interactive Verification Card */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0284c7]" />
                <h3 className="text-sm font-bold text-white">Termsheet Review & User Verification</h3>
              </div>
              {parsedTrade && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0284c7]/20 text-[#0284c7] border border-[#0284c7]/30">
                  {uploadedFileName || 'NLP VERIFIED'}
                </span>
              )}
            </div>

            {parsedTrade ? (
              <div className="mt-4 space-y-4">
                {/* Product Type Header */}
                <div className="p-3 bg-[#0f172a] rounded-lg border border-[#334155] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">EXTRACTED PRODUCT TYPE</span>
                    <strong className="text-sm font-bold text-[#0284c7]">{getProductTypeLabel(parsedTrade.productType)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">COUNTERPARTY</span>
                    <select
                      value={parsedTrade.counterparty}
                      onChange={(e) => setParsedTrade({ ...parsedTrade, counterparty: e.target.value })}
                      className="bg-[#1e293b] text-white border border-[#334155] rounded px-2 py-1 text-xs font-semibold"
                    >
                      <option value="Goldman Sachs International">Goldman Sachs</option>
                      <option value="JPMorgan Chase Bank N.A.">JPMorgan</option>
                      <option value="Barclays Bank PLC">Barclays</option>
                      <option value="BNP Paribas S.A.">BNP Paribas</option>
                      <option value="Deutsche Bank AG">Deutsche Bank</option>
                      <option value="Citigroup Global Markets">Citigroup</option>
                    </select>
                  </div>
                </div>

                {/* Editable Fields Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  
                  {/* Product Type Selector */}
                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155] space-y-1">
                    <label className="text-slate-400 text-[10px] block font-sans">Product Type:</label>
                    <select
                      value={parsedTrade.productType}
                      onChange={(e) => setParsedTrade({ ...parsedTrade, productType: e.target.value as ProductType })}
                      className="w-full bg-[#1e293b] text-white rounded p-1 text-xs font-bold"
                    >
                      <option value="IRS">IRS - Interest Rate Swap</option>
                      <option value="SWAPTION">SWAPTION - Swaption</option>
                      <option value="CAP_FLOOR">CAP_FLOOR - Cap / Floor</option>
                      <option value="FRA">FRA - Forward Rate Agreement</option>
                      <option value="BOND">BOND - Government Bond</option>
                      <option value="RANGE_ACCRUAL">RANGE_ACCRUAL - Corridor</option>
                      <option value="FX_FORWARD">FX_FORWARD - FX Forward</option>
                    </select>
                  </div>

                  {/* Notional */}
                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155] space-y-1">
                    <label className="text-slate-400 text-[10px] block font-sans">Notional Amount:</label>
                    <input
                      type="number"
                      value={parsedTrade.fixedLeg.notional}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setParsedTrade({
                          ...parsedTrade,
                          fixedLeg: { ...parsedTrade.fixedLeg, notional: val },
                          floatingLeg: { ...parsedTrade.floatingLeg, notional: val }
                        });
                      }}
                      className="w-full bg-[#1e293b] text-white rounded p-1 text-xs font-mono font-bold"
                    />
                  </div>

                  {/* Fixed Rate / Strike */}
                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155] space-y-1">
                    <label className="text-slate-400 text-[10px] block font-sans">Fixed Rate / Strike (%):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={parsedTrade.fixedLeg.fixedRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setParsedTrade({
                          ...parsedTrade,
                          fixedLeg: { ...parsedTrade.fixedLeg, fixedRate: val }
                        });
                      }}
                      className="w-full bg-[#1e293b] text-emerald-400 rounded p-1 text-xs font-mono font-bold"
                    />
                  </div>

                  {/* Benchmark Index */}
                  <div className="p-2.5 bg-[#0f172a] rounded-lg border border-[#334155] space-y-1">
                    <label className="text-slate-400 text-[10px] block font-sans">Floating Benchmark:</label>
                    <select
                      value={parsedTrade.floatingLeg.index}
                      onChange={(e) => setParsedTrade({
                        ...parsedTrade,
                        floatingLeg: { ...parsedTrade.floatingLeg, index: e.target.value as any }
                      })}
                      className="w-full bg-[#1e293b] text-amber-400 rounded p-1 text-xs font-bold"
                    >
                      <option value="SOFR">SOFR (USD)</option>
                      <option value="EURIBOR">EURIBOR (EUR)</option>
                      <option value="SONIA">SONIA (GBP)</option>
                      <option value="MIBOR">MIBOR (INR)</option>
                    </select>
                  </div>
                </div>

                {/* Sub-details Badge */}
                {parsedTrade.swaptionDetails && (
                  <div className="p-3 bg-[#0284c7]/10 border border-[#0284c7]/30 rounded-lg text-xs space-y-1">
                    <span className="text-[#0284c7] font-bold block">Swaption Termsheet Parameters</span>
                    <div className="text-slate-300 font-mono text-[11px] grid grid-cols-2 gap-2">
                      <span>Type: <strong>{parsedTrade.swaptionDetails.swaptionType}</strong></span>
                      <span>Premium: <strong>${parsedTrade.swaptionDetails.premiumAmount.toLocaleString()}</strong></span>
                      <span>Expiry: <strong>{parsedTrade.swaptionDetails.optionExpiryDate}</strong></span>
                      <span>Underlying: <strong>{parsedTrade.swaptionDetails.underlyingTenor} Swap</strong></span>
                    </div>
                  </div>
                )}

                {bookedStatus && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Trade {parsedTrade.tradeId} ({parsedTrade.productType}) successfully reviewed and booked to blotter!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center py-12 text-slate-500 text-xs font-mono">
                No termsheet uploaded yet. Upload a file or pick a sample termsheet on the left to extract and review fields.
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
                {bookedStatus ? 'Trade Booked' : `Confirm Termsheet Review & Book (${parsedTrade.productType})`}
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
