import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
  HelpCircle,
  TrendingDown,
  Car,
  HeartHandshake,
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  BarChart3,
  Database,
  Target,
  TrendingUp,
  Activity,
  FileText,
  GitCompare,
  Cpu,
} from 'lucide-react';

interface HomePageProps {
  onStartRiskCheck: () => void;
  onLearnMore?: () => void;
  onOpenAICopilot?: () => void;
  onNavigateToProPortal?: (proTab?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStartRiskCheck,
  onLearnMore,
  onOpenAICopilot,
  onNavigateToProPortal,
}) => {
  const proCapabilities = [
    {
      id: 'models',
      title: 'Statistical Model Comparisons',
      desc: 'GLM, GBDT Tweedie, and Two-Stage Hurdle loss model evaluations & metrics.',
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80',
    },
    {
      id: 'shap',
      title: 'SHAP Feature Importance',
      desc: 'Local TreeSHAP waterfall attributions, marginal feature impact & risk dossiers.',
      icon: Sparkles,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80',
    },
    {
      id: 'portfolio',
      title: 'Portfolio & Risk Analytics',
      desc: 'Loss ratio monitoring, exposure distributions, and cross-segment risk tiers.',
      icon: BarChart3,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80',
    },
    {
      id: 'csv-dataset',
      title: 'CSV Dataset Ingestion',
      desc: 'Bulk tabular dataset upload, schema validation, and automated batch scoring.',
      icon: Database,
      color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80',
    },
    {
      id: 'evaluation',
      title: 'Evaluation Metrics & Calibration',
      desc: 'ROC-AUC, PR-AUC, Brier score, ECE calibration & reliability diagrams.',
      icon: Target,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80',
    },
    {
      id: 'gini-lorenz',
      title: 'Gini & Lorenz Curves',
      desc: 'Lorenz inequality distributions, normalized Gini coefficient & underwriting lift.',
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80',
    },
    {
      id: 'diagnostics-drift',
      title: 'Data Drift Diagnostics',
      desc: 'Population Stability Index (PSI), Kolmogorov-Smirnov test & covariate shift.',
      icon: Activity,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80',
    },
    {
      id: 'audit-governance',
      title: 'Audit & Governance Logging',
      desc: 'Full underwriter decision audit trail, regulatory compliance & model registry.',
      icon: FileText,
      color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
    },
    {
      id: 'scenario',
      title: 'Scenario Studio (What-If)',
      desc: 'Interactive actuarial sensitivity simulation, discount tests & rate optimization.',
      icon: GitCompare,
      color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/80',
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-14 max-w-5xl mx-auto pb-12 px-3 sm:px-6">
      {/* HERO SECTION */}
      <section className="text-center pt-6 sm:pt-10 space-y-6">
        {/* Friendly trust badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-semibold tracking-wide shadow-xs">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Quick, Free &amp; Private Risk Assessment</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Understand Your Insurance Risk
        </h1>

        {/* Supporting Text */}
        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Check your estimated claim risk in a few simple steps.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <button
            type="button"
            id="hero-start-risk-check-btn"
            onClick={onStartRiskCheck}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-lg shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer group min-h-[56px] touch-manipulation"
          >
            <span>Start Risk Check →</span>
          </button>

          {onLearnMore && (
            <button
              type="button"
              id="hero-how-it-works-btn"
              onClick={onLearnMore}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[56px] touch-manipulation"
            >
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <span>How It Works</span>
            </button>
          )}
        </div>

        {/* Three Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-y-2.5 gap-x-6 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>100% Free &amp; Instant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>No Phone Numbers or Spam</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Takes Under 2 Minutes</span>
          </div>
        </div>
      </section>

      {/* THREE SIMPLE BENEFITS */}
      <section aria-label="Simple Benefits" className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Benefit 1 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              📝 Enter your insurance details
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tell us about your driving experience, vehicle type, and estimated annual mileage. No private identification numbers or passwords needed.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              📊 Get an estimated risk result
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Instantly see your personalized safety rating and an estimated fair price breakdown for your policy without waiting on hold.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              💡 Understand what affects your result
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              See what factors influence your insurance rate and discover actionable ways to lower your premium—such as certified safety devices and deductible options.
            </p>
          </div>
        </div>
      </section>

      {/* DEDICATED ADVANCED & PROFESSIONAL AREA (SPECIALIST SUITE) SECTION */}
      <section
        id="home-specialist-suite-section"
        className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-indigo-950/90 via-slate-900 to-slate-900 border border-indigo-900/60 shadow-xl text-white space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-900/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Advanced Actuary &amp; Underwriting Workspace</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Actuarial Specialist Suite
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Dedicated professional environment housing statistical models (GLM, GBDT Tweedie, Hurdle), SHAP attributions, portfolio analytics, CSV batch ingestion, calibration curves, drift monitoring, and scenario simulations.
            </p>
          </div>

          {onNavigateToProPortal && (
            <button
              type="button"
              id="home-open-specialist-workspace-btn"
              onClick={() => onNavigateToProPortal('models')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Launch Specialist Suite</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 9 Deep Capabilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {proCapabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => onNavigateToProPortal && onNavigateToProPortal(cap.id)}
                className="text-left p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${cap.color} transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                    Open <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* WHY DRIVERS USE THIS TOOL */}
      <section className="bg-slate-100/80 dark:bg-slate-900/60 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center sm:text-left">
          Why Drivers Use This Tool
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Find Potential Savings
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Discover which changes, such as adjusting collision deductibles or safe driving, reduce your estimated cost.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <HeartHandshake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Zero Pressure
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              No insurance sales agents calling or spamming you. You explore your risk score completely at your own pace.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <Car className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Clear &amp; Plain Language
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              No confusing insurance jargon. Everything is explained clearly so you understand what matters for your policy.
            </p>
          </div>
        </div>
      </section>

      {/* BOTTOM DISCLAIMER */}
      <section className="pt-2">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center max-w-3xl mx-auto leading-relaxed flex items-center justify-center gap-3">
          <Info className="w-5 h-5 text-slate-400 shrink-0 hidden sm:block" />
          <p>
            This tool provides an estimate based on the information provided and historical patterns. It does not guarantee whether a claim will occur, the amount of a claim, or the final insurance premium.
          </p>
        </div>
      </section>
    </div>
  );
};
