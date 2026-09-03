import React, { useState } from 'react';
import { PredictionResponse, PolicyholderInput } from '../../types';
import { ExplainablePredictionCard } from '../prediction/ExplainablePredictionCard';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  Car,
  BookmarkCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';

interface CustomerResultsPageProps {
  predictionResponse: PredictionResponse | null;
  policyId?: string;
  onNavigateToCheckRisk: () => void;
  onNavigateToExplain: () => void;
  onNavigateToHelp: () => void;
  onLogDecision?: (response: PredictionResponse, notes?: string) => void;
  onOpenAICopilot?: (prompt?: string) => void;
  onSwitchToPro?: () => void;
}

export const CustomerResultsPage: React.FC<CustomerResultsPageProps> = ({
  predictionResponse,
  policyId = 'POL-2026-8819',
  onNavigateToCheckRisk,
  onNavigateToExplain,
  onNavigateToHelp,
  onLogDecision,
  onOpenAICopilot,
  onSwitchToPro,
}) => {
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = () => {
    if (predictionResponse && onLogDecision) {
      onLogDecision(predictionResponse, 'Customer saved quote for review.');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // If no prediction has been calculated yet
  if (!predictionResponse) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            No Risk Assessment Calculated Yet
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Complete our quick 4-step risk check to calculate your personalized risk category, claim likelihood, and price guidance.
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

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Assessment Complete</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Your Insurance Risk Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Based on your driving history, vehicle profile, and selected coverage.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNavigateToCheckRisk}
            className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px] touch-manipulation"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Adjust Details</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToExplain}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px] touch-manipulation"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Explain My Result</span>
          </button>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Column: Primary Explainable Prediction Card (Strictly in Customer Mode) */}
        <div className="lg:col-span-8">
          <ExplainablePredictionCard
            predictionResponse={predictionResponse}
            policyId={policyId}
            onLogDecision={handleSave}
            onOpenAICopilot={onOpenAICopilot}
            isProfessionalMode={false}
          />
        </div>

        {/* Right Column: Customer Support & Next Steps */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Explanation Callout */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-slate-900 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-black">Help Me Understand</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Curious why you were placed in this risk tier or how your vehicle type influenced the numbers? Our AI Assistant translates everything into plain English.
            </p>
            <button
              type="button"
              onClick={onNavigateToExplain}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Plain-Language Breakdown →</span>
            </button>
          </div>

          {/* Actionable Tips to Lower Rate */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black">Tips to Lower Your Rate</h2>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Higher Deductible:</strong> Raising your collision deductible from $500 to $1,000 typically reduces annual cost by 10-15%.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Devices:</strong> Certified GPS anti-theft trackers earn instant security discounts.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Maintain Clean Record:</strong> Staying claim-free for 3+ years unlocks preferred pricing tiers.
                </span>
              </li>
            </ul>
          </div>

          {/* Educational Resources */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-black">Have Questions?</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Learn how auto insurance rates are calculated and look up common insurance terms in our plain-language guide.
            </p>
            <button
              type="button"
              onClick={onNavigateToHelp}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Browse Help &amp; FAQs</span>
            </button>
          </div>

          {/* Underwriter / Specialist Link */}
          {onSwitchToPro && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onSwitchToPro}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Looking for specialist underwriting diagnostics? Switch to Pro Area →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
