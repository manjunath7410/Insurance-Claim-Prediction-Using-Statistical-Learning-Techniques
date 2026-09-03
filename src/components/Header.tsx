import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Home,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  ChevronDown,
  BarChart3,
  Layers,
  FileCheck2,
  ArrowLeft,
  BookOpen,
  Database,
  Target,
  TrendingUp,
  Activity,
  FileText,
  GitCompare,
  Settings as SettingsIcon,
  User,
  Cpu,
} from 'lucide-react';
import { ProTabKey } from './professional/ProfessionalWorkspace';

export type TabType =
  | 'home'
  | 'prediction'
  | 'results'
  | 'explain-my-result'
  | 'help-about'
  | 'scenario'
  | 'dataset'
  | 'drift'
  | 'analytics'
  | 'models'
  | 'history'
  | 'actuarial'
  | 'settings';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  experienceMode: 'customer' | 'professional';
  onToggleExperienceMode: (mode: 'customer' | 'professional') => void;
  onSelectProTab?: (tab: ProTabKey) => void;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  onOpenFormulas?: () => void;
  onOpenAICopilot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  experienceMode,
  onToggleExperienceMode,
  onSelectProTab,
  theme,
  onToggleTheme,
  onOpenFormulas,
  onOpenAICopilot,
}) => {
  const [isProDropdownOpen, setIsProDropdownOpen] = useState(false);
  const proDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (proDropdownRef.current && !proDropdownRef.current.contains(event.target as Node)) {
        setIsProDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary Customer-Facing Navigation
  const customerTabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'prediction', label: 'Check Risk', icon: ShieldCheck },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'explain-my-result', label: 'Explain My Result', icon: Sparkles },
    { id: 'help-about', label: 'Help / About', icon: HelpCircle },
  ];

  // Specialist Suite Deep Capabilities List
  const proCapabilities: Array<{
    proTabId: ProTabKey;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { proTabId: 'models', label: 'Statistical Model Comparisons', description: 'GLM vs GBDT Tweedie vs Hurdle benchmark metrics', icon: Layers },
    { proTabId: 'shap', label: 'SHAP Feature Importance', description: 'TreeSHAP attributions & loss breakdowns', icon: Sparkles },
    { proTabId: 'portfolio', label: 'Portfolio & Risk Analytics', description: 'Loss ratio monitoring & portfolio segments', icon: BarChart3 },
    { proTabId: 'csv-dataset', label: 'CSV Dataset Ingestion & Batch Scoring', description: 'Tabular dataset upload & batch scoring', icon: Database },
    { proTabId: 'evaluation', label: 'Evaluation Metrics & Calibration', description: 'Brier score, ECE & reliability curves', icon: Target },
    { proTabId: 'gini-lorenz', label: 'Gini & Lorenz Curves', description: 'Lorenz inequality & underwriting sorting power', icon: TrendingUp },
    { proTabId: 'diagnostics-drift', label: 'Data Drift Diagnostics', description: 'Population Stability Index (PSI) & KS tests', icon: Activity },
    { proTabId: 'audit-governance', label: 'Audit & Governance Logging', description: 'Immutable decision logs & policy registry', icon: FileText },
    { proTabId: 'scenario', label: 'Scenario Studio (What-If)', description: 'Sensitivity simulation & discount optimization', icon: GitCompare },
    { proTabId: 'settings', label: 'Settings & Decision Cutoffs', description: 'Actuarial threshold calibration & preferences', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Brand Logo & Title */}
          <div
            onClick={() => {
              if (experienceMode === 'customer') {
                setActiveTab('home');
              } else {
                onToggleExperienceMode('customer');
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none shrink-0"
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-all ${
                experienceMode === 'professional'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-600/20 ring-2 ring-indigo-500/30'
                  : 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-600/20'
              }`}
            >
              {experienceMode === 'professional' ? (
                <Layers className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {experienceMode === 'professional' ? 'AutoSafe Pro' : 'AutoSafe Risk'}
                </span>
                <span
                  className={`hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    experienceMode === 'professional'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {experienceMode === 'professional' ? 'Specialist Suite' : 'Customer Portal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {experienceMode === 'professional'
                  ? 'Actuarial Diagnostics & Statistical Modeling'
                  : 'Auto Insurance Risk & Rate Guide'}
              </p>
            </div>
          </div>

          {/* DUAL-MODE SWITCHER (Central Pill on Desktop / Tablet) */}
          <div className="hidden lg:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
            <button
              type="button"
              id="dual-mode-customer-pill"
              onClick={() => onToggleExperienceMode('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                experienceMode === 'customer'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </button>
            <button
              type="button"
              id="dual-mode-pro-pill"
              onClick={() => onToggleExperienceMode('professional')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                experienceMode === 'professional'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Specialist Suite (Pro)</span>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          {experienceMode === 'customer' ? (
            <nav className="hidden md:flex items-center gap-1">
              {customerTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`nav-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 lg:px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {/* Dedicated Specialist Suite / Pro Section Button with Dropdown */}
              <div className="relative" ref={proDropdownRef}>
                <button
                  type="button"
                  id="nav-pro-suite-dropdown-btn"
                  onClick={() => setIsProDropdownOpen((prev) => !prev)}
                  className="px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-xs ml-1"
                  title="Explore Deep Actuarial & Underwriting Capabilities"
                >
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Specialist Suite</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isProDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                          Actuarial Specialist Suite
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          9 deep statistical modeling &amp; risk capabilities
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProDropdownOpen(false);
                          onToggleExperienceMode('professional');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Launch All →
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                      {proCapabilities.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setIsProDropdownOpen(false);
                              if (onSelectProTab) {
                                onSelectProTab(item.proTabId);
                              } else {
                                onToggleExperienceMode('professional');
                              }
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer group"
                          >
                            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors mt-0.5 shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {item.label}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {item.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </nav>
          ) : (
            /* In Professional Mode: Prominent Return to Customer View Button */
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 hidden xl:inline">
                ⚡ Specialist Workspace Active
              </span>
              <button
                type="button"
                id="header-pro-to-customer-btn"
                onClick={() => onToggleExperienceMode('customer')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <span>Return to Customer View</span>
              </button>
            </div>
          )}

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Quick Switch Button (Responsive for Tablet & Mobile) */}
            {experienceMode === 'customer' ? (
              <button
                type="button"
                id="header-switch-to-pro-btn"
                onClick={() => onToggleExperienceMode('professional')}
                className="inline-flex lg:hidden items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                title="Switch to Advanced Actuary & Underwriting Suite"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pro Suite →</span>
              </button>
            ) : (
              <button
                type="button"
                id="header-switch-to-customer-btn"
                onClick={() => onToggleExperienceMode('customer')}
                className="inline-flex md:hidden items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Customer</span>
              </button>
            )}

            {onOpenAICopilot && (
              <button
                type="button"
                id="header-ai-copilot-btn"
                onClick={onOpenAICopilot}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                title="Open AI Insurance Assistant"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={`Current theme: ${theme}. Click to cycle.`}
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Monitor className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
