import React from 'react';
import { X, BookOpen, CheckCircle, Calculator, Sigma, Layers, Award } from 'lucide-react';

interface ActuarialFormulasModalProps {
  onClose: () => void;
}

export const ActuarialFormulasModal: React.FC<ActuarialFormulasModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Actuarial Mathematical Formulations & Final Year Project Defense Guide
              </h3>
              <p className="text-[11px] text-slate-400">
                Core Statistical Learning Equations for Insurance Loss Modeling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-300 text-xs leading-relaxed">
          {/* Section 1: The Insurance Data Challenge */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" /> 1. The Fundamental Statistical Problem in Insurance
            </h4>
            <p>
              Standard OLS Linear Regression fails on insurance claim datasets for two key reasons:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-300">
              <li>
                <strong className="text-white">Zero-Inflation (Point mass at zero):</strong> Approximately 90–95% of policyholders file zero claims (Y = 0).
              </li>
              <li>
                <strong className="text-white">Heavy Right-Skewed Losses:</strong> Claim severity (Y | Y &gt; 0) follows a positive, continuous, right-skewed distribution (e.g. Gamma or Lognormal) where variance scales quadratically with the mean: Var(Y) = φ * μ².
              </li>
            </ul>
          </div>

          {/* Section 2: Mathematical Formulations of the 4 Models */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sigma className="w-4 h-4 text-indigo-400" /> 2. Model Mathematical Formulations
            </h4>

            {/* Model A: GLM */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-indigo-300 text-xs">A. Generalized Linear Model (GLM)</h5>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">Actuarial Benchmark</span>
              </div>
              <p>
                In a GLM, the response variable Y follows an exponential dispersion family. The mean μ = E(Y) is linked to linear predictors via monotonic link function g(·):
              </p>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-center text-blue-300 text-[11px]">
                {"Frequency: logit(p) = Xβ + ln(Exposure)   |   Severity: ln(μ_sev) = Xγ"}
              </div>
            </div>

            {/* Model B: Tweedie GBDT */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-blue-300 text-xs">B. Gradient Boosting with Tweedie Loss (LightGBM / XGBoost)</h5>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">Highest Accuracy</span>
              </div>
              <p>
                The Tweedie distribution models compound Poisson-Gamma processes where variance power p ∈ (1, 2). The unit deviance minimized by the gradient boosting tree is:
              </p>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-center text-emerald-300 text-[11px]">
                {"d(y, μ) = 2 * [ y^(2-p)/((1-p)(2-p)) - (y * μ^(1-p))/(1-p) + μ^(2-p)/(2-p) ]"}
              </div>
            </div>

            {/* Model C: Two-Stage Hurdle Model */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-emerald-300 text-xs">C. Two-Stage Actuarial Hurdle Model</h5>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Hurdle Separation</span>
              </div>
              <p>
                Total Expected Loss (Pure Premium μ) is partitioned into two independent stages:
              </p>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-center text-amber-300 text-[11px]">
                {"E(Loss) = P(Y > 0) * E(Y | Y > 0) = Logistic(Xβ) * Gamma(Xγ)"}
              </div>
            </div>
          </div>

          {/* Section 3: Evaluation Metrics for Insurance */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> 3. Why Gini & Deviance (Not Just Accuracy)?
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <strong className="text-white block mb-1">Normalized Gini Index:</strong>
                <p className="text-[11px] text-slate-400">
                  {"Measures the area between the Lorenz curve and the equality diagonal: G = 1 - 2 * ∫ L(p) dp. Superior at sorting risk cohorts."}
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <strong className="text-white block mb-1">Brier Score Calibration:</strong>
                <p className="text-[11px] text-slate-400">
                  {"Decomposes mean squared probability error into Reliability - Resolution + Uncertainty. Ensures probabilities reflect true frequencies."}
                </p>
              </div>
            </div>
          </div>

          {/* Viva Defense Cheatsheet */}
          <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              🎓 Final Year Viva Defense Quick-Answers:
            </h4>
            <div className="space-y-2 text-[11px]">
              <div>
                <strong className="text-white">Q: Why did you pick Gradient Boosting with Tweedie loss?</strong>
                <p className="text-slate-300">
                  A: "Because insurance claims feature compound Poisson-Gamma distributions with high zero-inflation. Tweedie loss ($p \approx 1.5$) handles zero frequency and non-negative continuous severity in a single unified loss objective without arbitrary thresholding."
                </p>
              </div>
              <div>
                <strong className="text-white">Q: How do you interpret black-box tree predictions for regulatory compliance?</strong>
                <p className="text-slate-300">
                  A: "We integrated TreeSHAP (Shapley Additive Explanations), providing mathematically guaranteed additive feature attribution ($f(x) = \phi_0 + \sum \phi_i$) for individual policyholder risk scores."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
