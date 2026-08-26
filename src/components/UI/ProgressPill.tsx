/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppConfig } from '../../types';
import { UI_GEOMETRY } from '../../ui/uiGeometry';

export const ProgressPill = ({ state, config }: { state: any; config: AppConfig }) => {
  const progressPercent = Math.min(100, Math.max(0, (state.stepIndex / Math.max(1, config.totalSteps)) * 100));
  const displayLives = config.activeMode === 'survival' ? state.lives : Math.max(0, 3 - state.errorCount);

  return (
    <div 
      className="progress-wrapper px-6 z-10 shrink-0"
    >
      <div 
        className="progress-bar relative bg-slate-200/50 rounded-full border-2 border-slate-300 overflow-hidden shadow-inner flex items-center"
        style={{ height: `${UI_GEOMETRY.PROGRESS_PILL_HEIGHT + 10}px` }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          style={{ width: `${progressPercent}%` }}
        />
        <div className="relative z-10 w-full flex justify-between px-6 text-[11px] font-black uppercase tracking-widest text-slate-800 pointer-events-none">
          <span className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            Step {state.stepIndex + 1} / {config.totalSteps}
          </span>
          <span data-guide-id="survival-lives" className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">❤ {displayLives}</span>
        </div>
      </div>
    </div>
  );
};
