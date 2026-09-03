import React, { useState, useEffect } from 'react';
import {
  PredictionResponse,
  SHAPFeatureContribution,
  ModelPrediction,
} from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  BookmarkCheck,
  Sparkles,
  GitCompare,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

export interface ExplainablePredictionCardProps {
  predictionResponse: PredictionResponse | null;
  policyId: string;
  onNavigateToInsights?: (response: PredictionResponse) => void;
  onNavigateToScenario?: (response: PredictionResponse) => void;
  onLogDecision?: (response: PredictionResponse, notes?: string) => void;
  savedSuccess?: boolean;
  onOpenAICopilot?: (prompt?: string) => void;
  onExplainMyResult?: (response: PredictionResponse) => void;
  preferredCurrency?: 'USD' | 'INR';
  isLoading?: boolean;
  isProfessionalMode?: boolean;
}

// Global Feature Importance baseline derived from training data (preserved for actuarial console)
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

interface FriendlyFactor {
  icon: '🟠' | '🟢';
  title: string;
  explanation: string;
}

export interface CustomerExplanation {
  title: string;
  riskMeaning: string;
  likelihoodMeaning: string;
  severityMeaning: string;
  factorsSummary: string;
  whatToUnderstand: string;
  reassuranceNotice: string;
  source: string;
  isFallback: boolean;
  disclaimer: string;
  timestamp: string;
}

export const ExplainablePredictionCard: React.FC<ExplainablePredictionCardProps> = ({
  predictionResponse,
  policyId,
  onNavigateToInsights,
  onNavigateToScenario,
  onLogDecision,
  savedSuccess = false,
  onOpenAICopilot,
  onExplainMyResult,
  preferredCurrency = 'INR',
  isLoading = false,
  isProfessionalMode = false,
}) => {
  // Currency toggle: Default to INR (₹) or USD ($)
  const [currency, setCurrency] = useState<'USD' | 'INR'>(preferredCurrency);

  // Progressive disclosure for actuaries and technical review (collapsed by default)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Customer Explanation state (Phase 6)
  const [customerExplanation, setCustomerExplanation] = useState<CustomerExplanation | null>(null);
  const [isExplainingCustomer, setIsExplainingCustomer] = useState<boolean>(false);
  const [showCustomerExplanation, setShowCustomerExplanation] = useState<boolean>(true);

  // Explanation status feedback
  const [explainNotice, setExplainNotice] = useState<string | null>(null);

  useEffect(() => {
    if (preferredCurrency) {
      setCurrency(preferredCurrency);
    }
  }, [preferredCurrency]);

  // Reset customer explanation when a fresh prediction is calculated
  useEffect(() => {
    setCustomerExplanation(null);
  }, [
    predictionResponse?.primaryPrediction?.claimProbability,
    predictionResponse?.primaryPrediction?.expectedSeverityUSD,
    policyId,
  ]);

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

  // ---------------------------------------------------------------------------
  // EXISTING RISK CALCULATION & THRESHOLDS (Strictly preserved from statisticalModels.ts)
  // prob < 0.045: Low Risk
  // prob < 0.11:  Standard
  // prob >= 0.11: Elevated / High Risk / Critical Review
  // ---------------------------------------------------------------------------
  const probVal = primaryPred.claimProbability;
  const rawTier = (primaryPred.riskTier || '').toLowerCase();

  let riskCategory: 'lower' | 'moderate' | 'higher' = 'moderate';
  if (rawTier.includes('low') || probVal < 0.045) {
    riskCategory = 'lower';
  } else if (rawTier.includes('standard') || (probVal >= 0.045 && probVal < 0.11)) {
    riskCategory = 'moderate';
  } else {
    riskCategory = 'higher';
  }

  // Currency formatting
  const USD_TO_INR_RATE = 83;
  const formatCurrency = (usdAmount: number): string => {
    if (currency === 'INR') {
      const inrAmount = Math.round(usdAmount * USD_TO_INR_RATE);
      return `₹${inrAmount.toLocaleString('en-IN')}`;
    }
    return `$${Math.round(usdAmount).toLocaleString('en-US')}`;
  };

  // Formatted Claim Likelihood percentage
  const displayLikelihood =
    primaryPred.claimProbabilityPercent % 1 === 0
      ? `${primaryPred.claimProbabilityPercent.toFixed(0)}%`
      : `${primaryPred.claimProbabilityPercent.toFixed(1)}%`;

  // ---------------------------------------------------------------------------
  // TRANSLATE MODEL EXPLAINABILITY / ATTRIBUTIONS INTO SIMPLE PLAIN ENGLISH
  // Never show the word SHAP to the normal user.
  // Translates feature names and effects into friendly descriptions without changing underlying values.
  // ---------------------------------------------------------------------------
  const generateFriendlyFactors = (): FriendlyFactor[] => {
    const attributions: SHAPFeatureContribution[] =
      predictionResponse?.shapAttributions || [];
    const factors: FriendlyFactor[] = [];
    const handledKeys = new Set<string>();

    const findAttr = (keyPart: string) =>
      attributions.find(
        (a) =>
          a.feature.toLowerCase().includes(keyPart.toLowerCase()) ||
          a.displayName.toLowerCase().includes(keyPart.toLowerCase())
      );

    // 1. Previous claims factor
    const claimsAttr = findAttr('claim');
    const priorClaimsCount = predictionResponse?.input?.priorClaimsLast5Years ?? 0;
    if (claimsAttr) {
      handledKeys.add(claimsAttr.feature);
      if (claimsAttr.direction === 'increases_risk' || priorClaimsCount > 0) {
        factors.push({
          icon: '🟠',
          title: 'Previous claims',
          explanation: 'Previous claims increased the estimated risk.',
        });
      } else {
        factors.push({
          icon: '🟢',
          title: 'Clean claims history',
          explanation: 'Having no prior claims helped lower your estimated risk.',
        });
      }
    } else {
      if (priorClaimsCount > 0) {
        factors.push({
          icon: '🟠',
          title: 'Previous claims',
          explanation: 'Previous claims increased the estimated risk.',
        });
      } else {
        factors.push({
          icon: '🟢',
          title: 'Clean claims history',
          explanation: 'Having no prior claims helped lower your estimated risk.',
        });
      }
    }

    // 2. Vehicle value / category factor
    const vehicleAttr = findAttr('vehicle');
    if (vehicleAttr) {
      handledKeys.add(vehicleAttr.feature);
      if (vehicleAttr.direction === 'increases_risk') {
        factors.push({
          icon: '🟠',
          title: 'Vehicle value',
          explanation: 'The vehicle value affected the estimated potential claim cost.',
        });
      } else {
        factors.push({
          icon: '🟢',
          title: 'Vehicle value',
          explanation: 'Standard vehicle repair and replacement profile helped keep claim costs moderate.',
        });
      }
    } else {
      factors.push({
        icon: '🟠',
        title: 'Vehicle value',
        explanation: 'The vehicle value affected the estimated potential claim cost.',
      });
    }

    // 3. Other factors from model attributions
    const remainingAttributions = attributions.filter((a) => !handledKeys.has(a.feature));
    for (const attr of remainingAttributions) {
      if (factors.length >= 4) break;
      const featLower = attr.feature.toLowerCase();

      if (featLower.includes('mileage')) {
        handledKeys.add(attr.feature);
        if (attr.direction === 'increases_risk') {
          factors.push({
            icon: '🟠',
            title: 'Annual mileage',
            explanation: 'Higher annual driving distance increased your road exposure.',
          });
        } else {
          factors.push({
            icon: '🟢',
            title: 'Annual mileage',
            explanation: 'Lower annual driving distance reduced your road exposure.',
          });
        }
      } else if (featLower.includes('credit')) {
        handledKeys.add(attr.feature);
        if (attr.direction === 'increases_risk') {
          factors.push({
            icon: '🟠',
            title: 'Credit profile',
            explanation: 'Credit profile had an upward effect on the statistical risk evaluation.',
          });
        } else {
          factors.push({
            icon: '🟢',
            title: 'Credit profile',
            explanation: 'A strong credit profile reduced the estimated risk.',
          });
        }
      } else if (featLower.includes('theft') || featLower.includes('antitheft')) {
        handledKeys.add(attr.feature);
        factors.push({
          icon: '🟢',
          title: 'Vehicle security',
          explanation: 'Installed anti-theft security system reduced the estimated risk.',
        });
      } else if (featLower.includes('deductible')) {
        handledKeys.add(attr.feature);
        if (attr.direction === 'decreases_risk') {
          factors.push({
            icon: '🟢',
            title: 'Policy deductible',
            explanation: 'A higher deductible reduced the insurer estimated claim share.',
          });
        } else {
          factors.push({
            icon: '🟠',
            title: 'Policy deductible',
            explanation: 'A lower deductible increased the insurer expected claim payout share.',
          });
        }
      } else if (featLower.includes('zone') || featLower.includes('region')) {
        handledKeys.add(attr.feature);
        if (attr.direction === 'increases_risk') {
          factors.push({
            icon: '🟠',
            title: 'Territory location',
            explanation: 'Operating in a higher-traffic territory increased estimated accident likelihood.',
          });
        } else {
          factors.push({
            icon: '🟢',
            title: 'Territory location',
            explanation: 'Driving in a lower-traffic territory reduced estimated accident likelihood.',
          });
        }
      }
    }

    // Always ensure a beneficial "Other factors" entry exists as requested
    const hasGreen = factors.some((f) => f.icon === '🟢');
    if (!hasGreen || factors.length < 3) {
      factors.push({
        icon: '🟢',
        title: 'Other factors',
        explanation: 'Some other information reduced or had a smaller effect on the estimated risk.',
      });
    }

    return factors;
  };

  const friendlyFactors = generateFriendlyFactors();

  // Explain My Result action handler (connects to Gemini explanation functionality)
  const handleExplainClick = async () => {
    if (!predictionResponse) return;

    // If already generated and currently hidden, simply reveal it
    if (customerExplanation && !showCustomerExplanation) {
      setShowCustomerExplanation(true);
      return;
    }

    setIsExplainingCustomer(true);
    setExplainNotice('Asking Gemini to explain your risk result in plain language...');

    try {
      const payload = {
        predictionId: policyId || (predictionResponse as any)?.id || 'pred_current',
        probability: primaryPred.claimProbability,
        probabilityPercent: `${primaryPred.claimProbabilityPercent.toFixed(1)}%`,
        riskCategory,
        expectedSeverityUSD: primaryPred.expectedSeverityUSD,
        purePremiumUSD: primaryPred.purePremiumUSD,
        displayLikelihood,
        displaySeverity: formatCurrency(primaryPred.expectedSeverityUSD),
        displayRiskCost: formatCurrency(primaryPred.purePremiumUSD),
        currency,
        topFactors: friendlyFactors,
        driverInputs: predictionResponse?.input,
      };

      const res = await fetch('/api/customer-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data: CustomerExplanation = await res.json();
      setCustomerExplanation(data);
      setShowCustomerExplanation(true);
      setExplainNotice(null);

      if (onExplainMyResult) {
        onExplainMyResult(predictionResponse);
      }
    } catch (err: any) {
      console.warn('Customer explanation API error, falling back to local deterministic explainer:', err);
      // High-quality local fallback ensures the user is never blocked or left without an explanation
      const fallback: CustomerExplanation = {
        title: 'Help Me Understand',
        riskMeaning:
          riskCategory === 'lower'
            ? 'Your profile is evaluated as Lower Risk. Compared to average drivers on the road, your history and vehicle profile indicate a lower statistical probability of accidents or claims.'
            : riskCategory === 'moderate'
            ? 'Your profile is evaluated as Moderate Risk. This is typical for everyday commuters and means your driving profile aligns closely with standard average road exposure.'
            : 'Your profile is evaluated as Higher Risk. This reflects factors such as recent claim history, higher mileage exposure, or vehicle characteristics that statistically elevate claim propensity.',
        likelihoodMeaning: `The estimated claim likelihood of ${displayLikelihood} represents the statistical chance that a claim might occur over a typical 12-month driving period. It is a probabilistic estimate derived from historical data of similar drivers, not a certainty.`,
        severityMeaning: `If an accident or covered loss does occur, the estimated average claim amount is ${formatCurrency(primaryPred.expectedSeverityUSD)}. This figure represents typical repair and replacement costs for vehicles in this class, rather than an out-of-pocket payment you must make.`,
        factorsSummary:
          friendlyFactors.length > 0
            ? `Your result was primarily influenced by key factors including: ${friendlyFactors.map(f => `${f.title} (${f.explanation})`).join('; ')}.`
            : 'Your result was influenced by your driving record, vehicle characteristics, and annual mileage exposure compared to historical benchmarks.',
        whatToUnderstand: `The estimated risk cost of ${formatCurrency(primaryPred.purePremiumUSD)} is an actuarial estimate of expected claim costs for this coverage period. It is not necessarily the final insurance premium you would pay, which also accounts for taxes, administrative expenses, and chosen deductible options.`,
        reassuranceNotice:
          'This estimate is provided to help you understand your risk factors transparently. It is based on the information provided and historical statistics, and is not a guarantee of future claims or a final insurance quote.',
        source: 'rule-based-actuarial-engine',
        isFallback: true,
        disclaimer:
          'This is an estimate based on the information provided and historical data. It is not a guarantee of future claims or a final insurance quote.',
        timestamp: new Date().toISOString(),
      };
      setCustomerExplanation(fallback);
      setShowCustomerExplanation(true);
      setExplainNotice(null);
    } finally {
      setIsExplainingCustomer(false);
    }
  };

  return (
    <div className="space-y-4" id="prediction-result-section">
      {/* MAIN FRIENDLY RESULT CARD CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        
        {/* Top Bar: Quote ID & Subtle Currency Switch */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Quote #{policyId}
            </span>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Currency:</span>
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currency === 'INR'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. YOUR RISK RESULT: Simple Risk Category (🟢 Lower / 🟠 Moderate / 🔴 Higher) */}
        {/* ========================================================================= */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            YOUR RISK RESULT
          </div>

          <div
            className={`rounded-2xl p-4 sm:p-5 border transition-all ${
              riskCategory === 'lower'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                : riskCategory === 'moderate'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-100'
                : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl leading-none">
                {riskCategory === 'lower'
                  ? '🟢'
                  : riskCategory === 'moderate'
                  ? '🟠'
                  : '🔴'}
              </span>
              <div>
                <div className="text-xl sm:text-2xl font-black tracking-tight">
                  {riskCategory === 'lower'
                    ? 'Lower Risk'
                    : riskCategory === 'moderate'
                    ? 'Moderate Risk'
                    : 'Higher Risk'}
                </div>
                <div className="text-xs sm:text-sm font-medium opacity-90 mt-0.5">
                  {riskCategory === 'lower'
                    ? 'Low likelihood of submitting a claim compared to the general population.'
                    : riskCategory === 'moderate'
                    ? 'Average claim frequency typical of standard everyday driving.'
                    : 'Elevated claim risk factors based on the information provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. CLAIM LIKELIHOOD */}
        {/* ========================================================================= */}
        <div className="rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            CLAIM LIKELIHOOD
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {displayLikelihood}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            This is the model&apos;s estimated likelihood of a claim based on the information you provided.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 3. IF A CLAIM HAPPENS */}
        {/* ========================================================================= */}
        <div className="rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            IF A CLAIM HAPPENS
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Estimated claim amount:
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {formatCurrency(primaryPred.expectedSeverityUSD)}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            This is an estimated average claim amount based on the model.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 4. ESTIMATED RISK COST (User-friendly representation of pure premium) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl p-5 border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
            ESTIMATED RISK COST
          </div>
          <div className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-300 font-mono tracking-tight">
            {formatCurrency(primaryPred.purePremiumUSD)}
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            This is an estimate of expected claim cost for the selected coverage period. It is not necessarily the final insurance premium you would pay.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 5. "Why did I get this result?" */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-1">
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Why did I get this result?
          </h3>

          <div className="space-y-2.5">
            {friendlyFactors.map((factor, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 transition-colors"
              >
                <span className="text-lg leading-none shrink-0 mt-0.5">
                  {factor.icon}
                </span>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {factor.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    &ldquo;{factor.explanation}&rdquo;
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. "🤖 Explain My Result" BUTTON & CUSTOMER EXPLANATION SECTION */}
        {/* ========================================================================= */}
        <div className="pt-2 space-y-4">
          <button
            type="button"
            id="btn-explain-my-result"
            onClick={handleExplainClick}
            disabled={isLoading || isExplainingCustomer}
            className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm sm:text-base font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70 min-h-[52px]"
          >
            {isExplainingCustomer ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Explaining Your Result with Gemini...</span>
              </>
            ) : customerExplanation ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Re-Explain My Result</span>
              </>
            ) : (
              <>
                <span className="text-lg">🤖</span>
                <span>Explain My Result</span>
              </>
            )}
          </button>

          {explainNotice && (
            <div className="text-center text-xs font-semibold text-blue-600 dark:text-blue-400 animate-fadeIn">
              {explainNotice}
            </div>
          )}

          {/* LOADING STATE FOR CUSTOMER EXPLANATION */}
          {isExplainingCustomer && (
            <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 animate-pulse space-y-2.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Help Me Understand: Asking Gemini to explain your result...</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Gemini is preparing a clear, reassuring breakdown of what your risk category, estimated likelihood, and repair costs mean in everyday terms without changing your numbers.
              </p>
            </div>
          )}

          {/* HELP ME UNDERSTAND - CUSTOMER EXPLANATION CARD (PHASE 6) */}
          {customerExplanation && showCustomerExplanation && !isExplainingCustomer && (
            <div
              id="customer-explanation-section"
              className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-blue-50/70 via-white to-slate-50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-800/80 shadow-sm space-y-5 transition-all"
            >
              {/* Header: Title & AI Provenance Badge */}
              <div className="flex items-start justify-between gap-3 border-b border-blue-100 dark:border-slate-800 pb-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {customerExplanation.title || 'Help Me Understand'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    A simple, plain-language explanation of your risk evaluation.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                      !customerExplanation.isFallback
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {!customerExplanation.isFallback ? (
                      <>
                        <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Gemini Assistant</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Actuarial Explainer</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomerExplanation(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Collapse explanation"
                    aria-label="Collapse explanation"
                  >
                    <ChevronDown className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </div>

              {/* 1. What the Risk Result Means */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>{riskCategory === 'lower' ? '🟢' : riskCategory === 'moderate' ? '🟠' : '🔴'}</span>
                  <span>1. What Your Risk Result Means</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  {customerExplanation.riskMeaning}
                </p>
              </div>

              {/* 2. What the Estimated Claim Likelihood Means */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>2. What Claim Likelihood Means ({displayLikelihood})</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  {customerExplanation.likelihoodMeaning}
                </p>
              </div>

              {/* 3. What the Estimated Claim Amount Means */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>🔧</span>
                  <span>3. What Estimated Claim Amount Means ({formatCurrency(primaryPred.expectedSeverityUSD)})</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  {customerExplanation.severityMeaning}
                </p>
              </div>

              {/* 4. Which Factors Influenced the Result */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>🔍</span>
                  <span>4. Factors Influencing Your Result</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  {customerExplanation.factorsSummary}
                </p>
              </div>

              {/* 5. What the User Should Understand About the Estimate */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>5. Understanding Your Estimated Risk Cost ({formatCurrency(primaryPred.purePremiumUSD)})</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  {customerExplanation.whatToUnderstand}
                </p>
              </div>

              {/* 6. Clarification & Reassurance Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">6. Informational Disclaimer</div>
                  <p>{customerExplanation.reassuranceNotice}</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-blue-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={handleExplainClick}
                  disabled={isExplainingCustomer}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-run Explanation</span>
                </button>

                {onOpenAICopilot && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenAICopilot(
                        `I have a question about my auto insurance risk evaluation:\n` +
                          `• Risk Category: ${riskCategory === 'lower' ? 'Lower Risk' : riskCategory === 'moderate' ? 'Moderate Risk' : 'Higher Risk'}\n` +
                          `• Claim Likelihood: ${displayLikelihood}\n` +
                          `• Estimated Risk Cost: ${formatCurrency(primaryPred.purePremiumUSD)}\n\n` +
                          `What are simple, everyday things I can do to keep my road risk low?`
                      )
                    }
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>Have more questions? Ask in AI Copilot →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* COLLAPSED EXPAND BUTTON (If user hid the explanation) */}
          {customerExplanation && !showCustomerExplanation && (
            <button
              type="button"
              onClick={() => setShowCustomerExplanation(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Show Saved Explanation (Help Me Understand)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 7. CLEAR DISCLAIMER */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            This is an estimate based on the information provided and historical data. It is not a guarantee of future claims or a final insurance quote.
          </span>
        </div>

        {/* ========================================================================= */}
        {/* SECONDARY ACTIONS: Save Quote & What-If Changes */}
        {/* ========================================================================= */}
        <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5 border-t border-slate-100 dark:border-slate-800">
          {onLogDecision && (
            <button
              type="button"
              id="btn-log-underwriting-decision"
              onClick={() => predictionResponse && onLogDecision(predictionResponse)}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <BookmarkCheck className="w-4 h-4 text-blue-600" />
              <span>{savedSuccess ? 'Quote Saved!' : 'Save Quote'}</span>
            </button>
          )}

          {isProfessionalMode && onNavigateToScenario && (
            <button
              type="button"
              id="btn-run-scenario-analysis"
              onClick={() => predictionResponse && onNavigateToScenario(predictionResponse)}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <GitCompare className="w-4 h-4 text-indigo-500" />
              <span>Test What-If Changes</span>
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PROGRESSIVE DISCLOSURE ACCORDION: Specialist / Actuarial Details (Professional Mode Only) */}
        {/* ========================================================================= */}
        {isProfessionalMode && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails((prev) => !prev)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-850/60 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Actuarial Details &amp; Model Diagnostics (For Specialists)</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showTechnicalDetails ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {showTechnicalDetails && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Claim Probability
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                      {primaryPred.claimProbabilityPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Expected Severity
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                      {formatCurrency(primaryPred.expectedSeverityUSD)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Pure Premium E[L]
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                      {formatCurrency(primaryPred.purePremiumUSD)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Underlying Model:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {primaryPred.modelName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deviance Score:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {primaryPred.devianceScore}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inference Latency:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {primaryPred.inferenceTimeMs}ms
                    </span>
                  </div>
                </div>

                {onNavigateToInsights && (
                  <button
                    type="button"
                    onClick={() => predictionResponse && onNavigateToInsights(predictionResponse)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Actuarial Insights Suite →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

