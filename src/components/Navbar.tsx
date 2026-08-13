import React, { useState } from 'react';
import {
  Activity, Database, FileCode, BarChart3, ReceiptText, Server, Edit3,
  TestTubes, CheckSquare, ShieldAlert, Calculator, ShieldCheck, TrendingUp, Menu, X, ChevronDown
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'xml' | 'blotter' | 'amend' | 'eod-risk' | 'pnl' | 'var' | 'risk-calc' | 'audit' | 'dotnet' | 'qa' | 'validation' | 'market-data' | 'cash-explain';
  setActiveTab: (tab: 'dashboard' | 'xml' | 'blotter' | 'amend' | 'eod-risk' | 'pnl' | 'var' | 'risk-calc' | 'audit' | 'dotnet' | 'qa' | 'validation' | 'market-data' | 'cash-explain') => void;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'xml', label: 'Trade Capture', icon: FileCode },
    { id: 'market-data', label: 'Market Data', icon: Database },
    { id: 'cash-explain', label: 'Cash Explain', icon: ReceiptText },
    { id: 'blotter', label: 'Blotter', icon: ReceiptText },
    { id: 'amend', label: 'Amend Trade', icon: Edit3 },
    { id: 'eod-risk', label: 'EOD Risk', icon: ShieldAlert },
    { id: 'pnl', label: 'PnL', icon: TrendingUp },
    { id: 'var', label: 'VaR', icon: ShieldCheck },
    { id: 'risk-calc', label: 'Risk Calc', icon: Calculator },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'dotnet', label: '.NET Models', icon: Server },
    { id: 'qa', label: 'QA Suite', icon: TestTubes },
    { id: 'validation', label: 'Validation', icon: CheckSquare },
  ] as const;

  const handleTabClick = (id: typeof activeTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header id="main-app-header" className="bg-[#0b0f19] border-b border-[#232d42] text-[#f8fafc] sticky top-0 z-50 shadow-md">
      <div id="header-container" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Top Header Bar */}
        <div id="header-top-bar" className="flex items-center justify-between h-14 gap-2">
          
          {/* Brand Logo & Title */}
          <div id="brand-section" className="flex items-center gap-2">
            <div id="brand-logo-icon" className="p-1.5 bg-[#151b28] rounded border border-[#2563eb]/40 text-[#2563eb] shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white font-sans truncate">
                IR Swap <span className="text-[#2563eb]">Trade Capture</span>
              </h1>
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#151b28] border border-[#232d42] text-slate-400">
                v2.6 .NET
              </span>
            </div>
          </div>

          {/* Controls & Mobile Hamburger Menu Button */}
          <div id="header-controls" className="flex items-center gap-2 sm:gap-3">
            
            {/* WebSocket Indicator */}
            <div
              id="ws-status-badge"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded border border-[#232d42] bg-[#151b28] text-[11px] font-mono"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isWsConnected ? 'bg-[#2563eb]' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-bold text-slate-300 hidden sm:inline">{isWsConnected ? 'WS LIVE' : 'WS OFFLINE'}</span>
              <span className="text-[9px] font-bold text-slate-300 sm:hidden">{isWsConnected ? 'LIVE' : 'OFF'}</span>
            </div>

            {/* Trade Count Badge (Tablet + Desktop) */}
            <div id="trade-count-pill" className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#151b28] border border-[#232d42] text-slate-300 text-xs">
              <Database className="w-3.5 h-3.5 text-[#2563eb]" />
              <span className="text-[11px]">Trades: <strong className="text-white font-mono">{tradeCount}</strong></span>
            </div>

            {/* Trader Selector */}
            <div id="user-selector" className="flex items-center gap-1 bg-[#151b28] border border-[#232d42] rounded px-2 py-1 text-xs">
              <span className="text-slate-400 text-[11px] hidden lg:inline">Trader:</span>
              <select
                id="trader-user-dropdown"
                value={traderUser}
                onChange={(e) => setTraderUser(e.target.value)}
                className="bg-transparent text-white focus:outline-none font-medium text-[11px] cursor-pointer max-w-[100px] sm:max-w-[150px] md:max-w-none truncate"
              >
                <option value="J. Doe (Head Rates Trader)" className="bg-[#0b0f19] text-white">J. Doe (Head Rates)</option>
                <option value="A. Smith (Senior Trader)" className="bg-[#0b0f19] text-white">A. Smith (Senior)</option>
                <option value="E. Vance (Rates Quant)" className="bg-[#0b0f19] text-white">E. Vance (Quant)</option>
                <option value="M. Taylor (Risk Officer)" className="bg-[#0b0f19] text-white">M. Taylor (Risk)</option>
              </select>
            </div>

            {/* Mobile Drawer Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-[#151b28] border border-[#232d42] text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Desktop & Tablet Navigation Bar (Horizontally scrollable with scrollbar hidden) */}
        <div id="nav-tabs-bar" className="hidden lg:flex items-center justify-between gap-1 py-1 border-t border-[#232d42] overflow-x-auto scrollbar-none">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-btn-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#2563eb] text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-[#151b28]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#232d42] bg-[#0b0f19] grid grid-cols-2 sm:grid-cols-3 gap-2 font-sans animate-in slide-in-from-top-2 duration-200">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#2563eb] text-white font-bold'
                      : 'bg-[#151b28] text-slate-300 hover:text-white border border-[#232d42]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-[#2563eb]" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </header>
  );
};
