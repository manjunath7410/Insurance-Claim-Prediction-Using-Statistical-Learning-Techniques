import React, { useState, useEffect } from 'react';
import { PredictionResponse } from '../../types';
import {
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Car,
  TrendingDown,
  Info,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Shield,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react';

interface CustomerExplainPageProps {
  predictionResponse: PredictionResponse | null;
  policyId?: string;
  onNavigateToCheckRisk: () => void;
  onNavigateToResults: () => void;
  onOpenAICopilot?: (prompt?: string) => void;
  onSwitchToPro?: () => void;
}

interface CustomerExplanationData {
  summary: string;
  riskCategoryMeaning: string;
  claimLikelihoodMeaning: string;
  claimAmountMeaning: string;
  influencingFactors: string[];
  whatToUnderstand: string;
  reassuranceNotice: string;
  source: string;
}

export const CustomerExplainPage: React.FC<CustomerExplainPageProps> = ({
  predictionResponse,
  policyId = 'POL-2026-8819',
  onNavigateToCheckRisk,
  onNavigateToResults,
  onOpenAICopilot,
  onSwitchToPro,
}) => {
  const [explanation, setExplanation] = useState<CustomerExplanationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const primaryPred = predictionResponse?.primaryPrediction;

  // Currency helper
  const formatUSD = (val: number) => `$${Math.round(val).toLocaleString()}`;
  const formatINR = (val: number) => `₹${Math.round(val * 83).toLocaleString('en-IN')}`;

  // Fetch or generate customer-friendly explanation
  const fetchExplanation = async () => {
    if (!predictionResponse || !primaryPred) return;

    setLoading(true);
    setError(null);

    const riskCategory =
      primaryPred.riskTier === 'Preferred'
        ? 'Lower Risk'
        : primaryPred.riskTier === 'Standard'
        ? 'Moderate Risk'
        : 'Higher Risk';

    try {
      const payload = {
        predictionId: policyId || (predictionResponse as any)?.id || 'pred_current',
        probability: primaryPred.claimProbability,
        probabilityPercent: `${primaryPred.claimProbabilityPercent.toFixed(1)}%`,
        riskCategory,
        expectedSeverity: formatUSD(primaryPred.expectedSeverityUSD),
        purePremium: formatUSD(primaryPred.purePremiumUSD),
        topFactors: (primaryPred.topRiskFactors || []).slice(0, 3).map((f) => ({
          name: f.factorName,
          impact: f.direction === 'Increases Risk' ? 'Higher cost factor' : 'Cost-saving factor',
          summary: f.humanSummary,
        })),
        driverAge: predictionResponse.input.age,
        vehicleCategory: predictionResponse.input.vehicleCategory,
        vehicleValue: formatUSD(predictionResponse.input.vehicleValue),
        annualMileage: predictionResponse.input.annualMileage,
        hasAntiTheft: predictionResponse.input.antiTheftDevice,
        cleanRecord:
          predictionResponse.input.priorClaimsLast5Years === 0 &&
          predictionResponse.input.trafficViolationsCount === 0,
      };

      const res = await fetch('/api/customer-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setExplanation(data);
      } else {
        throw new Error('Fallback to deterministic explanation');
      }
    } catch {
      // Deterministic fallback if API offline
      const isLow = primaryPred.claimProbability < 0.05;
      const isHigh = primaryPred.claimProbability > 0.12;

      setExplanation({
        summary: `Your vehicle insurance profile has been calculated as ${riskCategory}. This is based on your driving history and vehicle information.`,
        riskCategoryMeaning: isLow
          ? 'You are currently categorized as Lower Risk compared to average drivers. Drivers with clean histories and safe commute habits fall into this favorable category.'
          : isHigh
          ? 'Your profile is currently rated as Higher Risk. This is often due to vehicle repair costs, higher annual mileage, or recent claims.'
          : 'You are categorized as Moderate Risk, which is typical for everyday drivers with normal commute mileage.',
        claimLikelihoodMeaning: `Your estimated claim likelihood is ${primaryPred.claimProbabilityPercent.toFixed(
          1
        )}% per year. This represents the statistical chance of filing a claim in a typical 12-month policy term, meaning most years will pass claim-free.`,
        claimAmountMeaning: `If an accident occurs, the estimated average repair cost is ${formatUSD(
          primaryPred.expectedSeverityUSD
        )} (${formatINR(
          primaryPred.expectedSeverityUSD
        )}). This reflects standard parts and labor for your ${predictionResponse.input.vehicleCategory}.`,
        influencingFactors: [
          predictionResponse.input.priorClaimsLast5Years === 0
            ? 'Clean 5-year claim history is keeping your rate lower.'
            : 'Recent claim history adds an elevated risk surcharge.',
          predictionResponse.input.antiTheftDevice
            ? 'Certified anti-theft protection earns an active safety discount.'
            : 'Adding anti-theft equipment can lower future comprehensive rates.',
          `Vehicle value and repair complexity for ${predictionResponse.input.vehicleCategory}.`,
        ],
        whatToUnderstand: `The estimated risk cost of ${formatUSD(
          primaryPred.purePremiumUSD
        )} (${formatINR(
          primaryPred.purePremiumUSD
        )}) is the baseline cost required to cover expected vehicle damages. It does not include optional add-ons, insurer taxes, or administrative fees.`,
        reassuranceNotice:
          'This estimate is for informational purposes to help you understand your insurance factors. It is not a binding policy or quote.',
        source: 'rule-based-actuarial-engine',
        fallbackNotice: "We couldn't generate the explanation right now, but your risk result is still available.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanation();
  }, [predictionResponse]);

  const customerQuestions = [
    {
      q: 'Why does my vehicle value affect my risk assessment?',
      a: 'If your vehicle is damaged or stolen, the insurance payout depends directly on the cost of replacement parts and certified labor. More valuable vehicles cost more to repair or replace, which naturally increases the estimated claim amount.',
    },
    {
      q: 'Does having a clean driving record make a big difference?',
      a: 'Yes. Drivers with zero accidents and zero moving violations over the past 3 to 5 years regularly save 20% to 35% compared to drivers with recent incidents.',
    },
    {
      q: 'What is the fastest way I can lower my estimated rate?',
      a: 'Choosing a slightly higher collision deductible (e.g. $1,000 instead of $500), installing an approved GPS anti-theft device, or keeping your annual mileage under 10,000 miles can noticeably lower your risk cost.',
    },
    {
      q: 'Is this result a guaranteed quote?',
      a: 'No. This is an objective statistical estimate based on the details you provided and historical industry data. Final quotes from specific insurance providers will include state taxes, company fees, and chosen optional coverages.',
    },
  ];

  if (!predictionResponse || !primaryPred) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            No Active Assessment to Explain
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Please run a quick risk check first so our AI Assistant can review your specific vehicle and driving factors.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToCheckRisk}
          className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Start Your Risk Check →</span>
        </button>
      </div>
    );
  }

  const riskTierBadge =
    primaryPred.riskTier === 'Preferred' ? (
      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
        Lower Risk (Preferred)
      </span>
    ) : primaryPred.riskTier === 'Standard' ? (
      <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
        Moderate Risk (Standard)
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
        Higher Risk (Elevated)
      </span>
    );

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>AI Plain-Language Assistant</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onNavigateToResults}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer min-h-[44px] touch-manipulation inline-flex items-center justify-center"
            >
              ← Back to Results
            </button>
            <button
              type="button"
              onClick={fetchExplanation}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px] touch-manipulation"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing...' : 'Refresh Explanation'}</span>
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Help Me Understand My Result
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Here is a clear, everyday breakdown of what your numbers mean, why you were rated this way, and what to keep in mind.
        </p>

        {/* Quick Snapshot Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Rating</span>
            <div className="mt-1">{riskTierBadge}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual Likelihood</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {primaryPred.claimProbabilityPercent.toFixed(1)}%
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Repair Estimate</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {formatINR(primaryPred.expectedSeverityUSD)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Baseline Risk Cost</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
              {formatINR(primaryPred.purePremiumUSD)}
            </span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && !explanation && (
        <div className="p-8 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Analyzing your information...</p>
        </div>
      )}

      {/* The 6 Key Breakdown Sections */}
      {explanation && (
        <div className="space-y-4">
          {/* 1. What the Risk Result Means */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold">1. What Your Risk Category Means</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {explanation.riskCategoryMeaning}
            </p>
          </div>

          {/* 2. Estimated Claim Likelihood */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold">2. Estimated Claim Likelihood</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {explanation.claimLikelihoodMeaning}
            </p>
          </div>

          {/* 3. Estimated Claim Amount */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Car className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold">3. Estimated Repair &amp; Claim Amount</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {explanation.claimAmountMeaning}
            </p>
          </div>

          {/* 4. Influencing Factors */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold">4. Key Factors Influencing Your Result</h2>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {(explanation.influencingFactors || []).map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 5. Understanding the Estimate */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold">5. Understanding the Estimated Risk Cost</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {explanation.whatToUnderstand}
            </p>
          </div>

          {/* 6. Informational Disclaimer & Reassurance */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>6. Informational Notice &amp; Reassurance</span>
            </div>
            <p className="leading-relaxed">
              {explanation.reassuranceNotice}
            </p>
          </div>
        </div>
      )}

      {/* FREQUENTLY ASKED QUESTIONS ACCORDION */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
          Common Customer Questions
        </h2>
        <div className="space-y-2.5">
          {customerQuestions.map((item, index) => {
            const isOpen = expandedFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors min-h-[52px] touch-manipulation"
                >
                  <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* NAVIGATION CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onNavigateToResults}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer min-h-[50px] touch-manipulation flex items-center justify-center"
        >
          ← Return to Results
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNavigateToCheckRisk}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer min-h-[50px] touch-manipulation"
          >
            <span>Adjust Details (Check Risk)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Specialist Link */}
      {onSwitchToPro && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onSwitchToPro}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Looking for statistical model comparisons or SHAP attributions? Open Pro Area →</span>
          </button>
        </div>
      )}
    </div>
  );
};
