import React, { useState, useEffect, useCallback } from 'react';
import {
  PolicyholderInput,
  VehicleCategory,
  RegionalRiskZone,
  CoverageTier,
  PredictionResponse,
  CreditTier,
} from '../../types';
import {
  PRESET_PROFILES,
  runStatisticalLearningInference,
} from '../../services/statisticalModels';
import { ExplainablePredictionCard } from '../prediction/ExplainablePredictionCard';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Car,
  User,
  Shield,
  Zap,
  ChevronRight,
  ChevronLeft,
  Calendar,
  IndianRupee,
  DollarSign,
  Award,
  AlertCircle,
  HelpCircle,
  Clock,
  ThumbsUp,
  FileCheck2,
  Check,
} from 'lucide-react';

interface PredictionPageProps {
  onNavigateToInsights: (response: PredictionResponse) => void;
  onNavigateToScenario?: (response: PredictionResponse) => void;
  onNavigateToResults?: (response: PredictionResponse) => void;
  onNavigateToExplain?: (response: PredictionResponse) => void;
  onPredictionCalculated?: (response: PredictionResponse) => void;
  onLogDecision?: (response: PredictionResponse, notes?: string) => void;
  onOpenAICopilot?: (prompt?: string) => void;
  injectedPolicy?: Partial<PolicyholderInput> | null;
  isProfessionalMode?: boolean;
}

const DEFAULT_POLICY_INPUT: PolicyholderInput = {
  id: 'POL-2026-8819',
  age: 35,
  drivingExperienceYears: 15,
  creditScore: 740,
  creditTier: 'Very Good (740-799)',
  annualMileage: 12000,
  vehicleCategory: 'Compact SUV',
  vehicleAge: 3,
  vehicleValue: 24000, // in USD
  regionalZone: 'Suburban Moderate (Zone B)',
  coverageTier: 'Standard Comprehensive',
  deductible: 500, // in USD
  priorClaimsLast5Years: 0,
  trafficViolationsCount: 0,
  antiTheftDevice: true,
  policyTenureYears: 3,
  driverGender: 'Female',
  maritalStatus: 'Married',
  annualExposure: 1.0, // 1 year
};

const USD_TO_INR_RATE = 83;

// Indian format number helper e.g. 15,00,000
function formatINR(val: number): string {
  return Math.round(val).toLocaleString('en-IN');
}

// Compact Indian lakh/crore helper e.g. 15 Lakhs
function toLakhsCrores(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Crore`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)} Lakhs`;
  }
  return `₹${formatINR(val)}`;
}

export const PredictionPage: React.FC<PredictionPageProps> = ({
  onNavigateToInsights,
  onNavigateToScenario,
  onNavigateToResults,
  onNavigateToExplain,
  onPredictionCalculated,
  onLogDecision,
  onOpenAICopilot,
  injectedPolicy,
  isProfessionalMode = false,
}) => {
  const [formData, setFormData] = useState<PolicyholderInput>(DEFAULT_POLICY_INPUT);
  const [policyId, setPolicyId] = useState<string>('POL-2026-8819');
  const [activePreset, setActivePreset] = useState<string>('suburban_family_suv');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nlQuery, setNlQuery] = useState<string>('');
  const [nlToast, setNlToast] = useState<string | null>(null);

  // Multi-step Navigation State: 1 to 4
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);

  // Step validation errors
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Currency selection: default to INR (₹) for friendly customer experience
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [vehicleValueINR, setVehicleValueINR] = useState<number>(() =>
    Math.round(DEFAULT_POLICY_INPUT.vehicleValue * USD_TO_INR_RATE)
  );

  // Conditional Reveal states
  const [hasMadeClaim, setHasMadeClaim] = useState<boolean>(
    DEFAULT_POLICY_INPUT.priorClaimsLast5Years > 0
  );
  const [hasViolations, setHasViolations] = useState<boolean>(
    DEFAULT_POLICY_INPUT.trafficViolationsCount > 0
  );

  // Optional demographic fields expansion
  const [showAdditionalProfile, setShowAdditionalProfile] = useState<boolean>(false);

  // Results state
  const [statResponse, setStatResponse] = useState<PredictionResponse | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync vehicleValue in USD whenever vehicleValueINR changes
  const updateVehicleValueFromINR = (inrVal: number) => {
    setVehicleValueINR(inrVal);
    const usdVal = Math.max(500, Math.round(inrVal / USD_TO_INR_RATE));
    setFormData((prev) => ({ ...prev, vehicleValue: usdVal }));
  };

  // Sync vehicleValueINR when formData.vehicleValue changes from outside
  useEffect(() => {
    if (formData.vehicleValue) {
      setVehicleValueINR(Math.round(formData.vehicleValue * USD_TO_INR_RATE));
    }
  }, [formData.vehicleValue]);

  // Sync claim state with form data
  useEffect(() => {
    setHasMadeClaim(formData.priorClaimsLast5Years > 0);
  }, [formData.priorClaimsLast5Years]);

  // Run statistical regression prediction
  const runPrediction = useCallback(
    async (inputData: PolicyholderInput) => {
      setIsLoading(true);
      setError(null);
      setSavedSuccess(false);

      try {
        let data: PredictionResponse | null = null;

        // Call the backend prediction API
        try {
          const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { ...inputData, id: policyId },
              selectedModel: 'glm_logistic_gamma',
            }),
          });

          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            data = await res.json();
          }
        } catch (fetchErr) {
          console.warn('Backend API request bypassed, calculating via statistical engine:', fetchErr);
        }

        // Guaranteed fallback: If server returns non-JSON or is restarting, execute statistical engine
        if (!data) {
          data = runStatisticalLearningInference(
            { ...inputData, id: policyId },
            'glm_logistic_gamma'
          );
        }

        setStatResponse(data);
        if (onPredictionCalculated) {
          onPredictionCalculated(data);
        }

        // Record to store asynchronously for traceability if available
        try {
          const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
          const authHeader: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) authHeader['Authorization'] = `Bearer ${token}`;

          fetch('/api/predictions', {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
              input: { ...inputData, id: policyId },
              response: data,
            }),
          }).catch(() => {});
        } catch {
          // ignore background telemetry failure
        }
      } catch (err: any) {
        console.error('Prediction calculation error:', err);
        setError("Sorry, we couldn't calculate your result right now. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [policyId]
  );

  // Sync injected policy from AI Copilot drawer or scenario
  useEffect(() => {
    if (injectedPolicy) {
      setFormData((prev) => {
        const updated = { ...prev, ...injectedPolicy };
        runPrediction(updated);
        return updated;
      });
      setNlToast('✨ Loaded scenario details from your previous selection.');
      const t = setTimeout(() => setNlToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [injectedPolicy, runPrediction]);

  // Initial calculation on mount
  useEffect(() => {
    runPrediction(DEFAULT_POLICY_INPUT);
  }, []);

  // Step Validation Logic
  const validateStep = (stepNumber: number): boolean => {
    const errors: Record<string, string> = {};

    if (stepNumber === 1) {
      // Driver Age
      if (formData.age === undefined || formData.age === null || isNaN(formData.age)) {
        errors.age = 'Please enter your age to continue.';
      } else if (formData.age < 16 || formData.age > 100) {
        errors.age = 'Please enter an age between 16 and 100 years.';
      }

      // Driving Experience
      const maxExp = Math.max(0, (formData.age || 18) - 16);
      if (
        formData.drivingExperienceYears === undefined ||
        formData.drivingExperienceYears === null ||
        isNaN(formData.drivingExperienceYears)
      ) {
        errors.drivingExperience = 'Please enter your years of driving experience to continue.';
      } else if (formData.drivingExperienceYears < 0) {
        errors.drivingExperience = 'Driving experience cannot be negative.';
      } else if (formData.drivingExperienceYears > maxExp) {
        errors.drivingExperience = `Driving experience cannot exceed ${maxExp} years (your age minus legal driving age 16).`;
      }

      // Credit Rating
      if (!formData.creditScore || formData.creditScore < 300 || formData.creditScore > 850) {
        errors.creditScore = 'Please select your credit rating tier to continue.';
      }
    } else if (stepNumber === 2) {
      // Vehicle Value
      if (currency === 'INR') {
        if (!vehicleValueINR || vehicleValueINR < 40000 || vehicleValueINR > 80000000) {
          errors.vehicleValue = 'Please enter a vehicle value between ₹50,000 and ₹8 Crore to continue.';
        }
      } else {
        if (!formData.vehicleValue || formData.vehicleValue < 500 || formData.vehicleValue > 1000000) {
          errors.vehicleValue = 'Please enter a vehicle value between $500 and $1,000,000 to continue.';
        }
      }

      // Annual Mileage
      if (!formData.annualMileage || formData.annualMileage < 500 || formData.annualMileage > 100000) {
        errors.annualMileage = 'Please enter typical annual mileage between 500 and 100,000 miles to continue.';
      }

      // Vehicle Age
      if (formData.vehicleAge < 0 || formData.vehicleAge > 40) {
        errors.vehicleAge = 'Please enter vehicle age between 0 and 40 years to continue.';
      }
    } else if (stepNumber === 3) {
      // Prior Claims
      if (hasMadeClaim) {
        if (
          formData.priorClaimsLast5Years === undefined ||
          formData.priorClaimsLast5Years < 1 ||
          formData.priorClaimsLast5Years > 20
        ) {
          errors.priorClaims = 'Please enter the number of past claims (between 1 and 20) to continue.';
        }
      }

      // Traffic Violations
      if (hasViolations) {
        if (
          formData.trafficViolationsCount === undefined ||
          formData.trafficViolationsCount < 1 ||
          formData.trafficViolationsCount > 20
        ) {
          errors.trafficViolations = 'Please enter the number of violations (between 1 and 20) to continue.';
        }
      }
    } else if (stepNumber === 4) {
      // Coverage Duration (Exposure)
      if (!formData.annualExposure || formData.annualExposure < 0.05 || formData.annualExposure > 5.0) {
        errors.annualExposure = 'Please select how long you would like coverage to continue.';
      }

      // Deductible
      if (formData.deductible === undefined || formData.deductible < 0 || formData.deductible > 10000) {
        errors.deductible = 'Please select your preferred deductible amount to continue.';
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Next Step handler
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setStepErrors({});
      setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]));
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Previous Step handler
  const handlePrevStep = () => {
    setStepErrors({});
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Jump to step handler
  const handleJumpToStep = (targetStep: number) => {
    // Only allow jumping back, or jumping forward if earlier steps are completed
    if (targetStep < currentStep || completedSteps.includes(targetStep - 1)) {
      setStepErrors({});
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Preset button handler
  const handleApplyPreset = (presetKey: string) => {
    const preset = PRESET_PROFILES[presetKey];
    if (preset) {
      setActivePreset(presetKey);
      const updated = {
        ...formData,
        ...preset,
        id: policyId,
      };
      setFormData(updated);
      setVehicleValueINR(Math.round(updated.vehicleValue * USD_TO_INR_RATE));
      setHasMadeClaim(updated.priorClaimsLast5Years > 0);
      setHasViolations(updated.trafficViolationsCount > 0);
      runPrediction(updated);
      setNlToast(
        `✨ Loaded sample profile: ${preset.vehicleCategory} with ${preset.priorClaimsLast5Years} prior claims.`
      );
      setTimeout(() => setNlToast(null), 3500);
    }
  };

  // Final Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation of all steps before execution
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    const calculated = runStatisticalLearningInference(
      { ...formData, id: policyId },
      'glm_logistic_gamma'
    );
    setStatResponse(calculated);
    if (onPredictionCalculated) {
      onPredictionCalculated(calculated);
    }

    // In customer mode, directly transition to the dedicated Results screen for a frictionless mobile flow
    if (onNavigateToResults && !isProfessionalMode) {
      onNavigateToResults(calculated);
      return;
    }

    // On mobile or small screens, smooth scroll to results
    const resultEl = document.getElementById('prediction-result-section');
    if (resultEl && window.innerWidth < 1024) {
      setTimeout(() => {
        resultEl.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData(DEFAULT_POLICY_INPUT);
    setVehicleValueINR(Math.round(DEFAULT_POLICY_INPUT.vehicleValue * USD_TO_INR_RATE));
    setHasMadeClaim(false);
    setHasViolations(false);
    setActivePreset('suburban_family_suv');
    setCurrentStep(1);
    setCompletedSteps([1]);
    setStepErrors({});
    setError(null);
    runPrediction(DEFAULT_POLICY_INPUT);
  };

  const handleSaveDecision = () => {
    if (statResponse && onLogDecision) {
      onLogDecision(statResponse);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  // Stepper labels
  const stepsMeta = [
    { num: 1, title: 'About You', desc: 'Driver Details' },
    { num: 2, title: 'Your Vehicle', desc: 'Car & Commute' },
    { num: 3, title: 'Previous Claims', desc: 'Driving Record' },
    { num: 4, title: 'Insurance Coverage', desc: 'Term & Protection' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Friendly Intro Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Step-by-Step Risk &amp; Rate Estimator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Check Your Insurance Risk
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Complete the 4 simple steps below to see your personalized safety rating and estimated fair premium in under 2 minutes.
            </p>
          </div>

          {/* Example Profiles Selector */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Try a Sample Driver:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="preset-standard"
                onClick={() => handleApplyPreset('suburban_family_suv')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activePreset === 'suburban_family_suv'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Family SUV
              </button>
              <button
                type="button"
                id="preset-young"
                onClick={() => handleApplyPreset('young_urban_sports')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activePreset === 'young_urban_sports'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Young Driver
              </button>
              <button
                type="button"
                id="preset-retiree"
                onClick={() => handleApplyPreset('experienced_rural_sedan')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activePreset === 'experienced_rural_sedan'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Rural Sedan
              </button>
            </div>
          </div>
        </div>

        {/* Optional Natural Language Assist Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              id="natural-language-scenario-input"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="Or type in plain words: e.g. 32yo driver with ₹12 Lakh SUV and no claims..."
              className="w-full px-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {onOpenAICopilot && (
            <button
              type="button"
              id="open-copilot-from-promptbar-btn"
              onClick={() =>
                onOpenAICopilot(
                  nlQuery ||
                    'What are the best practical ways for a safe driver to lower auto insurance costs?'
                )
              }
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Ask AI Copilot</span>
            </button>
          )}
        </div>

        {nlToast && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
            <span>{nlToast}</span>
            <button
              type="button"
              onClick={() => setNlToast(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Redesigned Step-by-Step Customer Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          {/* Header & Reset Button */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Step {currentStep} of 4
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {stepsMeta[currentStep - 1].title}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset all fields to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Clear Progress Indicator (Step 1 of 4, Step 2 of 4...) */}
          <div className="space-y-2">
            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>

            {/* Step Selection Buttons */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1">
              {stepsMeta.map((s) => {
                const isActive = currentStep === s.num;
                const isCompleted = completedSteps.includes(s.num) && currentStep > s.num;

                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => handleJumpToStep(s.num)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] touch-manipulation ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs ring-1 ring-blue-600/30'
                        : isCompleted
                        ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 text-slate-400 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
                        Step {s.num}
                      </span>
                      {isCompleted && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold truncate mt-0.5">{s.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* ========================================================================= */}
            {/* STEP 1: ABOUT YOU */}
            {/* ========================================================================= */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Driver Age */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="driver-age-input"
                      className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5"
                    >
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>How old are you?</span>
                    </label>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                      {formData.age ? `${formData.age} years old` : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Insurer rates consider driver age for statistical crash risk assessment.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      id="driver-age-input"
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      min={16}
                      max={100}
                      value={formData.age || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const cleanAge = isNaN(val) ? 0 : val;
                        setFormData((prev) => ({
                          ...prev,
                          age: cleanAge,
                          drivingExperienceYears: Math.min(
                            prev.drivingExperienceYears,
                            Math.max(0, cleanAge - 16)
                          ),
                        }));
                      }}
                      className={`w-full sm:w-32 px-4 py-3 text-base font-bold rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 min-h-[48px] ${
                        stepErrors.age
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />

                    {/* Quick Age Buttons for fast mobile tapping */}
                    <div className="flex flex-wrap gap-2">
                      {[21, 28, 35, 48, 65].map((agePreset) => (
                        <button
                          key={agePreset}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              age: agePreset,
                              drivingExperienceYears: Math.min(
                                prev.drivingExperienceYears,
                                Math.max(0, agePreset - 16)
                              ),
                            }))
                          }
                          className={`min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all touch-manipulation flex items-center justify-center ${
                            formData.age === agePreset
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {agePreset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {stepErrors.age && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{stepErrors.age}</span>
                    </p>
                  )}
                </div>

                {/* 2. Driving Experience */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="driving-experience-input"
                      className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>How many years have you been driving?</span>
                    </label>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                      {formData.drivingExperienceYears} years
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Years since you earned your official driving license (max {Math.max(0, formData.age - 16)} yrs).
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      id="driving-experience-input"
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      min={0}
                      max={Math.max(0, formData.age - 16)}
                      value={formData.drivingExperienceYears}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setFormData((prev) => ({
                          ...prev,
                          drivingExperienceYears: isNaN(val) ? 0 : val,
                        }));
                      }}
                      className={`w-full sm:w-32 px-4 py-3 text-base font-bold rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 min-h-[48px] ${
                        stepErrors.drivingExperience
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />

                    <div className="flex flex-wrap gap-2">
                      {[2, 5, 10, 18, 25]
                        .filter((yrs) => yrs <= Math.max(0, formData.age - 16))
                        .map((exp) => (
                          <button
                            key={exp}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, drivingExperienceYears: exp }))
                            }
                            className={`min-h-[44px] min-w-[48px] px-3.5 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all touch-manipulation flex items-center justify-center ${
                              formData.drivingExperienceYears === exp
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {exp} yrs
                          </button>
                        ))}
                    </div>
                  </div>

                  {stepErrors.drivingExperience && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{stepErrors.drivingExperience}</span>
                    </p>
                  )}
                </div>

                {/* 3. Credit Rating (Friendly Cards) */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-slate-900 dark:text-white">
                      What is your credit score rating?
                    </label>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                      {formData.creditScore} ({formData.creditTier})
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A positive credit history typically qualifies drivers for preferred pricing.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {[
                      {
                        tier: 'Exceptional (800+)' as CreditTier,
                        score: 810,
                        title: 'Exceptional',
                        subtitle: '800+',
                        badge: 'Best Rate',
                      },
                      {
                        tier: 'Very Good (740-799)' as CreditTier,
                        score: 750,
                        title: 'Very Good',
                        subtitle: '740 - 799',
                        badge: 'Preferred',
                      },
                      {
                        tier: 'Good (670-739)' as CreditTier,
                        score: 710,
                        title: 'Good',
                        subtitle: '670 - 739',
                        badge: 'Standard',
                      },
                      {
                        tier: 'Fair (580-669)' as CreditTier,
                        score: 630,
                        title: 'Fair',
                        subtitle: '580 - 669',
                      },
                      {
                        tier: 'Poor (<580)' as CreditTier,
                        score: 540,
                        title: 'Rebuilding',
                        subtitle: 'Under 580',
                      },
                    ].map((item) => (
                      <button
                        key={item.tier}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            creditTier: item.tier,
                            creditScore: item.score,
                          }))
                        }
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer min-h-[56px] touch-manipulation flex flex-col justify-between ${
                          formData.creditTier === item.tier
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs ring-1 ring-blue-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{item.title}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>

                  {stepErrors.creditScore && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{stepErrors.creditScore}</span>
                    </p>
                  )}
                </div>

                {/* Collapsible Additional Profile Options (Gender, Marital Status) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdditionalProfile(!showAdditionalProfile)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAdditionalProfile ? '▾ Hide optional demographic details' : '▸ Optional personal details (Gender, Marital Status)'}</span>
                  </button>

                  {showAdditionalProfile && (
                    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Gender
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['Female', 'Male', 'Other'] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, driverGender: g }))}
                              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                                formData.driverGender === g
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Marital Status
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['Married', 'Single', 'Divorced'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, maritalStatus: m }))}
                              className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                                formData.maritalStatus === m
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 1 Continue Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all min-h-[52px] touch-manipulation"
                  >
                    <span>Continue to Your Vehicle</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: YOUR VEHICLE / POLICY */}
            {/* ========================================================================= */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Vehicle Type Selection */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-black text-slate-900 dark:text-white">
                    What type of vehicle do you drive?
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Different vehicle types have different repair parts costs and safety profiles.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {[
                      { id: 'Economy Sedan', label: 'Sedan / Hatchback', icon: '🚗' },
                      { id: 'Compact SUV', label: 'SUV / Crossover', icon: '🚙' },
                      { id: 'Luxury / Sports', label: 'Luxury / Sports Car', icon: '🏎️' },
                      { id: 'Heavy Truck / Electric', label: 'Electric Vehicle / Truck', icon: '⚡' },
                      { id: 'Commercial Van', label: 'Commercial Van', icon: '🚐' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            vehicleCategory: item.id as VehicleCategory,
                          }))
                        }
                        className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer min-h-[58px] touch-manipulation flex items-center gap-3 sm:flex-col sm:items-start ${
                          formData.vehicleCategory === item.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs ring-1 ring-blue-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-2xl shrink-0 sm:mb-1">{item.icon}</div>
                        <div className="font-extrabold text-sm sm:text-xs leading-snug">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Approximate Vehicle Value in ₹ (Indian Formatting) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="vehicle-value-input"
                      className="text-sm font-black text-slate-900 dark:text-white"
                    >
                      What is the approximate value of your vehicle?
                    </label>

                    {/* Currency Toggle */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setCurrency('INR')}
                        className={`px-2.5 py-1 rounded text-xs font-extrabold cursor-pointer transition-colors min-h-[32px] ${
                          currency === 'INR'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        ₹ INR
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency('USD')}
                        className={`px-2.5 py-1 rounded text-xs font-extrabold cursor-pointer transition-colors min-h-[32px] ${
                          currency === 'USD'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        $ USD
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estimated market replacement value of the vehicle.
                  </p>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                      {currency === 'INR' ? '₹' : '$'}
                    </div>

                    <input
                      id="vehicle-value-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={
                        currency === 'INR'
                          ? formatINR(vehicleValueINR)
                          : formatINR(formData.vehicleValue)
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const num = parseInt(raw, 10) || 0;
                        if (currency === 'INR') {
                          updateVehicleValueFromINR(num);
                        } else {
                          setFormData((prev) => ({ ...prev, vehicleValue: num }));
                          setVehicleValueINR(Math.round(num * USD_TO_INR_RATE));
                        }
                      }}
                      className={`w-full pl-8 pr-28 py-3.5 text-base sm:text-lg font-bold rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 min-h-[52px] ${
                        stepErrors.vehicleValue
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />

                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-blue-600 dark:text-blue-400">
                      {currency === 'INR' ? toLakhsCrores(vehicleValueINR) : `$${formData.vehicleValue?.toLocaleString()}`}
                    </div>
                  </div>

                  {/* Common Indian Vehicle Value Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {currency === 'INR' ? (
                      [
                        { label: '₹ 4 Lakhs (Hatchback)', inr: 400000 },
                        { label: '₹ 8 Lakhs (Sedan)', inr: 800000 },
                        { label: '₹ 15 Lakhs (Mid SUV)', inr: 1500000 },
                        { label: '₹ 25 Lakhs (Premium)', inr: 2500000 },
                        { label: '₹ 45 Lakhs (Luxury)', inr: 4500000 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => updateVehicleValueFromINR(item.inr)}
                          className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer touch-manipulation flex items-center justify-center"
                        >
                          {item.label}
                        </button>
                      ))
                    ) : (
                      [
                        { label: '$15,000', usd: 15000 },
                        { label: '$25,000', usd: 25000 },
                        { label: '$35,000', usd: 35000 },
                        { label: '$55,000', usd: 55000 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setFormData((p) => ({ ...p, vehicleValue: item.usd }));
                            setVehicleValueINR(Math.round(item.usd * USD_TO_INR_RATE));
                          }}
                          className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer touch-manipulation flex items-center justify-center"
                        >
                          {item.label}
                        </button>
                      ))
                    )}
                  </div>

                  {stepErrors.vehicleValue && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{stepErrors.vehicleValue}</span>
                    </p>
                  )}
                </div>

                {/* 3. Vehicle Age & Annual Mileage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Vehicle Age */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="vehicle-age-input"
                        className="text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        How old is the vehicle?
                      </label>
                      <span className="text-xs font-bold text-blue-600 font-mono">
                        {formData.vehicleAge === 0 ? 'Brand New' : `${formData.vehicleAge} yrs old`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="vehicle-age-input"
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        min={0}
                        max={30}
                        value={formData.vehicleAge}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            vehicleAge: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-24 px-3 py-2.5 text-base font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[48px]"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {[0, 2, 4, 8].map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, vehicleAge: a }))}
                            className={`min-h-[44px] min-w-[48px] px-3 py-2 text-xs font-bold rounded-xl border touch-manipulation flex items-center justify-center ${
                              formData.vehicleAge === a
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {a === 0 ? 'New' : `${a}y`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Annual Commute / Mileage */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        How much do you drive in a year?
                      </label>
                      <span className="text-xs font-bold text-blue-600 font-mono">
                        {formData.annualMileage?.toLocaleString()} mi/yr
                      </span>
                    </div>

                    <select
                      value={formData.annualMileage}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          annualMileage: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3.5 py-3 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer min-h-[48px]"
                    >
                      <option value={5000}>Low Commute (&lt; 6,000 miles / ~10,000 km)</option>
                      <option value={10000}>Moderate Commute (10,000 miles / ~16,000 km)</option>
                      <option value={12000}>Average Commute (12,000 miles / ~20,000 km)</option>
                      <option value={18000}>High Mileage (18,000+ miles / ~28,000 km)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Primary Driving Environment */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Where do you primarily drive and park?
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {[
                      {
                        id: 'Rural Low-Risk (Zone A)',
                        label: 'Rural / Country',
                        note: 'Lowest traffic risk',
                      },
                      {
                        id: 'Suburban Moderate (Zone B)',
                        label: 'Suburban / Towns',
                        note: 'Moderate traffic',
                      },
                      {
                        id: 'Urban Dense (Zone C)',
                        label: 'City / Streets',
                        note: 'Busy city driving',
                      },
                      {
                        id: 'Metro High-Congestion (Zone D)',
                        label: 'Metro Core',
                        note: 'Heavy traffic & crowds',
                      },
                    ].map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            regionalZone: zone.id as RegionalRiskZone,
                          }))
                        }
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer min-h-[56px] touch-manipulation flex flex-col justify-between ${
                          formData.regionalZone === zone.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-600 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-sm sm:text-xs font-bold">{zone.label}</div>
                        <div className="text-xs sm:text-[10px] text-slate-400 mt-0.5">{zone.note}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation Buttons for Step 2 */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="py-3.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[50px] touch-manipulation"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all min-h-[50px] touch-manipulation"
                  >
                    <span>Continue to Previous Claims</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: PREVIOUS CLAIMS */}
            {/* ========================================================================= */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Core Question: Have you made an insurance claim before? */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      Have you made an insurance claim before?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Claims in the past 5 years are used by actuaries to evaluate loss frequency.
                    </p>
                  </div>

                  {/* Clean No / Yes Toggle Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="claim-history-no-btn"
                      onClick={() => {
                        setHasMadeClaim(false);
                        setFormData((prev) => ({ ...prev, priorClaimsLast5Years: 0 }));
                        setStepErrors((prev) => {
                          const n = { ...prev };
                          delete n.priorClaims;
                          return n;
                        });
                      }}
                      className={`p-4 sm:p-5 rounded-2xl border text-center transition-all cursor-pointer flex items-center sm:flex-col justify-center gap-3 min-h-[64px] touch-manipulation ${
                        !hasMadeClaim
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <ThumbsUp className={`w-6 h-6 shrink-0 ${!hasMadeClaim ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div className="text-left sm:text-center">
                        <span className="text-sm font-black block">No Claims</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Clean record (0 claims)
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="claim-history-yes-btn"
                      onClick={() => {
                        setHasMadeClaim(true);
                        setFormData((prev) => ({
                          ...prev,
                          priorClaimsLast5Years: prev.priorClaimsLast5Years > 0 ? prev.priorClaimsLast5Years : 1,
                        }));
                      }}
                      className={`p-4 sm:p-5 rounded-2xl border text-center transition-all cursor-pointer flex items-center sm:flex-col justify-center gap-3 min-h-[64px] touch-manipulation ${
                        hasMadeClaim
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <AlertCircle className={`w-6 h-6 shrink-0 ${hasMadeClaim ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="text-left sm:text-center">
                        <span className="text-sm font-black block">Yes</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          I have filed a claim
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Clean Record Encouragement Banner */}
                  {!hasMadeClaim && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                          No-Claim Safety Discount Eligible
                        </div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                          Drivers with zero prior claims receive our highest safety credit, reducing estimated insurance risk by up to 15%.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL REVEAL: How many claims have you made? */}
                  {hasMadeClaim && (
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-900 dark:text-white">
                          How many claims have you made in the last 5 years?
                        </label>
                        <span className="text-xs font-black text-blue-600 font-mono">
                          {formData.priorClaimsLast5Years} {formData.priorClaimsLast5Years === 1 ? 'claim' : 'claims'}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                priorClaimsLast5Years: num,
                              }))
                            }
                            className={`py-3 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center ${
                              formData.priorClaimsLast5Years === num
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num === 4 ? '4+' : num} {num === 1 ? 'Claim' : 'Claims'}
                          </button>
                        ))}
                      </div>

                      {stepErrors.priorClaims && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{stepErrors.priorClaims}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Traffic Violations or Clean Record Question */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Any moving traffic violations in the last 3 years?
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Speeding tickets or traffic citations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setHasViolations(false);
                        setFormData((prev) => ({ ...prev, trafficViolationsCount: 0 }));
                      }}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center ${
                        !hasViolations
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-600'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      No Violations (Clean)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHasViolations(true);
                        setFormData((prev) => ({
                          ...prev,
                          trafficViolationsCount: prev.trafficViolationsCount > 0 ? prev.trafficViolationsCount : 1,
                        }));
                      }}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center ${
                        hasViolations
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 ring-1 ring-blue-600'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Yes, I Have Violations
                    </button>
                  </div>

                  {hasViolations && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Number of tickets:
                      </span>
                      {[1, 2, 3].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, trafficViolationsCount: v }))}
                          className={`min-h-[44px] min-w-[44px] px-3 py-1 text-xs font-bold rounded-xl border touch-manipulation flex items-center justify-center ${
                            formData.trafficViolationsCount === v
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation Buttons for Step 3 */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="py-3.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[50px] touch-manipulation"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all min-h-[50px] touch-manipulation"
                  >
                    <span>Continue to Insurance Coverage</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 4: INSURANCE COVERAGE */}
            {/* ========================================================================= */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Coverage Duration (Exposure in friendly language) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>How long is your insurance coverage?</span>
                    </label>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                      {formData.annualExposure === 0.25
                        ? '3 Months'
                        : formData.annualExposure === 0.5
                        ? '6 Months'
                        : formData.annualExposure === 1.0
                        ? '1 Year'
                        : '2 Years'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Duration of your policy term. A 1-year policy provides maximum rate stability.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {[
                      { exposure: 0.25, label: '3 months', badge: 'Quarterly' },
                      { exposure: 0.5, label: '6 months', badge: 'Half-Year' },
                      { exposure: 1.0, label: '1 year', badge: 'Standard / Best Rate' },
                      { exposure: 2.0, label: '2 years', badge: 'Multi-Year' },
                    ].map((term) => (
                      <button
                        key={term.exposure}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            annualExposure: term.exposure,
                          }))
                        }
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer min-h-[58px] touch-manipulation flex flex-col justify-between ${
                          formData.annualExposure === term.exposure
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs ring-1 ring-blue-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-black">{term.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {term.badge}
                        </div>
                      </button>
                    ))}
                  </div>

                  {stepErrors.annualExposure && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{stepErrors.annualExposure}</span>
                    </p>
                  )}
                </div>

                {/* 2. Coverage Level */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-black text-slate-900 dark:text-white">
                    What level of coverage do you want?
                  </label>

                  <div className="space-y-2">
                    {[
                      {
                        tier: 'Standard Comprehensive' as CoverageTier,
                        title: 'Standard Comprehensive',
                        badge: 'Recommended',
                        desc: 'Full third-party liability plus accidental damage and theft protection for your vehicle.',
                      },
                      {
                        tier: 'Full Comprehensive + Zero-Dep' as CoverageTier,
                        title: 'Full Comprehensive + Zero-Dep',
                        badge: 'Maximum Protection',
                        desc: 'Covers replacement parts at 100% without depreciation deductions.',
                      },
                      {
                        tier: 'Basic Third-Party' as CoverageTier,
                        title: 'Basic Third-Party',
                        badge: 'Legal Minimum',
                        desc: 'Required by law. Covers damage and bodily injury to third parties.',
                      },
                    ].map((cov) => (
                      <button
                        key={cov.tier}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            coverageTier: cov.tier,
                          }))
                        }
                        className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 min-h-[64px] touch-manipulation ${
                          formData.coverageTier === cov.tier
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs ring-1 ring-blue-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm sm:text-xs">{cov.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                              {cov.badge}
                            </span>
                          </div>
                          <p className="text-xs sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {cov.desc}
                          </p>
                        </div>
                        {formData.coverageTier === cov.tier && (
                          <Check className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Deductible (Explained in Plain English) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-slate-900 dark:text-white">
                      Collision Deductible
                    </label>
                    <span className="text-xs font-black text-blue-600 font-mono">
                      {currency === 'INR'
                        ? `₹${formatINR(formData.deductible * USD_TO_INR_RATE)}`
                        : `$${formData.deductible}`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your out-of-pocket payment before insurance covers a repair. Choosing a higher deductible lowers your annual premium.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { usd: 250, inr: 20000, label: 'Low' },
                      { usd: 500, inr: 40000, label: 'Standard' },
                      { usd: 750, inr: 60000, label: 'Higher Saving' },
                      { usd: 1000, inr: 80000, label: 'Max Saving' },
                    ].map((amt) => (
                      <button
                        key={amt.usd}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, deductible: amt.usd }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[54px] touch-manipulation ${
                          formData.deductible === amt.usd
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-black">
                          {currency === 'INR' ? `₹${formatINR(amt.inr)}` : `$${amt.usd}`}
                        </div>
                        <div
                          className={`text-[10px] ${
                            formData.deductible === amt.usd ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {amt.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Anti-Theft Device / GPS Tracker */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 min-h-[56px]">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
                      Anti-Theft Device or GPS Tracker Installed?
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Approved alarm, vehicle immobilizer, or GPS tracking unit.
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

                {/* FINAL REVIEW SUMMARY CARD */}
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      <span>Review Your Details</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">Ready to evaluate</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400">Driver</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.age} yrs • {formData.drivingExperienceYears}y exp
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400">Vehicle</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {formData.vehicleCategory} ({currency === 'INR' ? toLakhsCrores(vehicleValueINR) : `$${formData.vehicleValue}`})
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400">Claims History</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.priorClaimsLast5Years === 0 ? 'Clean (0 claims)' : `${formData.priorClaimsLast5Years} claims`}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400">Coverage Duration</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.annualExposure === 1.0 ? '1 Year Term' : `${formData.annualExposure * 12} Months Term`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* FINAL SUBMIT BUTTON: Check My Risk → */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="py-4 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[56px] touch-manipulation"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    id="predict-claim-risk-button"
                    disabled={isLoading}
                    className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer min-h-[56px] touch-manipulation"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Analyzing your information...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Check My Risk →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: Explainable Prediction Result Card (5 Cols) */}
        <div id="prediction-result-section" className="lg:col-span-5 space-y-4">
          <ExplainablePredictionCard
            predictionResponse={statResponse}
            policyId={policyId}
            onNavigateToInsights={onNavigateToInsights}
            onNavigateToScenario={onNavigateToScenario}
            onLogDecision={handleSaveDecision}
            savedSuccess={savedSuccess}
            onOpenAICopilot={onOpenAICopilot}
            onExplainMyResult={onNavigateToExplain}
            preferredCurrency={currency}
            isLoading={isLoading}
            isProfessionalMode={isProfessionalMode}
          />
        </div>
      </div>
    </div>
  );
};
