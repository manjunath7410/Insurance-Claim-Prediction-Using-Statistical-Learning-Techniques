import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../types';
import {
  FileText,
  Download,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Search,
} from 'lucide-react';

export const AuditGovernancePanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newLogPolicy, setNewLogPolicy] = useState('POL-771923');
  const [newLogDecision, setNewLogDecision] = useState('Approved standard comprehensive rate tier with 5% telematic loyalty credit.');
  const [newLogStatus, setNewLogStatus] = useState<'Approved' | 'Flagged' | 'Modified' | 'Declined'>('Approved');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCreateAuditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: newLogPolicy,
          driverAge: 35,
          vehicleCategory: 'Compact SUV',
          modelUsed: 'Gradient Boosting (Tweedie)',
          claimProbability: 0.054,
          expectedSeverity: 3400,
          purePremium: 183,
          grossPremium: 243,
          riskTier: 'Standard',
          decision: newLogDecision,
          underwriterName: 'Lead Actuary (M. Khot)',
          status: newLogStatus,
        }),
      });
      if (res.ok) {
        fetchLogs();
        setIsAddingNote(false);
        setNewLogDecision('');
      }
    } catch (err) {
      console.error('Error logging audit item:', err);
    }
  };

  const handleExportLogs = () => {
    if (logs.length === 0) return;
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `actuarial_audit_logs_${Date.now()}.json`;
    link.click();
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.policyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.decision.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.underwriterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.riskTier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Governance & Compliance
              </span>
              <h2 className="text-base font-bold text-white">Underwriting Decision Audit Trail</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Immutable logging of statistical model outputs, underwriting justifications, and rating tier actions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingNote ? 'Close Form' : 'Log Manual Underwriting Note'}</span>
            </button>

            <button
              onClick={handleExportLogs}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Trail (JSON)</span>
            </button>
          </div>
        </div>

        {/* Manual Underwriting Note Form */}
        {isAddingNote && (
          <form onSubmit={handleCreateAuditLog} className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Policy Identifier</label>
                <input
                  type="text"
                  value={newLogPolicy}
                  onChange={(e) => setNewLogPolicy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Underwriting Decision Status</label>
                <select
                  value={newLogStatus}
                  onChange={(e) => setNewLogStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Approved">Approved</option>
                  <option value="Flagged">Flagged (Surcharge / Investigation)</option>
                  <option value="Modified">Modified (Deductible Endorsement)</option>
                  <option value="Declined">Declined (Unacceptable Hazard)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Underwriter Sign-off</label>
                <input
                  type="text"
                  value="Senior Actuary (M. Khot)"
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Actuarial Justification / Decision Rationale</label>
              <textarea
                value={newLogDecision}
                onChange={(e) => setNewLogDecision(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="Explain the mathematical or demographic justification for the rating tier..."
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
              >
                Save to Immutable Log
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Audit History Records ({filteredLogs.length} logged)
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search policy, underwriter, tier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="text-[11px] text-slate-400 bg-slate-950/80 border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Log ID</th>
                <th className="py-2.5 px-2">Timestamp</th>
                <th className="py-2.5 px-2">Policy ID</th>
                <th className="py-2.5 px-2">Model Used</th>
                <th className="py-2.5 px-2 text-center">P(Claim)</th>
                <th className="py-2.5 px-2 text-right">Pure Premium</th>
                <th className="py-2.5 px-2 text-right">Gross Premium</th>
                <th className="py-2.5 px-2 text-center">Status</th>
                <th className="py-2.5 px-3">Decision Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono">
              {filteredLogs.map((log) => {
                const isApproved = log.status === 'Approved';
                const isFlagged = log.status === 'Flagged';
                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors text-slate-300">
                    <td className="py-2.5 px-3 font-semibold text-blue-400">{log.id}</td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400">{log.timestamp}</td>
                    <td className="py-2.5 px-2 font-bold text-slate-100">{log.policyId}</td>
                    <td className="py-2.5 px-2 font-sans text-[11px]">{log.modelUsed}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-indigo-300">
                      {(log.claimProbability * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right">${log.purePremium?.toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400">
                      ${log.grossPremium?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isFlagged
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-xs text-slate-300 max-w-xs">
                      <div>{log.decision}</div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        By: {log.underwriterName}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
