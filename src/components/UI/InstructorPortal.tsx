/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { recommendationService, Recommendation } from '../../services/recommendationService';
import { PracticePlanController } from '../../services/practicePlanController';

export const InstructorPortal = ({ 
  actions, 
  onNavigate,
  onClose,
  setIsOptionsOpen
}: { 
  actions: any; 
  onNavigate: (s: any) => void;
  onClose: () => void;
  setIsOptionsOpen: (v: boolean) => void;
}) => {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    setRecommendation(recommendationService.getLastRecommendation());
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-[var(--sa-ui-bg)] flex flex-col items-center p-6 overflow-y-auto">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow border border-slate-200">
           <div>
             <h1 className="text-2xl font-black text-slate-800">Instructor Portal</h1>
             <p className="text-sm font-bold text-slate-500">Manage lessons, track progress, and configure the training engine.</p>
           </div>
           <button 
             onClick={onClose} 
             className="sa-btn px-6 py-2 bg-slate-100 font-bold uppercase tracking-widest text-slate-500 rounded-full border-2 border-slate-200 hover:bg-slate-200 transition-colors"
           >
             Exit
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Training & Lessons */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* Primary Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setIsOptionsOpen(true);
                }}
                className="group relative flex flex-col items-start p-6 bg-blue-600 text-white rounded-2xl shadow-xl border-b-8 border-blue-800 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all"
              >
                <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🎯</span>
                <span className="text-xl font-black uppercase tracking-tight">Free Practice</span>
                <span className="text-sm font-bold opacity-80 text-left">Quick session with standard settings</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('lesson_builder');
                }}
                className="group relative flex flex-col items-start p-6 bg-amber-400 text-amber-900 rounded-2xl shadow-xl border-b-8 border-amber-600 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all"
              >
                <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📋</span>
                <span className="text-xl font-black uppercase tracking-tight">Lesson Plans</span>
                <span className="text-sm font-bold opacity-80 text-left">Build custom training sequences</span>
              </button>
            </div>

            {/* Recommendations (Moved from StartScreen) */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-1">
                <span className="text-sm">🤖</span> AI Recommendations
              </h2>
              {recommendation ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xl font-black text-emerald-900 mb-1">{recommendation.label}</div>
                    <div className="text-sm font-bold text-emerald-700 opacity-80">{recommendation.reason}</div>
                  </div>
                  <button 
                    onClick={() => {
                      import('../../services/lessonGeneratorService').then(({ lessonGeneratorService }) => {
                        const plan = lessonGeneratorService.generateLessonFromSkill(recommendation.skillKey);
                        PracticePlanController.loadPlan(plan);
                        onNavigate('lesson_builder');
                      });
                    }}
                    className="sa-btn px-6 py-3 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all whitespace-nowrap"
                  >
                    Start Recommended
                  </button>
                </div>
              ) : (
                <div className="text-sm font-bold text-emerald-700 opacity-80 py-2">
                  Complete more sessions to generate smart recommendations.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Analytics & Quick Links */}
          <div className="flex flex-col gap-6">
             <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Analytics</h3>
               <div className="flex flex-col gap-3">
                 <button
                   onClick={() => onNavigate('progress')}
                   className="w-full py-4 px-4 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 font-black flex items-center gap-3 hover:bg-indigo-100 transition-colors"
                 >
                   <span className="text-xl">📊</span>
                   <span className="uppercase tracking-widest text-sm text-left">Detailed Progress</span>
                 </button>
                 <button
                   onClick={() => onNavigate('skill_map')}
                   className="w-full py-4 px-4 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 font-black flex items-center gap-3 hover:bg-indigo-100 transition-colors"
                 >
                   <span className="text-xl">🌐</span>
                   <span className="uppercase tracking-widest text-sm text-left">Skill Universe</span>
                 </button>
               </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Support</h3>
                <p className="text-xs font-bold text-slate-500 mb-4 leading-relaxed">
                  Instructor Mode allows you to override the automated path and target specific skill regressions.
                </p>
                <div className="flex flex-col gap-2">
                   <div className="text-[10px] font-black text-slate-400 uppercase">Pro Tips:</div>
                   <div className="text-[11px] font-bold text-slate-600">• Use Lesson Plans to build multiplication table focal points.</div>
                   <div className="text-[11px] font-bold text-slate-600">• Check weak areas after every 10 sessions.</div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
