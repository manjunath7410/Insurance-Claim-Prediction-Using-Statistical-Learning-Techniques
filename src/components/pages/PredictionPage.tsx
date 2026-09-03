import React, { useState, useEffect, useCallback } from 'react';
import {
  PolicyholderInput,
  VehicleCategory,
  RegionalRiskZone,
  CoverageTier,
  PredictionResponse,
  ApiPredictionResponse,
} from '../../types';
import {
  PRESET_PROFILES,
  runStatisticalLearningInference,
} from '../../services/statisticalModels';
import { RiskBadge, normalizeRiskLevel } from '../common/RiskBadge';
import { ExplainablePredictionCard } from '../prediction/ExplainablePredictionCard';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Sliders,
  HelpCircle,
  Car,
  User,
  Shield,
  MapPin,
  Clock,
  Zap,
  Info,
  BookmarkCheck,
  Check,
  ChevronRight,
} from 'lucide-react';

interface PredictionPageProps {
  onNavigateToInsights: (response: PredictionResponse) => void;
  onNavigateToScenario?: (response: PredictionResponse) => void;
  onLogDecision?: (response: PredictionResponse, notes?: string) => void;
  onOpenAICopilot?: (prompt?: string) => void;
  injectedPolicy?: Partial<PolicyholderInput> | null;
}

const DEFAULT_POLICY_INPUT: PolicyholderInput = {
  id: 'POL-2026-8819',
  age: 35,
  drivingExperienceYears: 15,
  creditScore: 720,
  creditTier: 'Good (670-739)',
  annualMileage: 12000,
  vehicleCategory: 'Compact SUV',
  vehicleAge: 3,
  vehicleValue: 28000,
  regionalZone: 'Suburban Moderate (Zone B)',
  coverageTier: 'Standard Comprehensive',
  deductible: 750,
  priorClaimsLast5Years: 0,
  trafficViolationsCount: 0,
  antiTheftDevice: true,
  policyTenureYears: 3,
  driverGender: 'Female',
  maritalStatus: 'Married',
  annualExposure: 1.0,
};

export const PredictionPage: React.FC<PredictionPageProps> = ({
  onNavigateToInsights,
  onNavigateToScenario,
  onLogDecision,
  onOpenAICopilot,
  injectedPolicy,
}) => {
  const [formData, setFormData] = useState<PolicyholderInput>(DEFAULT_POLICY_INPUT);
  const [policyId, setPolicyId] = useState<string>('POL-2026-8819');
  const [activePreset, setActivePreset] = useState<string>('suburban_family_suv');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [nlQuery, setNlQuery] = useState<string>('');
  const [nlToast, setNlToast] = useState<string | null>(null);

  // Sync injected policy from AI Copilot drawer
  useEffect(() => {
    if (injectedPolicy) {
      setFormData((prev) => {
        const updated = { ...prev, ...injectedPolicy };
        runPrediction(updated);
        return updated;
      });
      setNlToast('✨ Applied parsed scenario parameters from AI Copilot.');
      const t = setTimeout(() => setNlToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [injectedPolicy]);
  
  // Results
  const [statResponse, setStatResponse] = useState<PredictionResponse | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Helper to generate new Policy ID
  const handleRegeneratePolicyId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newId = `POL-2026-${randomNum}`;
    setPolicyId(newId);
    setFormData((prev) => ({ ...prev, id: newId }));
  };

  // Run statistical regression prediction
  const runPrediction = useCallback(
    async (inputData: PolicyholderInput) => {
      setIsLoading(true);
      setError(null);
      setSavedSuccess(false);

      try {
        let data: PredictionResponse | null = null;

        // Try calling the live statistical regression prediction API (GLM Logistic + Gamma)
        try {
          const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { ...inputData, id: policyId },
              selectedModel: 'glm_logistic_gamma', // Statistical Regression GLM model
            }),
          });

          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            data = await res.json();
          }
        } catch (fetchErr) {
          // Dev server restarting or temporary network blip - fallback directly to statistical engine
          console.warn('Backend API request bypassed, calculating via client-side statistical engine:', fetchErr);
        }

        // Guaranteed fallback: If server returns non-JSON, HTML, or is restarting, execute exact statistical model
        if (!data) {
          data = runStatisticalLearningInference({ ...inputData, id: policyId }, 'glm_logistic_gamma');
        }

        setStatResponse(data);

        // Also record to backend predictions store asynchronously for traceability
        try {
          const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
          const authHeader: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) authHeader['Authorization'] = `Bearer ${token}`;

          fetch('/api/predictions', {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
              input: { ...inputData, id: policyId },
              modelVersion: 'v1.0.0-glm-logistic-baseline',
            }),
          }).catch(() => {
            // Non-blocking
          });
        } catch {
          // Non-blocking
        }
      } catch (err: any) {
        console.warn('Statistical regression prediction handled with fallback engine:', err);
        // Ensure the user never sees a broken UI or unexpected syntax error
        const fallback = runStatisticalLearningInference({ ...inputData, id: policyId }, 'glm_logistic_gamma');
        setStatResponse(fallback);
      } finally {
        setIsLoading(false);
      }
    },
    [policyId]
  );

  // Run initial prediction once on mount so the user immediately sees the working result
  useEffect(() => {
    runPrediction(formData);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runPrediction(formData);
  };

  const handleApplyPreset = (presetKey: string) => {
    if (PRESET_PROFILES[presetKey]) {
      const preset = { ...PRESET_PROFILES[presetKey], id: policyId };
      setActivePreset(presetKey);
      setFormData(preset);
      setError(null);
      runPrediction(preset);
    }
  };

  const handleParseNaturalLanguage = (query: string) => {
    if (!query.trim()) return;
    const lower = query.toLowerCase();
    const updates: Partial<PolicyholderInput> = {};

    // Driver Age
    const ageMatch =
      lower.match(/(?:age\s*[:=]?\s*|(\d{2})\s*(?:yo|y\/o|year\s*old))/i) ||
      lower.match(/\b(1[6-9]|[2-8]\d)\s*(?:years?|yo)\b/i);
    if (ageMatch) {
      const ageVal = parseInt(ageMatch[1] || ageMatch[0], 10);
      if (!isNaN(ageVal) && ageVal >= 16 && ageVal <= 95) {
        updates.age = ageVal;
        updates.drivingExperienceYears = Math.max(
          0,
          Math.min(formData.drivingExperienceYears, ageVal - 16)
        );
      }
    }

    // Prior Claims
    const claimMatch = lower.match(/(\d+)\s*(?:prior\s*)?claims?/i);
    if (claimMatch) {
      const c = parseInt(claimMatch[1], 10);
      if (!isNaN(c)) updates.priorClaimsLast5Years = Math.min(4, Math.max(0, c));
    } else if (
      lower.includes('clean record') ||
      lower.includes('no claims') ||
      lower.includes('zero claims') ||
      lower.includes('clean history')
    ) {
      updates.priorClaimsLast5Years = 0;
    }

    // Vehicle Value
    const valMatch =
      lower.match(/\$?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*k?\s*(?:value|car|vehicle|suv|sedan|truck)/i) ||
      lower.match(/\$(\d{2,3}(?:,\d{3})*|\d{4,6})/);
    if (valMatch) {
      const raw = valMatch[1].replace(/,/g, '');
      let num = parseFloat(raw);
      if (lower.includes(`${raw}k`) || num < 200) num *= 1000;
      if (num >= 3000 && num <= 150000) updates.vehicleValue = num;
    }

    // Vehicle Category
    if (lower.includes('suv')) updates.vehicleCategory = 'Compact SUV';
    else if (lower.includes('sedan') || lower.includes('compact car')) updates.vehicleCategory = 'Economy Sedan';
    else if (
      lower.includes('luxury') ||
      lower.includes('sports') ||
      lower.includes('porsche') ||
      lower.includes('bmw') ||
      lower.includes('mercedes')
    )
      updates.vehicleCategory = 'Luxury / Sports';
    else if (
      lower.includes('van') ||
      lower.includes('commercial') ||
      lower.includes('delivery')
    )
      updates.vehicleCategory = 'Commercial Van';
    else if (
      lower.includes('truck') ||
      lower.includes('electric') ||
      lower.includes('ev') ||
      lower.includes('tesla')
    )
      updates.vehicleCategory = 'Heavy Truck / Electric';

    // Regional Territory Zone
    if (lower.includes('rural') || lower.includes('countryside'))
      updates.regionalZone = 'Rural Low-Risk (Zone A)';
    else if (lower.includes('suburban') || lower.includes('suburb'))
      updates.regionalZone = 'Suburban Moderate (Zone B)';
    else if (lower.includes('urban') || lower.includes('city') || lower.includes('downtown'))
      updates.regionalZone = 'Urban Dense (Zone C)';
    else if (
      lower.includes('metro') ||
      lower.includes('congestion') ||
      lower.includes('high-traffic')
    )
      updates.regionalZone = 'Metro High-Congestion (Zone D)';

    // Anti-theft
    if (
      lower.includes('anti-theft') ||
      lower.includes('telematics') ||
      lower.includes('alarm') ||
      lower.includes('tracker')
    ) {
      updates.antiTheftDevice = true;
    }

    const merged = { ...formData, ...updates };
    setFormData(merged);
    runPrediction(merged);
    setNlToast(
      `✨ Evaluated scenario: ${updates.age ? `${updates.age}yo driver, ` : ''}${
        updates.vehicleCategory || formData.vehicleCategory
      } with ${updates.priorClaimsLast5Years ?? formData.priorClaimsLast5Years} prior claims.`
    );
    setTimeout(() => setNlToast(null), 4500);
  };

  const handleReset = () => {
    setFormData(DEFAULT_POLICY_INPUT);
    setActivePreset('suburban_family_suv');
    setError(null);
    runPrediction(DEFAULT_POLICY_INPUT);
  };

  const handleCopySummary = () => {
    if (!statResponse) return;
    const glm = statResponse.allModels?.glm_logistic_gamma || statResponse.primaryPrediction;
    const summaryText = `--- Insurance Risk Assessment Summary ---
Policy ID: ${policyId}
Driver Age: ${formData.age} | Experience: ${formData.drivingExperienceYears} yrs
Vehicle: ${formData.vehicleCategory} ($${formData.vehicleValue?.toLocaleString()})
Territory: ${formData.regionalZone}
Annual Mileage: ${formData.annualMileage?.toLocaleString()} miles
Prior Claims: ${formData.priorClaimsLast5Years}
Predicted Claim Probability: ${glm?.claimProbabilityPercent?.toFixed(2)}%
Risk Tier: ${glm?.riskTier || 'Standard'}
Expected Severity: $${glm?.expectedSeverityUSD?.toLocaleString() || 'N/A'}
Pure Premium (E[Loss]): $${glm?.purePremiumUSD?.toLocaleString() || 'N/A'}
Underwriting Recommendation: ${glm?.underwritingRecommendation || 'Standard Rate'}`;

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    }).catch(() => {
      // clipboard fallback
    });
  };

  const handleSaveDecision = () => {
    if (statResponse && onLogDecision) {
      onLogDecision(statResponse);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  // Derive plain-English reasons for the "Why?" section
  const getPlainEnglishExplanations = () => {
    if (!statResponse) return [];

    const reasons: Array<{ type: 'positive' | 'warning'; text: string }> = [];

    // Prior claims
    if (formData.priorClaimsLast5Years === 0) {
      reasons.push({ type: 'positive', text: 'Clean claim history (0 prior claims in 5 years)' });
    } else {
      reasons.push({
        type: 'warning',
        text: `${formData.priorClaimsLast5Years} prior claim incident${formData.priorClaimsLast5Years > 1 ? 's' : ''} in last 5 years`,
      });
    }

    // Driver age
    if (formData.age >= 25 && formData.age <= 65) {
      reasons.push({ type: 'positive', text: `Prime driving age (${formData.age} years old)` });
    } else if (formData.age < 21) {
      reasons.push({ type: 'warning', text: `Young driver age bracket (${formData.age} years old)` });
    } else if (formData.age >= 68) {
      reasons.push({ type: 'warning', text: `Senior driver cohort (${formData.age} years old)` });
    }

    // Anti-theft
    if (formData.antiTheftDevice) {
      reasons.push({ type: 'positive', text: 'Anti-theft & telematics device installed' });
    } else {
      reasons.push({ type: 'warning', text: 'No certified anti-theft device detected' });
    }

    // Annual Mileage
    if (formData.annualMileage > 15000) {
      reasons.push({
        type: 'warning',
        text: `Higher annual road mileage (${formData.annualMileage.toLocaleString()} miles/yr)`,
      });
    } else if (formData.annualMileage < 8000) {
      reasons.push({
        type: 'positive',
        text: `Low annual road exposure (${formData.annualMileage.toLocaleString()} miles/yr)`,
      });
    }

    // Credit score
    if (formData.creditScore >= 720) {
      reasons.push({ type: 'positive', text: `Strong insurance credit score (${formData.creditScore} FICO)` });
    } else if (formData.creditScore < 620) {
      reasons.push({ type: 'warning', text: `Lower insurance credit score rating (${formData.creditScore})` });
    }

    // Territory
    if (formData.regionalZone.includes('Metro')) {
      reasons.push({ type: 'warning', text: 'Metro high-congestion territory zone' });
    } else if (formData.regionalZone.includes('Rural')) {
      reasons.push({ type: 'positive', text: 'Rural low-congestion territory zone' });
    }

    return reasons.slice(0, 4); // Keep top 4 clear reasons
  };

  // Prediction calculations from GLM model
  const glmPred = statResponse?.allModels?.glm_logistic_gamma || statResponse?.primaryPrediction;
  const claimProbPercent = glmPred ? glmPred.claimProbabilityPercent : 6.4;
  const riskInfo = normalizeRiskLevel(glmPred?.riskTier || 'Standard', claimProbPercent);
  const actionThreshold = 8.0; // 8% standard underwriting threshold
  const isBelowThreshold = claimProbPercent < actionThreshold;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Clean Page Title Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Statistical Regression Model
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Logistic Regression (GLM)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Insurance Claim Prediction
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
              Estimate the probability of a claim using statistical regression.
            </p>
          </div>

          {/* Quick Archetype Preset Selector & Copy Summary */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Quick Profiles:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  id="preset-standard"
                  onClick={() => handleApplyPreset('suburban_family_suv')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    activePreset === 'suburban_family_suv'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Standard family SUV, suburban area, clean history"
                >
                  Family SUV
                </button>
                <button
                  type="button"
                  id="preset-young"
                  onClick={() => handleApplyPreset('young_urban_sports')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    activePreset === 'young_urban_sports'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Young driver, high annual mileage, sports car in metro zone"
                >
                  Young Driver
                </button>
                <button
                  type="button"
                  id="preset-retiree"
                  onClick={() => handleApplyPreset('experienced_rural_sedan')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    activePreset === 'experienced_rural_sedan'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Experienced driver, low mileage, rural area"
                >
                  Rural Sedan
                </button>
                <button
                  type="button"
                  id="preset-high-risk"
                  onClick={() => handleApplyPreset('high_risk_commuter')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    activePreset === 'high_risk_commuter'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="High mileage commuter, prior claim incidents, urban traffic"
                >
                  High-Risk
                </button>
              </div>
            </div>

            {/* Quick Copy Summary Button */}
            <button
              type="button"
              id="copy-summary-button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Google / Meta / ChatGPT Style Conversational Scenario Prompt Bar */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-purple-50/60 dark:from-slate-900 dark:via-indigo-950/25 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Conversational Underwriting Assistant
            </span>
          </div>
          {onOpenAICopilot && (
            <button
              type="button"
              id="open-copilot-from-promptbar-btn"
              onClick={() => onOpenAICopilot(nlQuery || 'Explain current risk evaluation and recommend optimization strategies')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Ask Copilot in Chat</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="natural-language-scenario-input"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleParseNaturalLanguage(nlQuery);
                }
              }}
              placeholder="Describe driver scenario in plain English (e.g., '22yo driver with $35k SUV in urban zone and 1 claim')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="analyze-scenario-btn"
              onClick={() => handleParseNaturalLanguage(nlQuery)}
              disabled={!nlQuery.trim()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Analyze Scenario</span>
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips (ChatGPT / Meta AI style) */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs whitespace-nowrap no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            Quick Examples:
          </span>
          {[
            {
              label: '⚡ 21yo Urban SUV (1 Claim)',
              text: '21yo driver with $35,000 compact SUV in urban dense area with 1 prior claim',
            },
            {
              label: '🛡️ 45yo Rural Sedan (Clean)',
              text: '45yo driver with $22,000 sedan in rural zone with clean record and anti-theft',
            },
            {
              label: '🚙 38yo Suburban Family',
              text: '38yo driver with $40,000 SUV in suburban zone with 14000 miles per year',
            },
            {
              label: '💼 28yo Commercial Van (Metro)',
              text: '28yo driver with commercial van in metro high-congestion zone and 2 claims',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setNlQuery(item.text);
                handleParseNaturalLanguage(item.text);
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/80 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shrink-0"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Toast confirmation banner */}
        {nlToast && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{nlToast}</span>
            <button
              type="button"
              onClick={() => setNlToast(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout: Form on Left, Result Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Clean Policy Risk Assessment Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Policy & Driver Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adjust sliders or fields to recalculate statistical pure premium
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
            {/* Policy ID (Editable / Auto-generated) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="policy-id-input"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Policy ID
                </label>
                <button
                  type="button"
                  onClick={handleRegeneratePolicyId}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Generate New ID
                </button>
              </div>
              <input
                id="policy-id-input"
                type="text"
                value={policyId}
                onChange={(e) => {
                  setPolicyId(e.target.value);
                  setFormData((prev) => ({ ...prev, id: e.target.value }));
                }}
                className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all font-mono"
                placeholder="POL-2026-8819"
              />
            </div>

            {/* Grid Row: Driver Age & Driving Experience with Slider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="driver-age-input"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Driver Age
                  </label>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formData.age} yrs
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    id="driver-age-input"
                    type="number"
                    min={16}
                    max={100}
                    value={formData.age}
                    onChange={(e) => {
                      const age = Number(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        age,
                        drivingExperienceYears: Math.min(prev.drivingExperienceYears, Math.max(0, age - 16)),
                      }));
                    }}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                  <input
                    type="range"
                    min={16}
                    max={85}
                    value={formData.age}
                    onChange={(e) => {
                      const age = Number(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        age,
                        drivingExperienceYears: Math.min(prev.drivingExperienceYears, Math.max(0, age - 16)),
                      }));
                    }}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, age: 21, drivingExperienceYears: 3 }))}
                      className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      Youth (21)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, age: 38, drivingExperienceYears: 18 }))}
                      className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      Prime (38)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, age: 68, drivingExperienceYears: 45 }))}
                      className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      Senior (68)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="driving-experience-input"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Driving Experience
                  </label>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formData.drivingExperienceYears} yrs
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    id="driving-experience-input"
                    type="number"
                    min={0}
                    max={Math.max(0, formData.age - 16)}
                    value={formData.drivingExperienceYears}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        drivingExperienceYears: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, formData.age - 16)}
                    value={formData.drivingExperienceYears}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        drivingExperienceYears: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Licensed years (Max {Math.max(0, formData.age - 16)} yrs)
                  </p>
                </div>
              </div>
            </div>

            {/* Grid Row: Vehicle Category & Coverage Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="vehicle-category-select"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Vehicle Category
                </label>
                <select
                  id="vehicle-category-select"
                  value={formData.vehicleCategory}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vehicleCategory: e.target.value as VehicleCategory,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value="Economy Sedan">Economy Sedan</option>
                  <option value="Compact SUV">Compact SUV</option>
                  <option value="Luxury / Sports">Luxury / Sports</option>
                  <option value="Commercial Van">Commercial Van</option>
                  <option value="Heavy Truck / Electric">Heavy Truck / Electric</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Classification of insured vehicle
                </p>
              </div>

              <div>
                <label
                  htmlFor="coverage-tier-select"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Coverage Tier
                </label>
                <select
                  id="coverage-tier-select"
                  value={formData.coverageTier}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      coverageTier: e.target.value as CoverageTier,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value="Basic Third-Party">Basic Third-Party</option>
                  <option value="Standard Comprehensive">Standard Comprehensive</option>
                  <option value="Full Comprehensive + Zero-Dep">Full Comprehensive + Zero-Dep</option>
                  <option value="Executive Platinum">Executive Platinum</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Policy benefit package level
                </p>
              </div>
            </div>

            {/* Grid Row: Vehicle Value & Policy Deductible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="vehicle-value-input"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Vehicle Value ($USD)
                  </label>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    ${formData.vehicleValue.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    id="vehicle-value-input"
                    type="number"
                    step={1000}
                    min={2000}
                    max={150000}
                    value={formData.vehicleValue}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vehicleValue: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                  <input
                    type="range"
                    min={5000}
                    max={100000}
                    step={2500}
                    value={formData.vehicleValue}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vehicleValue: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="deductible-select"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Collision Deductible
                  </label>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    ${formData.deductible}
                  </span>
                </div>
                <select
                  id="deductible-select"
                  value={formData.deductible}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deductible: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value={250}>$250 (Low Deductible)</option>
                  <option value={500}>$500 (Standard)</option>
                  <option value={750}>$750 (Balanced)</option>
                  <option value={1000}>$1,000 (Loss-Sharing Discount)</option>
                  <option value={2000}>$2,000 (High-Retention)</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Out-of-pocket retained loss per claim
                </p>
              </div>
            </div>

            {/* Grid Row: Annual Mileage & Insurance Credit Score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="annual-mileage-input"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Annual Mileage
                  </label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {formData.annualMileage.toLocaleString()} mi/yr
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    id="annual-mileage-input"
                    type="number"
                    step={500}
                    min={1000}
                    max={80000}
                    value={formData.annualMileage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        annualMileage: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                  <input
                    type="range"
                    min={3000}
                    max={35000}
                    step={1000}
                    value={formData.annualMileage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        annualMileage: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, annualMileage: 6000 }))}
                      className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      Low (6k)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, annualMileage: 12000 }))}
                      className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      Avg (12k)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, annualMileage: 22000 }))}
                      className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      High (22k)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="credit-score-input"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Insurance Credit Score
                  </label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {formData.creditScore} FICO
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    id="credit-score-input"
                    type="number"
                    min={300}
                    max={850}
                    value={formData.creditScore}
                    onChange={(e) => {
                      const score = Number(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        creditScore: score,
                      }));
                    }}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                  <input
                    type="range"
                    min={450}
                    max={850}
                    step={10}
                    value={formData.creditScore}
                    onChange={(e) => {
                      const score = Number(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        creditScore: score,
                      }));
                    }}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, creditScore: 580 }))}
                      className="hover:text-blue-600 cursor-pointer"
                    >
                      Fair (580)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, creditScore: 720 }))}
                      className="hover:text-blue-600 cursor-pointer"
                    >
                      Good (720)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, creditScore: 800 }))}
                      className="hover:text-blue-600 cursor-pointer"
                    >
                      Excellent (800)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Row: Prior Claims & Territory Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="prior-claims-select"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Prior Claims (Last 5 Years)
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 0, label: '0 (Clean)' },
                      { val: 1, label: '1' },
                      { val: 2, label: '2' },
                      { val: 3, label: '3+' },
                    ].map((step) => (
                      <button
                        key={step.val}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            priorClaimsLast5Years: step.val,
                          }))
                        }
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                          formData.priorClaimsLast5Years === step.val
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Past loss incident frequency recurrence signal
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="territory-zone-select"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Territory / Zone
                </label>
                <select
                  id="territory-zone-select"
                  value={formData.regionalZone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      regionalZone: e.target.value as RegionalRiskZone,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value="Rural Low-Risk (Zone A)">Rural Low-Risk (Zone A)</option>
                  <option value="Suburban Moderate (Zone B)">Suburban Moderate (Zone B)</option>
                  <option value="Urban Dense (Zone C)">Urban Dense (Zone C)</option>
                  <option value="Metro High-Congestion (Zone D)">Metro High-Congestion (Zone D)</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Regional risk territory rating
                </p>
              </div>
            </div>

            {/* Anti-Theft / Telematics Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="pr-4">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Anti-Theft Device & Telematics
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Certified alarm, GPS tracking, or connected driver telematics unit
                </span>
              </div>
              <label
                htmlFor="anti-theft-toggle"
                className="relative inline-flex items-center cursor-pointer shrink-0"
              >
                <input
                  type="checkbox"
                  id="anti-theft-toggle"
                  checked={formData.antiTheftDevice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      antiTheftDevice: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              id="predict-claim-risk-button"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer min-h-[48px]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Computing Statistical Regression...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Predict Claim Risk</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Phase 6 Explainable Insurance Claim Prediction Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <ExplainablePredictionCard
            predictionResponse={statResponse}
            policyId={policyId}
            onNavigateToInsights={onNavigateToInsights}
            onNavigateToScenario={onNavigateToScenario}
            onLogDecision={handleSaveDecision}
            savedSuccess={savedSuccess}
            onOpenAICopilot={onOpenAICopilot}
          />
        </div>
      </div>
    </div>
  );
};
