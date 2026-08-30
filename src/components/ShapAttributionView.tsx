import React from 'react';
import { SHAPFeatureContribution } from '../types';
import { ArrowUpRight, ArrowDownRight, Info, BarChart2 } from 'lucide-react';

interface ShapAttributionViewProps {
  attributions: SHAPFeatureContribution[];
  baseClaimRate: number;
}

export const ShapAttributionView: React.FC<ShapAttributionViewProps> = ({
  attributions,
  baseClaimRate,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              SHAP Attribution Waterfall
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-medium">
              Additive Drivers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Decomposes the predicted probability relative to the benchmark portfolio baseline frequency ({baseClaimRate.toFixed(1)}%).
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {attributions.map((attr, idx) => {
          const isRiskIncrease = attr.direction === 'increases_risk';
          const absImpact = Math.abs(attr.impactPercent);
          const barWidthPercent = Math.min(100, Math.max(6, (absImpact / 25) * 100));

          return (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-200">{attr.displayName}</span>
                  <span className="text-slate-300 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {attr.value}
                  </span>
                </div>
                <div className="flex items-center space-x-1 font-semibold font-mono">
                  {isRiskIncrease ? (
                    <span className="text-rose-400 flex items-center text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                      +{attr.impactPercent}% Risk
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center text-xs">
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                      {attr.impactPercent}% Discount
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Attribution Bar with disciplined solid color */}
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex items-center border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isRiskIncrease ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                <span className="truncate mr-2">{attr.description}</span>
                <span className="text-slate-400 font-mono shrink-0">|ΔP| = {absImpact}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
