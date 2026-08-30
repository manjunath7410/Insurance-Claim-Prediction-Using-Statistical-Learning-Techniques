import React from 'react';

export type RiskLevelType = 'LOW' | 'STANDARD' | 'MEDIUM' | 'ELEVATED' | 'HIGH' | 'VERY_HIGH' | 'CRITICAL';

interface RiskBadgeProps {
  level: string | RiskLevelType;
  probabilityPercent?: number;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function normalizeRiskLevel(level: string, prob?: number): {
  key: 'LOW' | 'STANDARD' | 'ELEVATED' | 'HIGH';
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotBg: string;
  description: string;
} {
  const norm = (level || '').toUpperCase().trim();

  // If probability is passed, categorize precisely by 4 tiers:
  // LOW < 4%, STANDARD 4% - <8%, ELEVATED 8% - <16%, HIGH >= 16%
  if (prob !== undefined) {
    if (prob < 4.0) {
      return {
        key: 'LOW',
        label: 'LOW RISK',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
        dotBg: 'bg-emerald-500',
        description: 'Estimated claim probability is well below average. Standard rate with preferred discount eligible.',
      };
    } else if (prob < 8.0) {
      return {
        key: 'STANDARD',
        label: 'STANDARD RISK',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
        badgeText: 'text-blue-700 dark:text-blue-300',
        badgeBorder: 'border-blue-200 dark:border-blue-800/60',
        dotBg: 'bg-blue-500',
        description: 'Estimated claim probability is within standard underwriting tolerance. Standard pricing approval.',
      };
    } else if (prob < 16.0) {
      return {
        key: 'ELEVATED',
        label: 'ELEVATED RISK',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
        badgeText: 'text-amber-700 dark:text-amber-300',
        badgeBorder: 'border-amber-200 dark:border-amber-800/60',
        dotBg: 'bg-amber-500',
        description: 'Estimated probability exceeds action threshold. Underwriting surcharge or deductible increase recommended.',
      };
    } else {
      return {
        key: 'HIGH',
        label: 'HIGH RISK',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
        badgeText: 'text-rose-700 dark:text-rose-300',
        badgeBorder: 'border-rose-200 dark:border-rose-800/60',
        dotBg: 'bg-rose-500',
        description: 'High loss frequency propensity. Mandatory underwriting escalation or secondary risk inspection.',
      };
    }
  }

  if (norm.includes('LOW')) {
    return {
      key: 'LOW',
      label: 'LOW RISK',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
      dotBg: 'bg-emerald-500',
      description: 'Estimated claim probability is below 4.0%. Eligible for preferred rate discounts.',
    };
  } else if (norm.includes('MED') || norm.includes('STAND')) {
    return {
      key: 'STANDARD',
      label: 'STANDARD RISK',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
      badgeText: 'text-blue-700 dark:text-blue-300',
      badgeBorder: 'border-blue-200 dark:border-blue-800/60',
      dotBg: 'bg-blue-500',
      description: 'Estimated claim probability is between 4.0% and 8.0%. Standard underwriting approval.',
    };
  } else if (norm.includes('ELEV')) {
    return {
      key: 'ELEVATED',
      label: 'ELEVATED RISK',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
      badgeText: 'text-amber-700 dark:text-amber-300',
      badgeBorder: 'border-amber-200 dark:border-amber-800/60',
      dotBg: 'bg-amber-500',
      description: 'Estimated claim probability is between 8.0% and 16.0%. Surcharge recommended.',
    };
  } else {
    return {
      key: 'HIGH',
      label: 'HIGH RISK',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
      badgeText: 'text-rose-700 dark:text-rose-300',
      badgeBorder: 'border-rose-200 dark:border-rose-800/60',
      dotBg: 'bg-rose-500',
      description: 'Estimated claim probability is 16.0% or higher. Escalated actuarial review required.',
    };
  }
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  probabilityPercent,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  const info = normalizeRiskLevel(level, probabilityPercent);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-semibold gap-1.5',
    md: 'px-2.5 py-1 text-xs font-semibold gap-2',
    lg: 'px-3.5 py-1.5 text-sm font-bold gap-2.5',
  }[size];

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder} ${sizeClasses} ${className} whitespace-nowrap transition-colors`}
    >
      {showDot && (
        <span
          className={`${dotSizes} rounded-full ${info.dotBg} shrink-0`}
          aria-hidden="true"
        />
      )}
      <span>{info.label}</span>
    </span>
  );
};
