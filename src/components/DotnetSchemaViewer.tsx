import React, { useState, useEffect } from 'react';
import { Server, Database, Code, Copy, Check, Terminal, Layers } from 'lucide-react';

export const DotnetSchemaViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'entity' | 'dbcontext' | 'sql_server'>('entity');
  const [csharpData, setCsharpData] = useState<{ entityClass?: string; dbContextClass?: string; sqlServerDdl?: string } | null>(null);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/csharp-models')
      .then((res) => res.json())
      .then((data) => setCsharpData(data))
      .catch((err) => console.error('Error fetching C# models:', err));
  }, []);

  const handleCopy = (code: string, tabKey: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabKey);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div id="dotnet-schema-portal" className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            .NET / Entity Framework Core & SQL Server Architecture
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Production-grade C# domain models, EF Core <code className="text-blue-300 font-mono">DbContext</code> fluent configurations with atomic SQL Server sequence defaults, and T-SQL database scripts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#16181d] border border-gray-700 rounded-lg p-2 text-xs font-mono text-blue-400">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span>EF Core 9.0 • SQL Server 2022</span>
        </div>
      </div>

      {/* Code Navigation Sub-Tabs */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 pt-2 bg-[#0a0b0d]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('entity')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'entity'
                  ? 'border-cyan-500 text-blue-400 bg-blue-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              IRSwapTrade.cs & AuditLog.cs Entities
            </button>
            <button
              onClick={() => setActiveTab('dbcontext')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'dbcontext'
                  ? 'border-cyan-500 text-blue-400 bg-blue-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              TradingDbContext.cs Configuration
            </button>
            <button
              onClick={() => setActiveTab('sql_server')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === 'sql_server'
                  ? 'border-cyan-500 text-blue-400 bg-blue-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              SQL Server T-SQL DDL Script
            </button>
          </div>

          {csharpData && (
            <button
              onClick={() => {
                const codeToCopy =
                  activeTab === 'entity'
                    ? csharpData.entityClass
                    : activeTab === 'dbcontext'
                    ? csharpData.dbContextClass
                    : csharpData.sqlServerDdl;
                if (codeToCopy) handleCopy(codeToCopy, activeTab);
              }}
              className="py-1 px-3 bg-[#16181d] hover:bg-gray-800 text-gray-200 border border-gray-700 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              {copiedTab === activeTab ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              {copiedTab === activeTab ? 'Copied!' : 'Copy Code'}
            </button>
          )}
        </div>

        {/* Code Content Container */}
        <div className="p-4 bg-[#0a0b0d]">
          {!csharpData ? (
            <div className="p-8 text-center text-gray-500 italic">Loading .NET EF Core schemas...</div>
          ) : (
            <div>
              {activeTab === 'entity' && (
                <pre className="text-xs font-mono text-blue-300 bg-[#0d0f12] p-4 rounded-lg overflow-x-auto border border-gray-800 leading-relaxed scrollbar-thin">
                  {csharpData.entityClass}
                </pre>
              )}

              {activeTab === 'dbcontext' && (
                <pre className="text-xs font-mono text-cyan-300 bg-[#0d0f12] p-4 rounded-lg overflow-x-auto border border-gray-800 leading-relaxed scrollbar-thin">
                  {csharpData.dbContextClass}
                </pre>
              )}

              {activeTab === 'sql_server' && (
                <pre className="text-xs font-mono text-green-400 bg-[#0d0f12] p-4 rounded-lg overflow-x-auto border border-gray-800 leading-relaxed scrollbar-thin">
                  {csharpData.sqlServerDdl}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
