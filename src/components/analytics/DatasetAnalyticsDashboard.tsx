import React, { useState, useMemo } from 'react';
import {
  Database,
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Sliders,
  DollarSign,
  Percent,
  Info,
  RefreshCw,
  Search,
  Grid,
  Scale,
  Sparkles,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  DatasetAnalyticsResult,
  getActiveDatasetAnalytics,
  generateBenchmarkDatasetAnalytics,
  generateDatasetAnalytics
} from '../../services/datasetAnalyticsService';
import { DatasetImportSummary } from '../../services/datasetImportService';

interface DatasetAnalyticsDashboardProps {
  importSummary?: DatasetImportSummary | null;
  onNavigateToUpload?: () => void;
}

export const DatasetAnalyticsDashboard: React.FC<DatasetAnalyticsDashboardProps> = ({
  importSummary,
  onNavigateToUpload
}) => {
  // Current active analytics data
  const [useBenchmark, setUseBenchmark] = useState<boolean>(!importSummary);

  const analyticsData: DatasetAnalyticsResult = useMemo(() => {
    if (importSummary && !useBenchmark) {
      return generateDatasetAnalytics(importSummary, importSummary.previewRows);
    }
    return getActiveDatasetAnalytics();
  }, [importSummary, useBenchmark]);

  // Section navigation
  const [activeTab, setActiveTab] = useState<
    'overview' | 'exploratory' | 'correlations' | 'claims' | 'models' | 'quality'
  >('overview');

  // Exploratory stats selected feature
  const [selectedFeature, setSelectedFeature] = useState<string>(() => {
    return analyticsData.overview.numericalFeatures[0] || '';
  });

  // Search filter for exploratory table
  const [featureSearch, setFeatureSearch] = useState<string>('');

  // Correlation heatmap cell inspection
  const [inspectedPair, setInspectedPair] = useState<{
    featureA: string;
    featureB: string;
    correlation: number;
  } | null>(null);

  const overview = analyticsData.overview;
  const exploratory = analyticsData.exploratoryStats;
  const correlation = analyticsData.correlation;
  const claims = analyticsData.claims;
  const modelInvariants = analyticsData.modelInvariants;
  const quality = analyticsData.qualityReport;

  // Filter exploratory table features
  const filteredNumericFeatures = useMemo(() => {
    return overview.numericalFeatures.filter((f) =>
      f.toLowerCase().includes(featureSearch.toLowerCase())
    );
  }, [overview.numericalFeatures, featureSearch]);

  const activeFeatureStats = exploratory[selectedFeature] || exploratory[overview.numericalFeatures[0]];

  return (
    <div id="dataset-analytics-dashboard" className="space-y-6">
      {/* =========================================================================
          TOP BANNER: DATASET OVERVIEW & HEALTH
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Dataset Analytics Layer
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Phase 4 Actuarial Exploration
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span>{overview.datasetName}</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  overview.health.grade === 'A'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : overview.health.grade === 'B'
                    ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                }`}
              >
                Health {overview.health.score}/100 ({overview.health.grade})
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              Automated empirical distribution profiling, Pearson correlation matrix, zero-inflation claim analytics, and data quality boundary diagnostics.
            </p>
          </div>

          {/* Dataset Switcher & Upload Quick Link */}
          <div className="flex flex-wrap items-center gap-2.5">
            {importSummary && (
              <button
                onClick={() => setUseBenchmark(!useBenchmark)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                {useBenchmark ? 'Switch to Uploaded File' : 'Switch to MTPL Benchmark'}
              </button>
            )}

            {onNavigateToUpload && (
              <button
                onClick={onNavigateToUpload}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Import New Dataset
              </button>
            )}
          </div>
        </div>

        {/* Dataset Overview KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Rows</span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-1">
              {overview.totalRows.toLocaleString()}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Columns</span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-1">
              {overview.totalColumns}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Numerical</span>
            <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-1">
              {overview.numericalCount}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Categorical</span>
            <p className="text-sm font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-1">
              {overview.categoricalCount}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Missing Cells</span>
            <p
              className={`text-sm font-extrabold font-mono mt-1 ${
                overview.missingValues.count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
              }`}
            >
              {overview.missingValues.count.toLocaleString()} ({overview.missingValues.percentage}%)
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Duplicates</span>
            <p
              className={`text-sm font-extrabold font-mono mt-1 ${
                overview.duplicateRecords.count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
              }`}
            >
              {overview.duplicateRecords.count.toLocaleString()} ({overview.duplicateRecords.percentage}%)
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Variable</span>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-1.5 font-mono">
              {overview.targetVariable || 'Not Defined'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</span>
            <p
              className={`text-xs font-bold truncate mt-1.5 ${
                overview.health.status === 'Passed' ? 'text-emerald-600' : 'text-amber-500'
              }`}
            >
              {overview.health.status}
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUB-NAVIGATION TABS
         ========================================================================= */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard Overview
        </button>

        <button
          onClick={() => setActiveTab('exploratory')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'exploratory'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Exploratory Statistics &amp; Distributions
        </button>

        <button
          onClick={() => setActiveTab('correlations')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'correlations'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Grid className="w-4 h-4" />
          Correlation Matrix ({correlation.numericalColumns.length} Variables)
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'claims'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Claim &amp; Actuarial Analysis
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'models'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Predicted vs Actual &amp; Residuals
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'quality'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Data Quality Report
        </button>
      </div>

      {/* =========================================================================
          TAB 1: DASHBOARD OVERVIEW & KEY ACTUARIAL SUMMARY
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Actuarial Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Claim Frequency</span>
                <Percent className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
                {claims.claimFrequencyPercent}%
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {claims.totalClaims.toLocaleString()} claims in {claims.totalPolicies.toLocaleString()} policies
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Claim Severity</span>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
                ${claims.claimSeverityUSD.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Average payout per positive claim event
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Actuarial Pure Premium</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-2">
                ${claims.purePremiumUSD.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Frequency × Severity (loss cost per unit)
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total Incurred Losses</span>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
                ${claims.totalClaimAmountUSD.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Median loss: ${claims.medianClaimAmountUSD.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Two-Column Visual Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart: Claim Occurrence Distribution */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Claim Occurrence Distribution (Zero-Inflation)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Empirical binary breakdown of claim vs non-claim policies
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                  Ratio {quality.potentialIssues.classImbalance.imbalanceRatio}
                </span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={claims.claimDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${Number(val).toLocaleString()} records (${item.payload.percentage}%)`,
                        'Count'
                      ]}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {claims.claimDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Top Correlated Feature Pairs */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Primary Numerical Associations
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Highest magnitude Pearson correlations between valid numerical variables
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('correlations')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  View Full Heatmap <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {correlation.pairs.slice(0, 5).map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {pair.featureA} <span className="text-slate-400 font-normal">↔</span> {pair.featureB}
                      </span>
                      <p className="text-[10px] text-slate-500 capitalize">
                        {pair.strength.replace('_', ' ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pair.correlation >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.abs(pair.correlation) * 100}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono font-bold w-12 text-right ${
                          pair.correlation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}
                      >
                        {pair.correlation > 0 ? `+${pair.correlation}` : pair.correlation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: EXPLORATORY STATISTICS & DISTRIBUTIONS
         ========================================================================= */}
      {activeTab === 'exploratory' && (
        <div className="space-y-6">
          {/* Feature Distribution Interactive Visualizer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Distribution Histogram
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Feature Distribution: <span className="font-mono text-blue-600">{activeFeatureStats?.column}</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  10-bin frequency distribution with Welford sample moments and quartile reference lines.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Select Feature:
                </label>
                <select
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {overview.numericalFeatures.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feature Moment Chips */}
            {activeFeatureStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-6 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Mean</span>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    {activeFeatureStats.mean.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Median</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                    {activeFeatureStats.median.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Std Dev</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                    {activeFeatureStats.std.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Min</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                    {activeFeatureStats.min.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Q25 (Q1)</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                    {activeFeatureStats.q25.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Q75 (Q3)</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                    {activeFeatureStats.q75.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Max</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                    {activeFeatureStats.max.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Missing</span>
                  <p className={`text-xs font-bold font-mono mt-0.5 ${activeFeatureStats.missingCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {activeFeatureStats.missingPercentage}%
                  </p>
                </div>
              </div>
            )}

            {/* Distribution Chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeFeatureStats?.distribution || []} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="binLabel" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${Number(val).toLocaleString()} records (${item.payload.percentage}%)`,
                      'Count'
                    ]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Numerical Exploratory Summary Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-50/70 dark:bg-slate-800/40">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Exploratory Statistics Matrix
                </h3>
                <p className="text-[11px] text-slate-500">
                  Comprehensive parametric and non-parametric distribution parameters
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter numerical features..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Feature Column</th>
                    <th className="p-3 text-right">Valid Count</th>
                    <th className="p-3 text-right">Missing %</th>
                    <th className="p-3 text-right">Mean</th>
                    <th className="p-3 text-right">Median</th>
                    <th className="p-3 text-right">Std Dev</th>
                    <th className="p-3 text-right">Min</th>
                    <th className="p-3 text-right">Q25 (Q1)</th>
                    <th className="p-3 text-right">Q75 (Q3)</th>
                    <th className="p-3 text-right">Max</th>
                    <th className="p-3 text-right">IQR</th>
                    <th className="p-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredNumericFeatures.map((col) => {
                    const s = exploratory[col];
                    if (!s) return null;
                    const isSelected = selectedFeature === col;
                    return (
                      <tr
                        key={col}
                        onClick={() => setSelectedFeature(col)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-transparent'}`}
                          />
                          {col}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                          {s.count.toLocaleString()}
                        </td>
                        <td
                          className={`p-3 text-right ${
                            s.missingCount > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {s.missingPercentage}%
                        </td>
                        <td className="p-3 text-right text-blue-600 dark:text-blue-400 font-bold">
                          {s.mean.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-800 dark:text-slate-200">
                          {s.median.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                          {s.std.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                          {s.min.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                          {s.q25.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                          {s.q75.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                          {s.max.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                          {s.iqr.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFeature(col);
                            }}
                            className="px-2 py-1 rounded text-[10px] font-sans font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                          >
                            Chart
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CORRELATION MATRIX ANALYSIS
         ========================================================================= */}
      {activeTab === 'correlations' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    Pearson r Matrix
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Numerical Correlation Matrix
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Calculated exclusively between appropriate continuous numerical features. Categorical variables are strictly excluded to avoid spurious linear correlations.
                </p>
              </div>

              {/* Color Scale Legend */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-rose-600 font-bold">-1.0 (Inverse)</span>
                <div className="h-3 w-28 rounded-full bg-gradient-to-r from-rose-500 via-slate-200 to-emerald-500 border border-slate-300 dark:border-slate-700" />
                <span className="text-emerald-600 font-bold">+1.0 (Positive)</span>
              </div>
            </div>

            {/* Matrix Heatmap Grid */}
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800 min-w-[120px]">
                      Feature
                    </th>
                    {correlation.numericalColumns.map((col) => (
                      <th
                        key={col}
                        className="p-2 text-center text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 min-w-[75px] truncate max-w-[100px]"
                        title={col}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlation.numericalColumns.map((rowCol, rIdx) => (
                    <tr key={rowCol} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="p-2 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {rowCol}
                      </td>
                      {correlation.numericalColumns.map((colCol, cIdx) => {
                        const rVal = correlation.matrix[rIdx]?.[cIdx] ?? 0;
                        const isDiag = rIdx === cIdx;

                        // Color coding based on correlation magnitude
                        let bgClass = 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
                        if (isDiag) {
                          bgClass = 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold';
                        } else if (rVal >= 0.5) {
                          bgClass = 'bg-emerald-200 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold';
                        } else if (rVal >= 0.2) {
                          bgClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium';
                        } else if (rVal <= -0.5) {
                          bgClass = 'bg-rose-200 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-bold';
                        } else if (rVal <= -0.2) {
                          bgClass = 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-medium';
                        }

                        return (
                          <td
                            key={colCol}
                            onClick={() =>
                              setInspectedPair({
                                featureA: rowCol,
                                featureB: colCol,
                                correlation: rVal
                              })
                            }
                            className={`p-2 text-center font-mono text-[11px] cursor-pointer hover:ring-2 hover:ring-blue-500 rounded transition-all ${bgClass}`}
                            title={`${rowCol} ↔ ${colCol}: r = ${rVal}`}
                          >
                            {isDiag ? '1.00' : rVal > 0 ? `+${rVal.toFixed(2)}` : rVal.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Cell Deep Inspection */}
            {inspectedPair && (
              <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                    Pairwise Association Inspection
                  </h4>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {inspectedPair.featureA} <span className="text-slate-400">and</span> {inspectedPair.featureB}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {inspectedPair.correlation === 1
                      ? 'Self-identity (1.00 correlation).'
                      : Math.abs(inspectedPair.correlation) >= 0.5
                      ? 'Substantial linear correlation. Monitor for multicollinearity in Generalized Linear Models.'
                      : Math.abs(inspectedPair.correlation) >= 0.2
                      ? 'Mild linear association. Provides orthogonal predictive variance.'
                      : 'Near-zero linear dependence. Statistically independent variables.'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-500 block">Pearson r</span>
                  <span
                    className={`text-xl font-extrabold font-mono ${
                      inspectedPair.correlation >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {inspectedPair.correlation > 0 ? `+${inspectedPair.correlation}` : inspectedPair.correlation}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: CLAIM & ACTUARIAL ANALYSIS
         ========================================================================= */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          {/* Actuarial Claim Breakdown Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Loss Modeling
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Underwriting Claim Severity &amp; Exposure Analysis
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Claim Frequency</span>
                <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-1">
                  {claims.claimFrequencyPercent}%
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Average Severity</span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                  ${claims.claimSeverityUSD.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Median Claim</span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                  ${claims.medianClaimAmountUSD.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Loss Cost / Policy</span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                  ${claims.averageClaimAmountUSD.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Pure Premium</span>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  ${claims.purePremiumUSD.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Gross Premium</span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                  ${claims.averagePremiumUSD.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Incurred</span>
                <p className="text-base font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-1">
                  ${claims.totalClaimAmountUSD.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Claim Visualizations: Frequency by Category & Amount Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart: Claim Frequency by Category */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Claim Frequency Across Segments (%)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Empirical claim rate partitioned by key categorical dimensions
                </p>
              </div>

              {Object.keys(claims.claimFrequencyByCategory).length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.values(claims.claimFrequencyByCategory)[0] || []}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" stroke="#64748b" fontSize={11} unit="%" />
                      <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={11} width={90} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${val}% (${item.payload.claimCount} claims / ${item.payload.totalPolicies} policies)`,
                          'Frequency'
                        ]}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Bar dataKey="claimFrequencyPercent" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                  No categorical segments available for claim frequency breakdown.
                </div>
              )}
            </div>

            {/* Chart: Claim Amount Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Claim Severity Payout Distribution
                </h3>
                <p className="text-[11px] text-slate-500">
                  Loss amount tier distribution for positive indemnities (Median: ${claims.medianClaimAmountUSD.toLocaleString()})
                </p>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={claims.claimAmountDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${Number(val).toLocaleString()} claims (${item.payload.percentage}%)`,
                        'Payouts'
                      ]}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: PREDICTED VS ACTUAL & RESIDUAL DISTRIBUTION
         ========================================================================= */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Predicted vs Actual Calibration Curve */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Calibration
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Predicted vs Actual Risk Tiers
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Comparison between predicted claim rate and empirical observed claims across partitioned risk deciles.
                </p>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={modelInvariants.predictedVsActual} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="riskTier" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="predictedRate"
                      name="Predicted Probability (%)"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actualRate"
                      name="Observed Empirical Rate (%)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Residual Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Error Dispersion
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Model Residual Distribution (y - ŷ)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Error bounds highlighting zero-inflation calibration (MSE: {modelInvariants.meanSquaredError}, MAE: {modelInvariants.meanAbsoluteError}).
                </p>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelInvariants.residualDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="binLabel" stroke="#64748b" fontSize={10} angle={-10} textAnchor="end" />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${Number(val).toLocaleString()} policies (${item.payload.percentage}%)`,
                        'Count'
                      ]}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: DATA QUALITY REPORT (DETECTED VS POTENTIAL)
         ========================================================================= */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          {/* Header Explanation */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Comprehensive Data Quality &amp; Underwriting Audit
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Actuarial standards require rigorous differentiation between verifiable deterministic defects (Detected) and statistical risk signals (Potential). The original imported dataset remains unaltered.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION A: DETECTED DATA DEFECTS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                  Detected Data Attributes (Empirical Facts)
                </h4>
              </div>

              {/* Detected Metric Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Missing Cells</span>
                  <p className="text-sm font-extrabold font-mono mt-1 text-slate-800 dark:text-slate-200">
                    {quality.detectedIssues.totalMissingCells.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {quality.detectedIssues.missingCellPercent}% of total
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Duplicate Rows</span>
                  <p className="text-sm font-extrabold font-mono mt-1 text-slate-800 dark:text-slate-200">
                    {quality.detectedIssues.duplicateRows.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {quality.detectedIssues.duplicateRowPercent}% of total
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Invalid Values</span>
                  <p className="text-sm font-extrabold font-mono mt-1 text-slate-800 dark:text-slate-200">
                    {quality.detectedIssues.invalidValues}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">Non-numeric cells</span>
                </div>
              </div>

              {/* Column Missingness Breakdown */}
              <div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Columns with Missing Values
                </h5>

                {quality.detectedIssues.columnsWithMissing.length === 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    Zero missing cells detected across all dataset features.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {quality.detectedIssues.columnsWithMissing.map((col) => (
                      <div
                        key={col.column}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs"
                      >
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {col.column}
                        </span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {col.missingCount.toLocaleString()} ({col.missingPercent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION B: POTENTIAL STATISTICAL ISSUES */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                  Potential Issues (Statistical Inferences)
                </h4>
              </div>

              {/* Class Imbalance Diagnosis */}
              <div className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" />
                    Target Variable Imbalance
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    Ratio {quality.potentialIssues.classImbalance.imbalanceRatio}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  {quality.potentialIssues.classImbalance.actuarialInterpretation}
                </p>
              </div>

              {/* Statistical Outliers (1.5x IQR Rule) */}
              <div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Potential Outliers (Tukey 1.5×IQR Rule)
                </h5>

                {quality.potentialIssues.outlierSummary.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No extreme statistical outliers detected beyond the 1.5×IQR boundary.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {quality.potentialIssues.outlierSummary.map((out) => (
                      <div
                        key={out.column}
                        className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs"
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {out.column}
                          </span>
                          <span className="text-amber-600 font-mono font-bold">
                            {out.outlierCount.toLocaleString()} outliers ({out.outlierPercent}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {out.rationale}. Note: Large insurance claim payouts or luxury vehicle valuations are valid loss representations, not data corruption.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
