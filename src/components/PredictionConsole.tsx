import React, { useState, useEffect, useCallback } from 'react';
import {
  PolicyholderInput,
  PredictionResponse,
  ModelType,
  ModelPrediction,
  ApiPredictionResponse,
} from '../types';
import {
  PRESET_PROFILES,
} from '../services/statisticalModels';
import { PredictionForm, FormValidationErrors } from './prediction/PredictionForm';
import { PredictionResultCard } from './prediction/PredictionResultCard';
import { ShapAttributionView } from './ShapAttributionView';
import {
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PredictionConsoleProps {
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
  onOpenReportModal: (response: PredictionResponse) => void;
  onLogDecision: (response: PredictionResponse, notes?: string) => void;
}

const DEFAULT_FORM_DATA: PolicyholderInput = {
  age: 32,
  drivingExperienceYears: 12,
  creditScore: 720,
  creditTier: 'Good (670-739)',
  annualMileage: 13500,
  vehicleCategory: 'Compact SUV',
  vehicleAge: 3,
  vehicleValue: 28500,
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

export const PredictionConsole: React.FC<PredictionConsoleProps> = ({
  selectedModel,
  setSelectedModel,
  onOpenReportModal,
  onLogDecision,
}) => {
  // Input form state
  const [formData, setFormData] = useState<PolicyholderInput>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Predictions state
  const [apiPrediction, setApiPrediction] = useState<ApiPredictionResponse | null>(null);
  const [statisticalData, setStatisticalData] = useState<PredictionResponse | null>(null);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // Model catalog state
  const [availableModels, setAvailableModels] = useState<Array<{ version: string; modelName: string; status: string }>>([]);
  const [selectedModelVersion, setSelectedModelVersion] = useState<string>('v1.2.0-gbdt-calibrated-platt');

  // Load available models from registry
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            setAvailableModels(
              data.models.map((m: any) => ({
                version: m.version,
                modelName: m.modelName,
                status: m.status,
              }))
            );
            if (data.activeVersion) {
              setSelectedModelVersion(data.activeVersion);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load model registry catalog:', err);
      }
    }
    loadModels();
  }, []);

  // Client-Side Validation Function
  const validateForm = useCallback((data: PolicyholderInput): FormValidationErrors => {
    const errs: FormValidationErrors = {};

    // 1. Customer Information Validation
    if (!data.age || isNaN(data.age)) {
      errs.age = 'Driver age is required.';
    } else if (data.age < 16 || data.age > 100) {
      errs.age = 'Driver age must be between 16 and 100 years.';
    }

    const maxExperience = Math.max(0, data.age - 16);
    if (data.drivingExperienceYears === undefined || isNaN(data.drivingExperienceYears)) {
      errs.drivingExperienceYears = 'Driving experience is required.';
    } else if (data.drivingExperienceYears < 0 || data.drivingExperienceYears > 80) {
      errs.drivingExperienceYears = 'Driving experience must be between 0 and 80 years.';
    } else if (data.drivingExperienceYears > maxExperience) {
      errs.drivingExperienceYears = `Driving experience (${data.drivingExperienceYears} yrs) cannot exceed age minus 16 (${maxExperience} yrs).`;
    }

    if (!data.creditScore || isNaN(data.creditScore)) {
      errs.creditScore = 'Credit score is required.';
    } else if (data.creditScore < 300 || data.creditScore > 850) {
      errs.creditScore = 'Credit score must be between 300 and 850.';
    }

    // 2. Policy Information Validation
    if (data.deductible === undefined || isNaN(data.deductible)) {
      errs.deductible = 'Deductible is required.';
    } else if (data.deductible < 0 || data.deductible > 10000) {
      errs.deductible = 'Deductible must be between $0 and $10,000.';
    }

    if (!data.annualExposure || isNaN(data.annualExposure)) {
      errs.annualExposure = 'Annual exposure is required.';
    } else if (data.annualExposure < 0.05 || data.annualExposure > 5.0) {
      errs.annualExposure = 'Annual exposure must be between 0.05 and 5.0 policy-years.';
    }

    // 3. Vehicle Information Validation
    if (!data.vehicleValue || isNaN(data.vehicleValue)) {
      errs.vehicleValue = 'Vehicle value is required.';
    } else if (data.vehicleValue < 500 || data.vehicleValue > 1000000) {
      errs.vehicleValue = 'Vehicle value must be between $500 and $1,000,000.';
    }

    if (!data.annualMileage || isNaN(data.annualMileage)) {
      errs.annualMileage = 'Annual mileage is required.';
    } else if (data.annualMileage < 500 || data.annualMileage > 100000) {
      errs.annualMileage = 'Annual mileage must be between 500 and 100,000 miles.';
    }

    // 4. Historical Claim Information Validation
    if (data.priorClaimsLast5Years === undefined || isNaN(data.priorClaimsLast5Years)) {
      errs.priorClaimsLast5Years = 'Prior claims count is required.';
    } else if (data.priorClaimsLast5Years < 0 || data.priorClaimsLast5Years > 20) {
      errs.priorClaimsLast5Years = 'Prior claims must be between 0 and 20 incidents.';
    }

    return errs;
  }, []);

  // Execute Prediction API Request
  const executePrediction = useCallback(
    async (inputData: PolicyholderInput, modelVer?: string) => {
      const validationErrors = validateForm(inputData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      setApiError(null);
      setIsLoading(true);

      try {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // 1. Call production ML prediction endpoint
        const predRes = await fetch('/api/predictions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            input: inputData,
            modelVersion: modelVer || selectedModelVersion,
          }),
        });

        if (!predRes.ok) {
          const errBody = await predRes.json().catch(() => ({}));
          if (predRes.status === 422 && Array.isArray(errBody.details)) {
            const serverErrors: FormValidationErrors = {};
            errBody.details.forEach((d: { field: string; message: string }) => {
              (serverErrors as any)[d.field] = d.message;
            });
            serverErrors.general = errBody.message || 'Validation failed on server parameters.';
            setErrors(serverErrors);
            return;
          }
          throw new Error(errBody.message || `Server returned error ${predRes.status}`);
        }

        const predJson: ApiPredictionResponse = await predRes.json();
        setApiPrediction(predJson);

        // 2. Also call statistical comparator in background for underwriting reports
        try {
          const statRes = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: inputData,
              selectedModel,
            }),
          });
          if (statRes.ok) {
            const statJson = await statRes.json();
            setStatisticalData(statJson);
          }
        } catch {
          // Non-blocking statistical fallback
        }
      } catch (err: any) {
        console.error('Prediction failed:', err);
        setApiError(err.message || 'An unexpected error occurred during prediction.');
      } finally {
        setIsLoading(false);
      }
    },
    [validateForm, selectedModelVersion, selectedModel]
  );

  // Initial load execution on mount
  useEffect(() => {
    executePrediction(formData, selectedModelVersion);
  }, []); // Run once on component mount

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executePrediction(formData, selectedModelVersion);
  };

  // Handle Reset to Benchmark Defaults
  const handleReset = () => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setApiError(null);
    executePrediction(DEFAULT_FORM_DATA, selectedModelVersion);
  };

  // Handle Apply Preset Archetypes
  const handleApplyPreset = (presetKey: string) => {
    if (PRESET_PROFILES[presetKey]) {
      const newForm = { ...PRESET_PROFILES[presetKey] };
      setFormData(newForm);
      setErrors({});
      executePrediction(newForm, selectedModelVersion);
    }
  };

  // Handle Model Version Change
  const handleModelVersionChange = (version: string) => {
    setSelectedModelVersion(version);
    executePrediction(formData, version);
  };

  // Handle Decision Logging
  const handleAuditLogClick = () => {
    if (statisticalData) {
      onLogDecision(statisticalData);
      setLogSuccessMessage('Decision logged to Audit Trail & Governance database');
      setTimeout(() => setLogSuccessMessage(null), 4000);
    } else if (apiPrediction) {
      // Create minimal synthetic response for callback
      const syntheticResp: PredictionResponse = {
        timestamp: apiPrediction.timestamp,
        policyId: apiPrediction.predictionId,
        input: formData,
        primaryPrediction: {
          modelId: selectedModel,
          modelName: apiPrediction.modelName,
          claimProbability: apiPrediction.probability,
          claimProbabilityPercent: Number((apiPrediction.probability * 100).toFixed(2)),
          confidenceInterval: [
            Math.max(0, Number(((apiPrediction.probability - 0.015) * 100).toFixed(2))),
            Number(((apiPrediction.probability + 0.015) * 100).toFixed(2)),
          ],
          expectedSeverityUSD: 4200,
          purePremiumUSD: Math.round(apiPrediction.probability * 4200),
          recommendedGrossPremiumUSD: Math.round((apiPrediction.probability * 4200 + 150) / 0.72),
          riskTier: apiPrediction.riskLevel === 'LOW' ? 'Low Risk' : apiPrediction.riskLevel === 'MEDIUM' ? 'Standard' : apiPrediction.riskLevel === 'HIGH' ? 'Elevated' : 'Critical Review',
          riskScore: Math.round(apiPrediction.probability * 400),
          devianceScore: 0.18,
          inferenceTimeMs: 12,
          underwritingRecommendation: apiPrediction.riskLevel === 'LOW' ? 'Accept with Discount' : apiPrediction.riskLevel === 'MEDIUM' ? 'Accept Standard Rate' : 'Accept with Surcharge',
        },
        allModels: {} as any,
        shapAttributions: apiPrediction.topContributingFactors.map((f) => ({
          feature: f.feature,
          displayName: f.label,
          value: f.value,
          impactPercent: f.contributionScore * 100,
          direction: f.impact === 'INCREASES_RISK' ? 'increases_risk' : 'decreases_risk',
          description: f.explanation,
        })),
        baseClaimRatePercent: 5.0,
        actuarialNotes: ['Prediction executed via production API service.'],
      };
      onLogDecision(syntheticResp);
      setLogSuccessMessage('Decision logged to Audit Trail & Governance database');
      setTimeout(() => setLogSuccessMessage(null), 4000);
    }
  };

  const getRiskBadgeColor = (tier?: string) => {
    switch (tier) {
      case 'Low Risk':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Standard':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Elevated':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'High Risk':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'Critical Review':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Error Alert if API error occurred */}
      {apiError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm text-rose-200">Prediction API Error</span>
              <p className="mt-0.5">{apiError}</p>
            </div>
          </div>
          <button
            onClick={() => executePrediction(formData, selectedModelVersion)}
            className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-200 border border-rose-800 hover:bg-rose-900 flex items-center space-x-1 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Grid: Form on Left (5 Cols), Results on Right (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Structured 5-Section Prediction Form */}
        <div className="lg:col-span-5 space-y-6">
          <PredictionForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onReset={handleReset}
            onApplyPreset={handleApplyPreset}
            selectedModelVersion={selectedModelVersion}
            onModelVersionChange={handleModelVersionChange}
            availableModels={availableModels}
          />
        </div>

        {/* Right Column: Prediction Result Display & Analysis */}
        <div className="lg:col-span-7 space-y-6">
          <PredictionResultCard
            prediction={apiPrediction}
            statisticalResponse={statisticalData}
            isLoading={isLoading}
            onOpenReportModal={() => statisticalData && onOpenReportModal(statisticalData)}
            onLogDecision={handleAuditLogClick}
            logSuccessMessage={logSuccessMessage}
          />

          {/* Model Cross-Check Comparison Table */}
          {statisticalData && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  Multi-Model Statistical Cross-Validation
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Comparative Batch</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="pb-2 font-medium">Model Family</th>
                      <th className="pb-2 font-medium">Claim Prob (%)</th>
                      <th className="pb-2 font-medium">Exp. Severity</th>
                      <th className="pb-2 font-medium">Pure Premium</th>
                      <th className="pb-2 font-medium">Risk Tier</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {(Object.values(statisticalData.allModels) as ModelPrediction[]).map((m) => {
                      const isActive = m.modelId === selectedModel;
                      return (
                        <tr
                          key={m.modelId}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isActive ? 'bg-blue-500/10 font-semibold text-blue-300' : 'text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 flex items-center gap-1.5 font-sans">
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                            {m.modelName}
                          </td>
                          <td className="py-2.5 font-bold">{m.claimProbabilityPercent}%</td>
                          <td className="py-2.5">${m.expectedSeverityUSD.toLocaleString()}</td>
                          <td className="py-2.5 font-bold">${m.purePremiumUSD.toLocaleString()}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-sans ${getRiskBadgeColor(
                                m.riskTier
                              )}`}
                            >
                              {m.riskTier}
                            </span>
                          </td>
                          <td className="py-2.5">
                            {!isActive ? (
                              <button
                                onClick={() => setSelectedModel(m.modelId)}
                                className="text-[11px] text-blue-400 hover:text-blue-300 underline font-sans"
                              >
                                Select
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-sans">Active</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Complementary SHAP Factor Waterfall */}
          {statisticalData && (
            <ShapAttributionView
              attributions={statisticalData.shapAttributions}
              baseClaimRate={statisticalData.baseClaimRatePercent}
            />
          )}
        </div>
      </div>
    </div>
  );
};
