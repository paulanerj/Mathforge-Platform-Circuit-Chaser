/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { PracticePlanController } from '../../services/practicePlanController';

import { useTheme } from '../../theme/useTheme';

interface StartScreenProps {
  state: any;
  actions: any;
  setIsOptionsOpen: (v: boolean) => void;
  config: any;
  onNavigate: (s: 'home' | 'play_menu' | 'lesson_builder' | 'progress' | 'skill_map' | 'child_dashboard' | 'instructor_portal' | 'playing' | 'circuit_climb') => void;
}

export const StartScreen = ({ state, actions, onNavigate, setIsOptionsOpen, config }: StartScreenProps) => {
  const theme = useTheme();
  const [hasActiveLesson, setHasActiveLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');

  useEffect(() => {
    if (PracticePlanController.hasActiveSession()) {
      setHasActiveLesson(true);
      setLessonTitle(PracticePlanController.getCurrentPlan()?.title || '');
    }
  }, []);

  const resumeLesson = () => {
    const level = PracticePlanController.getCurrentLevel();
    if (level) {
      const newConfig = PracticePlanController.mapLevelToAppConfig(level, config);
      actions.setConfig(newConfig);
      actions.startGame(newConfig);
      onNavigate('playing');
    }
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto"
      style={{ background: theme.tokens.startScreen.mainPanel.background }}
    >
      <div className="z-10 flex flex-col items-center text-center text-slate-800 w-full max-w-sm my-auto">
        
        {/* SECTION 1 — TITLE */}
        <div className="flex justify-center items-center py-4 mb-8">
          <h1 
            className="tracking-tight mathforge-title"
            style={{ 
              animation: 'enterUp 0.5s ease-out 0.1s both',
              textShadow: theme.tokens.startScreen.title.textShadow 
            }}
          >
            MathForge
          </h1>
        </div>
        
        {state.initError && (
          <div className="w-full max-w-md sa-card p-4 mb-8 text-sm leading-snug border-red-200 bg-red-50">
            <div className="font-black mb-1 text-red-600 uppercase tracking-widest text-[10px]">Error</div>
            <div className="opacity-90 mb-0 font-bold text-red-800">{state.initError}</div>
          </div>
        )}
        
        <div className="flex flex-col gap-4 w-full">
          {hasActiveLesson && (
            <button
              onClick={resumeLesson}
              className="splash-card w-full bg-[var(--mf-start-card-bg)] border-[var(--mf-start-card-border)] text-[var(--mf-start-card-text)] hover:bg-emerald-700 text-left flex flex-col gap-1 border cursor-pointer"
              style={{ 
                animation: 'enterUp 0.5s ease-out 0.15s both',
                boxShadow: theme.tokens.startScreen.splashCard.boxShadow,
                '--mf-start-card-bg': theme.tokens.startScreen.splashCard.variants.resumeBackground,
                '--mf-start-card-border': theme.tokens.startScreen.splashCard.variants.resumeBorder,
                '--mf-start-card-text': theme.tokens.startScreen.splashCard.variants.resumeText
              } as React.CSSProperties}
            >
              <div className="text-xl font-black">Resume Lesson</div>
              <div className="text-sm font-medium opacity-90">{lessonTitle}</div>
            </button>
          )}

          {/* SECTION 2 — PRIMARY CARD */}
          <button
            onClick={() => onNavigate('play_menu')}
            className="splash-card w-full bg-[var(--mf-start-card-bg)] border-[var(--mf-start-card-border)] text-[var(--mf-start-card-text)] hover:bg-blue-700 hover:text-white text-left flex flex-col gap-1 border cursor-pointer"
            style={{ 
              animation: 'enterUp 0.5s ease-out 0.2s both',
              boxShadow: theme.tokens.startScreen.splashCard.boxShadow,
              '--mf-start-card-bg': hasActiveLesson ? theme.tokens.startScreen.splashCard.variants.primaryActiveBackground : theme.tokens.startScreen.splashCard.variants.primaryNewBackground,
              '--mf-start-card-border': hasActiveLesson ? theme.tokens.startScreen.splashCard.variants.primaryActiveBorder : theme.tokens.startScreen.splashCard.variants.primaryNewBorder,
              '--mf-start-card-text': hasActiveLesson ? theme.tokens.startScreen.splashCard.variants.primaryActiveText : theme.tokens.startScreen.splashCard.variants.primaryNewText
            } as React.CSSProperties}
          >
            <div className="text-xl font-black">{hasActiveLesson ? 'Start New Training' : 'Continue Training'}</div>
            <div className="text-sm font-medium opacity-90">Pick up where you left off</div>
          </button>

          {/* SECTION 3 — SECONDARY CARD */}
          <button
            onClick={() => setIsOptionsOpen(true)}
            data-guide-id="settings-button"
            className="splash-card w-full bg-[var(--mf-start-card-bg)] border-[var(--mf-start-card-border)] text-[var(--mf-start-card-text)] hover:bg-white flex flex-col gap-1 text-left border cursor-pointer"
            style={{ 
              animation: 'enterUp 0.5s ease-out 0.3s both',
              boxShadow: theme.tokens.startScreen.splashCard.boxShadow,
              '--mf-start-card-bg': theme.tokens.startScreen.splashCard.variants.secondaryBackground,
              '--mf-start-card-border': theme.tokens.startScreen.splashCard.variants.secondaryBorder,
              '--mf-start-card-text': theme.tokens.startScreen.splashCard.variants.secondaryText
            } as React.CSSProperties}
          >
            <div className="text-lg font-black text-slate-700">Free Practice</div>
            <div className="text-sm font-medium text-slate-500">Choose what to practice</div>
          </button>

          {/* SECTION 4 — INSTRUCTOR CARD */}
          <button
            onClick={() => onNavigate('instructor_portal')}
            className="splash-card w-full bg-[var(--mf-start-card-bg)] border-[var(--mf-start-card-border)] text-[var(--mf-start-card-text)] hover:bg-slate-50 flex flex-col gap-1 text-left border mt-2 cursor-pointer"
            style={{ 
              animation: 'enterUp 0.5s ease-out 0.4s both',
              boxShadow: theme.tokens.startScreen.splashCard.boxShadow,
              '--mf-start-card-bg': theme.tokens.startScreen.splashCard.variants.tertiaryBackground,
              '--mf-start-card-border': theme.tokens.startScreen.splashCard.variants.tertiaryBorder,
              '--mf-start-card-text': theme.tokens.startScreen.splashCard.variants.tertiaryText
            } as React.CSSProperties}
          >
            <div className="text-lg font-black text-slate-700">Instructor Portal</div>
            <div className="text-sm font-medium text-slate-500">Build lessons and track progress</div>
          </button>

          {/* SECTION 5 — CIRCUIT CLIMB EXPERIMENTAL CARD */}
          <button
            onClick={() => onNavigate('circuit_climb')}
            className="splash-card w-full bg-slate-900 border-indigo-500 text-white hover:bg-slate-800 flex flex-col gap-1 text-left border mt-2 cursor-pointer shadow-xl relative overflow-hidden"
            style={{ 
              animation: 'enterUp 0.5s ease-out 0.5s both',
            } as React.CSSProperties}
          >
            <div className="absolute top-0 right-0 bg-indigo-600 text-[10px] font-black tracking-widest px-2 py-1 uppercase rounded-bl-lg">Experimental</div>
            <div className="text-lg font-black text-indigo-300">Circuit Climb</div>
            <div className="text-sm font-medium text-slate-400">Prototype vertical platformer</div>
          </button>
        </div>
      </div>
    </div>
  );
};
