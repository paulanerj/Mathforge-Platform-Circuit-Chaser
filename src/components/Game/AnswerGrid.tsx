/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UI_GEOMETRY } from '../../ui/uiGeometry';
import { DifficultyColorMapper } from '../../ui/difficultyColorMap';
import { GameStep, AppConfig } from '../../types';

export const AnswerGrid = ({
  distractors,
  state,
  flashState,
  isDark,
  actions,
  localClicked,
  setLocalClicked,
  currentStep,
  config,
  uiSkin = 'default',
  isTutorialActionStep = false,
}: {
  distractors: number[];
  state: any;
  flashState: string | null;
  isDark: boolean;
  actions: any;
  localClicked: number | null;
  setLocalClicked: (n: number | null) => void;
  currentStep: GameStep | null;
  config: AppConfig;
  uiSkin?: 'default' | 'forge';
  isTutorialActionStep?: boolean;
}) => {
  const count = distractors?.length || 0;
  
  if (!distractors || distractors.length < 2) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('INVALID ANSWERS — REGENERATING OR FAILING STATE', distractors);
    }
    return null;
  }

  const [scaleFactor, setScaleFactor] = useState(1);
  const [failSafeMessage, setFailSafeMessage] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!state.failedCurrentStep) {
      setFailSafeMessage(null);
    }
  }, [state.failedCurrentStep]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const cw = containerRef.current?.offsetWidth || 390;
      setScaleFactor(Math.min(Math.max(cw / 390, 1), 1.6));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const buttonHeight = Math.min(64 * scaleFactor, 96);
  const fontSize = Math.min(26 * scaleFactor, 38);

  const isThree = count === 3;
  const maxSlots = UI_GEOMETRY.ANSWER_STAGE_ROWS * UI_GEOMETRY.ANSWER_STAGE_COLS;
  const displayDistractors = distractors.slice(0, maxSlots);
  const slots = isThree ? displayDistractors : Array(maxSlots).fill(null);

  const currentLevel = currentStep?.difficultyMeta?.level || config.difficultyLevel || 5;
  const levelColor = DifficultyColorMapper.getHexForLevel(currentLevel);

  if (!isThree) {
    displayDistractors.forEach((ans, i) => {
      if (i < maxSlots) {
        slots[i] = ans;
      }
    });
  }

  return (
    <div 
      data-guide-id="answer-grid"
      className="w-full h-full relative mx-auto"
      style={{ maxWidth: `${UI_GEOMETRY.ANSWER_STAGE_MAX_WIDTH}px` }}
    >
      {failSafeMessage && (
        <div className="absolute -top-10 left-0 right-0 mx-auto w-11/12 bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded shadow-lg text-center z-50">
          {failSafeMessage}
        </div>
      )}
      <div
        ref={containerRef}
        className={`answer-grid grid mx-auto w-full h-full px-4 py-2 transition-opacity ${
        isDark ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        gridTemplateColumns: `repeat(${UI_GEOMETRY.ANSWER_STAGE_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${UI_GEOMETRY.ANSWER_STAGE_ROWS}, 1fr)`,
        gap: `${UI_GEOMETRY.ANSWER_STAGE_GAP}px`,
        maxWidth: `${UI_GEOMETRY.ANSWER_STAGE_MAX_WIDTH}px`
      }}
    >
      {slots.map((ans, i) => {
        if (ans === null) {
          return <div key={`empty-${i}`} className="invisible pointer-events-none h-full" />;
        }

        const isSelected = localClicked === ans;
        const isCorrectAnswer = currentStep && Number(ans) === Number(currentStep.correctAnswer);
        const isFailSafeMode = state.failedCurrentStep; // Correction phase active
        
        let activeClass = '';

        if (isFailSafeMode && !flashState) {
          // Highlight correct answer, de-emphasize others
          if (isCorrectAnswer) {
            activeClass = 'bg-green-100 border-green-400 text-green-900 shadow-[0_0_15px_rgba(74,222,128,0.5)] animate-pulse-subtle';
          } else {
            activeClass = 'opacity-30 grayscale';
          }
        } else if (flashState === 'correct' && isSelected) {
          activeClass = uiSkin === 'forge' ? 'answer-correct' : 'sa-btn--correct';
        } else if (flashState === 'incorrect' && isSelected) {
          activeClass = (uiSkin === 'forge' ? 'answer-error scale-95' : 'sa-btn--incorrect scale-95');
        } else if (flashState === 'incorrect') {
          activeClass = 'opacity-50 grayscale';
        }

        // 3-answer centering logic: 3rd button spans 2 columns and centers
        const isCenteredRow = isThree && i === 2;
        const spanClass = isCenteredRow ? 'col-span-2 justify-self-center' : 'col-span-1';
        const widthClass = isCenteredRow ? 'w-[var(--cw-mob)] md:w-[var(--cw-desk)]' : 'w-full';
        const isQMM = currentStep?.mode === 'qmm';

        let guideId = "answer-button-any";
        if (isCorrectAnswer) {
          if (isFailSafeMode) {
            guideId = "fail-safe-correct-answer";
          } else {
            guideId = "answer-button-correct";
          }
        }

        return (
          <button
            key={`${state.stepIndex}-${i}`}
            onClick={() => {
              if (isFailSafeMode && !isCorrectAnswer) {
                setFailSafeMessage(`${currentStep?.correctAnswer} is the correct answer. Please select it to continue.`);
                return;
              }
              console.log('AnswerGrid: Button clicked', ans);
              setLocalClicked(ans);
              actions.handleAnswer(ans);
            }}
            disabled={isDark || (!!flashState && !isFailSafeMode) || (state.isPaused && !isTutorialActionStep)}
            data-guide-id={guideId}
            className={`sa-btn answer-button ${uiSkin === 'forge' ? 'forge' : ''} ${isQMM ? 'qmm-mode' : ''} h-full font-bold ${spanClass} ${widthClass} ${activeClass}`}
            style={{ 
              height: `${buttonHeight}px`,
              fontSize: `${fontSize}px`,
              '--cw-mob': UI_GEOMETRY.ANSWER_STAGE_CENTER_BUTTON_WIDTH_MOBILE,
              '--cw-desk': UI_GEOMETRY.ANSWER_STAGE_CENTER_BUTTON_WIDTH_DESKTOP,
              borderColor: levelColor
            } as React.CSSProperties}
          >
            {ans}
          </button>
        );
      })}
      </div>
    </div>
  );
};
