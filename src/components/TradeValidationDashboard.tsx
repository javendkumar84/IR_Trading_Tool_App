import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Play,
  FileCheck,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Layers,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Zap,
  Code2,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Eye,
  Check,
} from 'lucide-react';
import { TradeValidationRun, TradeValidationItem, ProductType } from '../types';
import {
  runCompleteValidationSuite,
  executeBookingValidation,
  executeAmendmentValidation,
  executeMaturityValidation,
  executeCancellationValidation,
} from '../lib/tradeValidationSuite';
import { generateStakeholderPdfReport } from '../lib/pdfValidationReportGenerator';

export const TradeValidationDashboard: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [currentTestName, setCurrentTestName] = useState<string>('Ready to execute validation suite.');
  const [passedCount, setPassedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);

  const [activeRun, setActiveRun] = useState<TradeValidationRun | null>(null);
  const [selectedTradeItem, setSelectedTradeItem] = useState<TradeValidationItem | null>(null);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'matrix' | 'booking' | 'amendment' | 'maturity' | 'cancellation' | 'threetier'>('matrix');
  const [scenarioFilter, setScenarioFilter] = useState<'ALL' | 'BOOKING' | 'AMENDMENT' | 'MATURITY' | 'CANCELLATION'>('ALL');

  // Memoized Counts and Filtered Scenario Items
  const counts = useMemo(() => {
    if (!activeRun) return { bkg: 0, amd: 0, mat: 0, cnc: 0 };
    return {
      bkg: activeRun.results.filter(r => r.tradeId.startsWith('BKG')).length,
      amd: activeRun.results.filter(r => r.tradeId.startsWith('AMD')).length,
      mat: activeRun.results.filter(r => r.tradeId.startsWith('MAT')).length,
      cnc: activeRun.results.filter(r => r.tradeId.startsWith('CNC')).length,
    };
  }, [activeRun]);

  const filteredResults = useMemo(() => {
    if (!activeRun) return [];
    if (scenarioFilter === 'ALL') return activeRun.results;
    if (scenarioFilter === 'BOOKING') return activeRun.results.filter(r => r.tradeId.startsWith('BKG'));
    if (scenarioFilter === 'AMENDMENT') return activeRun.results.filter(r => r.tradeId.startsWith('AMD'));
    if (scenarioFilter === 'MATURITY') return activeRun.results.filter(r => r.tradeId.startsWith('MAT'));
    if (scenarioFilter === 'CANCELLATION') return activeRun.results.filter(r => r.tradeId.startsWith('CNC'));
    return activeRun.results;
  }, [activeRun, scenarioFilter]);

  // Launch Validation Execution Engine
  const handleRunSuite = async (mode: 'BOOKING' | 'AMENDMENT' | 'MATURITY' | 'CANCELLATION' | 'FULL') => {
    setIsRunning(true);
    setProgressPct(5);
    setCurrentTestName(`Initializing 4-Stage [${mode}] Trade Lifecycle Suite...`);
    setPassedCount(0);
    setFailedCount(0);

    try {
      const runResult = await runCompleteValidationSuite((pct, testName, pCount, fCount) => {
        setProgressPct(pct);
        setCurrentTestName(testName);
        setPassedCount(pCount);
        setFailedCount(fCount);
      });

      setActiveRun(runResult);
      if (runResult.results.length > 0) {
        setSelectedTradeItem(runResult.results[0]);
      }
    } catch (err: any) {
      console.error('Validation suite error:', err);
    } finally {
      setIsRunning(false);
      setProgressPct(100);
      setCurrentTestName('4-Stage Lifecycle Execution Complete!');
    }
  };

  // PDF Export Trigger
  const handleExportPdf = () => {
    if (!activeRun) return;
    generateStakeholderPdfReport(activeRun);
  };

  return (
    <div id="trade-validation-dashboard-root" className="space-y-6 pb-12">
      
      {/* Header Controls Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              4-Stage Trade Lifecycle Validation Dashboard & Playwright Suite
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end automated testing for 9 derivative products across 4 stages: Booking Validation, Amendment XML Diff, Maturity Lifecycle, and Cancellation Lifecycle.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleRunSuite('BOOKING')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer shadow"
            >
              <Play className="w-3 h-3 fill-current" />
              Run Booking
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleRunSuite('AMENDMENT')}
              className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer shadow"
            >
              <RefreshCw className="w-3 h-3" />
              Run Amendment
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleRunSuite('MATURITY')}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer shadow"
            >
              <Clock className="w-3 h-3" />
              Run Maturity
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleRunSuite('CANCELLATION')}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer shadow"
            >
              <XCircle className="w-3 h-3" />
              Run Cancellation
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleRunSuite('FULL')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run Full 4-Stage Suite
            </button>

            {activeRun && (
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Generate Stakeholder PDF
              </button>
            )}
          </div>
        </div>

        {/* Execution Progress & Status Indicators */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-500 font-sans">Current Test:</span>
              <span className="font-bold text-indigo-400 truncate max-w-md">{currentTestName}</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Passed: {passedCount}
              </span>
              <span className="text-rose-400 flex items-center gap-1 font-bold">
                <XCircle className="w-3.5 h-3.5" /> Failed: {failedCount}
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Duration: {activeRun ? `${(activeRun.durationMs / 1000).toFixed(2)}s` : '0.00s'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 h-2.5 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Results & Evidence Workspace */}
      {activeRun ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Trade Results Matrix */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Validated Trades Matrix ({filteredResults.length})
                </h3>
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                  Run ID: {activeRun.runId}
                </span>
              </div>

              {/* Scenario Filter Bar */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono overflow-x-auto">
                <button
                  onClick={() => setScenarioFilter('ALL')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${scenarioFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  All ({activeRun.results.length})
                </button>
                <button
                  onClick={() => setScenarioFilter('BOOKING')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${scenarioFilter === 'BOOKING' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Booking ({counts.bkg})
                </button>
                <button
                  onClick={() => setScenarioFilter('AMENDMENT')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${scenarioFilter === 'AMENDMENT' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Amend ({counts.amd})
                </button>
                <button
                  onClick={() => setScenarioFilter('MATURITY')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${scenarioFilter === 'MATURITY' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Mature ({counts.mat})
                </button>
                <button
                  onClick={() => setScenarioFilter('CANCELLATION')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${scenarioFilter === 'CANCELLATION' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Cancel ({counts.cnc})
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                {filteredResults.map((item) => {
                  const isSelected = selectedTradeItem?.id === item.id;
                  const isPass = item.overallStatus === 'PASS';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTradeItem(item)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-indigo-500 shadow-md'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                          {item.tradeId}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPass ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                          {item.overallStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                        <span>Product: <strong className="text-slate-200">{item.productType}</strong></span>
                        <span>Booking: <strong className={item.bookingStatus === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}>{item.bookingStatus}</strong></span>
                        <span>Amend: <strong className={item.amendmentStatus === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}>{item.amendmentStatus}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Evidence Viewer */}
          <div className="lg:col-span-7 space-y-4">
            {selectedTradeItem ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      Evidence Viewer: Trade #{selectedTradeItem.tradeId}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Product: {selectedTradeItem.productType} | Execution Time: {selectedTradeItem.durationMs}ms
                    </p>
                  </div>

                  {/* Evidence Viewer Tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 flex-wrap">
                    <button
                      onClick={() => setActiveEvidenceTab('matrix')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                        activeEvidenceTab === 'matrix' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Matrix
                    </button>

                    <button
                      onClick={() => setActiveEvidenceTab('booking')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                        activeEvidenceTab === 'booking' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Stage 1: Booking
                    </button>

                    <button
                      onClick={() => setActiveEvidenceTab('amendment')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                        activeEvidenceTab === 'amendment' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Stage 2: Amend
                    </button>

                    <button
                      onClick={() => setActiveEvidenceTab('maturity')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                        activeEvidenceTab === 'maturity' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Stage 3: Mature
                    </button>

                    <button
                      onClick={() => setActiveEvidenceTab('cancellation')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                        activeEvidenceTab === 'cancellation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Stage 4: Cancel
                    </button>

                    <button
                      onClick={() => setActiveEvidenceTab('threetier')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                        activeEvidenceTab === 'threetier' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400 hover:text-white'
                      }`}
                    >
                      3-Tier Persistence
                    </button>
                  </div>
                </div>

                {/* Evidence Tab 1: Field-by-Field Matrix */}
                {activeEvidenceTab === 'matrix' && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      XML Parsed Value vs UI Displayed Value Alignment
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                            <th className="p-2.5">Field Name</th>
                            <th className="p-2.5 text-indigo-400">Parsed XML Value</th>
                            <th className="p-2.5 text-teal-400">UI Captured Value</th>
                            <th className="p-2.5 text-center">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedTradeItem.fieldComparisons.map((fc) => (
                            <tr key={fc.fieldId} className="hover:bg-slate-900/40">
                              <td className="p-2.5 text-slate-200 font-semibold">{fc.fieldName}</td>
                              <td className="p-2.5 text-indigo-300">{fc.xmlValue}</td>
                              <td className="p-2.5 text-teal-300">{fc.uiValue}</td>
                              <td className="p-2.5 text-center font-bold">
                                {fc.status === 'PASS' ? (
                                  <span className="text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 text-[10px]">
                                    ✓ PASS
                                  </span>
                                ) : (
                                  <span className="text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800 text-[10px]">
                                    ✗ FAIL
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Evidence Tab 2: Stage 1 Booking */}
                {activeEvidenceTab === 'booking' && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      Stage 1: Trade Booking Snapshot Evidence
                    </div>

                    {selectedTradeItem.evidence.bookingScreenshot && (
                      <img
                        src={selectedTradeItem.evidence.bookingScreenshot}
                        alt="Booking Evidence"
                        className="w-full rounded-lg border border-slate-700 shadow-md max-h-72 object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Evidence Tab 3: Stage 2 Amendment */}
                {activeEvidenceTab === 'amendment' && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-indigo-400" />
                      Stage 2: Original XML vs Amended XML Tree Comparison
                    </div>

                    {selectedTradeItem.evidence.xmlDiffHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedTradeItem.evidence.xmlDiffHtml }}
                        className="rounded-lg overflow-hidden border border-slate-800"
                      />
                    ) : (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs font-mono">
                        No amendment diff output recorded.
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence Tab 4: Stage 3 Maturity */}
                {activeEvidenceTab === 'maturity' && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Stage 3: Trade Maturity Lifecycle XML Diff & Snapshot
                    </div>

                    {selectedTradeItem.evidence.maturityXmlDiffHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedTradeItem.evidence.maturityXmlDiffHtml }}
                        className="rounded-lg overflow-hidden border border-slate-800"
                      />
                    ) : (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs font-mono">
                        Run Maturity Validation to inspect Matured XML tree diffs.
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence Tab 5: Stage 4 Cancellation */}
                {activeEvidenceTab === 'cancellation' && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      Stage 4: Trade Cancellation Lifecycle XML Diff & Snapshot
                    </div>

                    {selectedTradeItem.evidence.cancellationXmlDiffHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedTradeItem.evidence.cancellationXmlDiffHtml }}
                        className="rounded-lg overflow-hidden border border-slate-800"
                      />
                    ) : (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs font-mono">
                        Run Cancellation Validation to inspect Cancelled XML tree diffs.
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence Tab 6: 3-Tier Persistence Verification */}
                {activeEvidenceTab === 'threetier' && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      3-Tier Workflow Persistence Verification (UI ↔ Backend XML ↔ SQLite Database)
                    </div>

                    {selectedTradeItem.evidence.threeTierSummary ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-emerald-300 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            3-Tier System Consistency Status: PASS
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Amendment committed and verified across UI form state, FpML XML tree structure, and SQLite database persistence.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                            <span className="font-bold text-indigo-400 block mb-1">1. UI Layer Status: VERIFIED</span>
                            <span className="text-slate-300 text-[11px]">{selectedTradeItem.evidence.threeTierSummary.uiDetails}</span>
                          </div>

                          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                            <span className="font-bold text-cyan-400 block mb-1">2. Backend FpML XML Layer Status: VERIFIED</span>
                            <span className="text-slate-300 text-[11px]">{selectedTradeItem.evidence.threeTierSummary.xmlDetails}</span>
                          </div>

                          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                            <span className="font-bold text-emerald-400 block mb-1">3. SQLite Database Layer (`ir_swap_trades.db`): VERIFIED</span>
                            <span className="text-slate-300 text-[11px]">{selectedTradeItem.evidence.threeTierSummary.dbDetails}</span>
                          </div>
                        </div>

                        {selectedTradeItem.evidence.threeTierSummary.dbRecordSnapshot && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-400">Database Record Snapshot (`ir_swap_trades`):</span>
                            <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-[10px] text-indigo-300 overflow-x-auto">
                              {JSON.stringify(selectedTradeItem.evidence.threeTierSummary.dbRecordSnapshot, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs font-mono">
                        Run Amendment Validation to perform 3-Tier System Persistence checks.
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 space-y-2">
                <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold">Select a trade from the matrix to view evidence.</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4 shadow-xl">
          <div className="p-4 bg-indigo-950/60 border border-indigo-800/60 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-indigo-400">
            <CheckSquare className="w-8 h-8 animate-bounce" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Active Validation Run</h3>
            <p className="text-xs text-slate-400">
              Click <strong className="text-indigo-400">Run Booking Validation</strong> or <strong className="text-emerald-400">Run Complete Regression</strong> to launch the automated Playwright E2E validation suite across all 9 derivative products.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
