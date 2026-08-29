import React from 'react';
import { SHAPFeatureContribution } from '../types';
import { ArrowUpRight, ArrowDownRight, Info, Sparkles } from 'lucide-react';

interface ShapAttributionViewProps {
  attributions: SHAPFeatureContribution[];
  baseClaimRate: number;
}

export const ShapAttributionView: React.FC<ShapAttributionViewProps> = ({
  attributions,
  baseClaimRate,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              SHAP Model Explainability & Factor Attribution
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Additive Risk Drivers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Decomposes the prediction relative to the baseline market frequency of {baseClaimRate}%
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {attributions.map((attr, idx) => {
          const isRiskIncrease = attr.direction === 'increases_risk';
          const absImpact = Math.abs(attr.impactPercent);
          const barWidthPercent = Math.min(100, Math.max(8, (absImpact / 25) * 100));

          return (
            <div
              key={idx}
              className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200">{attr.displayName}</span>
                  <span className="text-slate-400 font-mono text-[11px] bg-slate-800/60 px-1.5 py-0.5 rounded">
                    {attr.value}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-semibold">
                  {isRiskIncrease ? (
                    <span className="text-rose-400 flex items-center text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                      +{attr.impactPercent}% Risk
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center text-xs">
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                      {attr.impactPercent}% Discount
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Attribution Bar */}
              <div className="w-full bg-slate-800/60 h-2 rounded-full overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isRiskIncrease
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                <span>{attr.description}</span>
                <span className="text-slate-400 font-mono">|ΔP| = {absImpact}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
