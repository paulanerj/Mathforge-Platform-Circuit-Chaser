import React, { useEffect, useState } from 'react';
import { SkillProgress } from '../../types/skillProgress';
import { SkillProgressService } from '../../services/skillProgressService';
import { normalizeSkillKey } from '../../services/utils/skillKeyUtils';
import { classifySkills } from '../../services/insightService';
import { Achievement } from '../../types/achievement';
import { achievementService } from '../../services/achievementService';

export function formatSkillLabel(rawKey: any): string {
  const key = normalizeSkillKey(rawKey);
  if (!key) return 'Unknown Skill';
  
  if (key.startsWith('multiplication.table.')) {
    const parts = key.split('.');
    if (parts.length === 3) {
      const table = parseInt(parts[2], 10);
      if (table > 12) return 'Multiplication Practice';
      return `Multiplication Table ${parts[2]}`;
    }
    if (parts.length === 5 && parts[3] === 'factor') {
      const table = parseInt(parts[2], 10);
      if (table > 12) return 'Multiplication Practice';
      return `${parts[2]} × ${parts[4]}`; // Subskill
    }
  }
  if (key.startsWith('skipcount.step.')) {
    const parts = key.split('.');
    return `Skip Counting by ${parts[2]}`;
  }
  if (key.startsWith('pattern.')) {
    const parts = key.split('.');
    const rule = parts[2];
    const ruleStr = rule.replace('plus', '+').replace('minus', '-');
    return `Pattern ${ruleStr}`;
  }
  if (key.startsWith('skip_rhythm.step.')) {
    const parts = key.split('.');
    const step = parts[2];
    const type = parts[3] || 'standard';
    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    return `Skip Rhythm ${step} (${capitalizedType})`;
  }
  
  return key;
}

import { getProgressionStage } from '../../services/progressionService';
import { LEARNING_PATHS, getPathProgress } from '../../services/learningPathService';

const ProgressionChain = ({ masteryLevel }: { masteryLevel: 'weak' | 'developing' | 'strong' | 'mastered' }) => {
  const stage = getProgressionStage(masteryLevel);
  const stages = ['started', 'improving', 'strong', 'mastered'];
  const currentIndex = stages.indexOf(stage);

  return (
    <div className="flex items-center gap-1 sm:gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
      {stages.map((s, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        
        let displayStr = s === 'improving' ? 'Improving' : s === 'strong' ? 'Strong' : s === 'mastered' ? 'Mastered' : 'Started';

        let itemClass = "text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 sm:px-2 py-1 rounded transition-colors ";
        if (isCurrent) {
           itemClass += "text-white bg-[var(--sa-primary)] shadow-sm scale-110 sm:scale-105 border border-[var(--sa-primary)] z-10";
        } else if (isPast) {
           itemClass += "text-green-700 bg-green-50 border border-green-200 opacity-80";
        } else {
           itemClass += "text-slate-400 bg-slate-50 border border-slate-100 opacity-50";
        }

        return (
          <React.Fragment key={s}>
            <span className={itemClass}>{displayStr}</span>
            {i < stages.length - 1 && (
              <span className={`text-[10px] sm:text-xs ${isPast ? 'text-green-300' : 'text-slate-200'}`}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const InstructorDashboard = ({ onClose, onGenerateLesson }: { onClose: () => void, onGenerateLesson: (plan: any) => void }) => {
  const [progressData, setProgressData] = useState<Record<string, SkillProgress>>({});
  const [classifiedData, setClassifiedData] = useState<{ strong: SkillProgress[], improving: SkillProgress[], weak: SkillProgress[] }>({ strong: [], improving: [], weak: [] });
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    try {
      const allProgress = SkillProgressService.loadAll();
      setProgressData(allProgress);
      setClassifiedData(classifySkills(Object.values(allProgress)));
      
      const allAchievements = achievementService.loadAll();
      
      // Limit to latest 5, then sort by priority, then time desc
      const getPriorityScore = (p: string) => p === 'high' ? 3 : p === 'medium' ? 2 : 1;
      const latestAchievements = [...allAchievements]
        .sort((a, b) => b.unlockedAt - a.unlockedAt)
        .slice(0, 5)
        .sort((a, b) => getPriorityScore(b.priority) - getPriorityScore(a.priority) || b.unlockedAt - a.unlockedAt);
        
      setAchievements(latestAchievements);
    } catch (e) {
      console.warn("Failed to load skill data", e);
    }
  }, []);

  const handleFixWeakAreas = () => {
    import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
      if (classifiedData.weak.length > 0) {
        // Find best weak area
        const targetSkill = classifiedData.weak[0].skillKey;
        const plan = lessonGeneratorService.generateLessonFromSkill(targetSkill);
        onGenerateLesson(plan);
      }
    });
  };

  const handleReplayLastMistakes = () => {
    import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
      const plan = lessonGeneratorService.generateLessonFromMistakes([]);
      onGenerateLesson(plan);
    });
  };

  const masteryLabels = {
    weak: "Weak",
    developing: "Developing",
    strong: "Strong",
    mastered: "Mastered"
  };

  const grouped = {
    multiplication: (Object.values(progressData) as SkillProgress[]).filter(p => normalizeSkillKey(p.skillKey)?.startsWith('multiplication')),
    skipcount: (Object.values(progressData) as SkillProgress[]).filter(p => normalizeSkillKey(p.skillKey)?.startsWith('skipcount')),
    pattern: (Object.values(progressData) as SkillProgress[]).filter(p => normalizeSkillKey(p.skillKey)?.startsWith('pattern')),
    skip_rhythm: (Object.values(progressData) as SkillProgress[]).filter(p => normalizeSkillKey(p.skillKey)?.startsWith('skip_rhythm')),
  };

  const renderStars = (stars: number) => {
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  if (Object.keys(progressData).length === 0) {
    return (
      <div className="absolute inset-0 z-50 bg-[var(--sa-ui-bg)] flex flex-col items-center justify-center p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-sm">
           <h2 className="text-xl font-black mb-4 tracking-tight">Progress Dashboard</h2>
           <p className="text-slate-500 mb-6 font-medium">No data yet — complete a lesson to gather insights.</p>
           <button onClick={onClose} className="sa-btn w-full bg-slate-800 text-white font-black py-4 uppercase tracking-widest shadow-sm rounded-xl">Close</button>
         </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-[var(--sa-ui-bg)] flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-5xl h-full flex flex-col bg-slate-50 shadow-2xl overflow-hidden rounded-2xl border-4 border-[var(--sa-primary-soft)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Progress</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Learner Dashboard</p>
          </div>
          <button 
            onClick={onClose}
            className="sa-pill px-6 py-3 text-sm font-black bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-sm border border-slate-200 uppercase tracking-widest transition-colors"
          >
            CLOSE
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 bg-slate-50 items-start">
          
          {/* Left Column: Attention Section & Action Buttons */}
          <div className="flex flex-col gap-6 sticky top-0">
            <div className="bg-white p-6 rounded-2xl shadow border border-red-200">
              <h3 className="text-xl font-black text-red-600 tracking-tight mb-4 flex items-center gap-2 border-b border-red-100 pb-3">
                <span className="text-2xl">⚠️</span> Needs attention
              </h3>
              {classifiedData.weak.length > 0 ? (
                <div className="space-y-2 mb-6">
                  {classifiedData.weak.slice(0, 3).map((skill: SkillProgress) => (
                    <div key={skill.skillKey} className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col gap-2">
                       <p className="font-bold text-red-800 text-sm flex items-center justify-between pb-1 text-left w-full truncate">
                         <span className="flex items-center gap-2"><span className="opacity-50 flex-shrink-0">•</span> <span className="truncate">{formatSkillLabel(skill.skillKey)}</span></span>
                         <span className="flex-shrink-0 flex items-center gap-1">
                          {skill.trend === 'up' && <span className="text-green-600 text-xs bg-white px-1.5 rounded font-black border border-green-200">↑</span>}
                          {skill.trend === 'down' && <span className="text-red-500 text-xs bg-white px-1.5 rounded font-black border border-red-200">↓</span>}
                         </span>
                       </p>
                       <ProgressionChain masteryLevel={skill.masteryLevel} />
                       <button
                         onClick={() => {
                           import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                             const plan = lessonGeneratorService.generateLessonFromSkill(skill.skillKey);
                             onGenerateLesson(plan);
                           });
                         }}
                         className="sa-btn w-full bg-white text-red-600 border border-red-200 font-bold text-xs uppercase tracking-wider py-2 active:translate-y-[1px]"
                       >
                         Fix
                       </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 font-medium italic mb-6">No immediate weaknesses detected.</p>
              )}
              
              <div className="flex flex-col gap-3">
                <button onClick={handleFixWeakAreas} disabled={classifiedData.weak.length === 0} className="sa-btn w-full bg-red-600 text-white font-black uppercase text-[11px] tracking-widest py-4 shadow-md border-b-4 border-red-800 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:border-b-0 disabled:translate-y-1 disabled:hover:brightness-100">
                  Fix Weak Areas
                </button>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mt-2 mb-1">— OR —</div>
                <button onClick={handleReplayLastMistakes} className="sa-btn w-full bg-white text-slate-600 border-2 border-slate-200 font-black uppercase text-[11px] tracking-widest py-4 shadow-sm hover:bg-slate-50 active:translate-y-1 transition-all">
                  Replay Last Mistakes
                </button>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>Summary</span>
              </h3>
              <div className="flex flex-col gap-3">
                 <div className="flex justify-between items-center bg-green-50 px-4 py-3 rounded-xl border border-green-100 shadow-sm">
                   <span className="font-bold text-green-700 text-sm">Strong</span>
                   <span className="font-black text-green-800 text-lg">{classifiedData.strong.length}</span>
                 </div>
                 <div className="flex justify-between items-center bg-blue-50 px-4 py-3 rounded-xl border border-blue-100 shadow-sm">
                   <span className="font-bold text-blue-700 text-sm">Improving</span>
                   <span className="font-black text-blue-800 text-lg">{classifiedData.improving.length}</span>
                 </div>
              </div>
            </div>

            {achievements.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <span>🏆</span> Recent Achievements
                </h3>
                <div className="flex flex-col gap-3">
                  {achievements.map(ach => {
                    let achBg = "bg-slate-50 border-slate-200";
                    let titleColor = "text-slate-800";
                    let descColor = "text-slate-600";
                    let icon = "✓";
                    
                    if (ach.priority === 'high') {
                      achBg = "bg-amber-50 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)]";
                      titleColor = "text-amber-800";
                      descColor = "text-amber-700";
                      icon = "🌟";
                    } else if (ach.priority === 'medium') {
                      achBg = "bg-amber-50/50 border-amber-200";
                      titleColor = "text-amber-700";
                      descColor = "text-amber-600";
                      icon = "🏆";
                    }
                    
                    return (
                      <div key={ach.id} className={`flex items-start gap-3 p-3 rounded-xl border shadow-sm ${achBg}`}>
                        <div className="text-xl shrink-0 mt-0.5">{icon}</div>
                        <div className="flex flex-col">
                          <span className={`font-black text-sm ${titleColor}`}>{ach.title}</span>
                          <span className={`font-bold opacity-90 text-xs ${descColor}`}>{ach.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Learning Paths + Skill Grid */}
          <div className="flex flex-col gap-6 w-full overflow-hidden">
            
            {/* Learning Paths */}
            <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
              <h3 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>🎯</span> Learning Paths
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {LEARNING_PATHS.map(path => {
                  const progress = getPathProgress(path, progressData);
                  const isComplete = progress.total > 0 && progress.completed === progress.total;
                  
                  return (
                    <div key={path.id} className={`flex flex-col p-4 rounded-xl border shadow-sm transition-all ${isComplete ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                      <h4 className={`text-sm font-black mb-1 ${isComplete ? 'text-green-800' : 'text-slate-800'}`}>{path.title}</h4>
                      <p className={`text-xs font-bold leading-tight mb-4 flex-1 ${isComplete ? 'text-green-600' : 'text-slate-500'}`}>{path.description}</p>
                      
                      <div className="mt-auto">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isComplete ? 'text-green-600' : 'text-slate-400'}`}>Progress</span>
                          <span className={`text-xs font-black ${isComplete ? 'text-green-700' : 'text-slate-700'}`}>{progress.completed} / {progress.total}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full ${isComplete ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-[var(--sa-primary)]'}`} 
                            style={{ width: `${progress.percent * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {Object.entries(grouped).map(([domain, skills]) => {
              const skillsList = skills as SkillProgress[];
              if (skillsList.length === 0) return null;
              
              return (
                <div key={domain} className="bg-white p-6 rounded-2xl shadow border border-slate-200">
                  <h3 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--sa-primary)] opacity-50"></span>
                    {domain.replace('_', ' ')}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {skillsList.map((skill: SkillProgress) => (
                      <div key={skill.skillKey} className={`flex gap-4 flex-col justify-between items-start p-4 rounded-xl border transition-colors shadow-sm relative overflow-hidden group ${skill.masteryLevel === 'weak' ? 'bg-red-50 hover:bg-red-100 border-red-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200'}`}>
                        <div className={`absolute top-0 bottom-0 left-0 w-1 ${skill.masteryLevel === 'weak' ? 'bg-red-500 opacity-100' : 'bg-[var(--sa-primary)] opacity-0 group-hover:opacity-100'} transition-opacity`}></div>
                          <div className="flex gap-4 w-full flex-col lg:flex-row justify-between items-start lg:items-center">
                            <span className={`font-bold w-full lg:w-1/3 truncate ${skill.masteryLevel === 'weak' ? 'text-red-700 text-lg' : skill.masteryLevel === 'developing' ? 'text-blue-700 text-base' : 'text-green-700 text-sm'}`} title={formatSkillLabel(skill.skillKey)}>
                              {formatSkillLabel(skill.skillKey)}
                            </span>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-2/3 justify-between lg:justify-end">
                               <ProgressionChain masteryLevel={skill.masteryLevel} />
                               <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                 <span className="text-[11px] font-bold text-slate-500 w-16 text-center bg-white px-2 py-1 flex justify-center items-center rounded border border-slate-200 shadow-sm">
                                   <span className="text-slate-800 ml-1">{skill.lastAvgTime ? skill.lastAvgTime.toFixed(1) : '-. -'}s</span>
                                 </span>
                                 
                                 {skill.masteryLevel === 'weak' && (
                                   <button
                                     onClick={() => {
                                       import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                                         const plan = lessonGeneratorService.generateLessonFromSkill(skill.skillKey);
                                         onGenerateLesson(plan);
                                       });
                                     }}
                                     className="sa-btn bg-red-600 text-white font-black text-[10px] uppercase tracking-wider py-1 px-3 shadow-sm border-b-2 border-red-800 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all"
                                   >
                                     <span className="flex items-center gap-1">Fix</span>
                                   </button>
                                 )}
                               </div>
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};
