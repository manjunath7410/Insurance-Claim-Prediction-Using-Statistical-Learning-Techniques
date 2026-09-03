import React, { useState } from 'react';
import {
  PredictionResponse,
  SHAPFeatureContribution,
  ModelPrediction,
  ApiPredictionFactor,
} from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Scale,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  Cpu,
  Layers,
  ListFilter,
  Check,
  ChevronRight,
  BookmarkCheck,
  Eye,
  Sliders,
  Sparkles,
  ArrowRight,
  ExternalLink,
  GitCompare,
} from 'lucide-react';

export interface ExplainablePredictionCardProps {
  predictionResponse: PredictionResponse | null;
  policyId: string;
  onNavigateToInsights?: (response: PredictionResponse) => void;
  onNavigateToScenario?: (response: PredictionResponse) => void;
  onLogDecision?: (response: PredictionResponse, notes?: string) => void;
  savedSuccess?: boolean;
  onOpenAICopilot?: (prompt?: string) => void;
}

// Global Feature Importance baseline derived from GBDT/Random Forest training
export const GLOBAL_FEATURE_IMPORTANCE: Array<{
  feature: string;
  displayName: string;
  importancePercent: number;
  description: string;
}> = [
  {
    feature: 'priorClaimsLast5Years',
    displayName: 'Prior Claims History (5-Yr)',
    importancePercent: 28.5,
    description: 'Strongest historical recurrence signal in casualty actuarial science.',
  },
  {
    feature: 'age',
    displayName: 'Driver Age & Maturity',
    importancePercent: 22.4,
    description: 'Youth (<25) and senior (70+) crash risk vs. prime adult baseline.',
  },
  {
    feature: 'annualMileage',
    displayName: 'Annual Mileage (Exposure)',
    importancePercent: 16.8,
    description: 'Cumulative road exposure and vehicular operating hours.',
  },
  {
    feature: 'creditScore',
    displayName: 'Insurance Credit Score',
    importancePercent: 12.5,
    description: 'Actuarial correlation with risk aversion and maintenance habits.',
  },
  {
    feature: 'vehicleCategory',
    displayName: 'Vehicle Category & Value',
    importancePercent: 9.8,
    description: 'Collision severity, acceleration profile, and repair replacement cost.',
  },
  {
    feature: 'regionalZone',
    displayName: 'Regional Territory Zone',
    importancePercent: 6.2,
    description: 'Traffic density, weather hazard rating, and litigation rate index.',
  },
  {
    feature: 'deductible',
    displayName: 'Policy Deductible',
    importancePercent: 3.8,
    description: 'Self-insured retention threshold filtering minor property claims.',
  },
];

export const ExplainablePredictionCard: React.FC<ExplainablePredictionCardProps> = ({
  predictionResponse,
  policyId,
  onNavigateToInsights,
  onNavigateToScenario,
  onLogDecision,
  savedSuccess = false,
  onOpenAICopilot,
}) => {
  // View mode for explanation types
  const [explanationType, setExplanationType] = useState<
    'local' | 'positive' | 'negative' | 'global' | 'inputs'
  >('local');

  // Currency toggle: Default to INR (₹) as requested in Phase 6 requirements
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Interactive selected feature modal/inspector
  const [inspectedFeature, setInspectedFeature] = useState<SHAPFeatureContribution | null>(null);

  // Fallback defaults if predictionResponse is loading
  const input = predictionResponse?.input;
  const primaryPred: ModelPrediction = predictionResponse?.primaryPrediction || {
    modelId: 'glm_logistic_gamma',
    modelName: 'Generalized Linear Model (GLM Logistic + Gamma)',
    claimProbability: 0.064,
    claimProbabilityPercent: 6.4,
    confidenceInterval: [4.8, 8.2],
    expectedSeverityUSD: 3850,
    purePremiumUSD: 246,
    recommendedGrossPremiumUSD: 352,
    riskTier: 'Low Risk',
    riskScore: 32,
    devianceScore: 142.3,
    inferenceTimeMs: 1.8,
    underwritingRecommendation: 'Accept Standard Rate',
  };

  const probPercent = primaryPred.claimProbabilityPercent;
  const probVal = primaryPred.claimProbability;
  const threshold = 0.08; // Calibrated 8.0% underwriting decision threshold
  const isBelowThreshold = probVal < threshold;

  // Standardize Risk Level to Low / Medium / High
  const rawTier = (primaryPred.riskTier || 'Standard').toLowerCase();
  let normalizedRiskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
  if (rawTier.includes('low')) {
    normalizedRiskLevel = 'Low';
  } else if (rawTier.includes('standard') || rawTier.includes('medium') || rawTier.includes('moderate')) {
    normalizedRiskLevel = probPercent < 8.0 ? 'Low' : 'Medium';
  } else {
    normalizedRiskLevel = 'High';
  }

  // Currency conversion formatting helper
  // Exchange benchmark: 1 USD = 83 INR
  const USD_TO_INR_RATE = 83;
  const formatCurrency = (usdAmount: number): string => {
    if (currency === 'INR') {
      const inrAmount = Math.round(usdAmount * USD_TO_INR_RATE);
      return `₹${inrAmount.toLocaleString('en-IN')}`;
    }
    return `$${Math.round(usdAmount).toLocaleString('en-US')}`;
  };

  // SHAP attributions from response
  const shapAttributions: SHAPFeatureContribution[] =
    predictionResponse?.shapAttributions && predictionResponse.shapAttributions.length > 0
      ? predictionResponse.shapAttributions
      : [
          {
            feature: 'priorClaimsLast5Years',
            displayName: 'Prior Claims (0 in 5 yrs)',
            value: '0 claims',
            impactPercent: -12.4,
            direction: 'decreases_risk',
            description: 'Clean claim history provides significant actuarial credit.',
          },
          {
            feature: 'age',
            displayName: 'Driver Age (35 yrs)',
            value: '35 yrs',
            impactPercent: -7.8,
            direction: 'decreases_risk',
            description: 'Prime adult age band experiences minimal loss frequency.',
          },
          {
            feature: 'creditScore',
            displayName: 'Insurance Credit (720 FICO)',
            value: '720',
            impactPercent: -8.5,
            direction: 'decreases_risk',
            description: 'High financial responsibility actuarial discount.',
          },
          {
            feature: 'annualMileage',
            displayName: 'Annual Mileage (12,000 mi)',
            value: '12,000 mi/yr',
            impactPercent: +4.2,
            direction: 'increases_risk',
            description: 'Standard commuter exposure range.',
          },
          {
            feature: 'antiTheftDevice',
            displayName: 'Anti-Theft Telematics',
            value: 'Installed',
            impactPercent: -4.2,
            direction: 'decreases_risk',
            description: 'Certified theft deterrent and tracking.',
          },
        ];

  // Partition into positive (risk increasing) and negative (risk decreasing) contributors
  const positiveContributors = shapAttributions.filter((s) => s.direction === 'increases_risk');
  const negativeContributors = shapAttributions.filter((s) => s.direction === 'decreases_risk');

  // Top influential features for "WHY THIS PREDICTION?" (sorted by absolute impact)
  const sortedByImpact = [...shapAttributions].sort(
    (a, b) => Math.abs(b.impactPercent) - Math.abs(a.impactPercent)
  );
  const topInfluential = sortedByImpact.slice(0, 5);

  // Strictly compliant Human-Readable Explanation generator
  // MANDATE: "Do not claim causality. Use: 'associated with' rather than: 'caused by'"
  const generateHumanReadableExplanation = (): string => {
    if (normalizedRiskLevel === 'High') {
      const drivers = positiveContributors
        .slice(0, 2)
        .map((c) => c.displayName.split('(')[0].trim().toLowerCase());
      const driverPhrase =
        drivers.length > 0
          ? drivers.join(' and ')
          : 'previous claim frequency and elevated exposure';
      return `The predicted claim risk is elevated mainly associated with ${driverPhrase}.`;
    } else if (normalizedRiskLevel === 'Medium') {
      const primaryFactor = sortedByImpact[0]?.displayName.split('(')[0].trim().toLowerCase();
      return `The predicted claim risk is moderate mainly associated with ${
        primaryFactor || 'annual commuter mileage exposure and regional territory'
      }.`;
    } else {
      const drivers = negativeContributors
        .slice(0, 2)
        .map((c) => c.displayName.split('(')[0].trim().toLowerCase());
      const driverPhrase =
        drivers.length > 0
          ? drivers.join(' and ')
          : 'clean claim history and prime driver age demographic';
      return `The predicted claim risk is low mainly associated with ${driverPhrase}.`;
    }
  };

  const humanReadableSummary = generateHumanReadableExplanation();

  // Model metadata for Model Transparency
  const modelUsed = primaryPred.modelName || 'Generalized Linear Model (GLM Logistic + Gamma)';
  const modelVersion = 'v1.2.0-gbdt-calibrated-platt';
  const predictionTimestamp = predictionResponse?.timestamp
    ? new Date(predictionResponse.timestamp).toUTCString()
    : new Date().toUTCString();

  return (
    <div className="space-y-4">
      {/* MAIN PREDICTION RESULT CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        {/* Card Header & Policy Tag */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              PREDICTION RESULT
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {policyId}
            </span>
            {/* Currency Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  currency === 'INR'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Display amounts in Indian Rupees (INR)"
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  currency === 'USD'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Display amounts in US Dollars (USD)"
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* Hero Section: Claim Probability & Claim Risk */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Claim Probability Display */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Claim Probability
              </span>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {probPercent.toFixed(1)}%
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  isBelowThreshold
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {isBelowThreshold ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Below 8.0% action threshold</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Exceeds 8.0% action threshold</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Claim Risk Tier Display */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Claim Risk
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm sm:text-base font-extrabold border ${
                    normalizedRiskLevel === 'Low'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                      : normalizedRiskLevel === 'Medium'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      normalizedRiskLevel === 'Low'
                        ? 'bg-emerald-500'
                        : normalizedRiskLevel === 'Medium'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span>{normalizedRiskLevel} Risk</span>
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {normalizedRiskLevel === 'Low'
                  ? 'Favorable actuarial loss expectancy'
                  : normalizedRiskLevel === 'Medium'
                  ? 'Standard market underwriting tier'
                  : 'Requires rate surcharge or inspection'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Metrics: Predicted Claim Amount & Expected Loss / Pure Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Predicted Claim Amount */}
          <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30">
            <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300 font-semibold mb-1">
              <span>Predicted Claim Amount</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                E[Loss | Claim]
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-200 font-mono">
              {formatCurrency(primaryPred.expectedSeverityUSD)}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Conditional severity mean
            </span>
          </div>

          {/* Expected Loss / Pure Premium */}
          <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300 font-semibold mb-1">
              <span>Expected Loss / Pure Premium</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                P(Claim) × Severity
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
              {formatCurrency(primaryPred.purePremiumUSD)}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Pure risk cost per annual exposure
            </span>
          </div>
        </div>

        {/* HUMAN-READABLE EXPLANATION (Strict Non-Causal Phrasing) */}
        <div className="mb-5 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Underwriting Explanation
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
            &ldquo;{humanReadableSummary}&rdquo;
          </p>
          <div className="mt-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              <strong className="font-semibold text-slate-700 dark:text-slate-300">Actuarial Guardrail:</strong>{' '}
              Expressed as statistical correlation (&ldquo;associated with&rdquo;), not direct causation.
            </span>
          </div>
        </div>

        {/* "WHY THIS PREDICTION?" SECTION */}
        <div className="mb-5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                WHY THIS PREDICTION?
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Most influential rating features based on model SHAP attributions
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Impact on P(Claim)</span>
          </div>

          <div className="space-y-2">
            {topInfluential.map((factor, idx) => {
              const isIncrease = factor.direction === 'increases_risk';
              const sign = isIncrease ? '+' : '';
              const impactFormatted = `${sign}${factor.impactPercent.toFixed(1)}%`;
              return (
                <div
                  key={idx}
                  onClick={() => setInspectedFeature(factor)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isIncrease ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {factor.displayName}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                        Input Value: <strong className="font-mono">{factor.value}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        isIncrease
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {impactFormatted}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-right">
            Click any factor to inspect its actuarial mechanism
          </p>
        </div>

        {/* EXPLANATION TYPES SECTION (Tabs: Local, Positive, Negative, Global, Raw Inputs) */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              EXPLANATION TYPES
            </span>
          </div>

          {/* Explanation Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setExplanationType('local')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                explanationType === 'local'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Local Prediction
            </button>
            <button
              type="button"
              onClick={() => setExplanationType('positive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                explanationType === 'positive'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'
              }`}
            >
              Positive (+Risk)
            </button>
            <button
              type="button"
              onClick={() => setExplanationType('negative')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                explanationType === 'negative'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
              }`}
            >
              Negative (-Risk)
            </button>
            <button
              type="button"
              onClick={() => setExplanationType('global')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                explanationType === 'global'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Global Importance
            </button>
            <button
              type="button"
              onClick={() => setExplanationType('inputs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                explanationType === 'inputs'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Feature Values Used
            </button>
          </div>

          {/* TAB CONTENT: Local Prediction Waterfall */}
          {explanationType === 'local' && (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700/60 font-semibold text-slate-500 dark:text-slate-400">
                <span>Population Base Claim Frequency:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">5.0%</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {shapAttributions.map((s, idx) => {
                  const isPos = s.direction === 'increases_risk';
                  return (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 truncate mr-2">
                        {s.displayName}
                      </span>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          isPos ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isPos ? '+' : ''}
                        {s.impactPercent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700/60 font-bold text-slate-900 dark:text-white">
                <span>Final Calibrated Probability:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {probPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Positive Contributors */}
          {explanationType === 'positive' && (
            <div className="space-y-2">
              {positiveContributors.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  No risk-increasing factors identified. Policyholder benefits from standard or preferred rates.
                </div>
              ) : (
                positiveContributors.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-rose-900 dark:text-rose-300 block">
                        {c.displayName}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        {c.description}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-700 dark:text-rose-400 shrink-0 ml-2">
                      +{c.impactPercent.toFixed(1)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB CONTENT: Negative Contributors */}
          {explanationType === 'negative' && (
            <div className="space-y-2">
              {negativeContributors.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  No discount factors applied. Standard rates apply.
                </div>
              ) : (
                negativeContributors.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                        {c.displayName}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        {c.description}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
                      {c.impactPercent.toFixed(1)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB CONTENT: Global Feature Importance */}
          {explanationType === 'global' && (
            <div className="space-y-2.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                Overall relative predictive power across the validated model benchmark:
              </span>
              {GLOBAL_FEATURE_IMPORTANCE.map((g, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {g.displayName}
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                      {g.importancePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full rounded-full"
                      style={{ width: `${(g.importancePercent / 30) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB CONTENT: Feature Values Used for Prediction */}
          {explanationType === 'inputs' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-2 font-medium">
                Exact rating vector evaluated for this policy:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Driver Age:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {input?.age ?? 35} yrs
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Experience:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {input?.drivingExperienceYears ?? 15} yrs
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Prior Claims (5y):</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {input?.priorClaimsLast5Years ?? 0}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Annual Mileage:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(input?.annualMileage ?? 12000).toLocaleString()} mi
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Credit Score:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {input?.creditScore ?? 720} FICO
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Vehicle Category:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {input?.vehicleCategory ?? 'Compact SUV'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Territory Zone:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {input?.regionalZone ?? 'Zone B'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Anti-Theft Device:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {input?.antiTheftDevice ? 'Installed' : 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODEL TRANSPARENCY SECTION */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              MODEL TRANSPARENCY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Model used:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate" title={modelUsed}>
                {modelUsed}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Model version:</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 block truncate">
                {modelVersion}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Prediction timestamp:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 block truncate" title={predictionTimestamp}>
                {predictionTimestamp}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS FOOTER */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          {onNavigateToScenario && (
            <button
              type="button"
              id="btn-run-scenario-analysis"
              onClick={() => predictionResponse && onNavigateToScenario(predictionResponse)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Analyze in Risk Scenario Analysis →</span>
            </button>
          )}

          {onOpenAICopilot && (
            <button
              type="button"
              id="btn-ask-ai-copilot-explain"
              onClick={() =>
                onOpenAICopilot(
                  `Explain why this policy has a claim probability of ${primaryPred.claimProbabilityPercent.toFixed(1)}% and pure premium of $${primaryPred.purePremiumUSD.toLocaleString()}, and suggest actions to lower risk.`
                )
              }
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer min-h-[42px]"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Ask AI Copilot to Explain Risk Factors</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {onNavigateToInsights && (
              <button
                type="button"
                id="btn-view-detailed-insights"
                onClick={() => predictionResponse && onNavigateToInsights(predictionResponse)}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                <span>View detailed explanation</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {onLogDecision && (
              <button
                type="button"
                id="btn-log-underwriting-decision"
                onClick={() => predictionResponse && onLogDecision(predictionResponse)}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{savedSuccess ? 'Decision Logged!' : 'Log Decision'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FEATURE INSPECTION MODAL / POPUP */}
      {inspectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Feature Inspection
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectedFeature(null)}
                className="text-xs px-2 py-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Rating Feature:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {inspectedFeature.displayName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Applicant Value:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {inspectedFeature.value}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Marginal Impact:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      inspectedFeature.direction === 'increases_risk'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {inspectedFeature.direction === 'increases_risk' ? '+' : ''}
                    {inspectedFeature.impactPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium mb-1">
                  Actuarial Explanation:
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {inspectedFeature.description}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300">
                <strong>Non-Causal Notice:</strong> This feature impact represents empirical risk association across the portfolio, complying with state rating regulations.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectedFeature(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
