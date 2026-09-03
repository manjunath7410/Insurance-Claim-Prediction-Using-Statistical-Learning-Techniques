import React from 'react';
import {
  Home,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  BarChart3,
  Layers,
  ArrowLeft,
  Database,
  GitCompare,
  TrendingUp,
} from 'lucide-react';
import { TabType } from './Header';
import { ProTabKey } from './professional/ProfessionalWorkspace';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  experienceMode: 'customer' | 'professional';
  onToggleExperienceMode: (mode: 'customer' | 'professional') => void;
  activeProTab?: ProTabKey;
  onSelectProTab?: (tab: ProTabKey) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  experienceMode,
  onToggleExperienceMode,
  activeProTab = 'models',
  onSelectProTab,
}) => {
  if (experienceMode === 'professional') {
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 pb-safe transition-colors shadow-2xl">
        <nav className="flex items-center justify-around h-16 px-1">
          {/* Models */}
          <button
            type="button"
            id="mobile-pro-models"
            onClick={() => {
              if (onSelectProTab) onSelectProTab('models');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
              activeProTab === 'models'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeProTab === 'models' ? 'bg-indigo-950/80 scale-105 ring-1 ring-indigo-500/50' : ''
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold mt-0.5">Models</span>
          </button>

          {/* SHAP */}
          <button
            type="button"
            id="mobile-pro-shap"
            onClick={() => {
              if (onSelectProTab) onSelectProTab('shap');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
              activeProTab === 'shap'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeProTab === 'shap' ? 'bg-indigo-950/80 scale-105 ring-1 ring-indigo-500/50' : ''
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold mt-0.5">SHAP</span>
          </button>

          {/* Portfolio */}
          <button
            type="button"
            id="mobile-pro-portfolio"
            onClick={() => {
              if (onSelectProTab) onSelectProTab('portfolio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
              activeProTab === 'portfolio'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeProTab === 'portfolio' ? 'bg-indigo-950/80 scale-105 ring-1 ring-indigo-500/50' : ''
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold mt-0.5">Portfolio</span>
          </button>

          {/* Scenarios */}
          <button
            type="button"
            id="mobile-pro-scenario"
            onClick={() => {
              if (onSelectProTab) onSelectProTab('scenario');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
              activeProTab === 'scenario'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeProTab === 'scenario' ? 'bg-indigo-950/80 scale-105 ring-1 ring-indigo-500/50' : ''
              }`}
            >
              <GitCompare className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold mt-0.5">Scenario</span>
          </button>

          {/* Return to Customer Mode */}
          <button
            type="button"
            id="mobile-pro-exit"
            onClick={() => onToggleExperienceMode('customer')}
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded-xl bg-blue-600 text-white shadow-xs">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold mt-0.5">Customer</span>
          </button>
        </nav>
      </div>
    );
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors shadow-lg">
      <nav className="flex items-center justify-around h-16 px-1">
        {/* Home */}
        <button
          type="button"
          id="mobile-nav-home"
          onClick={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
            activeTab === 'home'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'home' ? 'bg-blue-50 dark:bg-blue-950/80 scale-105' : ''
            }`}
          >
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </button>

        {/* Check Risk */}
        <button
          type="button"
          id="mobile-nav-check-risk"
          onClick={() => {
            setActiveTab('prediction');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
            activeTab === 'prediction'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'prediction' ? 'bg-blue-50 dark:bg-blue-950/80 scale-105' : ''
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Check Risk</span>
        </button>

        {/* Results */}
        <button
          type="button"
          id="mobile-nav-results"
          onClick={() => {
            setActiveTab('results');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
            activeTab === 'results'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'results' ? 'bg-blue-50 dark:bg-blue-950/80 scale-105' : ''
            }`}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Results</span>
        </button>

        {/* Explain My Result */}
        <button
          type="button"
          id="mobile-nav-explain"
          onClick={() => {
            setActiveTab('explain-my-result');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer ${
            activeTab === 'explain-my-result'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'explain-my-result' ? 'bg-blue-50 dark:bg-blue-950/80 scale-105' : ''
            }`}
          >
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Explain</span>
        </button>

        {/* Pro Suite Tab */}
        <button
          type="button"
          id="mobile-nav-pro-suite"
          onClick={() => {
            onToggleExperienceMode('professional');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400"
        >
          <div className="p-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 transition-all">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-[10px] font-extrabold mt-0.5 text-indigo-700 dark:text-indigo-300">Pro Suite</span>
        </button>
      </nav>
    </div>
  );
};
