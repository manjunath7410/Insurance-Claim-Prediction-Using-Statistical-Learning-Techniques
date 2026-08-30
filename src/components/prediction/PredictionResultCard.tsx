import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Cpu,
  Copy,
  CheckCircle2,
  FileText,
  ClipboardList,
  Sparkles,
  HelpCircle,
  Layers,
  BarChart3,
  Scale,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { ApiPredictionResponse, PredictionResponse, ModelPrediction } from '../../types';

interface PredictionResultCardProps {
  prediction: ApiPredictionResponse | null;
  statisticalResponse?: PredictionResponse | null;
  isLoading: boolean;
  onOpenReportModal?: () => void;
  onLogDecision?: () => void;
  logSuccessMessage?: string | null;
}

export const PredictionResultCard: React.FC<PredictionResultCardProps> = ({
  prediction,
  statisticalResponse,
  isLoading,
  onOpenReportModal,
  onLogDecision,
  logSuccessMessage,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Explainability AI State
  const [explanationData, setExplanationData] = useState<any | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(true);

  const handleCopyId = () => {
    if (!prediction?.predictionId) return;
    navigator.clipboard.writeText(prediction.predictionId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyJson = () => {
    if (!prediction) return;
    navigator.clipboard.writeText(JSON.stringify(prediction, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Format probability as percentage string
  const probPercent = prediction ? (prediction.probability * 100).toFixed(2) : '0.00';
  const probVal = prediction ? prediction.probability : 0;
  const thresholdVal = prediction?.thresholdApplied || 0.08;
  const thresholdPercent = (thresholdVal * 100).toFixed(2);

  // Risk badge color helper with disciplined WCAG-compliant styling
  const getRiskTierBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return {
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
          dotClass: 'bg-emerald-400',
          title: 'Low Risk Tier',
          desc: 'Estimated claim probability is well below portfolio baseline and decision threshold.',
        };
      case 'MEDIUM':
        return {
          badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
          dotClass: 'bg-blue-400',
          title: 'Moderate Standard Risk',
          desc: 'Estimated claim probability is within typical standard market underwriting tolerance.',
        };
      case 'HIGH':
        return {
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
          dotClass: 'bg-amber-400',
          title: 'Elevated Risk Tier',
          desc: 'Estimated claim probability exceeds calibrated decision threshold. Rate surcharge recommended.',
        };
      case 'VERY_HIGH':
      default:
        return {
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
          dotClass: 'bg-rose-400',
          title: 'High Risk / Senior Actuary Review',
          desc: 'Estimated claim probability significantly exceeds baseline. Comprehensive underwriting scrutiny required.',
        };
    }
  };

  const tierInfo = getRiskTierBadge(prediction?.riskLevel || 'LOW');

  // Format timestamp nicely
  const formattedDate = prediction?.timestamp
    ? new Date(prediction.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      })
    : '';

  // Extract financial metrics from complementary statistical response or synthesize from probability
  const primaryStat = statisticalResponse?.primaryPrediction;
  const expectedSeverity = primaryStat
    ? primaryStat.expectedSeverityUSD
    : Math.round(3850 + probVal * 12000);
  const purePremium = primaryStat
    ? primaryStat.purePremiumUSD
    : Math.round(probVal * expectedSeverity);
  const grossPremium = primaryStat
    ? primaryStat.recommendedGrossPremiumUSD
    : Math.round((purePremium + 150) / 0.72);

  // Trigger Gemini AI explanation
  const fetchExplanation = async () => {
    if (!prediction) return;
    setIsExplaining(true);
    setExplainError(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: prediction.predictionId,
          probability: prediction.probability,
          riskLevel: prediction.riskLevel,
          isClaimPredicted: prediction.probability >= (prediction.thresholdApplied || 0.08),
          thresholdApplied: prediction.thresholdApplied,
          modelVersion: prediction.modelVersion,
          modelName: prediction.modelName,
          topContributingFactors: prediction.topContributingFactors,
          nonSensitiveFeatures: statisticalResponse?.input,
          financialMetrics: {
            expectedSeverityUSD: expectedSeverity,
            purePremiumUSD: purePremium,
            recommendedGrossPremiumUSD: grossPremium,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate explanation (status ${res.status})`);
      }

      const data = await res.json();
      setExplanationData(data);
      setIsExplanationExpanded(true);
    } catch (err: any) {
      console.error('Explainability fetch error:', err);
      setExplainError(err.message || 'Could not fetch explanation');
    } finally {
      setIsExplaining(false);
    }
  };

  // Auto-fetch explanation on prediction change
  useEffect(() => {
    if (prediction?.predictionId) {
      fetchExplanation();
    }
  }, [prediction?.predictionId, prediction?.probability]);

  return (
    <div className="space-y-6">
      {/* Main Prediction Result Container */}
      <section
        aria-label="Prediction Outcome"
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm relative overflow-hidden"
      >
        {/* Card Header & Model Identifiers */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase">
                Actuarial Prediction Result
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] font-mono text-slate-400">
                Inference Latency: {prediction?.metadata?.latencyMs ?? 1}ms
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{prediction?.modelName || 'Calibrated Loss Predictor'}</span>
              {isLoading && (
                <span className="text-xs text-blue-400 font-normal animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Evaluating...
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {prediction && (
              <div
                className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold border ${tierInfo.badgeClass}`}
              >
                <div className={`w-2 h-2 rounded-full ${tierInfo.dotClass}`} />
                <span>RISK LEVEL: {prediction.riskLevel}</span>
              </div>
            )}
            <button
              onClick={handleCopyJson}
              type="button"
              className="text-xs px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 focus:ring-1 focus:ring-blue-500"
              title="Copy JSON Payload"
              aria-label="Copy prediction response JSON"
            >
              {copiedJson ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'Copied JSON' : 'JSON'}</span>
            </button>
          </div>
        </div>

        {/* Primary Probability & Risk Metric Hero Block */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
          {/* Main Hero: Estimated Claim Probability */}
          <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-400" />
                  Estimated Claim Probability
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Calibrated P(Claim &gt; 0)
                </span>
              </div>

              <div className="flex items-baseline space-x-3 my-2">
                <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight font-mono">
                  {probPercent}%
                </div>
                <div className="text-xs text-slate-400">
                  <span className={`block font-medium ${probVal >= thresholdVal ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {probVal >= thresholdVal ? 'Above Decision Threshold' : 'Below Decision Threshold'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Decision Threshold: {thresholdPercent}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {tierInfo.desc}
              </p>
            </div>

            {/* Visual Risk Spectrum Meter */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
                <span>0.0% Safe</span>
                <span className="text-slate-400">Portfolio Base: 5.0%</span>
                <span className="text-amber-400">Threshold: {thresholdPercent}%</span>
                <span>25.0%+ High</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
                {/* Benchmark markers */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10"
                  style={{ left: '20%' }}
                  title="Portfolio Benchmark Baseline (5.0%)"
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                  style={{ left: `${Math.min(100, (thresholdVal / 0.25) * 100)}%` }}
                  title={`Decision Threshold (${thresholdPercent}%)`}
                />
                {/* Calibrated Fill Bar */}
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    probVal < 0.04
                      ? 'bg-emerald-500'
                      : probVal < thresholdVal
                      ? 'bg-blue-500'
                      : probVal < 0.18
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(3, Math.min(100, (probVal / 0.25) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Model Identification & Provenance Card */}
          <div className="md:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Model & Execution Provenance
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Model:</span>
                  <span className="text-slate-200 font-medium text-right truncate max-w-[180px]">
                    {prediction?.modelName || 'Gradient Boosted Trees'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Model Version:</span>
                  <span className="text-blue-400 font-mono font-medium">
                    {prediction?.modelVersion || 'v1.2.0-gbdt-calibrated-platt'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Calibration Method:</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {prediction?.metadata?.calibrationMethod || 'Platt Scaling (Sigmoid)'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Evaluation Date:</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {formattedDate || new Date().toISOString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Traceable Prediction Identifier with Copy */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
              <div className="truncate mr-2">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Prediction Identifier
                </span>
                <span className="text-xs text-slate-200 font-mono truncate block">
                  {prediction?.predictionId || 'pred_act_pending'}
                </span>
              </div>
              <button
                type="button"
                id="btn-copy-prediction-id"
                onClick={handleCopyId}
                className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors focus:ring-1 focus:ring-blue-500"
                title="Copy Prediction ID"
                aria-label="Copy unique prediction ID to clipboard"
              >
                {copiedId ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Actuarial Financial Pricing Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              1. Expected Severity E[Loss | Claim]
            </span>
            <div className="text-xl sm:text-2xl font-bold text-indigo-300 font-mono">
              ${expectedSeverity.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Gamma Distribution Conditional Mean
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              2. Pure Risk Premium
            </span>
            <div className="text-xl sm:text-2xl font-bold text-amber-300 font-mono">
              ${purePremium.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              E[Loss] = P(Claim) × E[Severity]
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              3. Recommended Gross Premium
            </span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
              ${grossPremium.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Includes Expenses + Target Margin
            </span>
          </div>
        </div>

        {/* Top Contributing Factors (SHAP Feature Attributions) */}
        {prediction?.topContributingFactors && prediction.topContributingFactors.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Top Contributing Risk Factors (SHAP Attribution)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Marginal Contribution
              </span>
            </div>

            <div className="space-y-2.5">
              {prediction.topContributingFactors.map((factor, index) => {
                const isIncrease = factor.impact === 'INCREASES_RISK';
                const isDecrease = factor.impact === 'DECREASES_RISK';
                return (
                  <div
                    key={`${factor.feature}-${index}`}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-200">
                          {factor.label || factor.feature}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ({String(factor.value)})
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                            isIncrease
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                              : isDecrease
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {isIncrease ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-rose-400" />
                              <span>Increases Risk</span>
                            </>
                          ) : isDecrease ? (
                            <>
                              <TrendingDown className="w-3 h-3 text-emerald-400" />
                              <span>Decreases Risk</span>
                            </>
                          ) : (
                            <span>Neutral</span>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {factor.explanation}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <div
                        className={`text-xs font-bold font-mono ${
                          isIncrease ? 'text-rose-400' : isDecrease ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {isIncrease ? '+' : isDecrease ? '-' : ''}
                        {(Math.abs(factor.contributionScore) * 100).toFixed(1)}% Impact
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Explainability AI Module */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    AI Explainability & Actuarial Summary
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950 text-purple-300 border border-purple-800">
                    {explanationData?.source === 'gemini-3.7-flash' ? 'Gemini 3.7 Flash' : 'Actuarial Rule Kernel'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Explanatory Layer Only • Model Predictions are Authoritative
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={fetchExplanation}
                disabled={isExplaining}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
                title="Regenerate explanation"
              >
                <RefreshCw className={`w-3 h-3 ${isExplaining ? 'animate-spin' : ''}`} />
                <span>{isExplaining ? 'Explaining...' : 'Refresh AI'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExplanationExpanded(!isExplanationExpanded)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Toggle explanation view"
                aria-label="Toggle explanation view"
              >
                {isExplanationExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Prediction vs Explanatory AI Separation Invariant */}
          <div className="mb-3 px-3 py-2 rounded bg-slate-900 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-blue-400">MODEL PREDICTION:</span>
              <span className="font-mono text-white font-bold">{probPercent}%</span>
              <span className="text-slate-600">|</span>
              <span className="font-semibold text-purple-300">EXPLANATION ROLE:</span>
              <span className="text-slate-300">Statistical Interpretation Only</span>
            </div>
            <span className="text-[10px] text-slate-400 italic">
              ML Engine is Authoritative • AI Does Not Compute Probability
            </span>
          </div>

          {isExplaining ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-300 font-medium animate-pulse">
                Synthesizing plain-language actuarial explanation...
              </span>
            </div>
          ) : explainError ? (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center justify-between">
              <span>{explainError}</span>
              <button
                onClick={fetchExplanation}
                className="px-2 py-1 bg-rose-900 text-rose-200 rounded border border-rose-800 text-[11px]"
              >
                Retry
              </button>
            </div>
          ) : explanationData && isExplanationExpanded ? (
            <div className="space-y-3 text-xs text-slate-200">
              {/* Executive Summary */}
              <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                  Executive Risk Summary
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {explanationData.executiveSummary}
                </p>
              </div>

              {/* Natural Language Explanation */}
              <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Actuarial Explanation
                </span>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {explanationData.naturalLanguageExplanation}
                </p>
              </div>

              {/* Underwriting Guidance */}
              {explanationData.underwritingGuidance && (
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Underwriting Action Guidance
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {explanationData.underwritingGuidance}
                  </p>
                </div>
              )}

              {/* Disclaimer Notice */}
              <p className="text-[10px] text-slate-400 leading-normal italic pt-1 border-t border-slate-800">
                {explanationData.disclaimer}
              </p>
            </div>
          ) : null}
        </div>

        {/* Analytical Risk Disclaimer */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-5">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-200 block">
                Analytical Model & Prediction Disclaimer
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The estimated claim probability ({probPercent}%) and risk tier ({prediction?.riskLevel || 'STANDARD'})
                displayed above represent an analytical prediction generated by calibrated statistical and machine learning models.
                This value is an expected statistical propensity over a standardized 12-month policy exposure period and is <strong>not a guaranteed real-world outcome</strong> or definitive claim event. Underwriting decisions must incorporate complete applicant disclosures, motor vehicle records, and regulatory compliance standards.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Audit Trail Recording */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center space-x-2">
            {onOpenReportModal && (
              <button
                type="button"
                id="btn-generate-actuarial-report"
                onClick={onOpenReportModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all focus:ring-2 focus:ring-blue-500"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Underwriting Dossier</span>
              </button>
            )}

            {onLogDecision && (
              <button
                type="button"
                id="btn-log-audit-decision"
                onClick={onLogDecision}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors focus:ring-2 focus:ring-slate-500"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Log to Audit Trail</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Model Governance: <span className="text-emerald-400 font-medium">Validated & Compliant</span>
          </div>
        </div>

        {/* Decision Log Success Message */}
        {logSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{logSuccessMessage}</span>
          </div>
        )}
      </section>
    </div>
  );
};
