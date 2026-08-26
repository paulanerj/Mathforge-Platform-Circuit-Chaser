/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppConfig } from '../../types';
import { UI_GEOMETRY } from '../../ui/uiGeometry';
import { DifficultyIndicator } from '../UI/DifficultyIndicator';
import { useConfirmAction } from '../../hooks/useConfirmAction';

export const GameHeader = ({
  state,
  config,
  timerDuration,
  modeConfig,
  sound,
  setIsOptionsOpen,
  actions,
  onExitToHome,
  onNavigate,
}: {
  state: any;
  config: AppConfig;
  timerDuration: number;
  modeConfig: any;
  sound: any;
  setIsOptionsOpen: (v: boolean) => void;
  actions: any;
  onExitToHome?: () => void;
  onNavigate?: (s: string) => void;
}) => {
  const { activeId, trigger } = useConfirmAction();

  return (
  <header 
    data-guide-id="top-bar"
    className="header-text w-full flex justify-between items-center px-6 py-4 z-10 shrink-0 text-[var(--sa-text)]"
    style={{ height: `${UI_GEOMETRY.HEADER_HEIGHT + 12}px`, maxWidth: `${UI_GEOMETRY.HEADER_MAX_WIDTH}px` }}
  >
    <div className="flex items-center gap-2">
      {onExitToHome && (
        <button
          onClick={() => {
            sound.playButtonClick();
            trigger(() => {
              actions.exitToIdle();
              if (onExitToHome) onExitToHome();
            }, 'home');
          }}
          className={`sa-pill px-3 py-1.5 font-bold uppercase border transition-all mr-1 ${activeId === 'home' ? 'text-white bg-red-500 border-red-500 opacity-100 shadow-md' : 'text-slate-400 border-slate-200/30 hover:border-slate-300 hover:text-slate-600'}`}
          style={{ fontSize: `11px` }}
        >
          {activeId === 'home' ? 'SURE?' : 'HOME'}
        </button>
      )}
      <button
        onClick={() => {
          sound.playButtonClick();
          if (onNavigate) {
            actions.togglePause(); // Better to pause if we navigate away
            onNavigate('play_menu');
          } else {
            setIsOptionsOpen(true);
          }
        }}
        data-guide-id="settings-button"
        className="sa-pill px-3 py-1.5 font-bold uppercase transition-all text-slate-400 border border-slate-200/40 hover:border-slate-300 hover:text-slate-600"
        style={{ fontSize: `11px` }}
      >
        MENU
      </button>
    </div>
    <DifficultyIndicator 
      level={state.steps?.[state.stepIndex]?.difficultyMeta?.level || config.difficultyLevel || 5} 
      config={config}
      actions={actions}
    />
    <div className="flex flex-col items-end">
      {config.targetResponseTime && (
        <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 -mb-1 mr-2 flex gap-1">
          <span>Target: {config.targetResponseTime}s</span>
        </div>
      )}
      <div
        className={`text-xl font-black tabular-nums tracking-wider bg-white px-4 py-2 rounded-xl border-2 border-slate-200 shadow-sm text-slate-700 ${
          timerDuration > 0 && config.timerOn && !modeConfig.usesDarkStopwatch ? 'visible' : 'invisible'
        }`}
      >
        {state.elapsedTime}s
      </div>
    </div>
  </header>
  );
};
