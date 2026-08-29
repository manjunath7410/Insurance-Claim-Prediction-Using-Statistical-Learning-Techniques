import React, { useState, useEffect } from 'react';
import {
  BENCHMARK_METRICS,
  ROC_CURVES_DATA,
  LORENZ_GINI_DATA,
  CALIBRATION_BINS,
} from '../services/statisticalModels';
import { ModelType, RegistryModelRecord, ModelComparisonSideBySide } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import {
  Award,
  Layers,
  Activity,
  CheckCircle,
  BarChart3,
  GitCommit,
  Info,
  TrendingUp,
  Shield,
  ArrowRightLeft,
  Check,
  XCircle,
  AlertTriangle,
  Archive,
  RefreshCw,
  Sliders,
  Database,
  Calendar,
  Lock,
} from 'lucide-react';

interface ModelComparisonProps {
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
}

export const ModelComparisonDashboard: React.FC<ModelComparisonProps> = ({
  selectedModel,
  setSelectedModel,
}) => {
  const [activeTab, setActiveTab] = useState<'performance' | 'registry' | 'compare'>('performance');
  const [activeCurveTab, setActiveCurveTab] = useState<'roc' | 'pr' | 'lorenz' | 'calibration' | 'importance'>('roc');
  const [registryModels, setRegistryModels] = useState<RegistryModelRecord[]>([]);
  const [activeChampionVersion, setActiveChampionVersion] = useState<string>('v1.2.0-gbdt-calibrated-platt');
  const [selectedModelA, setSelectedModelA] = useState<string>('v1.2.0-gbdt-calibrated-platt');
  const [selectedModelB, setSelectedModelB] = useState<string>('v1.1.0-hurdle-poisson');
  const [comparisonResult, setComparisonResult] = useState<ModelComparisonSideBySide | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Modal / Action States
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [targetPromoteVersion, setTargetPromoteVersion] = useState<string>('');
  const [promotionRationale, setPromotionRationale] = useState<string>('');
  const [retirementModalOpen, setRetirementModalOpen] = useState(false);
  const [targetRetireVersion, setTargetRetireVersion] = useState<string>('');
  const [retirementRationale, setRetirementRationale] = useState<string>('');
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [targetConfigVersion, setTargetConfigVersion] = useState<string>('');
  const [newThresholdValue, setNewThresholdValue] = useState<number>(0.08);
  const [configRationale, setConfigRationale] = useState<string>('');

  const fetchRegistry = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/models/registry');
      if (res.ok) {
        const data = await res.json();
        setRegistryModels(data.models || []);
        if (data.activeVersion) {
          setActiveChampionVersion(data.activeVersion);
        }
      }
    } catch (e) {
      console.error('Failed to fetch model registry:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async (verA: string, verB: string) => {
    try {
      const res = await fetch('/api/models/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionA: verA, versionB: verB }),
      });
      if (res.ok) {
        const comp = await res.json();
        setComparisonResult(comp);
      }
    } catch (e) {
      console.error('Failed to compare models:', e);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  useEffect(() => {
    if (selectedModelA && selectedModelB) {
      fetchComparison(selectedModelA, selectedModelB);
    }
  }, [selectedModelA, selectedModelB]);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/models/${targetPromoteVersion}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetStatus: 'PRODUCTION',
          rationale: promotionRationale || 'Validated statistical superiority on test partition.',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccessMessage(data.message || `Model ${targetPromoteVersion} successfully promoted.`);
        setPromotionModalOpen(false);
        setPromotionRationale('');
        fetchRegistry();
      } else {
        setActionErrorMessage(data.message || 'Failed to promote model.');
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Network error executing model promotion.');
    }
  };

  const handleRetire = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/models/${targetRetireVersion}/retire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rationale: retirementRationale || 'Archived due to deprecation or lower discrimination metrics.',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccessMessage(data.message || `Model ${targetRetireVersion} successfully retired.`);
        setRetirementModalOpen(false);
        setRetirementRationale('');
        fetchRegistry();
      } else {
        setActionErrorMessage(data.message || 'Failed to retire model.');
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Network error executing model retirement.');
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/models/${targetConfigVersion}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          decisionThreshold: newThresholdValue,
          rationale: configRationale || 'Actuarial risk threshold optimization update.',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccessMessage(data.message || 'Model configuration updated.');
        setThresholdModalOpen(false);
        setConfigRationale('');
        fetchRegistry();
      } else {
        setActionErrorMessage(data.message || 'Failed to update model configuration.');
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Network error updating configuration.');
    }
  };

  const GLOBAL_FEATURE_IMPORTANCE = [
    { feature: 'Prior Claims (5-Year)', importance: 0.28, category: 'Claim History' },
    { feature: 'Driver Age (< 25 / Senior)', importance: 0.22, category: 'Demographics' },
    { feature: 'Vehicle Category & Value', importance: 0.17, category: 'Asset Profile' },
    { feature: 'Regional Risk Territory', importance: 0.14, category: 'Geography' },
    { feature: 'Annual Mileage Exposure', importance: 0.09, category: 'Exposure' },
    { feature: 'Credit Score (FICO Tier)', importance: 0.06, category: 'Financial Score' },
    { feature: 'Anti-Theft / Telematics', importance: 0.04, category: 'Safety Mitigation' },
  ];

  const PR_CURVES_DATA = [
    { recall: 0.0, gbdt: 0.72, hurdle: 0.65, rf: 0.61, glm: 0.52 },
    { recall: 0.2, gbdt: 0.64, hurdle: 0.58, rf: 0.54, glm: 0.45 },
    { recall: 0.4, gbdt: 0.53, hurdle: 0.48, rf: 0.44, glm: 0.38 },
    { recall: 0.6, gbdt: 0.44, hurdle: 0.39, rf: 0.35, glm: 0.29 },
    { recall: 0.8, gbdt: 0.28, hurdle: 0.24, rf: 0.21, glm: 0.16 },
    { recall: 1.0, gbdt: 0.08, hurdle: 0.08, rf: 0.08, glm: 0.08 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRODUCTION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" /> PRODUCTION (CHAMPION)
          </span>
        );
      case 'CANDIDATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <Activity className="w-3 h-3 text-blue-400" /> CANDIDATE
          </span>
        );
      case 'DEVELOPMENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <GitCommit className="w-3 h-3 text-amber-400" /> DEVELOPMENT
          </span>
        );
      case 'RETIRED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
            <Archive className="w-3 h-3 text-slate-400" /> RETIRED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Phase 10: Model Governance & Auditability
              </span>
              <h2 className="text-base font-bold text-white">
                Actuarial Model Performance & Registry Management
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Versioned model tracking, ROC-AUC / PR-AUC evaluation, probability calibration metrics, and side-by-side candidate comparison.
            </p>
          </div>

          {/* Tab Pill Buttons */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'performance' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Performance & Calibration</span>
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'registry' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Model Registry & Governance</span>
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'compare' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Model Comparison</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {actionSuccessMessage && (
          <div className="mt-3 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold">×</button>
          </div>
        )}
        {actionErrorMessage && (
          <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{actionErrorMessage}</span>
            </div>
            <button onClick={() => setActionErrorMessage(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold">×</button>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: PERFORMANCE & CALIBRATION METRICS
          ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Key Evaluation Metrics Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Comprehensive Evaluation Metrics: ROC-AUC, PR-AUC, Precision, Recall, F1, Log Loss & Brier Score
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Active Champion: <span className="text-emerald-400 font-bold">{activeChampionVersion}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">ROC-AUC</span>
                <span className="text-lg font-extrabold text-blue-400">0.884</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">+8.3% vs GLM</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">PR-AUC</span>
                <span className="text-lg font-extrabold text-indigo-400">0.462</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">High Precision at Recall</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Precision</span>
                <span className="text-lg font-extrabold text-purple-400">0.441</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">@ Threshold 0.08</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Recall</span>
                <span className="text-lg font-extrabold text-pink-400">0.563</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Coverage of Hazard</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">F1 Score</span>
                <span className="text-lg font-extrabold text-amber-400">0.495</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Optimal Harmonic Mean</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Log Loss (↓)</span>
                <span className="text-lg font-extrabold text-emerald-400">0.1412</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">22.4% Loss Reduction</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Brier Score (↓)</span>
                <span className="text-lg font-extrabold text-cyan-400">0.0392</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">Platt Calibrated</span>
              </div>
            </div>
          </div>

          {/* Model Performance Comparison Matrix Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm overflow-hidden">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Complete Model Evaluation Matrix & Calibration Diagnostics
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="text-[11px] text-slate-400 bg-slate-950/80 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Model Version & Name</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-center">ROC-AUC (↑)</th>
                    <th className="py-3 px-2 text-center">PR-AUC (↑)</th>
                    <th className="py-3 px-2 text-center">Precision</th>
                    <th className="py-3 px-2 text-center">Recall</th>
                    <th className="py-3 px-2 text-center">F1 Score</th>
                    <th className="py-3 px-2 text-center">Log Loss (↓)</th>
                    <th className="py-3 px-2 text-center">Brier Score (↓)</th>
                    <th className="py-3 px-2 text-center">ECE (Calibration)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono">
                  {registryModels.map((m) => {
                    const isChampion = m.modelVersion === activeChampionVersion;
                    return (
                      <tr key={m.modelVersion} className={`hover:bg-slate-800/40 transition-colors ${isChampion ? 'bg-blue-950/20' : ''}`}>
                        <td className="py-3 px-3">
                          <div className="font-sans font-bold text-slate-200">{m.modelName}</div>
                          <div className="text-[10px] text-slate-400">{m.modelVersion} • {m.algorithm}</div>
                        </td>
                        <td className="py-3 px-2 font-sans">{getStatusBadge(m.status)}</td>
                        <td className="py-3 px-2 text-center font-bold text-blue-400">{m.evaluationMetrics?.rocAuc.toFixed(3)}</td>
                        <td className="py-3 px-2 text-center font-bold text-indigo-300">{m.evaluationMetrics?.prAuc.toFixed(3)}</td>
                        <td className="py-3 px-2 text-center text-purple-300">{m.evaluationMetrics?.precision.toFixed(3)}</td>
                        <td className="py-3 px-2 text-center text-pink-300">{m.evaluationMetrics?.recall.toFixed(3)}</td>
                        <td className="py-3 px-2 text-center font-bold text-amber-300">{m.evaluationMetrics?.f1Score.toFixed(3)}</td>
                        <td className="py-3 px-2 text-center text-emerald-400">{m.evaluationMetrics?.logLoss.toFixed(4)}</td>
                        <td className="py-3 px-2 text-center text-cyan-300">{m.evaluationMetrics?.brierScore.toFixed(4)}</td>
                        <td className="py-3 px-2 text-center text-slate-300">{((m.evaluationMetrics?.expectedCalibrationError || 0.01) * 100).toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Curves / Diagnostic Charts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Diagnostic Visualizations & Reliability Curves</h3>
                <p className="text-xs text-slate-400">
                  Interactive multi-model comparison across discrimination, precision-recall trade-offs, calibration reliability, and actuarial concentration.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveCurveTab('roc')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    activeCurveTab === 'roc' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ROC Curves
                </button>
                <button
                  onClick={() => setActiveCurveTab('pr')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    activeCurveTab === 'pr' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PR Curves
                </button>
                <button
                  onClick={() => setActiveCurveTab('calibration')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    activeCurveTab === 'calibration' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Calibration Reliability
                </button>
                <button
                  onClick={() => setActiveCurveTab('lorenz')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    activeCurveTab === 'lorenz' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Lorenz & Gini
                </button>
                <button
                  onClick={() => setActiveCurveTab('importance')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    activeCurveTab === 'importance' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Feature Importance
                </button>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              {activeCurveTab === 'roc' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ROC_CURVES_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="fpr"
                      stroke="#64748b"
                      label={{ value: 'False Positive Rate (1 - Specificity)', position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      label={{ value: 'True Positive Rate (Sensitivity / Recall)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="gbdt" name="GBDT Tweedie (AUC=0.884)" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="hurdle" name="Two-Stage Hurdle (AUC=0.869)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rf" name="Random Forest (AUC=0.854)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="glm" name="GLM Baseline (AUC=0.816)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="random" name="Random Guess (AUC=0.500)" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {activeCurveTab === 'pr' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PR_CURVES_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="recall"
                      stroke="#64748b"
                      label={{ value: 'Recall', position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      label={{ value: 'Precision', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="gbdt" name="GBDT Tweedie (PR-AUC=0.462)" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="hurdle" name="Two-Stage Hurdle (PR-AUC=0.428)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rf" name="Random Forest (PR-AUC=0.398)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="glm" name="GLM Baseline (PR-AUC=0.385)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {activeCurveTab === 'calibration' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={CALIBRATION_BINS} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="predicted"
                      stroke="#64748b"
                      label={{ value: 'Mean Predicted Claim Probability', position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      label={{ value: 'Observed Empirical Frequency', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="perfect" name="Perfect Calibration (y = x)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="gbdt" name="Platt Calibrated GBDT (ECE=0.0074, Slope=1.021)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="hurdle" name="Two-Stage Hurdle (ECE=0.0185)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="glm" name="GLM Logistic Baseline (ECE=0.0240)" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {activeCurveTab === 'lorenz' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={LORENZ_GINI_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="popFraction"
                      stroke="#64748b"
                      label={{ value: 'Cumulative Proportion of Population (Ranked by P(Claim))', position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      label={{ value: 'Cumulative Proportion of Losses', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="equality" name="Line of Equality (Gini = 0)" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="gbdt" name="GBDT (Gini = 0.768)" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="hurdle" name="Two-Stage Hurdle (Gini = 0.738)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="glm" name="GLM (Gini = 0.632)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {activeCurveTab === 'importance' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={GLOBAL_FEATURE_IMPORTANCE} layout="vertical" margin={{ top: 5, right: 30, left: 140, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <YAxis dataKey="feature" type="category" stroke="#cbd5e1" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px' }}
                      formatter={(val: number) => [`${(val * 100).toFixed(1)}% Relative Gain`, 'Importance']}
                    />
                    <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MODEL REGISTRY & GOVERNANCE
          ========================================================================= */}
      {activeTab === 'registry' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  Actuarial Model Registry & Version Tracking
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tracking algorithm specifications, dataset versions, training timestamps, decision thresholds, and lifecycle statuses.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRegistry}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Registry</span>
                </button>
              </div>
            </div>

            {/* Registry Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registryModels.map((model) => {
                const isChampion = model.modelVersion === activeChampionVersion;
                return (
                  <div
                    key={model.modelVersion}
                    className={`bg-slate-950 border rounded-xl p-4.5 space-y-3 transition-all ${
                      isChampion ? 'border-emerald-500/50 shadow-sm shadow-emerald-500/10' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{model.modelName}</h4>
                        </div>
                        <span className="text-xs font-mono text-blue-400 block mt-0.5">{model.modelVersion}</span>
                      </div>
                      <div>{getStatusBadge(model.status)}</div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{model.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">ALGORITHM</span>
                        <span className="text-slate-200 font-medium text-[11px] truncate block">{model.algorithm}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">DATASET VERSION</span>
                        <span className="text-slate-200 font-medium text-[11px] truncate block">{model.trainingDatasetVersion}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">TRAINING DATE</span>
                        <span className="text-slate-200 font-medium text-[11px] block">{model.trainingDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">DECISION THRESHOLD</span>
                        <span className="text-indigo-400 font-bold text-[11px] block">{model.decisionThreshold}</span>
                      </div>
                    </div>

                    {/* Hyperparameters Snippet */}
                    <div className="text-xs">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">HYPERPARAMETERS & CALIBRATION:</span>
                      <div className="bg-slate-900 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(model.hyperparameters || {}).map(([k, v]) => (
                          <span key={k} className="text-slate-400">
                            {k}: <span className="text-slate-200 font-semibold">{String(v)}</span>
                          </span>
                        ))}
                        <span className="text-cyan-400">
                          calib: <span className="text-cyan-200">{model.calibrationInformation?.method || 'N/A'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Governance Action Buttons */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400 font-mono">
                        ROC: <span className="text-blue-400 font-bold">{model.evaluationMetrics?.rocAuc.toFixed(3)}</span> • Gini:{' '}
                        <span className="text-emerald-400 font-bold">{model.evaluationMetrics?.giniCoefficient?.toFixed(3) || '0.768'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {model.status !== 'PRODUCTION' && model.status !== 'RETIRED' && (
                          <button
                            onClick={() => {
                              setTargetPromoteVersion(model.modelVersion);
                              setPromotionModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors"
                          >
                            Promote to Champion
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setTargetConfigVersion(model.modelVersion);
                            setNewThresholdValue(model.decisionThreshold);
                            setThresholdModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                          title="Configure decision threshold"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        {model.status !== 'RETIRED' && model.status !== 'PRODUCTION' && (
                          <button
                            onClick={() => {
                              setTargetRetireVersion(model.modelVersion);
                              setRetirementModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-medium transition-colors"
                            title="Retire model"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SIDE-BY-SIDE MODEL COMPARISON
          ========================================================================= */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                Side-by-Side Model Comparison & Delta Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare two models directly to evaluate discrimination gains, probability calibration shifts, and loss reduction.
              </p>
            </div>

            {/* Model Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-blue-400 mb-1.5">Model Version A (Champion / Candidate)</label>
                <select
                  value={selectedModelA}
                  onChange={(e) => setSelectedModelA(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {registryModels.map((m) => (
                    <option key={m.modelVersion} value={m.modelVersion}>
                      {m.modelName} ({m.modelVersion}) - {m.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-400 mb-1.5">Model Version B (Challenger / Baseline)</label>
                <select
                  value={selectedModelB}
                  onChange={(e) => setSelectedModelB(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  {registryModels.map((m) => (
                    <option key={m.modelVersion} value={m.modelVersion}>
                      {m.modelName} ({m.modelVersion}) - {m.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Results */}
            {comparisonResult && (
              <div className="space-y-4 pt-2">
                {/* Recommendation Banner */}
                <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/60 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Algorithmic Recommendation:{' '}
                        <span className="text-emerald-400">{comparisonResult.recommendation.championVersion}</span>
                      </span>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {comparisonResult.recommendation.selectionRationale}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {comparisonResult.recommendation.statisticallySuperiorMetrics.map((sm, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-500/30">
                            {sm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Metric Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="text-[11px] text-slate-400 bg-slate-950/80 border-b border-slate-800 uppercase tracking-wider font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Evaluation Metric</th>
                        <th className="py-2.5 px-3 text-blue-400 font-bold">{comparisonResult.modelA.modelName} (A)</th>
                        <th className="py-2.5 px-3 text-purple-400 font-bold">{comparisonResult.modelB.modelName} (B)</th>
                        <th className="py-2.5 px-3 text-center">Delta (A vs B)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">ROC-AUC (Discrimination)</td>
                        <td className="py-2.5 px-3 text-blue-400 font-bold">{comparisonResult.modelA.evaluationMetrics.rocAuc.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-purple-400 font-bold">{comparisonResult.modelB.evaluationMetrics.rocAuc.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            comparisonResult.metricDeltas.rocAucDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {comparisonResult.metricDeltas.rocAucDelta >= 0 ? '+' : ''}
                            {(comparisonResult.metricDeltas.rocAucDelta * 100).toFixed(2)}%
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">PR-AUC (Precision-Recall)</td>
                        <td className="py-2.5 px-3 text-blue-400 font-bold">{comparisonResult.modelA.evaluationMetrics.prAuc.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-purple-400 font-bold">{comparisonResult.modelB.evaluationMetrics.prAuc.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            comparisonResult.metricDeltas.prAucDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {comparisonResult.metricDeltas.prAucDelta >= 0 ? '+' : ''}
                            {(comparisonResult.metricDeltas.prAucDelta * 100).toFixed(2)}%
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">Precision</td>
                        <td className="py-2.5 px-3">{comparisonResult.modelA.evaluationMetrics.precision.toFixed(4)}</td>
                        <td className="py-2.5 px-3">{comparisonResult.modelB.evaluationMetrics.precision.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-slate-300">{comparisonResult.metricDeltas.precisionDelta >= 0 ? '+' : ''}{comparisonResult.metricDeltas.precisionDelta.toFixed(4)}</span>
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">Recall</td>
                        <td className="py-2.5 px-3">{comparisonResult.modelA.evaluationMetrics.recall.toFixed(4)}</td>
                        <td className="py-2.5 px-3">{comparisonResult.modelB.evaluationMetrics.recall.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-slate-300">{comparisonResult.metricDeltas.recallDelta >= 0 ? '+' : ''}{comparisonResult.metricDeltas.recallDelta.toFixed(4)}</span>
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">F1 Score</td>
                        <td className="py-2.5 px-3 font-bold text-amber-300">{comparisonResult.modelA.evaluationMetrics.f1Score.toFixed(4)}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-300">{comparisonResult.modelB.evaluationMetrics.f1Score.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            comparisonResult.metricDeltas.f1ScoreDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {comparisonResult.metricDeltas.f1ScoreDelta >= 0 ? '+' : ''}
                            {comparisonResult.metricDeltas.f1ScoreDelta.toFixed(4)}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">Log Loss (↓)</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{comparisonResult.modelA.evaluationMetrics.logLoss.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{comparisonResult.modelB.evaluationMetrics.logLoss.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            comparisonResult.metricDeltas.logLossDelta <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {comparisonResult.metricDeltas.logLossDelta <= 0 ? '' : '+'}
                            {comparisonResult.metricDeltas.logLossDelta.toFixed(4)}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">Brier Score (↓)</td>
                        <td className="py-2.5 px-3 text-cyan-300 font-bold">{comparisonResult.modelA.evaluationMetrics.brierScore.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-cyan-300 font-bold">{comparisonResult.modelB.evaluationMetrics.brierScore.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            comparisonResult.metricDeltas.brierScoreDelta <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {comparisonResult.metricDeltas.brierScoreDelta <= 0 ? '' : '+'}
                            {comparisonResult.metricDeltas.brierScoreDelta.toFixed(4)}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-300">Expected Calibration Error (ECE)</td>
                        <td className="py-2.5 px-3">{((comparisonResult.modelA.evaluationMetrics.expectedCalibrationError || 0.01) * 100).toFixed(2)}%</td>
                        <td className="py-2.5 px-3">{((comparisonResult.modelB.evaluationMetrics.expectedCalibrationError || 0.01) * 100).toFixed(2)}%</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-slate-300">
                            {comparisonResult.metricDeltas.eceDelta <= 0 ? '' : '+'}
                            {(comparisonResult.metricDeltas.eceDelta * 100).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          PROMOTION MODAL (ADMIN / ANALYST)
          ========================================================================= */}
      {promotionModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Promote Model to Production Champion</h4>
              </div>
              <button onClick={() => setPromotionModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Promoting <span className="font-mono text-emerald-400 font-bold">{targetPromoteVersion}</span> will make it the active prediction engine. The current champion will be archived to CANDIDATE status.
            </p>

            <form onSubmit={handlePromote} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Justification & Actuarial Governance Note <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={promotionRationale}
                  onChange={(e) => setPromotionRationale(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="Document reason for promotion (e.g. higher ROC-AUC, improved ECE, lower Brier Score)..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromotionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Promotion & Audit Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RETIREMENT MODAL (ADMIN ONLY)
          ========================================================================= */}
      {retirementModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <Archive className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Retire Obsolete Model</h4>
              </div>
              <button onClick={() => setRetirementModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Retiring <span className="font-mono text-rose-400 font-bold">{targetRetireVersion}</span> permanently archives this model version.
            </p>

            <form onSubmit={handleRetire} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Retirement Rationale <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={retirementRationale}
                  onChange={(e) => setRetirementRationale(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  placeholder="Document reason for retirement..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRetirementModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Confirm Retirement & Audit Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          THRESHOLD / CONFIG MODAL (ADMIN)
          ========================================================================= */}
      {thresholdModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sliders className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Adjust Decision Threshold</h4>
              </div>
              <button onClick={() => setThresholdModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Update the operating decision threshold for <span className="font-mono text-indigo-400 font-bold">{targetConfigVersion}</span>.
            </p>

            <form onSubmit={handleUpdateConfig} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Operating Decision Threshold (0.01 - 0.50)
                </label>
                <input
                  type="number"
                  step="0.005"
                  min="0.01"
                  max="0.50"
                  value={newThresholdValue}
                  onChange={(e) => setNewThresholdValue(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Actuarial Rationale for Threshold Adjustment <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={configRationale}
                  onChange={(e) => setConfigRationale(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Reason for threshold change (e.g. loss ratio target, cost asymmetry shift)..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setThresholdModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Update Threshold & Audit Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
