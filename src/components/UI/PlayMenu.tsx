/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const PlayMenu = ({
  onClose,
  onNavigate,
  actions,
  setIsOptionsOpen
}: {
  onClose: () => void;
  onNavigate: (s: any) => void;
  actions: any;
  setIsOptionsOpen: (v: boolean) => void;
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-[var(--sa-ui-bg)] flex flex-col items-center p-6 overflow-y-auto w-full h-full">
      <div className="w-full max-w-lg flex flex-col gap-6 mt-12 mb-20 animate-fade-in-up">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-slate-800 drop-shadow-sm">Choose how you want to play</h1>
          <p className="text-slate-500 font-bold mt-2">Pick an option below to start!</p>
        </div>

        {/* Guided Flow */}
        <button
          onClick={() => {
            onNavigate('child_dashboard');
          }}
          className="group relative sa-btn flex flex-col items-start p-6 bg-emerald-50 text-emerald-900 rounded-3xl shadow-lg border-4 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-100 hover:-translate-y-1 hover:shadow-xl active:translate-y-1 active:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl group-hover:scale-110 transition-transform">🗺️</span>
            <span className="text-2xl font-black uppercase tracking-tight text-emerald-700">Continue Journey</span>
          </div>
          <span className="text-sm font-bold opacity-80 text-emerald-800/80 pl-14">Follow your learning path and get recommendations.</span>
        </button>

        {/* Buffet Mode */}
        <button
          onClick={() => {
            setIsOptionsOpen(true);
          }}
          className="group relative sa-btn flex flex-col items-start p-6 bg-blue-50 text-blue-900 rounded-3xl shadow-lg border-4 border-blue-300 hover:border-blue-400 hover:bg-blue-100 hover:-translate-y-1 hover:shadow-xl active:translate-y-1 active:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl group-hover:scale-110 transition-transform">🎛️</span>
            <span className="text-2xl font-black uppercase tracking-tight text-blue-700">Choose What To Practice</span>
          </div>
          <span className="text-sm font-bold opacity-80 text-blue-800/80 pl-14">Pick arithmetic, multiplication, patterns, skip counting, or mixed practice.</span>
        </button>

        {/* Quick Play */}
        <button
          onClick={() => {
            actions.startGame();
            onNavigate('playing');
          }}
          className="group relative sa-btn flex flex-col items-start p-6 bg-amber-50 text-amber-900 rounded-3xl shadow-lg border-4 border-amber-300 hover:border-amber-400 hover:bg-amber-100 hover:-translate-y-1 hover:shadow-xl active:translate-y-1 active:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl group-hover:scale-110 transition-transform">⚡</span>
            <span className="text-2xl font-black uppercase tracking-tight text-amber-700">Quick Play</span>
          </div>
          <span className="text-sm font-bold opacity-80 text-amber-800/80 pl-14">Start right away with your current practice settings.</span>
        </button>

        {/* Circuit Climb (Development Integration) */}
        <button
          id="cc-playmenu-btn"
          onClick={() => {
            onNavigate('circuit_climb');
          }}
          className="group relative sa-btn flex flex-col items-start p-6 bg-sky-950 text-sky-100 rounded-3xl shadow-lg border-4 border-sky-600 hover:border-sky-500 hover:bg-sky-900/60 hover:-translate-y-1 hover:shadow-xl active:translate-y-1 active:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl group-hover:scale-110 transition-transform">🧗</span>
            <span className="text-2xl font-black uppercase tracking-tight text-sky-400">Circuit Climb</span>
          </div>
          <span className="text-sm font-bold opacity-80 text-sky-300/80 pl-14">Play the endless vertical arithmetic climbing prototype.</span>
        </button>
        
        {/* Back Button */}
        <button
          onClick={onClose}
          className="mt-6 self-center sa-btn px-8 py-3 bg-white font-black uppercase tracking-widest text-slate-500 rounded-full border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
        >
          Back
        </button>

      </div>
    </div>
  );
};
