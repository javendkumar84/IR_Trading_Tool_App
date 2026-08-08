import React from 'react';
import { Activity, Database, FileCode, BarChart3, ReceiptText, Server, Edit3, TestTubes, CheckSquare, ShieldAlert, Calculator, ShieldCheck, TrendingUp } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'xml' | 'blotter' | 'amend' | 'eod-risk' | 'pnl' | 'var' | 'risk-calc' | 'audit' | 'dotnet' | 'qa' | 'validation';
  setActiveTab: (tab: 'dashboard' | 'xml' | 'blotter' | 'amend' | 'eod-risk' | 'pnl' | 'var' | 'risk-calc' | 'audit' | 'dotnet' | 'qa' | 'validation') => void;
  isWsConnected: boolean;
  traderUser: string;
  setTraderUser: (user: string) => void;
  tradeCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isWsConnected,
  traderUser,
  setTraderUser,
  tradeCount,
}) => {
  return (
    <header id="main-app-header" className="bg-[#0b0f19] border-b border-[#232d42] text-[#f8fafc] sticky top-0 z-50 shadow-md">
      <div id="header-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="header-top-bar" className="flex items-center justify-between h-14">
          
          {/* Brand Title (Two-Color Precision Style) */}
          <div id="brand-section" className="flex items-center gap-2.5">
            <div id="brand-logo-icon" className="p-1.5 bg-[#151b28] rounded border border-[#2563eb]/40 text-[#2563eb]">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white font-sans">
                IR Swap <span className="text-[#2563eb]">Trade Capture</span>
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#151b28] border border-[#232d42] text-slate-400">
                v2.6 .NET Core
              </span>
            </div>
          </div>

          {/* Right Status Controls */}
          <div id="header-controls" className="flex items-center gap-3">
            
            {/* WebSocket Indicator */}
            <div
              id="ws-status-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#232d42] bg-[#151b28] text-xs font-mono"
            >
              <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-[#2563eb]' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-bold text-slate-300">{isWsConnected ? 'WS LIVE' : 'WS OFFLINE'}</span>
            </div>

            {/* Trade Count Badge */}
            <div id="trade-count-pill" className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#151b28] border border-[#232d42] text-slate-300 text-xs">
              <Database className="w-3.5 h-3.5 text-[#2563eb]" />
              <span className="text-[11px]">Trades: <strong className="text-white font-mono">{tradeCount}</strong></span>
            </div>

            {/* Trader User Switcher */}
            <div id="user-selector" className="flex items-center gap-2 bg-[#151b28] border border-[#232d42] rounded px-2 py-1 text-xs">
              <span className="text-slate-400 text-[11px] hidden md:inline">Trader:</span>
              <select
                id="trader-user-dropdown"
                value={traderUser}
                onChange={(e) => setTraderUser(e.target.value)}
                className="bg-transparent text-white focus:outline-none font-medium text-[11px] cursor-pointer"
              >
                <option value="J. Doe (Head Rates Trader)" className="bg-[#0b0f19] text-white">J. Doe (Head Rates)</option>
                <option value="A. Smith (Senior Trader)" className="bg-[#0b0f19] text-white">A. Smith (Senior)</option>
                <option value="E. Vance (Rates Quant)" className="bg-[#0b0f19] text-white">E. Vance (Quant)</option>
                <option value="M. Taylor (Risk Officer)" className="bg-[#0b0f19] text-white">M. Taylor (Risk)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Navigation Tabs (Strict 2-Color Monochromatic Slate + Blue Highlight) */}
        <div id="nav-tabs-bar" className="flex items-center justify-between gap-1 py-1 border-t border-[#232d42]">
          
          <button
            id="tab-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            id="tab-btn-xml"
            onClick={() => setActiveTab('xml')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'xml'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Trade Capture
          </button>

          <button
            id="tab-btn-blotter"
            onClick={() => setActiveTab('blotter')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'blotter'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            Blotter
          </button>

          <button
            id="tab-btn-amend"
            onClick={() => setActiveTab('amend')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'amend'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Amend Trade
          </button>

          <button
            id="tab-btn-eod-risk"
            onClick={() => setActiveTab('eod-risk')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'eod-risk'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            EOD Risk
          </button>

          <button
            id="tab-btn-pnl"
            onClick={() => setActiveTab('pnl')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pnl'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            PnL
          </button>

          <button
            id="tab-btn-var"
            onClick={() => setActiveTab('var')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'var'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            VaR
          </button>

          <button
            id="tab-btn-risk-calc"
            onClick={() => setActiveTab('risk-calc')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'risk-calc'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Risk Calculation
          </button>

          <button
            id="tab-btn-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit Trail
          </button>

          <button
            id="tab-btn-dotnet"
            onClick={() => setActiveTab('dotnet')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dotnet'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            .NET Models
          </button>

          <button
            id="tab-btn-qa"
            onClick={() => setActiveTab('qa')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'qa'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <TestTubes className="w-3.5 h-3.5" />
            QA Suite
          </button>

          <button
            id="tab-btn-validation"
            onClick={() => setActiveTab('validation')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'validation'
                ? 'bg-[#2563eb] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Validation
          </button>

        </div>

      </div>
    </header>
  );
};
