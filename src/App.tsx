import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header, TabType } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomePage } from './components/pages/HomePage';
import { HelpAboutPage } from './components/pages/HelpAboutPage';
import { PredictionPage } from './components/pages/PredictionPage';
import { CustomerResultsPage } from './components/pages/CustomerResultsPage';
import { CustomerExplainPage } from './components/pages/CustomerExplainPage';
import {
  ProfessionalWorkspace,
  ProTabKey,
} from './components/professional/ProfessionalWorkspace';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { runStatisticalLearningInference } from './services/statisticalModels';
import { PredictionResponse, PolicyholderInput } from './types';

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

const DEFAULT_POLICY_BASELINE: PolicyholderInput = {
  id: 'POL-2026-8819',
  age: 35,
  drivingExperienceYears: 15,
  creditScore: 740,
  creditTier: 'Very Good (740-799)',
  annualMileage: 12000,
  vehicleCategory: 'Compact SUV',
  vehicleAge: 3,
  vehicleValue: 24000,
  regionalZone: 'Suburban Moderate (Zone B)',
  coverageTier: 'Standard Comprehensive',
  deductible: 500,
  priorClaimsLast5Years: 0,
  trafficViolationsCount: 0,
  antiTheftDevice: true,
  policyTenureYears: 3,
  driverGender: 'Female',
  maritalStatus: 'Married',
  annualExposure: 1.0,
};

export default function App() {
  // Experience Mode: 'customer' (default, plain-English, zero-jargon) or 'professional' (actuarial diagnostics)
  const [experienceMode, setExperienceMode] = useState<'customer' | 'professional'>(() => {
    const saved = localStorage.getItem('app_experience_mode');
    return saved === 'professional' ? 'professional' : 'customer';
  });

  // Customer navigation state
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Professional workspace tab state
  const [activeProTab, setActiveProTab] = useState<ProTabKey>('models');

  // Shared prediction and scenario state
  const [activePrediction, setActivePrediction] = useState<PredictionResponse | null>(() => {
    try {
      return runStatisticalLearningInference(DEFAULT_POLICY_BASELINE);
    } catch {
      return null;
    }
  });
  const [scenarioBaseline, setScenarioBaseline] = useState<PolicyholderInput | null>(null);
  const [decisionThreshold, setDecisionThreshold] = useState<number>(8.0);

  // AI Assistant Drawer state
  const [isAICopilotOpen, setIsAICopilotOpen] = useState<boolean>(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    localStorage.setItem('app_experience_mode', experienceMode);
  }, [experienceMode]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  };

  const handleToggleExperienceMode = (newMode: 'customer' | 'professional') => {
    setExperienceMode(newMode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleOpenAICopilot = (prompt?: string) => {
    setCopilotInitialPrompt(prompt);
    setIsAICopilotOpen(true);
  };

  // Direct selection of a Professional Specialist Suite tab
  const handleSelectProTab = (tab: ProTabKey) => {
    setExperienceMode('professional');
    setActiveProTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic Navigation routing handler
  const handleNavigateTab = (tab: TabType) => {
    // If user clicked a pro-only tab directly
    const proOnlyTabs: TabType[] = [
      'models',
      'analytics',
      'actuarial',
      'scenario',
      'dataset',
      'drift',
      'history',
      'settings',
    ];

    if (proOnlyTabs.includes(tab)) {
      setExperienceMode('professional');
      if (tab === 'analytics') setActiveProTab('portfolio');
      else if (tab === 'actuarial') setActiveProTab('shap');
      else if (tab === 'dataset') setActiveProTab('csv-dataset');
      else if (tab === 'drift') setActiveProTab('diagnostics-drift');
      else if (tab === 'scenario') setActiveProTab('scenario');
      else if (tab === 'history') setActiveProTab('audit-governance');
      else if (tab === 'settings') setActiveProTab('settings');
      else setActiveProTab('models');
      return;
    }

    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col antialiased transition-colors duration-150">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        experienceMode={experienceMode}
        onToggleExperienceMode={handleToggleExperienceMode}
        onSelectProTab={handleSelectProTab}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenFormulas={() => setShowFormulasModal(true)}
        onOpenAICopilot={() => handleOpenAICopilot()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-8">
        {experienceMode === 'professional' ? (
          /* =========================================================================
             ADVANCED / PROFESSIONAL AREA (Actuarial Diagnostics, SHAP, Gini, Audit)
             ========================================================================= */
          <ProfessionalWorkspace
            activeTab={activeProTab}
            setActiveTab={setActiveProTab}
            onSwitchToCustomer={() => handleToggleExperienceMode('customer')}
            activePrediction={activePrediction}
            scenarioBaseline={scenarioBaseline}
            onOpenReportModal={(resp) => setActiveReportResponse(resp)}
            onOpenFormulasModal={() => setShowFormulasModal(true)}
            theme={theme}
            setTheme={setTheme}
            decisionThreshold={decisionThreshold}
            setDecisionThreshold={setDecisionThreshold}
          />
        ) : (
          /* =========================================================================
             CUSTOMER AREA (Home, Check Risk, Results, Explain My Result, Help/About)
             Strictly zero actuarial/statistical jargon visible to normal customers.
             ========================================================================= */
          <>
            {activeTab === 'home' && (
              <HomePage
                onStartRiskCheck={() => setActiveTab('prediction')}
                onLearnMore={() => setActiveTab('help-about')}
                onOpenAICopilot={() => handleOpenAICopilot()}
                onNavigateToProPortal={(proTab) => {
                  setExperienceMode('professional');
                  if (proTab) {
                    if (proTab === 'models') setActiveProTab('models');
                    else if (proTab === 'shap') setActiveProTab('shap');
                    else if (proTab === 'portfolio') setActiveProTab('portfolio');
                    else if (proTab === 'csv-dataset') setActiveProTab('csv-dataset');
                    else if (proTab === 'evaluation') setActiveProTab('evaluation');
                    else if (proTab === 'gini-lorenz') setActiveProTab('gini-lorenz');
                    else if (proTab === 'diagnostics-drift') setActiveProTab('diagnostics-drift');
                    else if (proTab === 'audit-governance') setActiveProTab('audit-governance');
                    else if (proTab === 'scenario') setActiveProTab('scenario');
                    else setActiveProTab('models');
                  } else {
                    setActiveProTab('models');
                  }
                }}
              />
            )}

            {activeTab === 'prediction' && (
              <PredictionPage
                onNavigateToInsights={(resp) => {
                  setActivePrediction(resp);
                  setExperienceMode('professional');
                  setActiveProTab('shap');
                }}
                onNavigateToScenario={(resp) => {
                  setActivePrediction(resp);
                  setScenarioBaseline(resp.input);
                  setExperienceMode('professional');
                  setActiveProTab('scenario');
                }}
                onNavigateToResults={(resp) => {
                  setActivePrediction(resp);
                  setActiveTab('results');
                }}
                onNavigateToExplain={(resp) => {
                  setActivePrediction(resp);
                  setActiveTab('explain-my-result');
                }}
                onPredictionCalculated={(resp) => {
                  setActivePrediction(resp);
                }}
                onLogDecision={handleLogDecision}
                onOpenAICopilot={handleOpenAICopilot}
                isProfessionalMode={false}
              />
            )}

            {activeTab === 'results' && (
              <CustomerResultsPage
                predictionResponse={activePrediction}
                policyId={activePrediction?.policyId || 'POL-2026-8819'}
                onNavigateToCheckRisk={() => setActiveTab('prediction')}
                onNavigateToExplain={() => setActiveTab('explain-my-result')}
                onNavigateToHelp={() => setActiveTab('help-about')}
                onLogDecision={handleLogDecision}
                onOpenAICopilot={handleOpenAICopilot}
                onSwitchToPro={() => {
                  setExperienceMode('professional');
                  setActiveProTab('models');
                }}
              />
            )}

            {activeTab === 'explain-my-result' && (
              <CustomerExplainPage
                predictionResponse={activePrediction}
                policyId={activePrediction?.policyId || 'POL-2026-8819'}
                onNavigateToCheckRisk={() => setActiveTab('prediction')}
                onNavigateToResults={() => setActiveTab('results')}
                onOpenAICopilot={handleOpenAICopilot}
                onSwitchToPro={() => {
                  setExperienceMode('professional');
                  setActiveProTab('models');
                }}
              />
            )}

            {activeTab === 'help-about' && (
              <HelpAboutPage
                onStartRiskCheck={() => setActiveTab('prediction')}
                onOpenAICopilot={() => handleOpenAICopilot()}
                onNavigateToProTools={() => {
                  setExperienceMode('professional');
                  setActiveProTab('models');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        experienceMode={experienceMode}
        onToggleExperienceMode={handleToggleExperienceMode}
        activeProTab={activeProTab}
        onSelectProTab={handleSelectProTab}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 py-4 text-center text-xs text-slate-500 dark:text-slate-400 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            {experienceMode === 'professional'
              ? 'AutoSafe Pro • Actuarial Modeling & Risk Analytics Platform'
              : 'AutoSafe • Clear & Simple Auto Insurance Risk Estimator'}
          </span>
          <div className="flex items-center gap-4">
            {experienceMode === 'customer' ? (
              <button
                type="button"
                onClick={() => handleToggleExperienceMode('professional')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer transition-colors"
              >
                Specialist Underwriting &amp; Actuarial Suite →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleExperienceMode('customer')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer transition-colors"
              >
                ← Switch to Customer View
              </button>
            )}
            <span className="font-mono text-slate-400">
              {experienceMode === 'professional'
                ? 'CAS Statistical Formulations'
                : 'Free & Private Estimation'}
            </span>
          </div>
        </div>
      </footer>

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        currentPolicy={activePrediction?.input || null}
        currentPrediction={activePrediction}
        initialPrompt={copilotInitialPrompt}
        isProfessionalMode={experienceMode === 'professional'}
      />

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
