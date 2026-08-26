/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
SPEEDMATH UI GEOMETRY CONTRACT

This layout is governed by src/ui/uiGeometry.ts.

Do NOT modify band structure or stage geometry.

Only UI_GEOMETRY constants may change layout values.

Any structural layout change requires PM authorization.
*/

import React, { useState, useEffect, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { HelpButton, HelpMenu } from './components/UI/Help';
import { useTutorialFreezeAdapter, useTutorialDirector, TutorialOverlay } from './tutorials';
import { SceneContainer } from './components/Layout/SceneContainer';
import { ParticleSystem } from './components/UI/ParticleSystem';
import { OptionsMenu } from './components/UI/Settings/OptionsMenu';
import { GameHeader } from './components/Game/GameHeader';
import { StartScreen } from './components/UI/StartScreen';
import { LessonPlanBuilder } from './components/UI/LessonBuilder/LessonPlanBuilder';
import { SessionSummary } from './components/UI/SessionSummary';
import { ProgressPill } from './components/UI/ProgressPill';
import { GameBoard } from './components/Game/GameBoard';
import { AnswerGrid } from './components/Game/AnswerGrid';
import { PauseOverlay } from './components/UI/PauseOverlay';
import { PracticePlanController } from './services/practicePlanController';
import { modeController } from './services/timing';

import { UI_GEOMETRY } from './ui/uiGeometry';

import { InstructorDashboard } from './components/UI/InstructorDashboard';
import { ChildDashboard } from './components/UI/ChildDashboard';
import { InstructorPortal } from './components/UI/InstructorPortal';
import { PlayMenu } from './components/UI/PlayMenu';
import { SkillMap } from './components/UI/SkillMap';
import { getHint } from './services/hintService';
import { AchievementPopup } from './components/UI/AchievementPopup';
import { toVisualStep } from './adapters/gameToVisualAdapter';
import { CircuitClimbDevHarness } from './games/circuit-climb/CircuitClimbDevHarness';

export default function App() {
  const logic = useGameLogic();
  const { config, state, distractors, flashState, opUpdateAnim, sound, actions, shake, finalResults, sessionXP, activeScene, problem, rhythmState } = logic;

  const currentStep = state.steps && state.steps[state.stepIndex] ? state.steps[state.stepIndex] : null;
  const currentModeStr = currentStep ? currentStep.mode : 'normal';
  const isDark = currentModeStr === 'dark';
  const modeConfig = modeController.getModeConfig(currentModeStr as any);

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<string>('home');
  const [localClicked, setLocalClicked] = useState<number | null>(null);
  const [uiSkin, setUiSkin] = useState<'default' | 'forge'>('default');
  const [uiRenderer, setUiRenderer] = useState<'circle' | 'minimal'>('circle');

  const VALID_SCREENS = [
    'home', 
    'play_menu', 
    'playing', 
    'session_summary', 
    'lesson_builder', 
    'instructor_portal', 
    'progress', 
    'skill_map', 
    'child_dashboard',
    'circuit_climb'
  ];

  const safeRoute = (route: string): string => {
    if (VALID_SCREENS.includes(route)) {
      return route;
    }
    console.warn(`[NAVIGATION] Attempted invalid route: ${route}. Redirecting to home.`);
    return 'home';
  };

  const navigateTo = (screen: string) => {
    const target = safeRoute(screen);
    console.log(`[NAVIGATION] Shifting to: ${target} (from: ${currentScreen})`);
    setCurrentScreen(target);
  };


  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const helpFreezeAdapter = useTutorialFreezeAdapter({
    isGamePaused: state.isPaused,
    togglePause: actions.togglePause,
  });

  const tutorialDirector = useTutorialDirector({
    isGamePaused: state.isPaused,
    togglePause: actions.togglePause,
    currentMode: currentModeStr,
    onNavigateTo: navigateTo,
  });

  const handleOpenHelp = () => {
    setIsHelpOpen(true);
    helpFreezeAdapter.beginOverlayFreeze();
  };

  const handleCloseHelp = () => {
    setIsHelpOpen(false);
    if (!tutorialDirector.activeScript) {
      helpFreezeAdapter.endOverlayFreeze();
    }
  };

  const handleCloseTutorial = () => {
    tutorialDirector.endTutorial('dismissed');
    helpFreezeAdapter.endOverlayFreeze();
  };


  useEffect(() => {
    if (!flashState) setLocalClicked(null);
  }, [flashState]);

  useEffect(() => {
    if (state.status === 'finished' && currentScreen === 'playing') {
      navigateTo('session_summary');
    }
  }, [state.status, currentScreen]);

  const themeClass = state.currentMode === 'dark' ? 'sa-theme-dark' : (state.currentMode === 'qmm' ? 'sa-theme-qmm' : 'sa-theme-light');


  return (
    <SceneContainer activeScene={activeScene} themeClass={themeClass} shake={shake}>
      <ParticleSystem trigger={flashState === 'correct'} isFinale={state.status === 'finished'} />
      <AchievementPopup />

      <OptionsMenu
        config={config}
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        onApply={(nc) => {
          actions.setConfig(nc);
          actions.startGame(nc);
          setIsOptionsOpen(false);
          navigateTo('playing');
        }}
      />

      {currentScreen === 'progress' && (
        <InstructorDashboard 
          onClose={() => navigateTo('home')} 
          onGenerateLesson={(plan) => {
            import('./services/practicePlanController').then(({ PracticePlanController }) => {
              PracticePlanController.loadPlan(plan);
              navigateTo('lesson_builder');
            });
          }}
        />
      )}

      {currentScreen === 'skill_map' && (
        <SkillMap 
          onClose={() => navigateTo('home')}
        />
      )}

      {currentScreen === 'play_menu' && (
        <PlayMenu
          onClose={() => navigateTo('home')}
          onNavigate={navigateTo}
          actions={actions}
          setIsOptionsOpen={setIsOptionsOpen}
        />
      )}

      {currentScreen === 'child_dashboard' && (
        <ChildDashboard 
          onClose={() => navigateTo('home')}
          onNavigate={navigateTo}
        />
      )}

      {currentScreen === 'instructor_portal' && (
        <InstructorPortal 
          actions={actions}
          onNavigate={navigateTo}
          onClose={() => navigateTo('home')}
          setIsOptionsOpen={setIsOptionsOpen}
        />
      )}

      {currentScreen === 'lesson_builder' && (
        <LessonPlanBuilder 
          config={config}
          onClose={() => navigateTo('home')} 
          onStart={(newConfig) => {
            actions.setConfig(newConfig);
            actions.startGame(newConfig);
            navigateTo('playing'); // Go to game logic
          }}
        />
      )}

      <main className="main-container w-full items-center z-10 px-4 min-h-0 h-full">
        {currentScreen === 'home' && (
          <StartScreen state={state} actions={actions} setIsOptionsOpen={setIsOptionsOpen} config={config} onNavigate={navigateTo} />
        )}
        
        {currentScreen === 'session_summary' && (
          <SessionSummary finalResults={finalResults} sessionXP={sessionXP} config={config} actions={actions} onNavigate={navigateTo} />
        )}
        
        {currentScreen === 'playing' && (
          <GameBoard
            state={state}
            visualStep={currentStep ? toVisualStep(currentStep, state.currentNumber, problem, state, config, logic.stepId) : null}
            isTutorialActionStep={tutorialDirector.currentStep?.kind === 'realAction'}
            actions={{
              ...actions,
              handleAnswer: (ans: number) => {
                const isCorrect = currentStep ? ans === currentStep.correctAnswer : false;
                tutorialDirector.notifyAction('submitCorrectAnswer', { isCorrect });
                actions.handleAnswer(ans);
              },
              advanceDarkStepNow: () => {
                tutorialDirector.notifyAction('tapCenterCoin');
                actions.advanceDarkStepNow();
              }
            }}
            config={config}
            distractors={distractors}
            flashState={flashState}
            localClicked={localClicked}
            setLocalClicked={setLocalClicked}
            currentStep={currentStep}
            rhythmState={rhythmState}
            uiSkin={uiSkin}
            uiRenderer={uiRenderer}
            topBar={
              <div className="flex flex-col items-center w-full">
                <GameHeader
                  state={state}
                  config={config}
                  timerDuration={currentStep?.timerSeconds || 0}
                  modeConfig={modeConfig}
                  sound={sound}
                  setIsOptionsOpen={setIsOptionsOpen}
                  actions={actions}
                  onExitToHome={() => navigateTo('home')}
                  onNavigate={navigateTo}
                />
                <div className="mt-1 w-full scale-[0.98]">
                  <ProgressPill state={state} config={config} />
                </div>
                
                {/* Context Overlay logic moved into topBar for now */}
                {problem?.context && (
                  <div className="mt-4 px-4 py-2 bg-[var(--sa-card)] border-[2px] border-[var(--sa-border)] shadow-sm rounded-xl text-lg font-black text-center text-[var(--sa-text)] tracking-widest animate-in fade-in slide-in-from-top-1">
                    {problem.context}
                  </div>
                )}
              </div>
            }
            footer={
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={actions.earlyExit}
                  className="sa-pill flex items-center justify-center font-black text-xl hover:scale-105 transition-transform w-12 h-12"
                  aria-label="Restart Game"
                >
                  ↺
                </button>
                <button
                  onClick={actions.togglePause}
                  data-guide-id="pause-button"
                  className="sa-pill flex items-center justify-center font-black text-xl hover:scale-105 transition-transform w-12 h-12"
                  aria-label={state.isPaused ? 'Resume' : 'Pause'}
                >
                  {state.isPaused ? '▶' : '||'}
                </button>
                <HelpButton onClick={handleOpenHelp} />
              </div>
            }
          />
        )}

        {currentScreen === 'circuit_climb' && (
          <CircuitClimbDevHarness onExit={() => navigateTo('play_menu')} />
        )}

        {!VALID_SCREENS.includes(currentScreen) && (
          <div className="flex flex-col items-center justify-center p-10 bg-slate-900/80 backdrop-blur rounded-3xl border-4 border-rose-500 shadow-2xl">
            <h1 className="text-white text-4xl font-black mb-4 uppercase tracking-tighter">Architecture Error</h1>
            <p className="text-rose-200 font-bold mb-6">SCREEN NOT FOUND: <span className="bg-rose-900 px-2 py-1 rounded select-all font-mono">{currentScreen}</span></p>
            <button onClick={() => navigateTo('home')} className="sa-btn px-8 py-4 bg-white text-rose-500 font-black rounded-xl hover:scale-105 transition-transform uppercase">
              Emergency Return Home
            </button>
          </div>
        )}
      </main>

      {!helpFreezeAdapter.isFrozenByOverlay && (
        <PauseOverlay 
          state={state} 
          actions={actions} 
          onBackToLessonPlan={() => {
            console.log('[NAVIGATION] Back to lesson plan triggered from pause');
            PracticePlanController.clearPlan();
            actions.exitToIdle();
            navigateTo('lesson_builder');
          }}
          onExitToHome={() => {
            console.log('[NAVIGATION] Pause exit to home triggered');
            PracticePlanController.clearPlan();
            actions.exitToIdle();
            navigateTo('home');
          }}
        />
      )}

      {isHelpOpen && (
        <HelpMenu
          currentMode={currentModeStr}
          currentScreen={currentScreen}
          onClose={handleCloseHelp}
          completedTutorials={tutorialDirector.completionState.completedTutorials}
          onStartTutorial={(id) => {
            setIsHelpOpen(false);
            tutorialDirector.startTutorial(id);
          }}
          onShowDemo={(targetId) => {
            setIsHelpOpen(false);
            const demoScript = currentModeStr?.toLowerCase() === 'dark' ? 'dark_mode_basics' : 'normal_mode_basics';
            tutorialDirector.startTutorial(demoScript);
          }}
        />
      )}

      {tutorialDirector.currentStep && (
        <TutorialOverlay
          targetId={tutorialDirector.currentStep.target?.id || 'app-root'}
          title={tutorialDirector.currentStep.title || tutorialDirector.activeScript?.title}
          message={tutorialDirector.currentStep.message}
          onClose={handleCloseTutorial}
          stepIndex={tutorialDirector.activeStepIndex}
          totalSteps={tutorialDirector.activeScript?.steps.length || 0}
          onNext={tutorialDirector.advanceStep}
          onPrev={tutorialDirector.previousStep}
          onSkip={() => tutorialDirector.endTutorial('skipped')}
          isRealActionStep={tutorialDirector.currentStep.kind === 'realAction'}
        />
      )}
    </SceneContainer>
  );
}
