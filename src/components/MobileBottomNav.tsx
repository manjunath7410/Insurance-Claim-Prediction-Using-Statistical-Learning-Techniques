import React from 'react';
import {
  Activity,
  BarChart3,
  Layers,
  Clock,
  Sparkles,
  Settings as SettingsIcon,
  Database,
} from 'lucide-react';
import { TabType } from './Header';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'prediction', label: 'Predict', icon: Activity },
    { id: 'dataset', label: 'Upload', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'models', label: 'Models', icon: Layers },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'actuarial', label: 'Insights', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors">
      <nav className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`mobile-nav-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] py-1 transition-colors cursor-pointer ${
                isActive
                  ? 'text-blue-700 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-blue-50 dark:bg-blue-950/80 scale-105' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
