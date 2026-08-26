/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppConfig } from '../../types';
import { PracticePlanController } from '../../services/practicePlanController';
import { formatSkillLabel } from './InstructorDashboard';
import { classifySkills } from '../../services/insightService';
import { SkillProgressService } from '../../services/skillProgressService';
import { recommendationService } from '../../services/recommendationService';

export const SessionSummary = ({ finalResults, actions, sessionXP, config, onNavigate }: { finalResults: any; actions: any; sessionXP: any; config: AppConfig; onNavigate?: (s: any) => void }) => {
  const [recommendation, setRecommendation] = useState<any>(null);

  useEffect(() => {
    setRecommendation(recommendationService.getNextRecommendedSkill());
  }, []);

  if (!finalResults) return null;
  
  const lessonSummary = PracticePlanController.getLessonSummary();
  const isLessonComplete = !!(lessonSummary && PracticePlanController.getCurrentPlan() && PracticePlanController.isLastLevel());

  if (isLessonComplete) {
    const progress: any = (PracticePlanController as any).progress;
    let allLessonSteps: any[] = [];
    if (progress && progress.levelResults) {
      allLessonSteps = Object.values(progress.levelResults).flatMap((lr: any) => lr.stepResults || []);
    } else {
      allLessonSteps = finalResults.steps || [];
    }

    const mistakesMap = allLessonSteps
      .filter((s: any) => (!s.correct || s.timedOut || s.timeout) && s.questionLabel)
      .reduce((acc: any, s: any) => {
        acc[s.questionLabel] = (acc[s.questionLabel] || 0) + 1;
        return acc;
      }, {});
    
    const topMistakes = Object.entries(mistakesMap)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3);

    const allSkillProgress = SkillProgressService.loadAll();
    const lessonSkills = lessonSummary.skillStats.map(stat => allSkillProgress[stat.skillKey]).filter(Boolean);
    const { strong, improving, weak } = classifySkills(lessonSkills);

    return (
      <div className="sa-card p-6 text-center animate-pop w-full max-w-lg flex flex-col items-center bg-white h-auto max-h-[90vh] flex-shrink-0 relative">
        <div className="overflow-y-auto w-full px-2 pb-24 hide-scrollbar">
          <div className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">
            Lesson Complete
          </div>
          <h2 className="text-3xl font-black mb-6 text-slate-800">
            {PracticePlanController.getCurrentPlan()?.title || 'Lesson Summary'}
          </h2>

          <div className="grid grid-cols-3 gap-3 w-full text-left mb-8">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center">
              <p className="text-[10px] font-black uppercase text-slate-400">Stars</p>
              <p className="text-2xl font-black text-amber-400">{lessonSummary.totalStars}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center">
              <p className="text-[10px] font-black uppercase text-slate-400">Accuracy</p>
              <p className="text-xl font-black text-slate-700">{Math.round(lessonSummary.totalAccuracy * 100)}%</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center">
              <p className="text-[10px] font-black uppercase text-slate-400">Avg Time</p>
              <p className="text-xl font-black text-slate-700">{lessonSummary.totalAvgTime.toFixed(1)}s</p>
            </div>
          </div>
          
          {(strong.length > 0 || improving.length > 0 || weak.length > 0) && (
            <div className="w-full text-left mb-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-200 pb-2">
                What we saw
              </h3>
              <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                {strong.map(s => <p key={s.skillKey}>• <span className="text-green-600 font-bold">Strong</span> with {formatSkillLabel(s.skillKey)}</p>)}
                {improving.map(s => <p key={s.skillKey}>• <span className="text-blue-600 font-bold">Improving</span> on {formatSkillLabel(s.skillKey)}</p>)}
                {weak.map(s => <p key={s.skillKey}>• <span className="text-red-500 font-bold">Struggled</span> with {formatSkillLabel(s.skillKey)}</p>)}
              </div>
            </div>
          )}

          <div className="w-full text-left mb-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Activity Breakdown
            </h3>
            <div className="flex flex-col gap-3">
              {lessonSummary.activities.map((act, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-slate-800 text-sm">{act.title}</div>
                    <div className="text-amber-400 tracking-tighter text-sm drop-shadow-sm">
                      {'⭐'.repeat(act.stars)}{'☆'.repeat(5 - act.stars)}
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 mb-2">
                    Accuracy: {Math.round(act.accuracy * 100)}% <span className="opacity-50">|</span> Avg: {act.avgTime.toFixed(1)}s <span className="opacity-50">|</span> Target: {act.targetTime}s
                  </div>
                  {act.missedItems && act.missedItems.length > 0 && (
                    <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-2 text-left">
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Missed:</span>
                      <span className="text-xs font-medium text-red-600">
                        {act.missedItems.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {topMistakes.length > 0 && (
            <div className="w-full text-left bg-red-50 border border-red-200 rounded-xl p-4 mb-6 relative">
              <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 border-b border-red-200 pb-2">
                You struggled with
              </h3>
              <ul className="space-y-2 mb-4">
                {topMistakes.map(([qLabel, count]: any) => (
                  <li key={qLabel} className="flex justify-between items-center text-sm font-bold text-red-800">
                    <span className="text-lg font-black bg-white px-3 py-1 rounded shadow-sm border border-red-100">{qLabel}</span>
                    <span className="flex gap-1 text-red-500 text-sm">
                      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                        <span key={i}>❌</span>
                      ))}
                      {count > 5 && <span className="text-xs self-center ml-1">+{count - 5}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              
              <div className="flex flex-col gap-2 mt-4 text-center">
                {recommendation && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-2 text-left">
                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">
                      Recommended next step:
                    </h3>
                    <p className="text-sm font-bold text-emerald-800 mb-3">{recommendation.label}</p>
                    <button
                      onClick={() => {
                        import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                          const plan = lessonGeneratorService.generateLessonFromSkill(recommendation.skillKey);
                          PracticePlanController.loadPlan(plan);
                          if (onNavigate) onNavigate('lesson_builder');
                          actions.clearPlanAndExit();
                        });
                      }}
                      className="w-full py-3 sa-btn bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                      Continue Practice
                    </button>
                  </div>
                )}
                <div className="text-[10px] font-black text-red-400 uppercase tracking-widest my-1">— OR —</div>
                <button
                  onClick={() => {
                    import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                      const plan = lessonGeneratorService.generateLessonFromMistakes(allLessonSteps);
                      PracticePlanController.loadPlan(plan);
                      if (onNavigate) onNavigate('lesson_builder');
                      actions.clearPlanAndExit();
                    });
                  }}
                  className="w-full py-3 sa-btn bg-white text-red-600 font-black text-xs uppercase tracking-wider shadow border-b-4 border-red-200 active:border-b-0 active:translate-y-1 transition-all"
                >
                  Replay Mistakes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Absolute positioned button container for navigation hub */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 flex flex-col gap-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] rounded-b-3xl">
          <button
            onClick={() => {
              if (recommendation) {
                import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                  const plan = lessonGeneratorService.generateLessonFromSkill(recommendation.skillKey);
                  PracticePlanController.loadPlan(plan);
                  if (onNavigate) onNavigate('lesson_builder');
                  actions.clearPlanAndExit();
                });
              } else {
                if (onNavigate) onNavigate('play_menu');
              }
            }}
            className="w-full py-4 sa-btn bg-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {recommendation ? 'Continue Practice' : 'Choose Next Skill'}
          </button>
          
          <div className="flex gap-2 w-full">
            <button
              onClick={() => {
                actions.startGame(config);
                if (onNavigate) onNavigate('playing');
              }}
              className="flex-1 py-3 sa-btn bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest border border-slate-200 hover:bg-slate-200 transition-all"
            >
              Play Again
            </button>
            <button
              onClick={() => {
                actions.clearPlanAndExit();
                if (onNavigate) onNavigate('home');
              }}
              className="flex-1 py-3 sa-btn bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border border-slate-100 hover:text-slate-600 transition-all"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modeNames: Record<string, string> = {
    standard: 'Standard Arithmetic',
    skipcount: 'Skip Counting',
    multiplication: 'Multiplication Trainer',
    pattern: 'Pattern Logic',
  };

  return (
    <div className="sa-card p-8 text-center animate-pop w-full max-w-lg flex flex-col items-center">
      <div className="text-[var(--sa-primary-dark)] font-black text-sm uppercase tracking-widest mb-1">
        {modeNames[config.learningMode || 'standard']}
      </div>
      <h2 className="text-4xl font-black mb-2">{finalResults.endedEarly ? 'Session Ended' : 'Summary'}</h2>
      <div className="flex justify-center gap-2 my-4 text-5xl drop-shadow-md">
        {'⭐'.repeat(finalResults.stars)}
        {'☆'.repeat(3 - finalResults.stars)}
      </div>

      {sessionXP && (
        <div className="w-full bg-[var(--sa-primary-soft)] rounded-xl p-4 mb-6 border-2 border-[var(--sa-primary)] flex flex-col items-center">
          <div className="text-[var(--sa-success-dark)] font-black text-2xl mb-1">+{sessionXP.earned} XP Earned!</div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden mt-2 border border-[var(--sa-border)]">
            <div className="h-full bg-[var(--sa-warning)] transition-all duration-1000" style={{ width: `${sessionXP.progress}%` }}></div>
          </div>
          <div className="w-full flex justify-between text-xs font-bold text-[var(--sa-primary-dark)] mt-1">
            <span>Level {sessionXP.level}</span>
            <span>{sessionXP.progress} / 100</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 w-full text-left mb-6">
        <div className="sa-card !shadow-none p-3 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase opacity-60">Accuracy</p>
          <p className="text-2xl font-black">{finalResults.accuracy}%</p>
        </div>
        <div className="sa-card !shadow-none p-3 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase opacity-60">Best Streak</p>
          <p className="text-2xl font-black">{sessionXP?.bestStreak || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full text-left mb-6">
        <div className="sa-card !shadow-none p-3 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase opacity-60">Avg Time</p>
          <p className="text-2xl font-black">{finalResults.avgResponseTime ? finalResults.avgResponseTime.toFixed(1) : '–'}s</p>
        </div>
        <div className="sa-card !shadow-none p-3 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase opacity-60">Target Time</p>
          <p className="text-2xl font-black">{PracticePlanController.getCurrentLevel()?.targetResponseTime ? `${PracticePlanController.getCurrentLevel()?.targetResponseTime}.0s` : '5.0s'}</p>
        </div>
      </div>

      {(() => {
        const mistakesMap = (finalResults.steps || [])
          .filter((s: any) => (!s.correct || s.timedOut) && s.questionLabel)
          .reduce((acc: any, s: any) => {
            acc[s.questionLabel] = (acc[s.questionLabel] || 0) + 1;
            return acc;
          }, {});
        
        const topMistakes = Object.entries(mistakesMap)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 3);
          
        if (topMistakes.length === 0) return null;

        return (
          <div className="w-full text-left bg-red-50 border-2 border-red-100 rounded-xl p-4 mb-6 relative">
            <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 border-b border-red-200 pb-2">
              You struggled with
            </h3>
            <ul className="space-y-2 mb-4">
              {topMistakes.map(([qLabel, count]: any) => (
                <li key={qLabel} className="flex justify-between items-center text-sm font-bold text-red-800">
                  <span className="text-lg font-black bg-white px-3 py-1 rounded shadow-sm border border-red-100">{qLabel}</span>
                  <span className="flex gap-1 text-red-500 text-sm">
                    {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                      <span key={i}>❌</span>
                    ))}
                    {count > 5 && <span className="text-xs self-center ml-1">+{count - 5}</span>}
                  </span>
                </li>
              ))}
            </ul>
            
            <div className="flex flex-col gap-2 mt-4 text-center">
              <button
                onClick={() => {
                  import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                    const plan = lessonGeneratorService.generateLessonFromMistakes(finalResults.steps);
                    PracticePlanController.loadPlan(plan);
                    if (onNavigate) onNavigate('lesson_builder');
                    actions.clearPlanAndExit(); // Clear current
                  });
                }}
                className="w-full py-3 sa-btn bg-white text-red-600 font-black text-xs uppercase tracking-wider shadow border-b-4 border-red-200 active:border-b-0 active:translate-y-1 transition-all"
              >
                Replay Mistakes
              </button>
            </div>
          </div>
        );
      })()}

      <div className="flex flex-col gap-3 w-full mt-4">
        <button
          onClick={() => {
            if (PracticePlanController.getCurrentPlan()) {
              const hasNext = PracticePlanController.advanceToNextLevel();
              if (hasNext) {
                const level = PracticePlanController.getCurrentLevel();
                if (level) {
                  const newConfig = PracticePlanController.mapLevelToAppConfig(level, config);
                  actions.startGame(newConfig);
                  if (onNavigate) onNavigate('playing');
                }
              } else {
                actions.clearPlanAndExit();
                if (onNavigate) onNavigate('home');
              }
            } else {
              actions.startGame(config);
              if (onNavigate) onNavigate('playing');
            }
          }}
          className="w-full py-5 sa-btn bg-blue-600 text-white font-black text-xl uppercase tracking-tighter shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {PracticePlanController.getCurrentPlan() 
            ? (PracticePlanController.isLastLevel() ? 'Finish Lesson' : 'Next Level') 
            : 'Continue'}
        </button>

        <div className="flex gap-2 w-full">
          <button
            onClick={() => {
              actions.startGame(config);
              if (onNavigate) onNavigate('playing');
            }}
            className="flex-1 py-3 sa-btn bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest border-2 border-slate-200 hover:bg-slate-200 transition-all"
          >
            Play Again
          </button>
          
          <button
            onClick={() => {
              actions.clearPlanAndExit();
              if (onNavigate) onNavigate('home');
            }}
            className="flex-1 py-3 sa-btn bg-white text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-100 hover:text-slate-600 transition-all"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
