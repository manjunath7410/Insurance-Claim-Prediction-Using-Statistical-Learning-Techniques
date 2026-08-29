import React from 'react';
import { ShieldCheck, Cpu, Database, Activity, FileText, BookOpen, Layers, BarChart3 } from 'lucide-react';
import { ModelType } from '../types';

interface HeaderProps {
  activeTab: 'prediction' | 'analytics' | 'models' | 'data' | 'audit' | 'defense';
  setActiveTab: (tab: 'prediction' | 'analytics' | 'models' | 'data' | 'audit' | 'defense') => void;
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
  onOpenFormulas: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedModel,
  setSelectedModel,
  onOpenFormulas,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner / System Ribbon */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Insurance Claim Prediction Platform
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Statistical Learning
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Final Year Data Science Project • Actuarial Modeling & Risk Analytics
              </p>
            </div>
          </div>

          {/* Model Selector & Defense Helper */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
              <span className="text-xs text-slate-400 px-2 font-medium flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> Active Model:
              </span>
              <select
                id="header-model-selector"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelType)}
                aria-label="Active statistical model selector"
                className="bg-slate-900 text-xs font-medium text-slate-200 border-none rounded-md px-2.5 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="gradient_boosting_tweedie">Gradient Boosting (Tweedie Deviance)</option>
                <option value="two_stage_hurdle">Two-Stage Hurdle (Bernoulli × Gamma)</option>
                <option value="random_forest">Random Forest Ensemble</option>
                <option value="glm_logistic_gamma">GLM (Logistic + Gamma Link)</option>
              </select>
            </div>

            <button
              id="header-formulas-button"
              onClick={onOpenFormulas}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 hover:bg-indigo-900/60 transition-colors text-xs font-medium"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Formulas & Viva Defense</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-800/80 -mb-px overflow-x-auto py-1">
          <button
            id="tab-prediction-console"
            onClick={() => setActiveTab('prediction')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'prediction'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Prediction & Underwriter Console</span>
          </button>

          <button
            id="tab-analytics-dashboard"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Insurance Analytics Dashboard</span>
          </button>

          <button
            id="tab-model-benchmarks"
            onClick={() => setActiveTab('models')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'models'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Model Comparison & ROC/Gini Curves</span>
          </button>

          <button
            id="tab-claims-dataset"
            onClick={() => setActiveTab('data')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data Layer & CSV Ingestion</span>
          </button>

          <button
            id="tab-audit-logs"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Trail & Governance</span>
          </button>
        </div>
      </div>
    </header>
  );
};

