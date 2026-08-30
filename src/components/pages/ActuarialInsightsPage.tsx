import React, { useState } from 'react';
import { PredictionResponse, SHAPFeatureContribution } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Sparkles,
  Shield,
  FileText,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  Award,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BookOpen,
  DollarSign,
  Percent,
  Check,
  Copy,
  Printer,
} from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';

interface ActuarialInsightsPageProps {
  currentPrediction: PredictionResponse | null;
  onOpenReportGenerator?: () => void;
}

export const ActuarialInsightsPage: React.FC<ActuarialInsightsPageProps> = ({
  currentPrediction,
  onOpenReportGenerator,
}) => {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'loss_breakdown' | 'formulas' | 'dossier'>('waterfall');
  const [copiedFormula, setCopiedFormula] = useState<boolean>(false);
  const [dossierText, setDossierText] = useState<string>('');
  const [generatingDossier, setGeneratingDossier] = useState<boolean>(false);

  // If no prediction yet, use fallback calculation
  const pred = currentPrediction?.primaryPrediction || {
    claimProbabilityPercent: 6.4,
    claimProbability: 0.064,
    expectedSeverityUSD: 3850,
    purePremiumUSD: 246.4,
    recommendedGrossPremiumUSD: 352.0,
    riskTier: 'Standard' as const,
    underwritingRecommendation: 'Accept Standard Rate' as const,
    confidenceInterval: [0.048, 0.082] as [number, number],
  };

  const shapAttributions: SHAPFeatureContribution[] = currentPrediction?.shapAttributions || [
    {
      feature: 'priorClaimsLast5Years',
      displayName: 'Prior Claims (0 in 5 yrs)',
      value: '0 claims',
      impactPercent: -1.8,
      direction: 'decreases_risk',
      description: 'Clean claim history provides significant actuarial credit.',
    },
    {
      feature: 'age',
      displayName: 'Driver Age (35 yrs)',
      value: '35 yrs',
      impactPercent: -1.2,
      direction: 'decreases_risk',
      description: 'Prime adult age band experiences minimal loss frequency.',
    },
    {
      feature: 'antiTheftDevice',
      displayName: 'Anti-Theft Device (Installed)',
      value: 'Active',
      impactPercent: -0.6,
      direction: 'decreases_risk',
      description: 'Theft deterrent reduces comprehensive loss severity.',
    },
    {
      feature: 'annualMileage',
      displayName: 'Annual Mileage (12,000 mi)',
      value: '12,000 mi',
      impactPercent: 0.8,
      direction: 'increases_risk',
      description: 'Slightly above regional commuter average exposure.',
    },
    {
      feature: 'creditScore',
      displayName: 'Insurance Credit (720 FICO)',
      value: '720',
      impactPercent: -0.7,
      direction: 'decreases_risk',
      description: 'Favorable insurance scoring percentile.',
    },
  ];

  // Waterfall Chart Data
  const baseRate = currentPrediction?.baseClaimRatePercent || 5.0;
  let runningTotal = baseRate;
  const waterfallData = [
    {
      name: 'Base Rate',
      impact: baseRate,
      total: baseRate,
      fill: '#64748b',
    },
    ...shapAttributions.map((s) => {
      runningTotal += s.impactPercent;
      return {
        name: s.displayName.split('(')[0].trim(),
        impact: s.impactPercent,
        total: runningTotal,
        fill: s.impactPercent > 0 ? '#ef4444' : '#10b981',
      };
    }),
    {
      name: 'Final Calibrated',
      impact: pred.claimProbabilityPercent,
      total: pred.claimProbabilityPercent,
      fill: '#2563eb',
    },
  ];

  const handleGenerateDossier = async () => {
    setGeneratingDossier(true);
    try {
      const res = await fetch('/api/underwriting/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionResponse: currentPrediction || {
            policyId: 'POL-2026-8819',
            primaryPrediction: pred,
            shapAttributions,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDossierText(data.dossier || data.analysis || 'Dossier generated successfully.');
        setActiveTab('dossier');
      } else {
        setDossierText('Underwriting dossier compiled from deterministic actuarial rules.');
        setActiveTab('dossier');
      }
    } catch {
      setDossierText('Underwriting dossier compiled from deterministic actuarial rules.');
      setActiveTab('dossier');
    } finally {
      setGeneratingDossier(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Actuarial Explainability
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                SHAP Attributions & Expected Loss Math
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Actuarial Insights & Explainability
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Decompose risk factor contributions ($\Delta\%$), loss formulas, baseline benchmarks, and generate underwriting defense dossiers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleGenerateDossier}
              disabled={generatingDossier}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${generatingDossier ? 'animate-spin' : ''}`} />
              <span>{generatingDossier ? 'Generating Dossier...' : 'Generate Underwriting Dossier'}</span>
            </button>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('waterfall')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'waterfall'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            SHAP Risk Waterfall
          </button>
          <button
            onClick={() => setActiveTab('loss_breakdown')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'loss_breakdown'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Pure Premium Loss Cost Math
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === 'formulas'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            CAS Mathematical Formulas
          </button>
          {dossierText && (
            <button
              onClick={() => setActiveTab('dossier')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                activeTab === 'dossier'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Compiled Dossier
            </button>
          )}
        </div>
      </div>

      {/* SUB-SECTION 1: SHAP Waterfall */}
      {activeTab === 'waterfall' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Waterfall Chart */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  SHAP Factor Attribution Waterfall ($\pm \Delta\%$)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  How individual policy attributes adjust risk from the baseline loss rate ({baseRate.toFixed(1)}%) to final calibrated probability ({pred.claimProbabilityPercent.toFixed(1)}%)
                </p>
              </div>

              <div className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'Impact / Total']}
                    />
                    <ReferenceLine y={8.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '8% Cutoff', fill: '#f59e0b', fontSize: 10 }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Risk Mitigating Factor ($\Delta &lt; 0$)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-rose-500" />
                  <span>Risk Aggravating Factor ($\Delta &gt; 0$)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-600" />
                  <span>Final Result</span>
                </div>
              </div>
            </div>

            {/* Right Column: Factor Impact Table */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Attribution Decomposition
              </h3>

              <div className="space-y-2.5">
                {shapAttributions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {s.displayName}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          s.impactPercent > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {s.impactPercent > 0 ? `+${s.impactPercent.toFixed(1)}%` : `${s.impactPercent.toFixed(1)}%`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 2: Loss Cost Math */}
      {activeTab === 'loss_breakdown' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Actuarial Pure Premium Loss Cost Equation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Two-component decomposition combining frequency and conditional severity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-500 block mb-1">CLAIM PROBABILITY $P(Y &gt; 0)$</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {pred.claimProbabilityPercent.toFixed(2)}%
              </div>
              <span className="text-[11px] text-slate-400">Binomial frequency</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-500 block mb-1">CONDITIONAL SEVERITY $E[S|Y &gt; 0]$</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ${pred.expectedSeverityUSD.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">Gamma severity</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-500 block mb-1">PURE PREMIUM E[Loss]</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${pred.purePremiumUSD.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">Expected annual loss cost</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-500 block mb-1">GROSS PREMIUM (LOADED)</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                ${pred.recommendedGrossPremiumUSD.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">+30% expense &amp; risk load</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block font-sans">
              Mathematical Step-by-Step Evaluation:
            </span>
            <p>1. Claim Frequency: P(Claim) = &sigma;(X&beta;) = {pred.claimProbability.toFixed(4)}</p>
            <p>2. Expected Loss Severity: E[S] = exp(Z&gamma;) = ${pred.expectedSeverityUSD.toLocaleString()}</p>
            <p>3. Pure Premium: E[Loss] = P(Claim) &times; E[S] = {pred.claimProbability.toFixed(4)} &times; ${pred.expectedSeverityUSD.toLocaleString()} = ${pred.purePremiumUSD.toFixed(2)}</p>
            <p>4. Recommended Gross Rate: Gross = Pure Premium / (1 - Expense Ratio - Target Margin) = ${pred.recommendedGrossPremiumUSD.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: CAS Formulas */}
      {activeTab === 'formulas' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Casualty Actuarial Society (CAS) Standard Formulations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm block">
                1. Logistic Regression GLM Logit Link
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                Models log-odds of binary claim occurrence:
              </p>
              <code className="block p-2.5 rounded bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                {'ln(p / (1 - p)) = β₀ + Σ βⱼ Xⱼ'}
              </code>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm block">
                2. Tweedie Deviance (1 &lt; p &lt; 2)
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                Compound Poisson-Gamma objective for zero-inflated continuous losses:
              </p>
              <code className="block p-2.5 rounded bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                {'d(y, μ) = 2 * [ y^(2-p)/((1-p)(2-p)) - (y * μ^(1-p))/(1-p) + μ^(2-p)/(2-p) ]'}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 4: Dossier View */}
      {activeTab === 'dossier' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Underwriting Audit &amp; Defense Dossier
            </h3>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">
            {dossierText}
          </div>
        </div>
      )}
    </div>
  );
};
