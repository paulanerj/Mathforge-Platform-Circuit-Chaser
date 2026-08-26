import React, { useEffect, useState } from 'react';
import { LEARNING_PATHS, getPathProgress } from '../../services/learningPathService';
import { LearningPath } from '../../types/learningPath';
import { achievementService } from '../../services/achievementService';
import { Achievement } from '../../types/achievement';
import { recommendationService, Recommendation } from '../../services/recommendationService';
import { SkillProgressService } from '../../services/skillProgressService';
import { formatSkillLabel } from './InstructorDashboard';
import { PracticePlanController } from '../../services/practicePlanController';

export const ChildDashboard = ({ onClose, onNavigate }: { onClose: () => void, onNavigate: (screen: any) => void }) => {
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [progressData, setProgressData] = useState<any>({});
  const [nextSkillLabel, setNextSkillLabel] = useState<string>('');
  const [nextSkillKey, setNextSkillKey] = useState<string>('');

  useEffect(() => {
    const data = SkillProgressService.loadAll();
    setProgressData(data);

    // Find the first unmastered path or default to multiplication
    let currentPath = LEARNING_PATHS[0];
    for (const path of LEARNING_PATHS) {
      const progress = getPathProgress(path, data);
      if (progress.completed < progress.total) {
        currentPath = path;
        break;
      }
    }
    setActivePath(currentPath);

    // Find first unmastered skill in the active path
    if (currentPath) {
        const nextSkill = currentPath.skills.find(key => {
            const skill = data[key];
            return !skill || skill.masteryLevel !== 'mastered';
        });
        if (nextSkill) {
            setNextSkillLabel(formatSkillLabel(nextSkill));
            setNextSkillKey(nextSkill);
        } else {
            setNextSkillLabel("You finished this path!");
        }
    }

    // Achievements
    const allAchievements = achievementService.loadAll();
    setRecentAchievements(allAchievements.sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 3));

    // Recommendation
    setRecommendation(recommendationService.getLastRecommendation());

  }, []);

  const pathProgress = activePath ? getPathProgress(activePath, progressData) : { completed: 0, total: 0, percent: 0 };

  return (
    <div className="absolute inset-0 z-50 bg-[var(--sa-ui-bg)] flex flex-col items-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-md border-4 border-blue-400">
           <h1 className="text-3xl font-black text-blue-600 truncate">Hey there! 👋</h1>
           <button onClick={onClose} className="sa-btn px-6 py-2 bg-slate-100 font-bold uppercase tracking-widest text-slate-500 rounded-full border-2 border-slate-200">Back</button>
        </div>

        {/* Current Goal */}
        {activePath && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-3xl shadow-lg border-4 border-emerald-400 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 text-9xl opacity-20 transform rotate-12">🎯</div>
            <h2 className="text-sm font-black text-emerald-700 uppercase tracking-widest mb-2 relative z-10">Your Goal</h2>
            <p className="text-3xl font-black text-green-900 mb-6 relative z-10">{activePath.title}</p>
            
            <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 border-2 border-white/50 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-emerald-800 text-lg">Progress</span>
                <span className="font-black text-emerald-600 text-2xl">{pathProgress.completed} <span className="text-emerald-400 text-lg">/ {pathProgress.total}</span></span>
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-4 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${pathProgress.percent * 100}%` }}></div>
              </div>

              {/* Visual Path dots */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {activePath.skills.map(skillKey => {
                      const skill = progressData[skillKey];
                      const done = skill?.masteryLevel === 'mastered';
                      return (
                          <span key={skillKey} className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm border-2 ${done ? 'bg-emerald-400 text-white border-emerald-500' : 'bg-slate-100 text-slate-300 border-slate-200'}`}>
                              {done ? '✔' : '○'}
                          </span>
                      );
                  })}
              </div>
            </div>

            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 mb-6 relative z-10">
                <p className="font-bold text-emerald-800 uppercase tracking-widest text-xs mb-1">Next up</p>
                <p className="font-black text-emerald-950 text-xl">{nextSkillLabel}</p>
            </div>

            {nextSkillKey && (
                <button 
                  className="relative z-10 w-full sa-btn bg-emerald-500 hover:bg-emerald-400 text-white font-black text-2xl py-6 rounded-2xl shadow-xl shadow-emerald-500/30 border-b-8 border-emerald-700 active:border-b-0 active:translate-y-2 transition-all group"
                  onClick={() => {
                    import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                        const plan = lessonGeneratorService.generateLessonFromSkill(nextSkillKey);
                        PracticePlanController.loadPlan(plan);
                        onNavigate('lesson_builder');
                    });
                  }}
                >
                    <span className="flex items-center justify-center gap-3">
                        ▶ <span className="group-hover:scale-105 transition-transform">Start Playing</span>
                    </span>
                </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Focus Area */}
            {recommendation ? (
               <div className="bg-amber-50 p-6 rounded-3xl shadow-md border-4 border-amber-300 text-center flex flex-col justify-between">
                 <div>
                    <h2 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-4">Let's work on this</h2>
                    <p className="text-2xl font-black text-amber-900 mb-6 leading-tight">{recommendation.label}</p>
                 </div>
                 <button 
                  className="sa-btn w-full bg-amber-400 hover:bg-amber-300 text-amber-900 font-black text-lg py-4 rounded-xl shadow-lg border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all"
                  onClick={() => {
                      import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                          const plan = lessonGeneratorService.generateLessonFromSkill(recommendation.skillKey);
                          PracticePlanController.loadPlan(plan);
                          onNavigate('lesson_builder');
                      });
                  }}
                 >
                   Practice This
                 </button>
               </div>
            ) : (
                <div className="bg-slate-100 p-6 rounded-3xl shadow-sm border-2 border-slate-200 text-center flex flex-col justify-center items-center opacity-70">
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Practice Needed</h2>
                    <p className="font-bold text-slate-600">Play some more to get recommendations!</p>
                </div>
            )}

            {/* Recent Achievements */}
            <div className="bg-white p-6 rounded-3xl shadow-md border-4 border-blue-400">
              <h2 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-4 border-b-2 border-slate-100 pb-2">You just achieved</h2>
              {recentAchievements.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {recentAchievements.map(a => (
                        <li key={a.id} className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                           <span className="text-2xl">🏆</span>
                           <span className="font-bold text-blue-900 leading-tight">{a.title}</span>
                        </li>
                    ))}
                  </ul>
              ) : (
                  <p className="text-slate-400 font-bold text-center mt-6">Go play and unlock some trophies!</p>
              )}
            </div>
        </div>

      </div>
    </div>
  );
};
