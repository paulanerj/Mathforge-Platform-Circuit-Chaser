/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PracticePlanController } from '../../services/practicePlanController';
import { useTheme } from '../../theme/useTheme';

export const PauseOverlay = ({ 
  state, 
  actions,
  onBackToLessonPlan,
  onExitToHome
}: { 
  state: any; 
  actions: any;
  onBackToLessonPlan?: () => void;
  onExitToHome?: () => void;
}) => {
  const theme = useTheme();

  if (!(state.isPaused && state.status === 'playing')) return null;
  
  const hasActivePlan = !!PracticePlanController.getCurrentPlan();

  return (
    <div
      className="absolute inset-0 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      style={{ background: theme.tokens.panels.pause.backdrop }}
    >
      <div 
        className="p-8 rounded-3xl border-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 min-w-[280px]"
        style={{
          background: theme.tokens.panels.pause.panel.background,
          borderColor: theme.tokens.panels.pause.panel.borderColor,
          boxShadow: theme.tokens.panels.pause.panel.boxShadow
        }}
      >
        <div 
          className="text-3xl font-black tracking-widest mb-4 text-center uppercase"
          style={{ color: theme.tokens.panels.pause.titleColor }}
        >
          PAUSED
        </div>
        
        <button 
          onClick={actions.togglePause}
          className="w-full sa-btn font-black uppercase tracking-widest rounded-xl py-4 hover:scale-105 transition-transform"
          style={{ backgroundColor: theme.tokens.panels.pause.buttons.resumeButtonBackground, color: theme.tokens.panels.pause.buttons.buttonTextColor }}
        >
          ▶ Resume
        </button>

        <button 
          onClick={() => actions.startGame()}
          className="w-full sa-btn font-black uppercase tracking-widest rounded-xl py-4 hover:scale-105 transition-transform"
          style={{ backgroundColor: theme.tokens.panels.pause.buttons.restartButtonBackground, color: theme.tokens.panels.pause.buttons.buttonTextColor }}
        >
          ↺ Restart Activity
        </button>

        {hasActivePlan && onBackToLessonPlan && (
          <button 
            onClick={() => {
              onBackToLessonPlan();
            }}
            className="w-full sa-btn font-black uppercase tracking-widest rounded-xl py-4 hover:scale-105 transition-transform"
            style={{ backgroundColor: theme.tokens.panels.pause.buttons.lessonPlanButtonBackground, color: theme.tokens.panels.pause.buttons.buttonTextColor }}
          >
            📋 Back to Lesson Plan
          </button>
        )}

        <button 
          onClick={onExitToHome}
          className="w-full sa-btn font-black uppercase tracking-widest rounded-xl py-4 hover:scale-105 transition-transform"
          style={{ backgroundColor: theme.tokens.panels.pause.buttons.exitButtonBackground, color: theme.tokens.panels.pause.buttons.buttonTextColor }}
        >
          ✖ Exit to Home
        </button>
      </div>
    </div>
  );
};

