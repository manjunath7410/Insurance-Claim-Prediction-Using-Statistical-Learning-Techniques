import React, { useState, useEffect, useCallback } from 'react';
import {
  PolicyholderInput,
  VehicleCategory,
  RegionalRiskZone,
  CoverageTier,
  PredictionResponse,
  ApiPredictionResponse,
} from '../../types';
import { PRESET_PROFILES } from '../../services/statisticalModels';
import { RiskBadge, normalizeRiskLevel } from '../common/RiskBadge';
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
  onLogDecision?: (response: PredictionResponse, notes?: string) => void;
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
  onLogDecision,
}) => {
  const [formData, setFormData] = useState<PolicyholderInput>(DEFAULT_POLICY_INPUT);
  const [policyId, setPolicyId] = useState<string>('POL-2026-8819');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
        // Call the statistical regression prediction API (GLM Logistic + Gamma)
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { ...inputData, id: policyId },
            selectedModel: 'glm_logistic_gamma', // Statistical Regression GLM model
          }),
        });

        if (!res.ok) {
          throw new Error(`Prediction service returned status ${res.status}`);
        }

        const data: PredictionResponse = await res.json();
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
        console.error('Failed to run statistical regression prediction:', err);
        setError(err?.message || 'Unable to complete prediction. Please check inputs and try again.');
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
      setFormData(preset);
      runPrediction(preset);
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_POLICY_INPUT);
    runPrediction(DEFAULT_POLICY_INPUT);
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

          {/* Quick Archetype Preset Selector */}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Quick Profiles:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                id="preset-standard"
                onClick={() => handleApplyPreset('suburban_family_suv')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Family SUV
              </button>
              <button
                type="button"
                id="preset-young"
                onClick={() => handleApplyPreset('young_urban_sports')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Young Driver
              </button>
              <button
                type="button"
                id="preset-retiree"
                onClick={() => handleApplyPreset('rural_retiree_sedan')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Rural Sedan
              </button>
            </div>
          </div>
        </div>
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
                Enter policy attributes to estimate claim occurrence probability
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

            {/* Grid Row: Driver Age & Driving Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="driver-age-input"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Driver Age
                  </label>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {formData.age} yrs
                  </span>
                </div>
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Primary policyholder age (16–100)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="driving-experience-input"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Driving Experience
                  </label>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {formData.drivingExperienceYears} yrs
                  </span>
                </div>
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Licensed years (Max {Math.max(0, formData.age - 16)} yrs)
                </p>
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Estimated annual driven miles
                </p>
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Standard credit rating (300–850)
                </p>
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
                <select
                  id="prior-claims-select"
                  value={formData.priorClaimsLast5Years}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priorClaimsLast5Years: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value={0}>0 Prior Claims (Clean History)</option>
                  <option value={1}>1 Prior Claim</option>
                  <option value={2}>2 Prior Claims</option>
                  <option value={3}>3 Prior Claims</option>
                  <option value={4}>4+ Prior Claims</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Past loss incident frequency
                </p>
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

        {/* RIGHT COLUMN: Clean Prediction Result Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                CLAIM RISK
              </span>
              <span className="text-xs font-mono text-slate-400">
                {policyId}
              </span>
            </div>

            {/* Primary Risk Number Display */}
            <div className="text-center py-4 sm:py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-5">
              <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                {claimProbPercent.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                Estimated Claim Probability
              </div>
              
              <div className="mt-3.5 flex justify-center">
                <RiskBadge
                  level={glmPred?.riskTier || 'STANDARD'}
                  probabilityPercent={claimProbPercent}
                  size="lg"
                />
              </div>

              {/* Action Threshold status */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 px-4 flex items-center justify-center gap-2 text-xs font-semibold">
                {isBelowThreshold ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Below the 8.0% action threshold</span>
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Exceeds 8.0% underwriting threshold</span>
                  </span>
                )}
              </div>
            </div>

            {/* Simple Underwriting Recommendation */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 mb-5 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
                Recommendation:
              </span>
              <span>
                {glmPred?.underwritingRecommendation || (isBelowThreshold ? 'Accept Standard Rate' : 'Accept with Surcharge')} —{' '}
                {isBelowThreshold
                  ? 'Eligible for standard policy issuance with no mandatory surcharge.'
                  : 'Requires rate loading or elevated deductible review.'}
              </span>
            </div>

            {/* "Why?" Section in Plain English */}
            <div className="space-y-2.5 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Why?
              </h3>
              <div className="space-y-2">
                {getPlainEnglishExplanations().map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border transition-colors ${
                      item.type === 'positive'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40 text-slate-800 dark:text-slate-200'
                        : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/40 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.type === 'positive' ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions: View detailed explanation & Save Decision */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                id="view-detailed-explanation-button"
                onClick={() => {
                  if (statResponse) {
                    onNavigateToInsights(statResponse);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span>View detailed explanation</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="save-decision-button"
                onClick={handleSaveDecision}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {savedSuccess ? 'Logged to Underwriting History!' : 'Log Underwriting Decision'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
