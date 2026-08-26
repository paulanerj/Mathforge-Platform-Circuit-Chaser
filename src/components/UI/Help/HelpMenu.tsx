import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Lightbulb, 
  Compass, 
  HelpCircle, 
  Info, 
  Sparkles,
  Heart,
  EyeOff,
  Zap
} from 'lucide-react';
import { useTheme } from '../../../theme/useTheme';

interface HelpMenuProps {
  currentMode: string;
  onClose: () => void;
  onShowDemo?: (targetId: string) => void;
  onStartTutorial?: (id: any) => void;
  completedTutorials?: Record<string, boolean>;
  currentScreen?: string;
}

const GENERAL_TIPS = [
  "Choose the answer that solves the center problem. Speed and accuracy both build high multipliers!",
  "Pedagogical Fail-Safe is active by default. If you make a mistake, don't worry—the correct answer is highlighted in green, letting you recover and learn without double penalties.",
  "You can disable the Pedagogical Fail-Safe or sound effects anytime via the gear icon in the homepage settings menu.",
  "Check out the Lesson Builder on the home screen to customize step difficulties, operations ranges, and choose target modes.",
  "In Dark Mode, the answer grid is hidden. Keep an eye on the center coin and tap it repeatedly to match your math count!"
];

export const HelpMenu: React.FC<HelpMenuProps> = ({ 
  currentMode, 
  onClose, 
  onShowDemo,
  onStartTutorial,
  completedTutorials = {},
  currentScreen
}) => {
  const [activeTab, setActiveTab] = useState<'mode' | 'tutorials'>('mode');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % GENERAL_TIPS.length);
  };

  const getModeHelp = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'normal':
        return {
          title: "Normal Mode",
          description: "Solve the formula inside the central coin and select the correct value from the options displayed on the grid.",
          guideline: [
            "Calculate carefully: consecutive correct answers build your visual score multiplier.",
            "Pedagogical Fail-Safe is active: if you choose incorrectly, the grid enters correction mode. Follow the blinking green target to continue without standard penalties!"
          ],
          icon: <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
        };
      case 'qmm':
        return {
          title: "Quick Math Mode (QMM)",
          description: "Rapid-fire testing area prioritizing immediate mental calculations and visual recognition. Grid layouts are streamlined.",
          guideline: [
            "Focus primarily on the center value and the incoming mathematical modifiers.",
            "Timers are tighter, prompting quicker math reactions. Accuracy still preserves your progression streak!"
          ],
          icon: <Zap className="w-6 h-6 text-amber-500" />
        };
      case 'dark':
        return {
          title: "Dark Mode",
          description: "An offline rhythm-based testing flow wherein the visual AnswerGrid represents a blind region and remains hidden.",
          guideline: [
            "Use the center coin action directly! Tap the centered coin in the timing rhythm matching the math target.",
            "This mode encourages non-visual cognitive pacing. Do not try to look for grid options!"
          ],
          icon: <EyeOff className="w-6 h-6 text-indigo-500" />
        };
      case 'hidden':
        return {
          title: "Hidden Mode",
          description: "Critical math inputs or target factors are partially hidden, checking pure mental arithmetic and logical deduction.",
          guideline: [
            "Study the visible operational numbers and determine the obscured parameters.",
            "Your fail-safe system serves as a backstop here so you don't stall on tough puzzles."
          ],
          icon: <HelpCircle className="w-6 h-6 text-rose-500" />
        };
      case 'survival':
        return {
          title: "Survival Mode",
          description: "Every incorrect selection reduces active hearts/lives. Highly challenging environment designed for mastery.",
          guideline: [
            "Every error deducts a life. Keep highly focused on accuracy over speed.",
            "Success under pressure yields special multipliers. Use the Fail-Safe green highlight to study the missed answer safely before proceeding."
          ],
          icon: <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        };
      default:
        return {
          title: "Standard Mode Guide",
          description: "Analyze the mathematical questions displayed in the central core and choose its match in the options grid.",
          guideline: [
            "Take your time: developing conceptual intuition remains the highest priority.",
            "Explore default options or adjust variables directly in the homepage sidebar."
          ],
          icon: <Compass className="w-6 h-6 text-sky-500" />
        };
    }
  };

  const modeHelp = getModeHelp(currentMode);
  const theme = useTheme();

  return (
    <div 
      className="absolute inset-0 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ background: theme.tokens.panels.help.backdrop }}
      onClick={(e) => {
        // Prevent click-throughs from hitting elements underneath
        e.stopPropagation();
      }}
    >
      <div 
        className="rounded-3xl border-4 w-full max-w-lg p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        style={{
          background: theme.tokens.panels.help.panel.background,
          borderColor: theme.tokens.panels.help.panel.borderColor,
          boxShadow: theme.tokens.panels.help.panel.boxShadow,
          '--mf-help-header-divider': theme.tokens.panels.help.headerDividerColor,
          '--mf-help-footer-divider': theme.tokens.panels.help.footerDividerColor,
          '--mf-help-tab-bg': theme.tokens.panels.help.tabContainerBackground,
          '--mf-help-section-title': theme.tokens.panels.help.sectionTitleColor,
          '--mf-help-body-text': theme.tokens.panels.help.bodyTextColor,
          '--mf-help-muted-text': theme.tokens.panels.help.mutedTextColor
        } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[var(--mf-help-header-divider)] dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 
              className="text-2xl font-black uppercase tracking-tight"
              style={{ color: theme.tokens.panels.help.titleColor }}
            >
              Help & Guidance
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-6 h-6 text-slate-500 hover:text-slate-800 dark:hover:text-white" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1 bg-[var(--mf-help-tab-bg)] dark:bg-slate-800 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('mode')}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'mode'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Current Mode Help
          </button>
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'tutorials'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Tutorial List
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'mode' ? (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/40">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl shrink-0">
                  {modeHelp.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-indigo-900 dark:text-indigo-100 text-lg font-bold">{modeHelp.title}</h3>
                  <p className="text-[var(--mf-help-body-text)] dark:text-slate-300 text-sm leading-relaxed">{modeHelp.description}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-[var(--mf-help-section-title)] dark:text-slate-200 text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-500" />
                  Key Instructions
                </h4>
                <ul className="space-y-2">
                  {modeHelp.guideline.map((line, idx) => (
                    <li key={idx} className="flex gap-2 text-[var(--mf-help-body-text)] dark:text-slate-300 text-xs leading-relaxed">
                      <span className="text-indigo-500 font-bold shrink-0">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dynamic Quick Tip Box */}
              <div className="mt-2 bg-amber-50/70 dark:bg-amber-950/10 border-2 border-dashed border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Quick Tip
                  </div>
                  <button 
                    onClick={nextTip}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    Next Tip →
                  </button>
                </div>
                <p className="text-[var(--mf-help-body-text)] dark:text-slate-300 text-xs italic leading-relaxed">
                  "{GENERAL_TIPS[currentTipIndex]}"
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200 h-full min-h-[200px]">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-2">
                <BookOpen className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-[var(--mf-help-section-title)] dark:text-slate-200 text-lg font-black uppercase tracking-wider text-center">
                Training Guides
              </h3>
              <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-lg">
                Coming Soon
              </div>
              <p className="text-center text-[var(--mf-help-muted-text)] dark:text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
                Interactive guided lessons and training scripts are currently disabled while we upgrade the visual architecture.
              </p>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex gap-3 pt-3 border-t border-[var(--mf-help-footer-divider)] dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 sa-btn bg-emerald-500 text-white font-black uppercase tracking-wider rounded-xl py-3 text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md cursor-pointer text-center"
          >
            ▶ Resume Game
          </button>
        </div>
      </div>
    </div>
  );
};
