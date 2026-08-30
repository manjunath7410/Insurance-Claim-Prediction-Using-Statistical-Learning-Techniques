import React, { useState, useEffect } from 'react';
import { ApiPredictionResponse, PredictionResponse, ModelType } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  Shield,
  Car,
  User,
  MapPin,
  X,
  ChevronRight,
  ExternalLink,
  Sliders,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface PredictionHistoryPageProps {
  onSelectPredictionForInsights?: (pred: PredictionResponse) => void;
}

export const PredictionHistoryPage: React.FC<PredictionHistoryPageProps> = ({
  onSelectPredictionForInsights,
}) => {
  const [predictions, setPredictions] = useState<ApiPredictionResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<ApiPredictionResponse | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/predictions?limit=50');
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions || []);
      }
    } catch (e) {
      console.error('Failed to fetch prediction history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filtered and searched records
  const filteredPredictions = predictions.filter((p) => {
    const matchesSearch =
      (p.policyId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.input?.vehicleCategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.input?.regionalZone || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk =
      selectedRiskFilter === 'ALL' ||
      (selectedRiskFilter === 'LOW' && (p.output?.riskScore ?? 0) < 30) ||
      (selectedRiskFilter === 'STANDARD' && (p.output?.riskScore ?? 0) >= 30 && (p.output?.riskScore ?? 0) < 60) ||
      (selectedRiskFilter === 'ELEVATED' && (p.output?.riskScore ?? 0) >= 60 && (p.output?.riskScore ?? 0) < 80) ||
      (selectedRiskFilter === 'HIGH' && (p.output?.riskScore ?? 0) >= 80);

    return matchesSearch && matchesRisk;
  });

  const handleExportCSV = () => {
    if (predictions.length === 0) return;
    const headers = [
      'PredictionID',
      'PolicyID',
      'Timestamp',
      'DriverAge',
      'VehicleCategory',
      'AnnualMileage',
      'RegionalZone',
      'CreditScore',
      'ClaimProbabilityPercent',
      'PurePremiumUSD',
      'RiskScore',
      'Recommendation',
    ];

    const rows = predictions.map((p) => [
      p.id,
      p.policyId,
      p.timestamp,
      p.input?.age,
      p.input?.vehicleCategory,
      p.input?.annualMileage,
      p.input?.regionalZone,
      p.input?.creditScore,
      p.output?.claimProbabilityPercent?.toFixed(2),
      p.output?.purePremiumUSD,
      p.output?.riskScore,
      `"${p.output?.underwritingRecommendation || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `insurance_prediction_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Audit Trail & History
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Recent Underwriting Calculations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Prediction History
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Review, filter, and inspect past policy claim risk evaluations and underwriting decisions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              disabled={predictions.length === 0}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Policy ID, vehicle category, or territory..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'LOW', 'STANDARD', 'ELEVATED', 'HIGH'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedRiskFilter(tier)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedRiskFilter === tier
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tier === 'ALL' ? 'All Risks' : tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading audit history...</p>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No matching prediction records found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or run a new prediction on the Prediction page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Policy ID</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Claim Prob</th>
                  <th className="py-3 px-4">Pure Premium</th>
                  <th className="py-3 px-4">Recommendation</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPredictions.map((p) => {
                  const prob = p.output?.claimProbabilityPercent ?? 6.4;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedRecord(p)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {p.policyId}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(p.timestamp).toLocaleDateString()} {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <RiskBadge
                          level={prob < 4 ? 'LOW' : prob < 8 ? 'STANDARD' : prob < 16 ? 'ELEVATED' : 'HIGH'}
                          probabilityPercent={prob}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {prob.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        ${p.output?.purePremiumUSD?.toLocaleString() ?? 245}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {p.output?.underwritingRecommendation || 'Accept Standard Rate'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                          <span>Inspect</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Inspection Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full overflow-y-auto p-6 sm:p-7 shadow-2xl border-l border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Policy Record</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {selectedRecord.policyId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Risk Summary in Drawer */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {selectedRecord.output?.claimProbabilityPercent?.toFixed(1) ?? '6.4'}%
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Estimated Claim Propensity</p>
              <div className="mt-2.5 flex justify-center">
                <RiskBadge
                  level={
                    (selectedRecord.output?.claimProbabilityPercent ?? 6.4) < 4
                      ? 'LOW'
                      : (selectedRecord.output?.claimProbabilityPercent ?? 6.4) < 8
                      ? 'STANDARD'
                      : (selectedRecord.output?.claimProbabilityPercent ?? 6.4) < 16
                      ? 'ELEVATED'
                      : 'HIGH'
                  }
                  probabilityPercent={selectedRecord.output?.claimProbabilityPercent ?? 6.4}
                />
              </div>
            </div>

            {/* Policy Parameters Snapshot */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Input Parameters
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[11px]">Driver Age</span>
                  <span className="font-bold">{selectedRecord.input?.age} years</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[11px]">Vehicle Category</span>
                  <span className="font-bold">{selectedRecord.input?.vehicleCategory}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[11px]">Annual Mileage</span>
                  <span className="font-bold">
                    {selectedRecord.input?.annualMileage?.toLocaleString()} mi
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[11px]">Insurance Credit</span>
                  <span className="font-bold">{selectedRecord.input?.creditScore} FICO</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[11px]">Territory Zone</span>
                  <span className="font-bold">{selectedRecord.input?.regionalZone}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[11px]">Prior Claims</span>
                  <span className="font-bold">{selectedRecord.input?.priorClaimsLast5Years} in 5 yrs</span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              Close Snapshot
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
