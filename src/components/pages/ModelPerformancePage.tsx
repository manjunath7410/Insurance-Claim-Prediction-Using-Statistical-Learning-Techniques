import React, { useState, useEffect } from 'react';
import {
  BENCHMARK_METRICS,
  ROC_CURVES_DATA,
  LORENZ_GINI_DATA,
  CALIBRATION_BINS,
} from '../../services/statisticalModels';
import { ModelType, RegistryModelRecord, ModelComparisonSideBySide } from '../../types';
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
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database,
  Calendar,
  Lock,
  Cpu,
} from 'lucide-react';

interface ModelPerformancePageProps {
  selectedModel?: ModelType;
  onSelectModel?: (model: ModelType) => void;
}

export const ModelPerformancePage: React.FC<ModelPerformancePageProps> = ({
  selectedModel = 'glm_logistic_gamma',
  onSelectModel,
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'curves' | 'registry'>('comparison');
  const [activeCurveTab, setActiveCurveTab] = useState<'roc' | 'lorenz' | 'calibration'>('roc');
  const [registryModels, setRegistryModels] = useState<RegistryModelRecord[]>([]);
  const [activeChampionVersion, setActiveChampionVersion] = useState<string>('v1.2.0-gbdt-calibrated-platt');
  const [loading, setLoading] = useState<boolean>(false);

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

  useEffect(() => {
    fetchRegistry();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Model Diagnostics & Registry
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Statistical Benchmark Validation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Model Performance & Benchmarks
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Compare statistical regression with machine-learning ensembles, ROC-AUC, Gini, and calibration curves.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Active Champion</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                GBDT Tweedie (v1.2.0)
              </span>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Model Performance Comparison
          </button>
          <button
            onClick={() => setActiveTab('curves')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'curves'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            ROC, Gini & Calibration Curves
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Model Registry & Governance
          </button>
        </div>
      </div>

      {/* SUB-PAGE 1: Clean Comparison Table */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  MODEL PERFORMANCE COMPARISON
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Statistical discrimination and calibration metrics validated on holdout test set
                </p>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Holdout Test Set ($N=2,000$)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800 pb-3">
                  <tr>
                    <th className="py-3 px-3">Model Architecture</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">ROC-AUC</th>
                    <th className="py-3 px-3">Gini Index</th>
                    <th className="py-3 px-3">Brier Score</th>
                    <th className="py-3 px-3">Latency</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {BENCHMARK_METRICS.map((model) => {
                    const isChampion = model.modelId === 'gradient_boosting_tweedie';
                    const isRegression = model.modelId === 'glm_logistic_gamma';

                    return (
                      <tr
                        key={model.modelId}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          isChampion ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {model.modelName}
                            </span>
                            {isChampion && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                Champion Model
                              </span>
                            )}
                            {isRegression && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                Prediction Page Engine
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 text-xs">
                          {model.techniqueCategory}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {model.rocAuc.toFixed(3)}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {model.giniCoefficient.toFixed(3)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {model.brierScore.toFixed(4)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {model.inferenceLatencyMs} ms
                        </td>
                        <td className="py-3.5 px-3">
                          {isChampion ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                              <Award className="w-3.5 h-3.5" />
                              Champion
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-semibold">
                              Candidate
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Note on Statistical Regression Separation */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-900 dark:text-blue-200 block mb-0.5">
                  Actuarial Modeling Architecture Note:
                </span>
                <span>
                  The simple Insurance Claim Prediction page utilizes the <strong>GLM Logistic Regression</strong> statistical engine with a logit link function to provide transparent, linear risk factor attributions. The production ML Champion (Gradient Boosted Trees) serves as an advanced non-linear comparison benchmark.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PAGE 2: Interactive Curves */}
      {activeTab === 'curves' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Model Discrimination & Reliability Curves
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualizing ranking power and empirical calibration
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveCurveTab('roc')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeCurveTab === 'roc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                ROC Curves
              </button>
              <button
                onClick={() => setActiveCurveTab('lorenz')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeCurveTab === 'lorenz'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Lorenz Gini Curve
              </button>
              <button
                onClick={() => setActiveCurveTab('calibration')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeCurveTab === 'calibration'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Calibration Diagram
              </button>
            </div>
          </div>

          {activeCurveTab === 'roc' && (
            <div className="space-y-4">
              <div className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ROC_CURVES_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="x" tick={{ fontSize: 11 }} label={{ value: 'False Positive Rate', position: 'bottom', offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'True Positive Rate', angle: -90, position: 'left', fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="gbdt" name="GBDT (AUC=0.864)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="hurdle" name="Hurdle (AUC=0.841)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rf" name="Random Forest (AUC=0.835)" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="glm" name="GLM Logistic (AUC=0.812)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="baseline" name="Random Baseline" stroke="#94a3b8" strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeCurveTab === 'lorenz' && (
            <div className="space-y-4">
              <div className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={LORENZ_GINI_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="x" tick={{ fontSize: 11 }} label={{ value: 'Cumulative % of Earned Exposure', position: 'bottom', offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'Cumulative % of Total Losses', angle: -90, position: 'left', fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="gbdt" name="GBDT (Gini=0.728)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="hurdle" name="Hurdle (Gini=0.682)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="glm" name="GLM (Gini=0.624)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="baseline" name="Line of Equality (Gini=0)" stroke="#94a3b8" strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeCurveTab === 'calibration' && (
            <div className="space-y-4">
              <div className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={CALIBRATION_BINS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="meanPredicted" tick={{ fontSize: 11 }} label={{ value: 'Mean Predicted Probability', position: 'bottom', offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'Observed Empirical Frequency', angle: -90, position: 'left', fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="observedFrequency" name="Observed Loss Rate" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="meanPredicted" name="Perfect Calibration ($y=x$)" stroke="#10b981" strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-PAGE 3: Registry & Governance */}
      {activeTab === 'registry' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Production Model Registry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audited model artifacts, version tags, and champion designations
              </p>
            </div>
            <button
              onClick={fetchRegistry}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Registry</span>
            </button>
          </div>

          <div className="space-y-3">
            {registryModels.length > 0 ? (
              registryModels.map((m) => {
                const isActive = m.status === 'CHAMPION';
                return (
                  <div
                    key={m.version}
                    className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {m.version}
                        </span>
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            CHAMPION
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {m.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {m.modelName} — {m.algorithm}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      <span>ROC-AUC: <strong>{m.metrics?.rocAuc?.toFixed(3) || '0.842'}</strong></span>
                      <span>Cutoff: <strong>{((m.config?.decisionThreshold || 0.08) * 100).toFixed(1)}%</strong></span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Loading registry model records...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
