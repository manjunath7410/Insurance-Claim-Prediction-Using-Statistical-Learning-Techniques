import React, { useState } from 'react';
import {
  HelpCircle,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Car,
  CheckCircle2,
  ChevronDown,
  BookOpen,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';

interface HelpAboutPageProps {
  onStartRiskCheck: () => void;
  onOpenAICopilot: () => void;
  onOpenFormulasModal?: () => void;
  onNavigateToProTools?: () => void;
}

export const HelpAboutPage: React.FC<HelpAboutPageProps> = ({
  onStartRiskCheck,
  onOpenAICopilot,
  onOpenFormulasModal,
  onNavigateToProTools,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How is my auto insurance risk calculated?',
      answer:
        'Your insurance risk is based on two straightforward factors: 1) the chance of getting into an accident or filing a claim during the year (accident frequency), and 2) the expected cost to repair or replace your vehicle if an accident happens (claim severity). We look at real historical driving data—like your driving experience, vehicle value, miles driven, and claim history—to find a fair, accurate estimate.',
    },
    {
      question: 'What do the risk categories (Low, Standard, High) mean?',
      answer:
        '• Low Risk (Preferred): Experienced drivers with clean records and safe vehicles. Qualifies for the lowest rates and best discounts.\n• Standard Risk: Everyday drivers with typical commuting miles and minor or no claims. Standard competitive pricing applies.\n• Elevated Risk: Often newer drivers, high annual miles, or drivers with recent claims or violations. Tips are provided to help lower this risk over time.',
    },
    {
      question: 'How can I lower my insurance rate right now?',
      answer:
        'You can lower your premium in several easy ways:\n1. Choose a higher collision deductible (e.g. going from $500 to $1,000 often saves 10-15%).\n2. Install an anti-theft GPS tracker or safety device.\n3. Drive fewer annual miles or carpool when possible.\n4. Keep a clean driving record free of moving violations or at-fault accidents.',
    },
    {
      question: 'What is a collision deductible and how do I choose one?',
      answer:
        'A deductible is the amount you agree to pay out-of-pocket before insurance covers the remainder of a covered repair. For example, if you have a $500 deductible and a $3,000 repair, you pay $500 and insurance pays $2,500. Choosing a higher deductible lowers your annual payment because you take on a slightly larger share of minor fender benders.',
    },
    {
      question: 'Does checking my risk hurt my insurance credit score?',
      answer:
        'Not at all. This tool is completely free, anonymous, and does not perform a hard credit pull. It simply uses the general credit tier you select to give an accurate rate range.',
    },
    {
      question: 'Why do vehicle values and types affect the price?',
      answer:
        'If a luxury sports car or large commercial vehicle is damaged, parts and specialty labor cost significantly more than standard economy sedans or compact SUVs. The higher the vehicle value and repair complexity, the higher the replacement coverage cost.',
    },
  ];

  const glossaryItems = [
    {
      term: 'Premium',
      definition:
        'The amount you pay to keep your auto insurance policy active, typically billed annually or divided into monthly payments.',
    },
    {
      term: 'Deductible',
      definition:
        'The out-of-pocket amount you pay toward vehicle repairs before your insurance coverage pays the rest.',
    },
    {
      term: 'Anti-Theft / Telematics',
      definition:
        'Safety devices like GPS tracking, immobilizers, or safe-driving sensors that alert emergency services or deter vehicle theft, earning insurance discounts.',
    },
    {
      term: 'Comprehensive Coverage',
      definition:
        'Insurance that protects your car against non-collision damage such as theft, vandalism, weather, windshield damage, or hitting an animal.',
    },
    {
      term: 'Clean Record',
      definition:
        'Having 0 at-fault accidents and 0 moving violations over the past 3 to 5 years, which unlocks top-tier safe driver discounts.',
    },
  ];

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-900">
          <HelpCircle className="w-4 h-4" />
          <span>Help &amp; Education Center</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Everything you need to know about your rate
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Clear, straightforward answers without confusing insurance jargon or mathematical formulas.
        </p>
      </div>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Frequently Asked Questions</span>
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                >
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 whitespace-pre-line">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* PLAIN-ENGLISH GLOSSARY */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Common Insurance Words in Plain English</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {glossaryItems.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
            >
              <div className="font-extrabold text-sm text-blue-600 dark:text-blue-400">
                {item.term}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.definition}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AI ASSISTANT CARD */}
      <section className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 text-white shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <h3 className="text-lg font-black">Still have a specific question?</h3>
        </div>
        <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
          Ask our AI Underwriting Copilot anything about your situation in everyday conversation. It can explain why your rate changed or suggest how to save.
        </p>
        <button
          type="button"
          onClick={onOpenAICopilot}
          className="px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-indigo-900 font-extrabold text-xs transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Ask AI Assistant</span>
        </button>
      </section>

      {/* CTA TO RETURN TO CHECK RISK */}
      <div className="text-center pt-4 space-y-3">
        <button
          type="button"
          onClick={onStartRiskCheck}
          className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Ready? Start Your Risk Check</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {onNavigateToProTools && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateToProTools}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Looking for specialist underwriting tools &amp; diagnostics? Switch to Pro Area →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
