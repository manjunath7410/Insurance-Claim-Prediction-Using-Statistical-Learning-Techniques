import React, { useState } from 'react';
import { Header } from './components/Header';
import { PredictionConsole } from './components/PredictionConsole';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ModelComparisonDashboard } from './components/ModelComparisonDashboard';
import { DataExplorer } from './components/DataExplorer';
import { AuditGovernancePanel } from './components/AuditGovernancePanel';
import { UnderwritingReportModal } from './components/UnderwritingReportModal';
import { ActuarialFormulasModal } from './components/ActuarialFormulasModal';
import { ModelType, PredictionResponse } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'prediction' | 'analytics' | 'models' | 'data' | 'audit' | 'defense'>('prediction');
  const [selectedModel, setSelectedModel] = useState<ModelType>('gradient_boosting_tweedie');
  
  // Modals state
  const [activeReportResponse, setActiveReportResponse] = useState<PredictionResponse | null>(null);
  const [showFormulasModal, setShowFormulasModal] = useState(false);

  const handleLogDecision = async (response: PredictionResponse, notes?: string) => {
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: response.policyId,
          driverAge: response.input.age,
          vehicleCategory: response.input.vehicleCategory,
          modelUsed: response.primaryPrediction.modelName,
          claimProbability: response.primaryPrediction.claimProbability,
          expectedSeverity: response.primaryPrediction.expectedSeverityUSD,
          purePremium: response.primaryPrediction.purePremiumUSD,
          grossPremium: response.primaryPrediction.recommendedGrossPremiumUSD,
          riskTier: response.primaryPrediction.riskTier,
          decision: notes || `Underwriting recommendation: ${response.primaryPrediction.underwritingRecommendation}`,
          underwriterName: 'Lead Actuary (M. Khot)',
          status: response.primaryPrediction.claimProbabilityPercent > 30 ? 'Flagged' : 'Approved',
        }),
      });
    } catch (e) {
      console.error('Failed to log audit item:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        onOpenFormulas={() => setShowFormulasModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'prediction' && (
          <PredictionConsole
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            onOpenReportModal={(resp) => setActiveReportResponse(resp)}
            onLogDecision={handleLogDecision}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard />}

        {activeTab === 'models' && (
          <ModelComparisonDashboard
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />
        )}

        {activeTab === 'data' && <DataExplorer />}

        {activeTab === 'audit' && <AuditGovernancePanel />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            Insurance Claim Prediction Platform • Statistical Learning & Actuarial Risk Engine
          </span>
          <span className="font-mono text-slate-400">
            Validated against Casualty Actuarial Society (CAS) Loss Distributions
          </span>
        </div>
      </footer>

      {/* Modals */}
      {activeReportResponse && (
        <UnderwritingReportModal
          predictionResponse={activeReportResponse}
          onClose={() => setActiveReportResponse(null)}
        />
      )}

      {showFormulasModal && (
        <ActuarialFormulasModal onClose={() => setShowFormulasModal(false)} />
      )}
    </div>
  );
}

