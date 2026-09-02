import React from 'react';
import {
  ShieldCheck,
  Activity,
  BarChart3,
  Layers,
  Clock,
  Sparkles,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  BookOpen,
  Database,
} from 'lucide-react';
import { ModelType } from '../types';

export type TabType = 'prediction' | 'dataset' | 'analytics' | 'models' | 'history' | 'actuarial' | 'settings';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  onOpenFormulas?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  theme,
  onToggleTheme,
  onOpenFormulas,
}) => {
  const navTabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'prediction', label: 'Prediction', icon: Activity },
    { id: 'dataset', label: 'Dataset Upload', icon: Database },
    { id: 'analytics', label: 'Portfolio Analytics', icon: BarChart3 },
    { id: 'models', label: 'Model Performance', icon: Layers },
    { id: 'history', label: 'Prediction History', icon: Clock },
    { id: 'actuarial', label: 'Actuarial Insights', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navbar */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div
            onClick={() => setActiveTab('prediction')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Insurance Claim Prediction
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Statistical GLM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Actuarial Risk &amp; Machine Learning Engine
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {onOpenFormulas && (
              <button
                type="button"
                onClick={onOpenFormulas}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="View Actuarial Mathematical Formulas & Defense"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Formulas</span>
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
