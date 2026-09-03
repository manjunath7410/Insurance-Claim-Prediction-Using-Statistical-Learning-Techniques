import React, { useState, useEffect } from 'react';
import { PredictionResponse } from '../types';
import {
  X,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileText,
  DollarSign,
  AlertCircle,
  Building,
  Scale,
  Cpu,
  Download,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface UnderwritingReportModalProps {
  predictionResponse: PredictionResponse;
  onClose: () => void;
}

interface DossierSection {
  title: string;
  [key: string]: any;
}

interface CompleteDossier {
  reportId: string;
  predictionId: string;
  generatedAt: string;
  promptVersion: string;
  source: 'gemini-3.8-flash' | 'gemini-3.7-flash' | 'rule-based-actuarial-engine' | string;
  isFallback: boolean;
  sections: {
    executiveSummary: {
      title: string;
      content: string;
      summaryBullets: string[];
    };
    prediction: {
      title: string;
      claimProbability: number;
      claimProbabilityFormatted: string;
      calibratedThreshold: number;
      calibratedThresholdFormatted: string;
      thresholdStatus: string;
      isClaimFlagged: boolean;
      pureRiskPremiumUSD: number;
      expectedSeverityUSD: number;
      recommendedGrossPremiumUSD: number;
      authoritativeEngine: string;
    };
    riskLevel: {
      title: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
      tierDescription: string;
      portfolioPercentileRange: string;
      underwritingAction: string;
    };
    keyFactors: {
      title: string;
      primaryRiskDrivers: Array<{
        name: string;
        observedValue: string;
        direction: string;
        attributionScore: number;
        actuarialExplanation: string;
      }>;
      netRiskDirection: string;
    };
    modelInformation: {
      title: string;
      modelName: string;
      modelVersion: string;
      modelType: string;
      calibrationMethod: string;
      rocAucBenchmark: number;
      brierScoreBenchmark: number;
      trainingDataProvenance: string;
      governanceStatus: string;
    };
    limitations: {
      title: string;
      items: string[];
    };
    importantDisclaimer: {
      title: string;
      notice: string;
      humanInTheLoopRequirement: string;
      regulatoryNotice: string;
    };
  };
}

export const UnderwritingReportModal: React.FC<UnderwritingReportModalProps> = ({
  predictionResponse,
  onClose,
}) => {
  const [dossier, setDossier] = useState<CompleteDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'formatted' | 'json'>('formatted');
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    async function fetchAiReport() {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/underwriting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            policyId: predictionResponse.policyId,
            predictionId: predictionResponse.policyId,
            probability: predictionResponse.primaryPrediction.claimProbability,
            claimProbability: predictionResponse.primaryPrediction.claimProbability,
            riskLevel: predictionResponse.primaryPrediction.riskTier.toUpperCase().includes('LOW')
              ? 'LOW'
              : predictionResponse.primaryPrediction.riskTier.toUpperCase().includes('ELEVATED') || predictionResponse.primaryPrediction.riskTier.toUpperCase().includes('HIGH')
              ? 'HIGH'
              : predictionResponse.primaryPrediction.riskTier.toUpperCase().includes('CRITICAL')
              ? 'VERY_HIGH'
              : 'MEDIUM',
            modelVersion: predictionResponse.primaryPrediction.modelName,
            modelName: predictionResponse.primaryPrediction.modelName,
            topContributingFactors: predictionResponse.shapAttributions.map((s) => ({
              feature: s.feature,
              label: s.displayName,
              value: s.value,
              contributionScore: s.impactPercent / 100,
              impact: s.direction === 'increases_risk' ? 'INCREASES_RISK' : 'DECREASES_RISK',
              explanation: s.description,
            })),
            nonSensitiveFeatures: {
              driverAge: predictionResponse.input.age,
              drivingExperienceYears: predictionResponse.input.drivingExperienceYears,
              creditTier: predictionResponse.input.creditTier,
              creditScore: predictionResponse.input.creditScore,
              vehicleCategory: predictionResponse.input.vehicleCategory,
              vehicleAge: predictionResponse.input.vehicleAge,
              annualMileage: predictionResponse.input.annualMileage,
              regionalZone: predictionResponse.input.regionalZone,
              coverageTier: predictionResponse.input.coverageTier,
              deductible: predictionResponse.input.deductible,
              priorClaimsCount: predictionResponse.input.priorClaimsLast5Years,
              trafficViolationsCount: predictionResponse.input.trafficViolationsCount,
              annualExposure: predictionResponse.input.annualExposure,
            },
            financialMetrics: {
              expectedSeverityUSD: predictionResponse.primaryPrediction.expectedSeverityUSD,
              purePremiumUSD: predictionResponse.primaryPrediction.purePremiumUSD,
              recommendedGrossPremiumUSD: predictionResponse.primaryPrediction.recommendedGrossPremiumUSD,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setDossier(data);
        } else {
          // Try legacy endpoint fallback
          const legacyRes = await fetch('/api/ai-underwriting-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: predictionResponse.input,
              prediction: predictionResponse.primaryPrediction,
              shapAttributions: predictionResponse.shapAttributions,
            }),
          });
          if (legacyRes.ok) {
            const legData = await legacyRes.json();
            if (legData.dossier) {
              setDossier(legData.dossier);
            }
          }
        }
      } catch (e) {
        console.error('Failed to generate underwriting dossier report:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchAiReport();
  }, [predictionResponse]);

  const { input, primaryPrediction, policyId } = predictionResponse;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!dossier) return;
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `underwriting_dossier_${policyId || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    if (!dossier) return;
    navigator.clipboard.writeText(JSON.stringify(dossier, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:bg-white print:text-black">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 print:bg-white print:border-b-2 print:border-slate-300">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white print:text-black">
                  Actuarial Underwriting & Risk Dossier
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 print:hidden">
                  7-Section Formal Report
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono print:text-slate-600">
                Policy Ref: {policyId || 'POL-88392'} • Model: {primaryPrediction.modelName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 print:hidden">
            {/* View Switcher Tabs */}
            <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800 mr-2">
              <button
                onClick={() => setActiveView('formatted')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeView === 'formatted'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dossier
              </button>
              <button
                onClick={() => setActiveView('json')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeView === 'json'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JSON
              </button>
            </div>

            <button
              onClick={handleDownloadJson}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              title="Download JSON Dossier"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clear Model vs Explanatory AI Separation Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs print:bg-slate-50 print:border-b">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 text-[10px]">
              MODEL PREDICTION: {primaryPrediction.claimProbabilityPercent}%
            </span>
            <span className="text-slate-500">→</span>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-[10px] flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              EXPLANATORY LAYER: {dossier?.source?.includes('gemini') ? 'Gemini 3.8 Flash' : 'Actuarial Rule Kernel'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Prompt Version: <span className="text-slate-300">{dossier?.promptVersion || 'v1.2-underwriting-dossier'}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible text-slate-200 print:text-black">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-medium animate-pulse">
                Synthesizing comprehensive 7-section Actuarial Dossier...
              </span>
            </div>
          ) : activeView === 'json' ? (
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-slate-400">Structured Dossier JSON Payload</span>
                <button
                  onClick={handleCopyJson}
                  className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  {copiedJson ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[60vh]">
                {JSON.stringify(dossier, null, 2)}
              </pre>
            </div>
          ) : dossier ? (
            <div className="space-y-6">
              {/* Rating Snapshot Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-xs print:bg-slate-50 print:border-slate-300">
                <div>
                  <span className="text-slate-400 text-[10px] block">Driver Demographics</span>
                  <span className="font-semibold text-white print:text-black">
                    Age {input.age} • {input.driverGender} • {input.maritalStatus}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Insured Asset & Zone</span>
                  <span className="font-semibold text-white print:text-black truncate block">
                    {input.vehicleCategory} ({input.regionalZone})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">P(Claim) Frequency</span>
                  <span className="font-bold text-blue-400 text-sm print:text-blue-700">
                    {dossier.sections.prediction.claimProbabilityFormatted}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Pure Risk Premium</span>
                  <span className="font-bold text-emerald-400 text-sm print:text-emerald-700">
                    ${dossier.sections.prediction.pureRiskPremiumUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 print:text-blue-800">
                  <Sparkles className="w-3.5 h-3.5" /> {dossier.sections.executiveSummary.title}
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 space-y-2.5 print:bg-slate-50 print:border-slate-300">
                  <p className="text-xs text-slate-300 leading-relaxed print:text-black">
                    {dossier.sections.executiveSummary.content}
                  </p>
                  {dossier.sections.executiveSummary.summaryBullets && dossier.sections.executiveSummary.summaryBullets.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-800/60 print:border-slate-300">
                      {dossier.sections.executiveSummary.summaryBullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300 print:text-black">
                          <span className="text-blue-400 font-bold">•</span>
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Authoritative Model Prediction */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 print:text-indigo-800">
                  <Scale className="w-3.5 h-3.5" /> {dossier.sections.prediction.title}
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 grid grid-cols-1 sm:grid-cols-3 gap-4 print:bg-slate-50 print:border-slate-300">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Calibrated Claim Probability</span>
                    <span className="text-xl font-bold font-mono text-white print:text-black">
                      {dossier.sections.prediction.claimProbabilityFormatted}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cutoff Threshold: {dossier.sections.prediction.calibratedThresholdFormatted}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Expected Severity (Loss|Claim)</span>
                    <span className="text-xl font-bold font-mono text-indigo-300 print:text-indigo-900">
                      ${dossier.sections.prediction.expectedSeverityUSD.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Gamma / Pareto Tail
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Recommended Gross Premium</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 print:text-emerald-800">
                      ${dossier.sections.prediction.recommendedGrossPremiumUSD.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Pure Risk: ${dossier.sections.prediction.pureRiskPremiumUSD.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Calibrated Risk Stratification */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 print:text-purple-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> {dossier.sections.riskLevel.title}
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 space-y-2 print:bg-slate-50 print:border-slate-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 print:text-black">
                      Tier: {dossier.sections.riskLevel.riskLevel} ({dossier.sections.riskLevel.portfolioPercentileRange})
                    </span>
                    <span className="text-xs text-blue-300 font-medium">
                      Action: {dossier.sections.riskLevel.underwritingAction}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed print:text-black">
                    {dossier.sections.riskLevel.tierDescription}
                  </p>
                </div>
              </div>

              {/* 4. Key Factors (SHAP Decomposition) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 print:text-amber-800">
                  <Layers className="w-3.5 h-3.5" /> {dossier.sections.keyFactors.title}
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 space-y-2.5 print:bg-slate-50 print:border-slate-300">
                  {dossier.sections.keyFactors.primaryRiskDrivers.map((factor, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-800/50 last:border-0 last:pb-0 print:border-slate-200">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-200 print:text-black">{factor.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({factor.observedValue})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 print:text-slate-600">{factor.actuarialExplanation}</p>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-amber-300 print:text-amber-800">
                          {factor.direction} ({(Math.abs(factor.attributionScore) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Model Information & Provenance */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 print:text-cyan-800">
                  <Cpu className="w-3.5 h-3.5" /> {dossier.sections.modelInformation.title}
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 text-xs space-y-1.5 print:bg-slate-50 print:border-slate-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 print:text-black">
                    <div>
                      <span className="text-slate-400">Model Name:</span> {dossier.sections.modelInformation.modelName}
                    </div>
                    <div>
                      <span className="text-slate-400">Model Version:</span> {dossier.sections.modelInformation.modelVersion}
                    </div>
                    <div>
                      <span className="text-slate-400">Calibration:</span> {dossier.sections.modelInformation.calibrationMethod}
                    </div>
                    <div>
                      <span className="text-slate-400">Governance:</span> {dossier.sections.modelInformation.governanceStatus}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 print:border-slate-300">
                    Provenance: {dossier.sections.modelInformation.trainingDataProvenance}
                  </div>
                </div>
              </div>

              {/* 6. Actuarial Limitations */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 print:text-rose-800">
                  <AlertTriangle className="w-3.5 h-3.5" /> {dossier.sections.limitations.title}
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 space-y-1.5 print:bg-slate-50 print:border-slate-300">
                  {dossier.sections.limitations.items.map((item, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-slate-300 print:text-black">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Regulatory & Human-in-the-Loop Disclaimer */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 print:text-emerald-800">
                  <Info className="w-3.5 h-3.5" /> {dossier.sections.importantDisclaimer.title}
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/90 text-xs text-slate-300 space-y-2 print:bg-slate-50 print:border-slate-300 print:text-black">
                  <p className="leading-relaxed">{dossier.sections.importantDisclaimer.notice}</p>
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 print:text-black print:bg-amber-50">
                    <strong>Mandatory Underwriting Protocol:</strong> {dossier.sections.importantDisclaimer.humanInTheLoopRequirement}
                  </div>
                  <p className="text-[11px] text-slate-400 print:text-slate-600">
                    {dossier.sections.importantDisclaimer.regulatoryNotice}
                  </p>
                </div>
              </div>

              {/* Dossier Footer */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap justify-between items-center text-[11px] text-slate-400 print:border-slate-300">
                <span>
                  Generated: {new Date(dossier.generatedAt).toLocaleString()} • ID: {dossier.reportId}
                </span>
                <span>Casualty Actuarial Society (CAS) Standard Validation</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <span>Failed to load underwriting dossier report.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
