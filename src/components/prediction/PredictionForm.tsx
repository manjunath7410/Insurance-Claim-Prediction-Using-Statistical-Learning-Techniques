import React from 'react';
import {
  User,
  Shield,
  Car,
  Clock,
  MapPin,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  PolicyholderInput,
  VehicleCategory,
  RegionalRiskZone,
  CreditTier,
  CoverageTier,
} from '../../types';

export interface FormValidationErrors {
  age?: string;
  drivingExperienceYears?: string;
  creditScore?: string;
  annualMileage?: string;
  vehicleValue?: string;
  vehicleAge?: string;
  deductible?: string;
  priorClaimsLast5Years?: string;
  trafficViolationsCount?: string;
  annualExposure?: string;
  policyTenureYears?: string;
  general?: string;
}

interface PredictionFormProps {
  formData: PolicyholderInput;
  setFormData: React.Dispatch<React.SetStateAction<PolicyholderInput>>;
  errors: FormValidationErrors;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  onApplyPreset: (presetKey: string) => void;
  selectedModelVersion: string;
  onModelVersionChange: (version: string) => void;
  availableModels: Array<{ version: string; modelName: string; status: string }>;
}

export const PredictionForm: React.FC<PredictionFormProps> = ({
  formData,
  setFormData,
  errors,
  isLoading,
  onSubmit,
  onReset,
  onApplyPreset,
  selectedModelVersion,
  onModelVersionChange,
  availableModels,
}) => {
  // Helper to handle credit score tier synchronization
  const handleCreditScoreChange = (score: number) => {
    let tier: CreditTier = 'Good (670-739)';
    if (score >= 800) tier = 'Exceptional (800+)';
    else if (score >= 740) tier = 'Very Good (740-799)';
    else if (score >= 670) tier = 'Good (670-739)';
    else if (score >= 580) tier = 'Fair (580-669)';
    else tier = 'Poor (<580)';

    setFormData((prev) => ({
      ...prev,
      creditScore: score,
      creditTier: tier,
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" id="prediction-input-form" noValidate>
      {/* Preset Archetypes Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Quick Actuarial Archetypes:</span>
          </div>
          <span className="text-[11px] text-slate-400">Pre-fill standard risk profiles</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            id="preset-young-sports"
            onClick={() => onApplyPreset('young_urban_sports')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors text-left flex items-center gap-1.5"
          >
            <span>🏎️</span>
            <span className="truncate">Young Urban Driver</span>
          </button>
          <button
            type="button"
            id="preset-rural-sedan"
            onClick={() => onApplyPreset('experienced_rural_sedan')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors text-left flex items-center gap-1.5"
          >
            <span>🏡</span>
            <span className="truncate">Experienced Rural</span>
          </button>
          <button
            type="button"
            id="preset-family-suv"
            onClick={() => onApplyPreset('suburban_family_suv')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors text-left flex items-center gap-1.5"
          >
            <span>👨‍👩‍👧</span>
            <span className="truncate">Suburban Family SUV</span>
          </button>
          <button
            type="button"
            id="preset-high-commuter"
            onClick={() => onApplyPreset('high_risk_commuter')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors text-left flex items-center gap-1.5"
          >
            <span>⚠️</span>
            <span className="truncate">High-Risk Commuter</span>
          </button>
        </div>
      </div>

      {/* Model Selection Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <label htmlFor="select-model-version" className="block text-xs font-semibold text-slate-200">
              Target Machine Learning Model
            </label>
            <span className="text-[11px] text-slate-400">
              Select calibrated model architecture from production registry
            </span>
          </div>
        </div>
        <select
          id="select-model-version"
          value={selectedModelVersion}
          onChange={(e) => onModelVersionChange(e.target.value)}
          className="bg-slate-950 text-xs font-medium text-slate-200 border border-slate-800 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
        >
          {availableModels.length > 0 ? (
            availableModels.map((m) => (
              <option key={m.version} value={m.version}>
                {m.modelName} ({m.version}) {m.status === 'active' ? '★ Champion' : ''}
              </option>
            ))
          ) : (
            <>
              <option value="v1.2.0-gbdt-calibrated-platt">
                Gradient Boosted Decision Trees (v1.2.0 Platt) ★ Champion
              </option>
              <option value="v1.1.0-hurdle-poisson">
                Two-Stage Hurdle Poisson-Gamma (v1.1.0)
              </option>
              <option value="v1.0.0-glm-tweedie">
                GLM Compound Poisson-Gamma Tweedie (v1.0.0)
              </option>
            </>
          )}
        </select>
      </div>

      {/* General Form Error Banner */}
      {errors.general && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Validation Alert</span>
            <span>{errors.general}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CUSTOMER INFORMATION */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold">
              1
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-400" />
              Customer Information
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Demographic Risk
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Driver Age */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-driver-age" className="text-xs text-slate-300 font-medium flex items-center gap-1">
                Driver Age <span className="text-[10px] text-slate-400">[16–100 yrs]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.age} yrs
              </span>
            </div>
            <input
              id="input-driver-age"
              type="range"
              min="16"
              max="90"
              value={formData.age}
              onChange={(e) => {
                const age = Number(e.target.value);
                const maxExp = Math.max(0, age - 16);
                const exp = Math.min(formData.drivingExperienceYears, maxExp);
                setFormData((prev) => ({ ...prev, age, drivingExperienceYears: exp }));
              }}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-1"
            />
            <p className="text-[11px] text-slate-400">
              Foundational demographic rating factor. Novice drivers (&lt;25) have elevated loss frequency.
            </p>
            {errors.age && <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.age}</p>}
          </div>

          {/* Driving Experience */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-experience" className="text-xs text-slate-300 font-medium flex items-center gap-1">
                Driving Experience <span className="text-[10px] text-slate-400">[0–80 yrs, ≤ Age - 16]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.drivingExperienceYears} yrs
              </span>
            </div>
            <input
              id="input-experience"
              type="range"
              min="0"
              max={Math.max(1, formData.age - 16)}
              value={formData.drivingExperienceYears}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, drivingExperienceYears: Number(e.target.value) }))
              }
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-1"
            />
            <p className="text-[11px] text-slate-400">
              Years licensed. Strictly capped at driver age minus legal minimum driving age (16).
            </p>
            {errors.drivingExperienceYears && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.drivingExperienceYears}</p>
            )}
          </div>
        </div>

        {/* Credit Score & Tier */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="input-credit-score" className="text-xs text-slate-300 font-medium flex items-center gap-1">
              Insurance Credit Score (FICO-based) <span className="text-[10px] text-slate-400">[300–850]</span>
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-medium text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                {formData.creditTier}
              </span>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.creditScore}
              </span>
            </div>
          </div>
          <input
            id="input-credit-score"
            type="range"
            min="300"
            max="850"
            step="5"
            value={formData.creditScore}
            onChange={(e) => handleCreditScoreChange(Number(e.target.value))}
            className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-1"
          />
          <p className="text-[11px] text-slate-400">
            Empirically correlated with actuarial claim propensity and policyholder loss severity per CAS literature.
          </p>
          {errors.creditScore && (
            <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.creditScore}</p>
          )}
        </div>

        {/* Gender & Marital Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label htmlFor="select-driver-gender" className="block text-xs text-slate-300 font-medium mb-1">
              Driver Gender
            </label>
            <select
              id="select-driver-gender"
              value={formData.driverGender}
              onChange={(e) => setFormData((prev) => ({ ...prev, driverGender: e.target.value as any }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Non-Binary / Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="select-marital-status" className="block text-xs text-slate-300 font-medium mb-1">
              Marital Status
            </label>
            <select
              id="select-marital-status"
              value={formData.maritalStatus}
              onChange={(e) => setFormData((prev) => ({ ...prev, maritalStatus: e.target.value as any }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Single">Single</option>
              <option value="Married">Married (Multi-Driver Discount)</option>
              <option value="Divorced">Divorced / Separated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. POLICY INFORMATION */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              Policy Information
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Contract Terms
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Coverage Tier */}
          <div>
            <label htmlFor="select-coverage-tier" className="block text-xs text-slate-300 font-medium mb-1">
              Coverage Package Tier
            </label>
            <select
              id="select-coverage-tier"
              value={formData.coverageTier}
              onChange={(e) => setFormData((prev) => ({ ...prev, coverageTier: e.target.value as CoverageTier }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Basic Third-Party">Basic Third-Party (Liability Only)</option>
              <option value="Standard Comprehensive">Standard Comprehensive (Collision + OTC)</option>
              <option value="Full Comprehensive + Zero-Dep">Full Comprehensive + Zero-Depreciation</option>
              <option value="Executive Platinum">Executive Platinum (Roadside + Rental + GAP)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Determines policy deductible rules and covered perils.
            </p>
          </div>

          {/* Policy Deductible */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-deductible" className="text-xs text-slate-300 font-medium">
                Comprehensive Deductible <span className="text-[10px] text-slate-400">[$0–$10,000]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                ${formData.deductible.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <select
                id="select-deductible-preset"
                value={formData.deductible}
                onChange={(e) => setFormData((prev) => ({ ...prev, deductible: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="0">$0 (Zero Deductible)</option>
                <option value="250">$250 (Low Deductible)</option>
                <option value="500">$500 (Standard)</option>
                <option value="750">$750</option>
                <option value="1000">$1,000 (Cost-Sharing)</option>
                <option value="1500">$1,500</option>
                <option value="2500">$2,500 (High Retention)</option>
                <option value="5000">$5,000 (Commercial/Excess)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Higher deductibles eliminate small-dollar attritional claims.
            </p>
            {errors.deductible && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.deductible}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Annual Exposure */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-annual-exposure" className="text-xs text-slate-300 font-medium">
                Policy Annual Exposure <span className="text-[10px] text-slate-400">[0.05–5.0 yrs]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.annualExposure.toFixed(2)} yr
              </span>
            </div>
            <input
              id="input-annual-exposure"
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={formData.annualExposure}
              onChange={(e) => setFormData((prev) => ({ ...prev, annualExposure: Number(e.target.value) }))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-1"
            />
            <p className="text-[11px] text-slate-400">
              Standard rating year is 1.0 (12 continuous months of coverage).
            </p>
            {errors.annualExposure && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.annualExposure}</p>
            )}
          </div>

          {/* Policy Tenure */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-policy-tenure" className="text-xs text-slate-300 font-medium">
                Prior Tenure with Carrier <span className="text-[10px] text-slate-400">[0–40 yrs]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.policyTenureYears} yrs
              </span>
            </div>
            <input
              id="input-policy-tenure"
              type="range"
              min="0"
              max="25"
              step="1"
              value={formData.policyTenureYears}
              onChange={(e) => setFormData((prev) => ({ ...prev, policyTenureYears: Number(e.target.value) }))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-1"
            />
            <p className="text-[11px] text-slate-400">
              Long-standing policyholder loyalty correlates with lower moral hazard.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VEHICLE INFORMATION */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Car className="w-4 h-4 text-cyan-400" />
              Vehicle Information
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Physical Asset
          </span>
        </div>

        {/* Vehicle Category Selection Grid */}
        <div>
          <label className="block text-xs text-slate-300 font-medium mb-2">
            Vehicle Category & Class
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                { id: 'Economy Sedan', icon: '🚗', label: 'Economy Sedan', sub: 'Standard passenger car' },
                { id: 'Compact SUV', icon: '🚙', label: 'Compact SUV', sub: 'Crossover / AWD' },
                { id: 'Luxury / Sports', icon: '🏎️', label: 'Luxury / Sports', sub: 'High horsepower / premium' },
                { id: 'Commercial Van', icon: '🚐', label: 'Commercial Van', sub: 'Cargo / Trade utility' },
                { id: 'Heavy Truck / Electric', icon: '⚡', label: 'Truck / EV', sub: 'High mass / battery' },
              ] as const
            ).map((v) => {
              const isSelected = formData.vehicleCategory === v.id;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setFormData((prev) => ({ ...prev, vehicleCategory: v.id }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{v.icon}</span>
                    <span className="text-xs font-semibold block">{v.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 pl-6">{v.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Insured Vehicle Value */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-vehicle-value" className="text-xs text-slate-300 font-medium">
                Insured Stated Value (USD) <span className="text-[10px] text-slate-400">[$500–$1,000,000]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                ${formData.vehicleValue.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
              <input
                id="input-vehicle-value"
                type="number"
                step="1000"
                min="500"
                max="1000000"
                value={formData.vehicleValue}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicleValue: Number(e.target.value) }))}
                className={`w-full bg-slate-950 border rounded-lg pl-7 pr-3 py-2 text-xs text-slate-200 focus:outline-none font-mono ${
                  errors.vehicleValue ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {[15000, 30000, 55000, 100000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setFormData((prev) => ({ ...prev, vehicleValue: val }))}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                >
                  ${val / 1000}k
                </button>
              ))}
            </div>
            {errors.vehicleValue && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.vehicleValue}</p>
            )}
          </div>

          {/* Vehicle Age */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-vehicle-age" className="text-xs text-slate-300 font-medium">
                Vehicle Age <span className="text-[10px] text-slate-400">[0–40 yrs]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.vehicleAge} {formData.vehicleAge === 1 ? 'yr' : 'yrs'}
              </span>
            </div>
            <input
              id="input-vehicle-age"
              type="range"
              min="0"
              max="25"
              value={formData.vehicleAge}
              onChange={(e) => setFormData((prev) => ({ ...prev, vehicleAge: Number(e.target.value) }))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-1"
            />
            <p className="text-[11px] text-slate-400">
              Older vehicles experience mechanical failures but have lower total replacement costs.
            </p>
          </div>
        </div>

        {/* Annual Mileage & Anti-theft */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-annual-mileage" className="text-xs text-slate-300 font-medium">
                Estimated Annual Mileage <span className="text-[10px] text-slate-400">[500–100,000 mi]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.annualMileage.toLocaleString()} mi/yr
              </span>
            </div>
            <input
              id="input-annual-mileage"
              type="range"
              min="1000"
              max="45000"
              step="500"
              value={formData.annualMileage}
              onChange={(e) => setFormData((prev) => ({ ...prev, annualMileage: Number(e.target.value) }))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mb-1"
            />
            <p className="text-[11px] text-slate-400">
              Primary on-road risk exposure driver. Direct proportional relation to collision risk.
            </p>
            {errors.annualMileage && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.annualMileage}</p>
            )}
          </div>

          <div className="flex flex-col justify-between">
            <label className="text-xs text-slate-300 font-medium block mb-1">
              Safety & Security Hardware
            </label>
            <div
              onClick={() => setFormData((prev) => ({ ...prev, antiTheftDevice: !prev.antiTheftDevice }))}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                formData.antiTheftDevice
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold block text-slate-200">
                    Active Anti-Theft / Immobilizer
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    GPS Tracker, Alarm, or Engine Kill Switch
                  </span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  formData.antiTheftDevice
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                {formData.antiTheftDevice && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. HISTORICAL CLAIM INFORMATION */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold">
              4
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Historical Claim & Violation Information
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Loss History
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Prior Claims in Past 5 Years */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-prior-claims" className="text-xs text-slate-300 font-medium">
                Past Claims (Last 5 Years) <span className="text-[10px] text-slate-400">[0–20 claims]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.priorClaimsLast5Years} {formData.priorClaimsLast5Years === 1 ? 'claim' : 'claims'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    priorClaimsLast5Years: Math.max(0, prev.priorClaimsLast5Years - 1),
                  }))
                }
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-sm"
              >
                -
              </button>
              <input
                id="input-prior-claims"
                type="number"
                min="0"
                max="20"
                value={formData.priorClaimsLast5Years}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priorClaimsLast5Years: Number(e.target.value) }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 text-center font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    priorClaimsLast5Years: Math.min(20, prev.priorClaimsLast5Years + 1),
                  }))
                }
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-sm"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Statistically highest-ranked feature for future claim propensity in actuarial modeling.
            </p>
            {errors.priorClaimsLast5Years && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.priorClaimsLast5Years}</p>
            )}
          </div>

          {/* Traffic Violations */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-violations" className="text-xs text-slate-300 font-medium">
                Moving Traffic Violations <span className="text-[10px] text-slate-400">[0–15 incidents]</span>
              </label>
              <span className="text-xs font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formData.trafficViolationsCount} {formData.trafficViolationsCount === 1 ? 'violation' : 'violations'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    trafficViolationsCount: Math.max(0, prev.trafficViolationsCount - 1),
                  }))
                }
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-sm"
              >
                -
              </button>
              <input
                id="input-violations"
                type="number"
                min="0"
                max="15"
                value={formData.trafficViolationsCount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, trafficViolationsCount: Number(e.target.value) }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 text-center font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    trafficViolationsCount: Math.min(15, prev.trafficViolationsCount + 1),
                  }))
                }
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-sm"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Speeding, reckless driving, or red-light violations indicate driver behavioral risk.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. OTHER RISK VARIABLES */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs font-bold">
              5
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-400" />
              Other Risk & Territorial Variables
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Territory & Environment
          </span>
        </div>

        {/* Territory Selection Cards */}
        <div>
          <label className="block text-xs text-slate-300 font-medium mb-2">
            Territorial Rating Risk Zone
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(
              [
                {
                  id: 'Rural Low-Risk (Zone A)',
                  name: 'Zone A: Rural Low-Risk',
                  desc: 'Low vehicle density, open highways, minimal intersection accidents',
                  badge: '0.82× Base Loss Multiplier',
                },
                {
                  id: 'Suburban Moderate (Zone B)',
                  name: 'Zone B: Suburban Moderate',
                  desc: 'Residential commuter arteries, shopping corridors, typical claim rate',
                  badge: '1.00× Baseline Benchmark',
                },
                {
                  id: 'Urban Dense (Zone C)',
                  name: 'Zone C: Urban Dense',
                  desc: 'High traffic density, parallel street parking, pedestrian congestion',
                  badge: '1.34× Base Loss Multiplier',
                },
                {
                  id: 'Metro High-Congestion (Zone D)',
                  name: 'Zone D: Metro Congestion',
                  desc: 'Dense downtown grid, frequent stop-and-go collisions, elevated theft',
                  badge: '1.68× Base Loss Multiplier',
                },
              ] as const
            ).map((zone) => {
              const isSelected = formData.regionalZone === zone.id;
              return (
                <button
                  type="button"
                  key={zone.id}
                  onClick={() => setFormData((prev) => ({ ...prev, regionalZone: zone.id }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{zone.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {zone.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">{zone.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Form Defaults</span>
        </button>

        <button
          type="submit"
          id="btn-submit-prediction"
          disabled={isLoading}
          className="flex-1 max-w-sm flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Running Actuarial Inference...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Run Actuarial Claim Prediction</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
