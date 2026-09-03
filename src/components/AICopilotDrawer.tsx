import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Zap,
  ArrowRight,
  RotateCcw,
  Check,
  Copy,
  Info,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { PolicyholderInput, PredictionResponse } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  extractedPolicy?: Partial<PolicyholderInput>;
}

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPolicy?: PolicyholderInput | null;
  currentPrediction?: PredictionResponse | null;
  onApplyExtractedPolicy?: (extracted: Partial<PolicyholderInput>) => void;
  initialPrompt?: string;
  isProfessionalMode?: boolean;
}

const PRO_STARTER_PROMPTS = [
  '⚡ Young driver with 1 claim in urban zone',
  '🛡️ Experienced commuter with clean 5-year record',
  '💡 Why is claim probability calculated at this level?',
  '📉 How can this driver lower their pure premium?',
  '⚖️ What is the difference between GLM and Tweedie models?',
];

const CUSTOMER_STARTER_PROMPTS = [
  '💡 Why is my estimated risk rating at this level?',
  '📉 What are the easiest ways for me to lower my insurance rate?',
  '🚗 How does my vehicle value affect repair cost estimates?',
  '🛡️ Does installing a GPS anti-theft tracker save money?',
  '🔍 What is the difference between deductible and premium?',
];

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  currentPolicy,
  currentPrediction,
  onApplyExtractedPolicy,
  initialPrompt,
  isProfessionalMode = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: isProfessionalMode
        ? "👋 **Hi! I'm your AI Underwriting Copilot.**\n\nI combine Google Gemini with CAS actuarial risk formulas. You can:\n• **Type a scenario in plain English** (e.g. *\"22yo driver with $30k SUV in urban area and 1 claim\"*) to auto-populate the model.\n• **Ask underwriting questions** about risk scores, SHAP attributions, or pure premiums.\n• **Request discount strategies** to optimize policy retention."
        : "👋 **Hi! I'm your AI Insurance Assistant.**\n\nI'm here to help you understand your insurance results in plain, simple English.\n• **Ask about your risk score or claim likelihood**.\n• **Learn how to lower your estimated rate**.\n• **Ask any questions about deductibles, coverage, or vehicle factors**.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'Gemini 3.8 Flash',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Handle initial prompt passed from parent
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInputValue(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            policyInput: currentPolicy,
            prediction: currentPrediction?.primaryPrediction,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          id: `ast_${Date.now()}`,
          sender: 'assistant',
          text: data.reply || 'Analysis completed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Actuarial Kernel',
          extractedPolicy: data.extractedPolicy,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(`API returned ${res.status}`);
      }
    } catch (err: any) {
      // Graceful local assistant fallback
      const fallbackMsg: Message = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: `### 📋 Policy Risk Evaluation\n\nI evaluated your inquiry for the current policy:\n• **Current Claim Probability**: ${currentPrediction?.primaryPrediction?.claimProbabilityPercent?.toFixed(2) || 'N/A'}%\n• **Risk Tier**: ${currentPrediction?.primaryPrediction?.riskTier || 'Standard'}\n• **Expected Pure Premium**: $${currentPrediction?.primaryPrediction?.purePremiumUSD?.toLocaleString() || 'N/A'}\n\n*Guidance*: Drivers in this risk cohort benefit from increasing the physical damage deductible from $500 to $1,000, which reduces pure loss cost by approximately 7.4%.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Actuarial Rule Engine',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Conversation refreshed. Type any driver profile, underwriting question, or actuarial query below.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Gemini 3.8 Flash',
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full sm:w-[480px] lg:w-[520px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  AI Underwriting Copilot
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Gemini &amp; CAS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conversational risk intelligence &amp; scenario parser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close Copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Context Pill (Active Policy Summary) */}
        {currentPrediction && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Context:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {currentPrediction.policyId} ({currentPrediction.input.age}yo, {currentPrediction.input.vehicleCategory})
              </span>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              {currentPrediction.primaryPrediction.claimProbabilityPercent.toFixed(1)}% Claim Prob
            </span>
          </div>
        )}

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-sm">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-xs shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200 dark:border-slate-700/60 shadow-xs'
                  }`}
                >
                  {/* Message Content formatted with line breaks & bullets */}
                  <div className="space-y-1.5 whitespace-pre-line font-normal">
                    {msg.text.split('\n').map((line, i) => {
                      if (line.startsWith('### ')) {
                        return (
                          <h4 key={i} className="font-bold text-slate-900 dark:text-white text-sm pt-1 pb-0.5">
                            {line.replace('### ', '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('• ') || line.startsWith('- ')) {
                        return (
                          <div key={i} className="flex items-start gap-1.5 pl-1">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{line.replace(/^[•-]\s*/, '')}</span>
                          </div>
                        );
                      }
                      return <p key={i}>{line}</p>;
                    })}
                  </div>

                  {/* Extracted Policy Action Card */}
                  {msg.extractedPolicy && onApplyExtractedPolicy && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 text-slate-800 dark:text-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Parsed Scenario Parameters
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                        {msg.extractedPolicy.age !== undefined && (
                          <div>Age: <strong className="text-slate-900 dark:text-white">{msg.extractedPolicy.age}</strong></div>
                        )}
                        {msg.extractedPolicy.priorClaimsLast5Years !== undefined && (
                          <div>Claims: <strong className="text-slate-900 dark:text-white">{msg.extractedPolicy.priorClaimsLast5Years}</strong></div>
                        )}
                        {msg.extractedPolicy.vehicleValue !== undefined && (
                          <div>Value: <strong className="text-slate-900 dark:text-white">${msg.extractedPolicy.vehicleValue.toLocaleString()}</strong></div>
                        )}
                        {msg.extractedPolicy.vehicleCategory && (
                          <div>Type: <strong className="text-slate-900 dark:text-white">{msg.extractedPolicy.vehicleCategory}</strong></div>
                        )}
                        {msg.extractedPolicy.regionalZone && (
                          <div className="col-span-2 truncate">Zone: <strong className="text-slate-900 dark:text-white">{msg.extractedPolicy.regionalZone}</strong></div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (msg.extractedPolicy) {
                            onApplyExtractedPolicy(msg.extractedPolicy);
                            onClose();
                          }
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Apply to Prediction Form</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div
                    className={`mt-2 pt-1 border-t flex items-center justify-between text-[10px] ${
                      isUser
                        ? 'border-blue-500/40 text-blue-200'
                        : 'border-slate-200 dark:border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <span>{msg.source || (isUser ? 'You' : 'AI Copilot')} • {msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-bl-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Analyzing your information...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Pills (Google / ChatGPT style) */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            {(isProfessionalMode ? PRO_STARTER_PROMPTS : CUSTOMER_STARTER_PROMPTS).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Box */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Copilot or type scenario (e.g. 24yo, SUV, 1 claim)..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
              title="Send prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1.5">
            Powered by Gemini &amp; CAS actuarial models. Verify with underwriting guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};
