import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header, TabType } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PredictionPage } from './components/pages/PredictionPage';
import { PortfolioAnalyticsPage } from './components/pages/PortfolioAnalyticsPage';
import { ModelPerformancePage } from './components/pages/ModelPerformancePage';
import { PredictionHistoryPage } from './components/pages/PredictionHistoryPage';
import { ActuarialInsightsPage } from './components/pages/ActuarialInsightsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { DatasetUploadPage } from './components/pages/DatasetUploadPage';
import { ScenarioAnalysisPage } from './components/pages/ScenarioAnalysisPage';
import { DataDriftPage } from './components/pages/DataDriftPage';
import { ModelType, PredictionResponse, PolicyholderInput } from './types';

// Modals
const UnderwritingReportModal = lazy(() =>
  import('./components/UnderwritingReportModal').then((m) => ({
    default: m.UnderwritingReportModal,
  }))
);
const ActuarialFormulasModal = lazy(() =>
  import('./components/ActuarialFormulasModal').then((m) => ({
    default: m.ActuarialFormulasModal,
  }))
);

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] p-8 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
      <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Loading module analytics...
      </span>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('prediction');
  const [activePrediction, setActivePrediction] = useState<PredictionResponse | null>(null);
  const [scenarioBaseline, setScenarioBaseline] = useState<PolicyholderInput | null>(null);
  const [decisionThreshold, setDecisionThreshold] = useState<number>(8.0);

  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('app_theme_mode');
    return (saved as 'light' | 'dark' | 'system') || 'light';
  });

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme();
    localStorage.setItem('app_theme_mode', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  };

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
          decision:
            notes ||
            `Underwriting recommendation: ${response.primaryPrediction.underwritingRecommendation}`,
          underwriterName: 'Actuarial Risk Officer',
          status: response.primaryPrediction.claimProbabilityPercent > 16 ? 'Flagged' : 'Approved',
        }),
      });
    } catch (e) {
      console.error('Failed to log audit item:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col antialiased transition-colors duration-150">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenFormulas={() => setShowFormulasModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mb-16 lg:mb-0">
        {activeTab === 'prediction' && (
          <PredictionPage
            onNavigateToInsights={(resp) => {
              setActivePrediction(resp);
              setActiveTab('actuarial');
            }}
            onNavigateToScenario={(resp) => {
              setActivePrediction(resp);
              setScenarioBaseline(resp.input);
              setActiveTab('scenario');
            }}
            onLogDecision={handleLogDecision}
          />
        )}

        {activeTab === 'scenario' && (
          <ScenarioAnalysisPage
            initialBaseline={scenarioBaseline || activePrediction?.input || null}
            onNavigateToPrediction={() => setActiveTab('prediction')}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetUploadPage
            onNavigateToAnalytics={() => setActiveTab('analytics')}
            onNavigateToDrift={() => setActiveTab('drift')}
          />
        )}

        {activeTab === 'drift' && (
          <DataDriftPage
            onNavigateToDatasetUpload={() => setActiveTab('dataset')}
            onNavigateToModels={() => setActiveTab('models')}
          />
        )}

        {activeTab === 'analytics' && <PortfolioAnalyticsPage />}

        {activeTab === 'models' && <ModelPerformancePage />}

        {activeTab === 'history' && (
          <PredictionHistoryPage
            onSelectPredictionForInsights={(resp) => {
              setActivePrediction(resp);
              setActiveTab('actuarial');
            }}
          />
        )}

        {activeTab === 'actuarial' && (
          <ActuarialInsightsPage
            currentPrediction={activePrediction}
            onOpenReportGenerator={() => setActiveReportResponse(activePrediction)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            theme={theme}
            onThemeChange={setTheme}
            decisionThreshold={decisionThreshold}
            onDecisionThresholdChange={setDecisionThreshold}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 py-4 text-center text-xs text-slate-500 dark:text-slate-400 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            Insurance Claim Prediction Platform • Statistical Regression &amp; Machine Learning
          </span>
          <span className="font-mono text-slate-400">
            Casualty Actuarial Society (CAS) Standard Formulations
          </span>
        </div>
      </footer>

      {/* Modals */}
      <Suspense fallback={null}>
        {activeReportResponse && (
          <UnderwritingReportModal
            predictionResponse={activeReportResponse}
            onClose={() => setActiveReportResponse(null)}
          />
        )}

        {showFormulasModal && (
          <ActuarialFormulasModal onClose={() => setShowFormulasModal(false)} />
        )}
      </Suspense>
    </div>
  );
}
