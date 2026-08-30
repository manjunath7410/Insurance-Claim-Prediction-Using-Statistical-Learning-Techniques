import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Sliders,
  Shield,
  Download,
  RotateCcw,
  Check,
  Percent,
  DollarSign,
  Bell,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface SettingsPageProps {
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (newTheme: 'light' | 'dark' | 'system') => void;
  decisionThreshold?: number;
  onDecisionThresholdChange?: (val: number) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  theme,
  onThemeChange,
  decisionThreshold = 8.0,
  onDecisionThresholdChange,
}) => {
  const [threshold, setThreshold] = useState<number>(decisionThreshold);
  const [baseRate, setBaseRate] = useState<number>(5.0);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [currency, setCurrency] = useState<string>('USD');
  const [saveBanner, setSaveBanner] = useState<boolean>(false);

  const handleSavePreferences = () => {
    if (onDecisionThresholdChange) {
      onDecisionThresholdChange(threshold);
    }
    localStorage.setItem('pref_threshold', threshold.toString());
    localStorage.setItem('pref_base_rate', baseRate.toString());
    localStorage.setItem('pref_auto_save', autoSave.toString());
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  const handleResetDefaults = () => {
    setThreshold(8.0);
    setBaseRate(5.0);
    setAutoSave(true);
    setCurrency('USD');
    onThemeChange('light');
    if (onDecisionThresholdChange) onDecisionThresholdChange(8.0);
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Application Preferences
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Settings &amp; Configuration
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Customize appearance, underwriting decision cutoffs, loss baselines, and data exports.
            </p>
          </div>
        </div>
      </div>

      {saveBanner && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      {/* 1. Theme Selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Interface Theme &amp; Appearance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select your preferred visual mode
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/30'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Sun className="w-6 h-6 text-amber-500" />
            <span className="text-xs font-bold">Light (Modern Standard)</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
              Clean white cards with high contrast text
            </span>
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/30'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Moon className="w-6 h-6 text-indigo-400" />
            <span className="text-xs font-bold">Dark Mode</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
              Deep navy slate for low-light environments
            </span>
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('system')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === 'system'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/30'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Monitor className="w-6 h-6 text-slate-500" />
            <span className="text-xs font-bold">System Default</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
              Follows your operating system theme
            </span>
          </button>
        </div>
      </div>

      {/* 2. Actuarial Decision Thresholds */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Underwriting Thresholds &amp; Baselines
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure action trigger cutoffs for automated underwriting flags
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Production Action Threshold (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Policies with probability &ge; {threshold}% will trigger underwriting surcharge or review.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Portfolio Base Claim Rate (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                max="30"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Benchmark historical loss frequency across all market segments.
            </p>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-save-toggle"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="auto-save-toggle" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Automatically persist all predictions to audit history
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>

        <button
          type="button"
          onClick={handleSavePreferences}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};
