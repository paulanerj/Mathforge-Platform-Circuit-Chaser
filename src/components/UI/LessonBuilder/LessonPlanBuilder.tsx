import React, { useState, useEffect, useRef } from 'react';
import { PracticePlan, PracticeLevelConfig } from '../../../types/practicePlan';
import { ACTIVITY_PRESETS, ActivityPreset } from '../../../config/activityPresets';
import { PracticePlanController } from '../../../services/practicePlanController';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import { SafeStorage } from '../../../services/safeStorage';
import { STORAGE_KEYS } from '../../../constants';

export const LessonPlanBuilder: React.FC<{
  config: any;
  onClose: () => void;
  onStart: (config: any) => void;
}> = ({ config, onClose, onStart }) => {
  const [activePlan, setActivePlan] = useState<PracticePlan | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<PracticePlan[]>([]);
  const { activeId, trigger } = useConfirmAction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const parsed = SafeStorage.getItem<{ plans: PracticePlan[] } | null>(STORAGE_KEYS.LESSON_PLANS, null);
      if (parsed && parsed.plans) {
        // Migration check for version/timestamp
        const upgradedPlans = parsed.plans.map(p => ({
          ...p,
          version: p.version || 1,
          updatedAt: p.updatedAt || p.createdAt || Date.now()
        }));
        setSavedPlans(upgradedPlans);
      }
    } catch (e) {
      console.error('Failed to load lesson plans', e);
    }
    
    // Resume previous builder state if a plan is currently loaded
    const currentPlan = PracticePlanController.getCurrentPlan();
    if (currentPlan) {
      setActivePlan(currentPlan);
    }
  }, []);

  const saveLessonPlan = () => {
    if (!activePlan) return;
    const planToSave = { ...activePlan, updatedAt: Date.now(), version: 1 };
    const existingIndex = savedPlans.findIndex(p => p.planId === activePlan.planId);
    let newPlans = [...savedPlans];
    if (existingIndex >= 0) {
      newPlans[existingIndex] = planToSave;
    } else {
      newPlans.push(planToSave);
    }
    setSavedPlans(newPlans);
    setActivePlan(planToSave);
    try {
      SafeStorage.setItem(STORAGE_KEYS.LESSON_PLANS, { plans: newPlans });
    } catch (e) {
      console.error('Failed to save lesson plans', e);
    }
  };

  const deletePlan = (planId: string) => {
    const newPlans = savedPlans.filter(p => p.planId !== planId);
    setSavedPlans(newPlans);
    SafeStorage.setItem(STORAGE_KEYS.LESSON_PLANS, { plans: newPlans });
    if (activePlan?.planId === planId) {
      setActivePlan(null);
      setSelectedActivity(null);
    }
  };

  const startLessonPlan = () => {
    if (!activePlan || activePlan.levels.length === 0) return;
    saveLessonPlan();
    PracticePlanController.loadPlan(activePlan);
    const level = PracticePlanController.getCurrentLevel();
    if (level) {
      const newConfig = PracticePlanController.mapLevelToAppConfig(level, config);
      onStart(newConfig);
    }
  };

  const exportPlans = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ version: 1, type: "mathforge_export", plans: savedPlans }));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `mathforge_plans_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.plans && Array.isArray(parsed.plans)) {
          // Merge safely avoiding duplicates if ID matches exactly, else append
          let newPlans = [...savedPlans];
          parsed.plans.forEach((importedPlan: PracticePlan) => {
            const existingIdx = newPlans.findIndex(p => p.planId === importedPlan.planId);
            if (existingIdx >= 0) {
              newPlans[existingIdx] = importedPlan;
            } else {
              newPlans.push(importedPlan);
            }
          });
          setSavedPlans(newPlans);
          SafeStorage.setItem(STORAGE_KEYS.LESSON_PLANS, { plans: newPlans });
          alert("Import successful!");
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const loadSavedPlan = (plan: PracticePlan) => {
    setActivePlan(plan);
    setSelectedActivity(null);
  };

  const moveUp = (index: number) => {
    if (!activePlan || index === 0) return;

    const updated = [...activePlan.levels];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];

    setActivePlan({ ...activePlan, levels: updated });
  };

  const moveDown = (index: number) => {
    if (!activePlan || index === activePlan.levels.length - 1) return;

    const updated = [...activePlan.levels];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];

    setActivePlan({ ...activePlan, levels: updated });
  };

  const deleteActivity = (index: number) => {
    if (!activePlan) return;
    const removed = activePlan.levels[index];
    const updated = [...activePlan.levels];
    updated.splice(index, 1);
    
    let nextSelected = selectedActivity;
    if (selectedActivity === removed.levelId) {
      nextSelected = updated.length > 0 ? updated[Math.min(index, updated.length - 1)].levelId : null;
    }
    
    setActivePlan({...activePlan, levels: updated});
    setSelectedActivity(nextSelected);
  };

  const duplicateActivity = (index: number) => {
    if (!activePlan) return;
    const toDuplicate = activePlan.levels[index];
    const duplicated: PracticeLevelConfig = {
      ...toDuplicate,
      levelId: 'l_' + Date.now() + Math.random(),
    };
    const newLevels = [...activePlan.levels];
    newLevels.splice(index + 1, 0, duplicated);
    setActivePlan({...activePlan, levels: newLevels});
  };

  const insertActivity = (preset: ActivityPreset) => {
    if (!activePlan) return;
    const newLvl: PracticeLevelConfig = {
      levelId: 'l_' + Date.now() + Math.random(),
      title: preset.name,
      mode: preset.config.mode || 'standard',
      difficulty: preset.config.difficulty || 2,
      steps: preset.config.steps || 20,
      targetResponseTime: preset.config.targetResponseTime || 5,
      skipStep: preset.config.skipStep,
      patternType: preset.config.patternType,
      patternRule: preset.config.patternRule,
      sequenceLength: preset.config.sequenceLength,
      tableSelection: preset.config.tableSelection,
      starThresholds: {
        oneStar: { completion: true },
        twoStar: { accuracy: 0.7 },
        threeStar: { accuracy: 0.85 },
        fourStar: { accuracy: 0.95 },
        fiveStar: { accuracy: 1.0 }
      }
    };
    setActivePlan({...activePlan, levels: [...activePlan.levels, newLvl]});
    setSelectedActivity(newLvl.levelId);
  };

  const addPresetActivity = (mode: string) => {
    if (!activePlan) return;
    const presetConfig = ACTIVITY_PRESETS.find(p => p.config.mode === mode) || ACTIVITY_PRESETS[0];
    insertActivity({ ...presetConfig, name: mode.replace('_', ' ') });
  };

  const calculateEstimatedTime = () => {
    if (!activePlan) return 0;
    const seconds = activePlan.levels.reduce((acc, l) => acc + (l.steps * (l.targetResponseTime || 5)), 0);
    return Math.ceil(seconds / 60);
  };

  return (
    <div data-guide-id="lesson-builder-root" className="absolute inset-0 z-50 bg-[#e0ebf5] flex flex-col font-sans">
      {/* TOP HEADER */}
      <div className="h-16 bg-white border-b border-slate-300 flex items-center justify-between px-6 shadow-sm shrink-0">
        <div className="flex gap-8 text-sm font-bold text-slate-500">
          <button onClick={onClose} className="hover:text-slate-800 uppercase tracking-widest text-slate-400">Home</button>
          <button className="text-blue-600 uppercase tracking-widest border-b-2 border-blue-600 pb-1">Lesson Plans</button>
        </div>
        <div>
          <button onClick={onClose} className="sa-btn px-4 py-2 text-xs font-black bg-white border-2 border-slate-300 text-slate-600 shadow-none uppercase hover:bg-slate-50">Exit</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - TEMPLATES */}
        <div className="w-64 bg-white border-r border-slate-300 flex flex-col p-4 overflow-y-auto shrink-0 shadow-sm z-10 space-y-6 hidden md:block">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Create Lesson Plan</h2>
            <button onClick={() => setActivePlan({
              planId: 'plan_' + Date.now(),
              title: 'New Lesson Plan',
              description: '',
              createdAt: Date.now(),
              levels: []
            })} className="w-full bg-blue-600 text-white font-black uppercase text-xs tracking-wider py-3 rounded-lg shadow-sm hover:bg-blue-700 transition">
              Create New
            </button>
          </div>

          {savedPlans.length > 0 && (
             <div>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 mt-4 flex justify-between items-center">
               Saved Plans
               <button onClick={exportPlans} className="text-blue-500 hover:text-blue-700">Export</button>
             </h3>
             <div data-guide-id="lesson-plan-list" className="space-y-1">
               {savedPlans.map(p => (
                 <div key={p.planId} className="flex group bg-slate-50 hover:bg-slate-100 rounded-md transition border border-transparent hover:border-slate-200">
                   <button onClick={() => loadSavedPlan(p)} className="flex-1 text-left px-3 py-2 text-sm font-bold text-slate-600 truncate">
                     {p.title || 'Untitled Plan'}
                     <div className="text-[10px] font-normal text-slate-400 mt-0.5">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Unknown date'}</div>
                   </button>
                   <button onClick={() => trigger(() => deletePlan(p.planId), 'del_' + p.planId)} className={`w-10 flex items-center justify-center transition-colors ${activeId === 'del_' + p.planId ? 'bg-red-500 text-white rounded-r-md text-[10px] font-black' : 'text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}>
                     {activeId === 'del_' + p.planId ? 'DEL?' : '✕'}
                   </button>
                 </div>
               ))}
             </div>
           </div>
          )}

          <div className="pt-4 border-t border-slate-200 mt-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Import Plans</h3>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition border border-slate-200 text-center">
              Import JSON
            </button>
          </div>

          {activePlan && (
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Smart Presets</h3>
              <div className="space-y-1 mt-2">
                {ACTIVITY_PRESETS.map((preset, idx) => (
                   <button key={idx} onClick={() => insertActivity(preset)} className="w-full flex tracking-tight flex-col text-left px-3 py-2 text-sm font-bold text-slate-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200">
                     <span>+ {preset.name}</span>
                     <span className="text-[10px] font-medium text-emerald-600 mt-0.5">{preset.subtitle}</span>
                   </button>
                ))}
              </div>
            </div>
          )}

          {activePlan && (
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Add Blank Activity</h3>
              <div className="space-y-1 mt-2">
                <button onClick={() => addPresetActivity('skipcount')} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition border border-slate-200">+ Skip Counting</button>
                <button onClick={() => addPresetActivity('pattern')} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition border border-slate-200">+ Pattern Logic</button>
                <button onClick={() => addPresetActivity('multiplication_fluency')} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition border border-slate-200">+ Multiplication Fluency</button>
                <button onClick={() => addPresetActivity('skip_rhythm')} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition border border-slate-200">+ Skip Rhythm</button>
                <button onClick={() => addPresetActivity('mixed')} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition border border-slate-200">+ Mixed Arithmetic</button>
              </div>
            </div>
          )}
        </div>

        {/* CENTER PANEL - TIMELINE */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto p-4 md:p-8 items-center relative">
          {!activePlan ? (
            <div className="text-center mt-20 opacity-50">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-xl font-black">Select or Create a Lesson Plan</h2>
            </div>
          ) : (
            <div className="max-w-2xl w-full flex flex-col min-h-full">
              {activePlan?.planId.startsWith('generated-') && activePlan.levels.length > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 px-5 py-4 rounded-2xl mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xl font-black flex items-center gap-2">🎯 Targeted Practice</span>
                    <span className="text-sm font-bold opacity-80 mt-1">{activePlan.title.replace('Practice — ', '')}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const baseConfig = PracticePlanController.mapLevelToAppConfig(activePlan.levels[0], config);
                      onStart(baseConfig);
                    }} 
                    className="sa-btn bg-emerald-600 text-white font-black text-sm px-6 py-3 hover:bg-emerald-700 shadow flex items-center justify-center gap-2 tracking-widest uppercase"
                  >
                    Play Now
                  </button>
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 shrink-0 relative">
                <input 
                  type="text" 
                  value={activePlan.title} 
                  onChange={e => setActivePlan({...activePlan, title: e.target.value})}
                  className="text-2xl font-black w-full border-none outline-none focus:ring-0 p-0 text-slate-800"
                  placeholder="Lesson Plan Name"
                />
                
                {activePlan.description ? (
                  <div className="mt-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                      <span className="text-lg">🎯</span> {activePlan.description}
                    </p>
                  </div>
                ) : null}

                <div className="flex justify-between items-center mt-2">
                  <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded border border-rose-100 flex items-center gap-1 shrink-0">
                    <span className="text-xs">⚠️</span> Lesson overrides all global settings
                  </div>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
                    <span>Est:</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {calculateEstimatedTime()} min
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {activePlan.levels.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center">
                    <p className="text-slate-400 font-bold mb-4">No activities yet.</p>
                    <div className="md:hidden">
                      <button onClick={() => insertActivity(ACTIVITY_PRESETS[0])} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">Add Counting</button>
                    </div>
                  </div>
                ) : (
                  activePlan.levels.map((level, i) => (
                    <div key={level.levelId} onClick={() => setSelectedActivity(level.levelId)} className={`bg-white p-5 rounded-2xl cursor-pointer shadow-sm border-2 transition relative ${selectedActivity === level.levelId ? 'border-blue-500 shadow-md transform scale-[1.01]' : 'border-slate-200 hover:border-blue-300'}`}>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          trigger(() => deleteActivity(i), level.levelId);
                        }} 
                        className={`absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-full transition-colors leading-none z-10 ${activeId === level.levelId ? 'bg-red-500 text-white text-xs font-black' : 'text-slate-300 hover:bg-red-50 hover:text-red-500 text-xl'}`}
                      >
                        {activeId === level.levelId ? 'SURE?' : '✕'}
                      </button>
                      
                      <div className="absolute left-2 top-5 flex flex-col gap-1 z-10">
                        <button onClick={(e) => { e.stopPropagation(); moveUp(i); }} disabled={i === 0} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded bg-white transition-colors font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
                        <button onClick={(e) => { e.stopPropagation(); moveDown(i); }} disabled={i === activePlan.levels.length - 1} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded bg-white transition-colors font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
                      </div>

                      <div className="flex justify-between items-start mb-2 pl-8 pr-6">
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">{level.title || `Activity ${i+1}`}</h3>
                          <div className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-widest">{level.mode.replace('_', ' ')}</div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4 mt-2">
                          <button onClick={(e) => { e.stopPropagation(); duplicateActivity(i); }} className="text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-emerald-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">Dup</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-500 font-medium pl-4 mt-4 border-t border-slate-100 pt-3">
                        <div>Problems: <span className="font-bold text-slate-700">{level.steps}</span></div>
                        <div>Difficulty: <span className="font-bold text-slate-700">{level.difficulty}</span></div>
                        {(level.mode === 'skipcount' || level.mode === 'skip_rhythm') && <div>Step Size: <span className="font-bold text-slate-700">{level.skipStep}</span></div>}
                        {level.mode === 'pattern' && <div>Rule: <span className="font-bold text-slate-700">{level.patternRule}</span></div>}
                        {level.mode === 'multiplication_fluency' && level.tableSelection && <div>Table: <span className="font-bold text-slate-700">{level.tableSelection.join(', ')}</span></div>}
                        <div>Target Time: <span className="font-bold text-slate-700">{level.targetResponseTime || 5}s</span></div>
                        <div>Est. Time: <span className="font-bold text-slate-700">{Math.ceil((level.steps * (level.targetResponseTime || 5)) / 60)} min</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 flex justify-center gap-4 border-t border-slate-300 pt-6 pb-12 shrink-0">
                <button onClick={() => setActivePlan(null)} className="px-6 py-3 font-black text-slate-500 bg-white border-2 border-slate-300 rounded-xl uppercase tracking-widest text-sm hover:bg-slate-50 transition">Cancel</button>
                <button 
                  onClick={saveLessonPlan} 
                  disabled={activePlan.levels.length === 0}
                  className="px-8 py-3 font-black text-white bg-blue-600 border-2 border-blue-600 rounded-xl uppercase tracking-widest text-sm hover:bg-blue-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Lesson Plan
                </button>
                <button 
                  onClick={startLessonPlan} 
                  disabled={activePlan.levels.length === 0}
                  className="px-8 py-3 font-black text-white bg-emerald-500 border-2 border-emerald-500 rounded-xl uppercase tracking-widest text-sm hover:bg-emerald-600 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▶ Start
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Activity Editor */}
        {activePlan && selectedActivity && (
          <div data-guide-id="lesson-step-editor" className="w-80 bg-white border-l border-slate-300 flex flex-col p-6 overflow-y-auto shrink-0 shadow-sm z-10 animate-fade-in-right transform origin-right">
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Activity Editor</h2>
              <button onClick={() => setSelectedActivity(null)} className="text-slate-400 hover:text-slate-700 text-lg">×</button>
            </div>
            
            {(() => {
              const activity = activePlan.levels.find(l => l.levelId === selectedActivity);
              if (!activity) return null;
              
              return (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Activity Name</label>
                    <input 
                      type="text" 
                      value={activity.title} 
                      onChange={e => {
                        const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, title: e.target.value} : l);
                        setActivePlan({...activePlan, levels: updated});
                      }}
                      className="w-full sa-input font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Activity Type</label>
                    <select 
                      data-guide-id="mode-selector"
                      value={activity.mode}
                      onChange={e => {
                        const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, mode: e.target.value} : l);
                        setActivePlan({...activePlan, levels: updated});
                      }}
                      className="w-full sa-input bg-slate-50 border-slate-300 text-slate-700 font-bold"
                    >
                      <option value="skipcount">Skip Counting</option>
                      <option value="pattern">Pattern Logic</option>
                      <option value="multiplication_fluency">Multiplication Fluency</option>
                      <option value="skip_rhythm">Skip Rhythm</option>
                      <option value="mixed">Mixed Arithmetic</option>
                    </select>
                  </div>

                  {activity.mode === 'pattern' && (
                    <div className="border-t border-slate-200 pt-4 space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pattern Settings</h3>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Pattern Family</label>
                        <select 
                          value={activity.patternType || 'arithmetic'}
                          onChange={e => {
                            const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, patternType: e.target.value} : l);
                            setActivePlan({...activePlan, levels: updated});
                          }}
                          className="w-full sa-input text-sm"
                        >
                          <option value="arithmetic">Arithmetic</option>
                          <option value="skip">Skip</option>
                          <option value="geometric">Geometric</option>
                          <option value="alternating">Alternating</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">Rule</label>
                          <input 
                            type="text" 
                            value={activity.patternRule || '+3'}
                            onChange={e => {
                              const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, patternRule: e.target.value} : l);
                              setActivePlan({...activePlan, levels: updated});
                            }}
                            className="w-full sa-input"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">Seq. Length</label>
                          <input 
                            type="number" 
                            value={activity.sequenceLength || 4}
                            onChange={e => {
                              const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, sequenceLength: Number(e.target.value)} : l);
                              setActivePlan({...activePlan, levels: updated});
                            }}
                            className="w-full sa-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(activity.mode === 'skipcount' || activity.mode === 'skip_rhythm') && (
                    <div className="border-t border-slate-200 pt-4 space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Skip Settings</h3>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Step Size</label>
                        <input 
                          type="number" 
                          value={activity.skipStep || 2}
                          onChange={e => {
                            const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, skipStep: Number(e.target.value)} : l);
                            setActivePlan({...activePlan, levels: updated});
                          }}
                          className="w-full sa-input"
                        />
                      </div>
                    </div>
                  )}

                  {activity.mode === 'multiplication_fluency' && (
                     <div className="border-t border-slate-200 pt-4 space-y-4">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Multiplication Settings</h3>
                     <div>
                       <label className="text-xs font-bold text-slate-600 mb-1 block">Table</label>
                       <input 
                         type="number" 
                         value={activity.tableSelection?.[0] || 3}
                         onChange={e => {
                           const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, tableSelection: [Number(e.target.value)]} : l);
                           setActivePlan({...activePlan, levels: updated});
                         }}
                         className="w-full sa-input"
                       />
                     </div>
                   </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Session Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Problems</label>
                        <input 
                          type="number" 
                          value={activity.steps}
                          onChange={e => {
                            const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, steps: Number(e.target.value)} : l);
                            setActivePlan({...activePlan, levels: updated});
                          }}
                          className="w-full sa-input"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Difficulty</label>
                        <select 
                          value={activity.difficulty}
                          onChange={e => {
                            const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, difficulty: Number(e.target.value)} : l);
                            setActivePlan({...activePlan, levels: updated});
                          }}
                          className="w-full sa-input"
                        >
                          <option value={1}>1 - Beginner</option>
                          <option value={2}>2 - Easy</option>
                          <option value={3}>3 - Medium</option>
                          <option value={4}>4 - Hard</option>
                          <option value={5}>5 - Expert</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Timing Target</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Target Time Per Answer (seconds)</label>
                        <input 
                          type="number" 
                          min={1}
                          max={10}
                          value={activity.targetResponseTime || 5}
                          onChange={e => {
                            let val = Number(e.target.value);
                            if (val < 1) val = 1;
                            if (val > 10) val = 10;
                            const updated = activePlan.levels.map(l => l.levelId === selectedActivity ? {...l, targetResponseTime: val} : l);
                            setActivePlan({...activePlan, levels: updated});
                          }}
                          className="w-full sa-input"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Used for star scoring and performance evaluation</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <button onClick={() => setSelectedActivity(null)} className="w-full py-3 sa-btn bg-blue-600 text-white font-black uppercase text-xs tracking-widest">
                      Done Editing
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  );
};


