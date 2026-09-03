import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  BarChart3,
  Database,
  Target,
  TrendingUp,
  FileText,
  Activity,
  GitCompare,
  Settings as SettingsIcon,
  BookOpen,
  ArrowLeft,
  ShieldAlert,
  Clock,
  Shield,
  Award,
  Lock,
  GitBranch,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { PredictionResponse, PolicyholderInput, ModelType } from '../../types';
import { ModelPerformancePage } from '../pages/ModelPerformancePage';
import { ModelComparisonDashboard } from '../ModelComparisonDashboard';
import { ActuarialInsightsPage } from '../pages/ActuarialInsightsPage';
import { PortfolioAnalyticsPage } from '../pages/PortfolioAnalyticsPage';
import { DatasetUploadPage } from '../pages/DatasetUploadPage';
import { DataExplorer } from '../DataExplorer';
import { DataDriftPage } from '../pages/DataDriftPage';
import { PredictionHistoryPage } from '../pages/PredictionHistoryPage';
import { AuditGovernancePanel } from '../AuditGovernancePanel';
import { ScenarioAnalysisPage } from '../pages/ScenarioAnalysisPage';
import { SettingsPage } from '../pages/SettingsPage';

export type ProTabKey =
  | 'models'
  | 'shap'
  | 'portfolio'
  | 'csv-dataset'
  | 'evaluation'
  | 'gini-lorenz'
  | 'audit-governance'
  | 'diagnostics-drift'
  | 'scenario'
  | 'settings';

interface ProfessionalWorkspaceProps {
  activeTab: ProTabKey;
  setActiveTab: (tab: ProTabKey) => void;
  onSwitchToCustomer: () => void;
  activePrediction: PredictionResponse | null;
  scenarioBaseline: PolicyholderInput | null;
  onOpenReportModal?: (resp: PredictionResponse) => void;
  onOpenFormulasModal?: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  decisionThreshold: number;
  setDecisionThreshold: (val: number) => void;
}

export const ProfessionalWorkspace: React.FC<ProfessionalWorkspaceProps> = ({
  activeTab,
  setActiveTab,
  onSwitchToCustomer,
  activePrediction,
  scenarioBaseline,
  onOpenReportModal,
  onOpenFormulasModal,
  theme,
  setTheme,
  decisionThreshold,
  setDecisionThreshold,
}) => {
  // Sub-toggle states for tabs with multiple deep specialized views
  const [modelSubTab, setModelSubTab] = useState<'benchmarks' | 'champion_challenger'>('benchmarks');
  const [datasetSubTab, setDatasetSubTab] = useState<'upload' | 'quality_explorer'>('upload');
  const [auditSubTab, setAuditSubTab] = useState<'records' | 'governance'>('records');
  const [comparisonSelectedModel, setComparisonSelectedModel] = useState<ModelType>('gradient_boosting_tweedie');

  const proNavItems: Array<{
    id: ProTabKey;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    category: 'Modeling' | 'Portfolio' | 'Validation' | 'Governance';
  }> = [
    {
      id: 'models',
      label: 'Model Information & Comparisons',
      description: 'GLM, GBDT Tweedie, Two-Stage Hurdle specifications & metrics',
      icon: Layers,
      category: 'Modeling',
    },
    {
      id: 'shap',
      label: 'SHAP Analysis & Attributions',
      description: 'TreeSHAP waterfall, feature attributions, loss models & dossier',
      icon: Sparkles,
      category: 'Modeling',
    },
    {
      id: 'portfolio',
      label: 'Portfolio & Risk Analytics',
      description: 'Loss ratio monitoring, exposure distributions & risk tiers',
      icon: BarChart3,
      category: 'Portfolio',
    },
    {
      id: 'csv-dataset',
      label: 'Portfolio CSV & Batch Scoring',
      description: 'Tabular dataset upload, schema validation & automated scoring',
      icon: Database,
      category: 'Portfolio',
    },
    {
      id: 'evaluation',
      label: 'Evaluation Metrics & Calibration',
      description: 'ROC-AUC, PR-AUC, Brier score, ECE & reliability diagrams',
      icon: Target,
      category: 'Validation',
    },
    {
      id: 'gini-lorenz',
      label: 'Gini & Lorenz Analysis',
      description: 'Lorenz inequality curves, normalized Gini index & sorting power',
      icon: TrendingUp,
      category: 'Validation',
    },
    {
      id: 'diagnostics-drift',
      label: 'Technical Diagnostics & Drift',
      description: 'Population Stability Index (PSI), KS test & residual deviance',
      icon: Activity,
      category: 'Validation',
    },
    {
      id: 'audit-governance',
      label: 'Audit & Governance Information',
      description: 'Underwriting decision trail, policy logs & model registry',
      icon: FileText,
      category: 'Governance',
    },
    {
      id: 'scenario',
      label: 'Scenario Studio (What-If)',
      description: 'Actuarial sensitivity simulation & discount optimization',
      icon: GitCompare,
      category: 'Modeling',
    },
    {
      id: 'settings',
      label: 'Settings & Thresholds',
      description: 'Underwriting decision thresholds & platform preferences',
      icon: SettingsIcon,
      category: 'Governance',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* PROFESSIONAL WORKSPACE TOP BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">
                Advanced Underwriting &amp; Actuarial Suite
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                Specialist Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Statistical inference, CAS actuarial models, SHAP explainability &amp; governance diagnostics
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenFormulasModal && (
            <button
              type="button"
              id="pro-workspace-formulas-btn"
              onClick={onOpenFormulasModal}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="View CAS Mathematical Proofs & Model Formulations"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">CAS Mathematical Proofs</span>
            </button>
          )}

          <button
            type="button"
            id="pro-workspace-back-to-customer-btn"
            onClick={onSwitchToCustomer}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch to Customer Area</span>
          </button>
        </div>
      </div>

      {/* ADVANCED HORIZONTAL NAVIGATION BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max">
          {proNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`pro-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title={item.description}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div className="transition-all duration-150">
        {/* 1. Model Information & Comparisons */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            {/* Sub-tab selection */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
              <button
                type="button"
                id="pro-models-subtab-benchmarks"
                onClick={() => setModelSubTab('benchmarks')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modelSubTab === 'benchmarks'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Statistical Validation &amp; Benchmarks</span>
              </button>
              <button
                type="button"
                id="pro-models-subtab-champion-challenger"
                onClick={() => setModelSubTab('champion_challenger')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modelSubTab === 'champion_challenger'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Champion vs Challenger A/B Lifecycle</span>
              </button>
            </div>

            {modelSubTab === 'benchmarks' ? (
              <ModelPerformancePage initialTab="comparison" />
            ) : (
              <ModelComparisonDashboard
                selectedModel={comparisonSelectedModel}
                setSelectedModel={setComparisonSelectedModel}
              />
            )}
          </div>
        )}

        {/* 2. SHAP Analysis & Attributions */}
        {activeTab === 'shap' && (
          <ActuarialInsightsPage
            currentPrediction={activePrediction}
            onOpenReportGenerator={() => activePrediction && onOpenReportModal && onOpenReportModal(activePrediction)}
          />
        )}

        {/* 3. Portfolio & Risk Analytics */}
        {activeTab === 'portfolio' && <PortfolioAnalyticsPage />}

        {/* 4. Portfolio CSV & Dataset Upload */}
        {activeTab === 'csv-dataset' && (
          <div className="space-y-6">
            {/* Sub-tab selection */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
              <button
                type="button"
                id="pro-dataset-subtab-upload"
                onClick={() => setDatasetSubTab('upload')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  datasetSubTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Batch CSV/Excel Ingestion &amp; Scoring</span>
              </button>
              <button
                type="button"
                id="pro-dataset-subtab-explorer"
                onClick={() => setDatasetSubTab('quality_explorer')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  datasetSubTab === 'quality_explorer'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pipeline Quality &amp; Leakage Audit</span>
              </button>
            </div>

            {datasetSubTab === 'upload' ? (
              <DatasetUploadPage
                onNavigateToAnalytics={() => setActiveTab('portfolio')}
                onNavigateToDrift={() => setActiveTab('diagnostics-drift')}
              />
            ) : (
              <DataExplorer />
            )}
          </div>
        )}

        {/* 5. Evaluation Metrics & Calibration */}
        {activeTab === 'evaluation' && (
          <ModelPerformancePage initialTab="curves" initialCurveTab="calibration" />
        )}

        {/* 6. Gini & Lorenz Analysis */}
        {activeTab === 'gini-lorenz' && (
          <ModelPerformancePage initialTab="curves" initialCurveTab="lorenz" />
        )}

        {/* 7. Technical Diagnostics & Drift */}
        {activeTab === 'diagnostics-drift' && (
          <DataDriftPage
            onNavigateToDatasetUpload={() => setActiveTab('csv-dataset')}
            onNavigateToModels={() => setActiveTab('models')}
          />
        )}

        {/* 8. Audit & Governance Information */}
        {activeTab === 'audit-governance' && (
          <div className="space-y-6">
            {/* Sub-tab selection */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setAuditSubTab('records')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  auditSubTab === 'records'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Policy Records &amp; Historical Evaluations
              </button>
              <button
                type="button"
                onClick={() => setAuditSubTab('governance')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  auditSubTab === 'governance'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Underwriting Decision Logs &amp; Governance
              </button>
            </div>

            {auditSubTab === 'records' ? (
              <PredictionHistoryPage
                onSelectPredictionForInsights={(resp) => {
                  setActiveTab('shap');
                }}
              />
            ) : (
              <AuditGovernancePanel />
            )}
          </div>
        )}

        {/* 9. Scenario Studio (What-If) */}
        {activeTab === 'scenario' && (
          <ScenarioAnalysisPage
            initialBaseline={scenarioBaseline || activePrediction?.input || null}
            onNavigateToPrediction={() => setActiveTab('models')}
          />
        )}

        {/* 10. Settings & Thresholds */}
        {activeTab === 'settings' && (
          <SettingsPage
            theme={theme}
            onThemeChange={setTheme}
            decisionThreshold={decisionThreshold}
            onDecisionThresholdChange={setDecisionThreshold}
          />
        )}
      </div>
    </div>
  );
};
