import React, { useState } from 'react';
import { ShieldCheck, Lock, Search, Key, RefreshCw, FileText, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditTrailProps {
  auditLogs: AuditLogEntry[];
  onRefresh: () => void;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ auditLogs, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedDiffLog, setSelectedDiffLog] = useState<AuditLogEntry | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.tradeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div id="audit-trail-view" className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Cryptographic Action Audit Log & Security Integrity
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Every trade booking, XML import, status amendment, or termination is logged with an immutable SHA-256 HMAC signature to ensure complete audit trails and tamper detection.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="py-2 px-4 bg-[#16181d] hover:bg-gray-800 text-gray-200 border border-gray-700 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          Re-verify Audit Hashes
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Trade ID, User or Action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#16181d] border border-gray-700 rounded pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Action Type:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#16181d] border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 font-mono focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Action Events</option>
            <option value="BOOK_TRADE">BOOK_TRADE</option>
            <option value="IMPORT_XML">IMPORT_XML</option>
            <option value="UPDATE_STATUS">UPDATE_STATUS</option>
            <option value="TERMINATE_TRADE">TERMINATE_TRADE</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0a0b0d] border-b border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Trade Ref</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">SHA-256 HMAC Signature</th>
                <th className="py-3 px-4 text-center">Payload Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 italic font-sans">
                    No audit events recorded matching current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                      
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-gray-300 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 text-white font-sans font-semibold">
                        <div>{log.userName}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{log.userId} • {log.ipAddress}</div>
                      </td>

                      {/* Action Event */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'BOOK_TRADE'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                              : log.action === 'IMPORT_XML'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                              : log.action === 'TERMINATE_TRADE'
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Trade Ref */}
                      <td className="py-3 px-4 text-blue-400 font-bold">
                        {log.tradeId}
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 text-gray-300 max-w-xs truncate font-sans text-[11px]">
                        {log.details}
                      </td>

                      {/* SHA-256 HMAC */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {log.isHashValid !== false ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-950/40 border border-green-800/50 px-1.5 py-0.5 rounded font-mono" title="HMAC Signature Validated">
                              <CheckCircle2 className="w-3 h-3" />
                              {log.hash.substring(0, 12)}...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/50 px-1.5 py-0.5 rounded font-mono" title="Tamper Detection Warning!">
                              <AlertTriangle className="w-3 h-3" />
                              INVALID HASH
                            </span>
                          )}
                        </div>
                      </td>

                      {/* View Payload Diff */}
                      <td className="py-3 px-4 text-center">
                        {log.newState ? (
                          <button
                            onClick={() => setSelectedDiffLog(log)}
                            className="p-1.5 bg-[#16181d] hover:bg-gray-800 border border-gray-700 text-gray-300 rounded cursor-pointer font-sans text-[11px] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            Diff
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[10px]">—</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Modal */}
      {selectedDiffLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0f12] border border-gray-700 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Audit Event Payload State — Trade {selectedDiffLog.tradeId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDiffLog(null)}
                className="text-gray-400 hover:text-white font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Previous State</span>
                <pre className="text-[11px] font-mono text-gray-400 bg-[#0a0b0d] p-3 rounded overflow-y-auto max-h-[300px] border border-gray-800 leading-relaxed scrollbar-thin">
                  {selectedDiffLog.previousState ? JSON.stringify(JSON.parse(selectedDiffLog.previousState), null, 2) : 'No previous state (Initial booking)'}
                </pre>
              </div>

              <div>
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-1">New State Payload</span>
                <pre className="text-[11px] font-mono text-green-400 bg-[#0a0b0d] p-3 rounded overflow-y-auto max-h-[300px] border border-gray-800 leading-relaxed scrollbar-thin">
                  {selectedDiffLog.newState ? JSON.stringify(JSON.parse(selectedDiffLog.newState), null, 2) : 'N/A'}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800 text-right">
              <button
                onClick={() => setSelectedDiffLog(null)}
                className="py-1.5 px-4 bg-[#16181d] hover:bg-gray-800 text-white border border-gray-700 rounded font-bold uppercase text-[10px] tracking-widest cursor-pointer"
              >
                Close Diff Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
