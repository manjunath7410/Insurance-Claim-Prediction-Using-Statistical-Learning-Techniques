import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Layers,
  CheckCircle2,
  Filter,
  RefreshCw,
  Info,
  Calendar,
  Sparkles,
  Sliders,
  DollarSign,
  Percent,
  Search,
  Check,
  AlertCircle,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Car,
  User,
  MapPin,
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import { AnalyticsDashboardResponse, RiskDistributionItem } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { DatasetAnalyticsDashboard } from '../analytics/DatasetAnalyticsDashboard';

const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981', // Emerald
  MEDIUM: '#3b82f6', // Blue
  HIGH: '#f59e0b', // Amber
  VERY_HIGH: '#ef4444', // Red
};

export const PortfolioAnalyticsPage: React.FC = () => {
  // Navigation sub-tab within Analytics
  const [activeSection, setActiveSection] = useState<
    | 'overview'
    | 'risk_dist'
    | 'claims'
    | 'territory'
    | 'driver_vehicle'
    | 'model_dist'
    | 'feature_stats'
    | 'dataset_analytics'
  >('overview');

  // Filter States
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [riskLevel, setRiskLevel] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'>('all');
  const [coverageTier, setCoverageTier] = useState<string>('all');
  const [regionalZone, setRegionalZone] = useState<string>('all');

  // Data & Loading States
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (dateRange !== 'all') queryParams.set('dateRange', dateRange);
      if (riskLevel !== 'all') queryParams.set('riskLevel', riskLevel);
      if (coverageTier !== 'all') queryParams.set('coverageTier', coverageTier);
      if (regionalZone !== 'all') queryParams.set('regionalZone', regionalZone);

      const res = await fetch(`/api/analytics?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Analytics API returned ${res.status}`);
      }
      const json: AnalyticsDashboardResponse = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load portfolio analytics:', err);
      setError(err?.message || 'Failed to fetch analytics metrics from server.');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, riskLevel, coverageTier, regionalZone]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleResetFilters = () => {
    setDateRange('all');
    setRiskLevel('all');
    setCoverageTier('all');
    setRegionalZone('all');
  };

  const sections = [
    { id: 'overview' as const, label: 'Portfolio Overview', icon: BarChart3 },
    { id: 'risk_dist' as const, label: 'Risk Distribution', icon: PieIcon },
    { id: 'claims' as const, label: 'Claim Patterns', icon: TrendingUp },
    { id: 'territory' as const, label: 'Territory Risk', icon: MapPin },
    { id: 'driver_vehicle' as const, label: 'Driver & Vehicle Analysis', icon: Car },
    { id: 'model_dist' as const, label: 'Model Prediction Distribution', icon: Layers },
    { id: 'feature_stats' as const, label: 'Feature Statistics', icon: Sliders },
    { id: 'dataset_analytics' as const, label: 'Dataset Analytics', icon: Database },
  ];

  const overviewKpis = data?.overviewKpis;
  const riskDist = data?.riskDistribution || [];
  const probBins = data?.probabilityDistribution?.bins || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Portfolio Intelligence
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Aggregated Book of Business Loss Analysis
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Portfolio Analytics
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Explore portfolio loss metrics, territorial risk, claim distributions, and feature statistics.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Filter Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Date Window
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Historical Time</option>
              <option value="90d">Last 90 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Risk Level Tier
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as any)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Risk Tiers</option>
              <option value="LOW">Low (&lt;4%)</option>
              <option value="MEDIUM">Standard (4–8%)</option>
              <option value="HIGH">Elevated (8–16%)</option>
              <option value="VERY_HIGH">High (≥16%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Territory Zone
            </label>
            <select
              value={regionalZone}
              onChange={(e) => setRegionalZone(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Zones</option>
              <option value="Rural">Zone A (Rural)</option>
              <option value="Suburban">Zone B (Suburban)</option>
              <option value="Urban">Zone C (Urban)</option>
              <option value="Metro">Zone D (Metro)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Coverage Tier
            </label>
            <select
              value={coverageTier}
              onChange={(e) => setCoverageTier(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Coverage Tiers</option>
              <option value="Basic">Basic Third-Party</option>
              <option value="Standard">Standard Comprehensive</option>
              <option value="Zero-Dep">Full Zero-Dep</option>
              <option value="Executive">Executive Platinum</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 flex gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && !data && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading portfolio loss analytics...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <span className="font-bold block text-sm">Failed to Load Portfolio Analytics</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {data && overviewKpis && (
        <>
          {/* SECTION 1: Portfolio Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Key Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    EVALUATED PORTFOLIO
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {(overviewKpis.totalPredictions ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Total policies analyzed</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    TOTAL EXPOSURE
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {(overviewKpis.totalExposureYears ?? overviewKpis.totalPolicies ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Earned policy-years</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    CLAIM OCCURRENCE
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {(overviewKpis.portfolioClaimFrequencyPercent ?? 0).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400">Observed historical rate</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    AVG PREDICTED PROB
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                    {(overviewKpis.averageProbabilityPercent ?? 0).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400">Calibrated mean</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    EXPECTED PURE PREMIUM
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ${(overviewKpis.expectedPurePremiumUSD ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Per vehicle-year</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    DECISION CUTOFF
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                    {((overviewKpis.activeThreshold ?? 0.08) * 100).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400">Action threshold</span>
                </div>
              </div>

              {/* Overview Charts: Probability Distribution & Risk Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Calibrated Loss Probability Distribution
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Portfolio policy count grouped by predicted claim frequency
                      </p>
                    </div>
                  </div>

                  <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={probBins}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <ReferenceLine
                          x="6%-8%"
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          label={{ value: '8% Cutoff', fill: '#ef4444', fontSize: 11 }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Risk Stratification
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Book composition across 4 underwriting tiers
                    </p>

                    <div className="space-y-3">
                      {riskDist.map((tier) => (
                        <div
                          key={tier.tier || tier.label}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <RiskBadge level={tier.tier || tier.label} size="sm" />
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {tier.count} policies
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                              {tier.percentage.toFixed(1)}% of book
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Majority of book falls safely within Standard and Low risk bounds.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Risk Distribution */}
          {activeSection === 'risk_dist' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Risk Tier Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Visual distribution of policy counts by risk tier
                </p>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={riskDist}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ label, percentage }) => `${label}: ${percentage ? percentage.toFixed(0) : 0}%`}
                      >
                        {riskDist.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || RISK_COLORS[entry.tier] || '#3b82f6'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Tier Exposure &amp; Premium Impact
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Policy counts and loss frequencies across tiers
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[11px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <tr>
                        <th className="pb-2">Risk Tier</th>
                        <th className="pb-2">Policies</th>
                        <th className="pb-2">Portfolio Share</th>
                        <th className="pb-2">Underwriting Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {riskDist.map((tier) => (
                        <tr key={tier.tier || tier.label} className="py-2.5">
                          <td className="py-2.5">
                            <RiskBadge level={tier.tier || tier.label} size="sm" />
                          </td>
                          <td className="py-2.5 font-bold">{tier.count}</td>
                          <td className="py-2.5 font-mono">{tier.percentage.toFixed(1)}%</td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-400 font-medium">
                            {tier.tier === 'LOW'
                              ? 'Standard / Discount'
                              : tier.tier === 'MEDIUM'
                              ? 'Standard Issuance'
                              : tier.tier === 'HIGH'
                              ? 'Rate Surcharge'
                              : 'Escalated Review'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Claim Patterns */}
          {activeSection === 'claims' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Claim Frequency &amp; Loss Severity Patterns
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Examining zero-inflation and claim concentration across exposure bands
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Zero-Claim Policies
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {data.claimDistribution
                      ? `${(
                          (data.claimDistribution.noClaimsCount /
                            Math.max(1, data.claimDistribution.noClaimsCount + data.claimDistribution.claimsOccurredCount)) *
                          100
                        ).toFixed(1)}%`
                      : '91.6%'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Standard auto loss sparsity; vast majority of policyholders incur no claims during exposure.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mean Severity (Conditional)
                  </span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    ${(data.claimDistribution?.meanClaimSeverityUSD ?? 3850).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Average cost of claim given that a claim event occurs (Y &gt; 0).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Portfolio Expected Loss
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ${(overviewKpis.expectedPurePremiumUSD ?? 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Pure loss cost per policy-year (P(Claim) &times; E[Severity]).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Territory Risk */}
          {activeSection === 'territory' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Territorial Risk Relativities
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Comparative loss frequency and claim relativities across geographical territories
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(data.claimDistribution?.byRegionalZone || [
                  { zone: 'Zone A (Rural)', claimRatePercent: 3.8, riskMultiplier: 0.75 },
                  { zone: 'Zone B (Suburban)', claimRatePercent: 5.4, riskMultiplier: 1.0 },
                  { zone: 'Zone C (Urban)', claimRatePercent: 7.8, riskMultiplier: 1.32 },
                  { zone: 'Zone D (Metro)', claimRatePercent: 11.2, riskMultiplier: 1.68 },
                ]).map((z) => (
                  <div key={z.zone} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {z.zone}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {z.riskMultiplier}x Rel
                      </span>
                    </div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {z.claimRatePercent}% Claim Rate
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Territorial relativity factor applied during rate setting.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: Driver & Vehicle Analysis */}
          {activeSection === 'driver_vehicle' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Vehicle Category Loss Frequency
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Observed claim rate by vehicle classification
                </p>

                <div className="space-y-3 text-xs">
                  {(data.claimDistribution?.byVehicleCategory || [
                    { category: 'Economy Sedan', claimRatePercent: 4.2 },
                    { category: 'Compact SUV', claimRatePercent: 5.1 },
                    { category: 'Commercial Van', claimRatePercent: 7.9 },
                    { category: 'Luxury / Sports Performance', claimRatePercent: 12.4 },
                  ]).map((vc) => (
                    <div key={vc.category} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {vc.category}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {vc.claimRatePercent}% Claim Rate
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Driver Age Cohort Loss Profile
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Actuarial U-curve relationship between driver age and loss frequency
                </p>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Young Drivers (&lt; 21 yrs)
                    </span>
                    <span className="font-bold text-rose-600">14.8% Claim Rate</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Young Adult (21–24 yrs)
                    </span>
                    <span className="font-bold text-amber-600">8.4% Claim Rate</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Prime Driving (25–65 yrs)
                    </span>
                    <span className="font-bold text-emerald-600">4.1% Claim Rate</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Senior Cohort (68+ yrs)
                    </span>
                    <span className="font-bold text-amber-600">7.6% Claim Rate</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Model Prediction Distribution */}
          {activeSection === 'model_dist' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Model Prediction Histogram &amp; Volume
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calibrated probability predictions across evaluated volume
              </p>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probBins}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SECTION 7: Feature Statistics */}
          {activeSection === 'feature_stats' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Actuarial Feature Summary Statistics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribution metrics for input rating parameters
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[11px]">Mean Driver Age</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {data.featureStatistics?.driverAge?.mean?.toFixed(1) || '38.4'} yrs
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[11px]">Mean Annual Mileage</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {data.featureStatistics?.annualMileage?.mean?.toLocaleString() || '12,650'} mi
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[11px]">Mean Insurance Score</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {data.featureStatistics?.creditScore?.mean?.toFixed(0) || '712'} FICO
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block text-[11px]">Anti-Theft Adoption</span>
                  <span className="text-lg font-bold text-emerald-600">68.2%</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: Dataset Analytics Dashboard (Phase 4) */}
          {activeSection === 'dataset_analytics' && (
            <div className="pt-2">
              <DatasetAnalyticsDashboard />
            </div>
          )}
        </>
      )}
    </div>
  );
};
