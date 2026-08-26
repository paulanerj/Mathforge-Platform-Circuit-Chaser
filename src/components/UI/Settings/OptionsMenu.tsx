/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppConfig } from '../../../types';
import { CurriculumEditor } from './CurriculumEditor';
import { DifficultySlider } from '../DifficultySlider';
import { ModeConfigurationPanel } from './modes/ModeConfigurationPanel';
import { useTheme } from '../../../theme/useTheme';

const PRESETS = [
  {
    id: 'p1',
    name: 'Beginner Arithmetic',
    config: {
      learningMode: 'standard',
      opsEnabled: { '+': true, '-': false, '×': false, '÷': false },
      rangeMin: 0,
      rangeMax: 10,
      modifiersPerStep: 1,
      timerOn: false,
    },
  },
  {
    id: 'p2',
    name: 'Addition & Subtraction Practice',
    config: {
      learningMode: 'standard',
      opsEnabled: { '+': true, '-': true, '×': false, '÷': false },
      rangeMin: 0,
      rangeMax: 20,
      modifiersPerStep: 1,
      timerOn: true,
    },
  },
  {
    id: 'p3',
    name: 'Multiplication Tables',
    config: { learningMode: 'multiplication', multBase: 4, multMaxFactor: 10, timerOn: true },
  },
  {
    id: 'p4',
    name: 'Skip Counting Trainer',
    config: { learningMode: 'skipcount', skipBase: 5, rangeMin: 0, rangeMax: 100, timerOn: true },
  },
  {
    id: 'p5',
    name: 'Skip Rhythm Mode',
    config: { learningMode: 'skip_rhythm', difficultyLevel: 5, timerOn: true },
  },
];

export const OptionsMenu = ({
  config,
  isOpen,
  onClose,
  onApply,
}: {
  config: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  onApply: (c: AppConfig) => void;
}) => {
  const [temp, setTemp] = useState(config);
  const [mainTab, setMainTab] = useState<'MODES'|'ANSWER_GEN'|'DIFFICULTY'|'ADVANCED'>('MODES');
  const [activeTab, setActiveTab] = useState('Game & Timing');
  const [isProfessorMode, setIsProfessorMode] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const theme = useTheme();

  const tabsRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setTemp(JSON.parse(JSON.stringify(config)));
      setIsProfessorMode(false);
      setActiveTab('Game & Timing');
      setToastMsg('');
    }
  }, [config, isOpen]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!tabsRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - tabsRef.current.offsetLeft;
    scrollLeftPos.current = tabsRef.current.scrollLeft;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !tabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    tabsRef.current.scrollLeft = scrollLeftPos.current - walk;
  };

  const onMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (tabsRef.current) {
      tabsRef.current.scrollLeft += e.deltaY;
    }
  };

  const update = (key: keyof AppConfig, value: any) => setTemp((prev) => ({ ...prev, [key]: value }));

  const updateOp = (op: string, value: boolean) => {
    const newOps = { ...temp.opsEnabled, [op]: value };
    const activeOps = Object.keys(newOps).filter((k) => newOps[k]);

    if (activeOps.length === 0) return;

    if (temp.learningMode === 'standard' && activeOps.length === 1 && activeOps[0] === '×') {
      setTemp((prev) => ({ ...prev, opsEnabled: newOps, learningMode: 'multiplication' }));
      setToastMsg('Multiplication Trainer Activated! Engine auto-switched to table traversal mode.');
      setTimeout(() => setToastMsg(''), 5000);
    } else {
      setTemp((prev) => ({ ...prev, opsEnabled: newOps }));
    }
  };

  const applyPreset = (preset: any) => {
    setTemp((prev) => ({ ...prev, ...preset.config }));
    setToastMsg(`Loaded Preset: ${preset.name}`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const addPhase = () => update('phaseSequence', [...temp.phaseSequence, { mode: 'normal', count: 3 }]);
  const updatePhase = (index: number, key: string, val: any) => {
    const newSeq = [...temp.phaseSequence];
    (newSeq[index] as any)[key] = val;
    update('phaseSequence', newSeq);
  };
  const removePhase = (index: number) => update('phaseSequence', temp.phaseSequence.filter((_, i) => i !== index));

  if (!isOpen) return null;

  const isLockedPhaseMode = temp.learningMode === 'multiplication' || 
                            temp.learningMode === 'multiplication_linear' || 
                            temp.learningMode === 'multiplication_pattern' || 
                            temp.learningMode === 'skip_rhythm' || 
                            temp.learningMode === 'pattern';

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm z-[200] flex items-center justify-center p-4 lg:p-12"
      style={{
        background: theme.tokens.panels.settings.backdrop,
        '--mf-options-section-title': theme.tokens.panels.settings.sectionTitleColor,
        '--mf-options-section-divider': theme.tokens.panels.settings.sectionDividerColor,
        '--mf-options-passive-section-bg': theme.tokens.panels.settings.passiveSectionBackground,
        '--mf-options-muted-text': theme.tokens.panels.settings.mutedTextColor
      } as React.CSSProperties}
    >
      <div 
        className="sa-card w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]"
        style={{
          background: theme.tokens.panels.settings.panel.background,
          borderColor: theme.tokens.panels.settings.panel.borderColor,
          boxShadow: theme.tokens.panels.settings.panel.boxShadow
        }}
      >
        <div 
          className="p-6 pb-4 border-b shrink-0 z-20"
          style={{ borderColor: theme.tokens.panels.settings.panel.borderColor }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 
                className="text-2xl font-black uppercase"
                style={{ color: theme.tokens.panels.settings.titleColor }}
              >
                DEFAULT PRACTICE SETTINGS
              </h2>
              <p 
                className="text-xs font-bold uppercase tracking-widest mt-1 opacity-70"
                style={{ color: theme.tokens.panels.settings.bodyColor }}
              >
                Used for Free Practice Mode
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-full border border-[var(--mf-options-section-divider)] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-[var(--sa-ui-accent)] uppercase">Instructor Mode</span>
              <input
                type="checkbox"
                checked={isProfessorMode}
                onChange={(e) => setIsProfessorMode(e.target.checked)}
                className="w-5 h-5 accent-[var(--sa-ui-accent)] cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div 
          className="p-6 overflow-y-auto flex-1 relative"
          style={{ color: theme.tokens.panels.settings.bodyColor }}
        >
          {toastMsg && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 sa-toast z-[300] animate-bounce-gentle text-sm font-bold text-center flex items-center gap-3 w-max max-w-[90%]">
              <span className="text-2xl">⚡</span>
              <span className="text-left">{toastMsg}</span>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="sa-settings-panel h-full border-t-4 border-t-[var(--sa-primary)]">
                <h3 className="text-[10px] font-black tracking-widest text-[var(--mf-options-section-title)] uppercase mb-4 opacity-60 flex items-center gap-2">
                  <span className="text-lg">🎮</span> Layer 1 — Learning Mode
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {(['standard', 'multiplication_linear', 'multiplication_pattern', 'skipcount', 'skip_rhythm', 'pattern', 'mixed'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setTemp((prev) => {
                          const next = { ...prev, learningMode: mode as any };
                          if (mode === 'multiplication_linear' && next.selectedTables && next.selectedTables.length > 1) {
                            next.selectedTables = [next.selectedTables[next.selectedTables.length - 1]];
                            next.multBase = next.selectedTables[0];
                          }
                          return next;
                        });
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        temp.learningMode === mode
                          ? `mode-${(mode === 'standard' || mode === 'mixed') ? 'standard' : (mode === 'multiplication_linear' || mode === 'multiplication_pattern') ? 'multiply' : mode === 'skipcount' ? 'skip' : mode === 'skip_rhythm' ? 'rhythm' : 'pattern'} shadow-md scale-[1.02] z-10 relative`
                          : 'bg-white border-[var(--sa-ui-border)] hover:bg-slate-50 grayscale opacity-70'
                      }`}
                    >
                      <div className="text-3xl">
                        {(mode === 'standard' || mode === 'mixed') ? '➕' : (mode === 'multiplication_linear' || mode === 'multiplication_pattern') ? '✖' : mode === 'skipcount' ? '⏭' : mode === 'skip_rhythm' ? '🥁' : '🔷'}
                      </div>
                      <div>
                        <div className="font-black leading-tight text-base">
                          {mode === 'standard'
                            ? 'Standard Arithmetic'
                            : mode === 'multiplication_linear'
                            ? 'Multiplication Fluency'
                            : mode === 'multiplication_pattern'
                            ? 'Multiplication Patterns'
                            : mode === 'skipcount'
                            ? 'Skip Counting'
                            : mode === 'skip_rhythm'
                            ? 'Skip Rhythm'
                            : mode === 'pattern'
                            ? 'Pattern Logic'
                            : 'Mixed Arithmetic'}
                        </div>
                        <div className="text-[10px] font-bold mt-1 opacity-80 uppercase tracking-wide">
                          {mode === 'standard'
                            ? 'Addition & Subtraction'
                            : mode === 'multiplication_linear'
                            ? 'Strict linear tables'
                            : mode === 'multiplication_pattern'
                            ? 'Advanced table traversal'
                            : mode === 'skipcount'
                            ? 'Multiples practice'
                            : mode === 'skip_rhythm'
                            ? 'Momentum Chains'
                            : mode === 'pattern'
                            ? 'Sequence reasoning'
                            : 'Mixed operations'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <ModeConfigurationPanel config={temp} update={update} updateOp={updateOp} />
            </div>

            <div className="flex-1 space-y-4 flex flex-col">
              <div className="sa-settings-panel h-full border-t-4 border-t-[var(--sa-warning)]">
                <h3 className="text-[10px] font-black tracking-widest text-[var(--mf-options-section-title)] uppercase mb-4 opacity-60 flex items-center gap-2 border-b border-[var(--mf-options-section-divider)] pb-3">
                  <span className="text-lg">📐</span> Game Structure
                </h3>
                <div className="grid grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">Total Steps</label>
                    <select
                      value={temp.totalSteps}
                      onChange={(e) => update('totalSteps', Number(e.target.value))}
                      className="sa-input w-full text-lg"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">Base Mode</label>
                    <select
                      value={temp.activeMode}
                      onChange={(e) => update('activeMode', e.target.value)}
                      className="sa-input w-full text-lg"
                    >
                      <option value="normal">Normal</option>
                      <option value="survival">Survival</option>
                    </select>
                  </div>
                  {temp.learningMode === 'standard' && (
                    <>
                      <div>
                        <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">Goal Number</label>
                        <input
                          type="number"
                          value={temp.targetNumber}
                          onChange={(e) => update('targetNumber', Number(e.target.value))}
                          className="sa-input w-full text-center text-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">
                          Allowed Offset (±)
                        </label>
                        <input
                          type="number"
                          value={temp.targetFlex}
                          onChange={(e) => update('targetFlex', Number(e.target.value))}
                          className="sa-input w-full text-center text-lg"
                        />
                      </div>
                    </>
                  )}
                </div>

                <h3 className="text-[10px] font-black tracking-widest text-[var(--mf-options-section-title)] uppercase mb-4 opacity-60 flex items-center gap-2 border-b border-[var(--mf-options-section-divider)] pb-3">
                  <span className="text-lg">🎯</span> Answer Generation
                </h3>
                <div className="grid grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">Answer Choices</label>
                    <select
                      value={temp.answerChoices || 4}
                      onChange={(e) => update('answerChoices', Number(e.target.value))}
                      className="sa-input w-full text-lg"
                    >
                      <option value={3}>3 Choices</option>
                      <option value={4}>4 Choices</option>
                      <option value={5}>5 Choices</option>
                    </select>
                  </div>
                  {isProfessorMode && (
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2 mt-2">&nbsp;</label>
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-[var(--mf-options-section-divider)]">
                        <input
                          type="checkbox"
                          checked={temp.strictValidation || false}
                          onChange={(e) => update('strictValidation', e.target.checked)}
                          className="w-4 h-4 accent-red-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[var(--mf-options-section-title)] uppercase">Strict Engine Rules</span>
                      </label>
                    </div>
                  )}
                </div>
                
                <h3 className="text-[10px] font-black tracking-widest text-[var(--mf-options-section-title)] uppercase mb-4 opacity-60 flex items-center gap-2 border-b border-[var(--mf-options-section-divider)] pb-3 mt-6">
                  <span className="text-lg">🔥</span> Difficulty Rules
                </h3>
                <div className="mt-2">
                  <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">Difficulty Level</label>
                  <DifficultySlider config={temp} onCommit={(level) => update('difficultyLevel', level)} />
                </div>

                <label className="flex items-center justify-between cursor-pointer p-4 bg-[var(--mf-options-passive-section-bg)] rounded-xl border border-[var(--mf-options-section-divider)] hover:bg-slate-100 mt-6 transition-colors">
                  <span className="font-bold text-[var(--sa-ui-text)] uppercase text-[12px]">Mute Audio</span>
                  <input
                    type="checkbox"
                    checked={temp.isMuted}
                    onChange={(e) => update('isMuted', e.target.checked)}
                    className="w-6 h-6 accent-[var(--sa-ui-accent)] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {isProfessorMode && (
            <div className="mt-8 animate-pop">
              <div className="sa-settings-panel overflow-hidden border-t-4 border-t-[#8B5CF6]">
                <div className="relative border-b border-[var(--mf-options-section-divider)] -mx-4 -mt-4 mb-6 bg-[var(--mf-options-passive-section-bg)]">
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--mf-options-passive-section-bg)] to-transparent pointer-events-none z-10" />
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--mf-options-passive-section-bg)] to-transparent pointer-events-none z-10" />
                  <div
                    className="sa-tabbar cursor-grab active:cursor-grabbing px-6 pt-4 bg-transparent border-none"
                    ref={tabsRef}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUpOrLeave}
                    onMouseLeave={onMouseUpOrLeave}
                    onWheel={onWheel}
                  >
                    {['Game & Timing', 'Phase Sequence', 'Curriculum', 'Advanced & Audio'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-4 ${
                          activeTab === tab ? 'sa-tab-active border-[var(--sa-ui-accent)]' : 'sa-tab border-transparent hover:bg-slate-200'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === 'Game & Timing' && (
                  <div className="space-y-4 animate-pop max-w-2xl mx-auto">
                    <div className="sa-card p-6 shadow-sm border border-[var(--mf-options-section-divider)] mb-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold text-[var(--sa-ui-text)] uppercase text-sm tracking-wide">Pedagogical Fail-Safe</span>
                        <input
                          type="checkbox"
                          checked={temp.pedagogicalFailSafe !== false} // defaults to true
                          onChange={(e) => update('pedagogicalFailSafe', e.target.checked)}
                          className="w-6 h-6 accent-[var(--sa-ui-accent)] cursor-pointer"
                        />
                      </label>
                      <p className="text-xs text-[var(--mf-options-muted-text)] mt-2">When enabled, incorrect answers highlight the correct button and reset the clock, reducing frustration.</p>
                    </div>

                    <div className="sa-card p-6 shadow-sm border border-[var(--mf-options-section-divider)]">
                      <label className="flex items-center justify-between cursor-pointer mb-6 border-b border-[var(--mf-options-section-divider)] pb-4">
                        <span className="font-bold text-[var(--sa-ui-text)] uppercase text-sm tracking-wide">Enable Timers</span>
                        <input
                          type="checkbox"
                          checked={temp.timerOn}
                          disabled={isLockedPhaseMode}
                          onChange={(e) => update('timerOn', e.target.checked)}
                          className="w-6 h-6 accent-[var(--sa-ui-accent)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-6">
                        <div className={`relative ${isLockedPhaseMode ? 'opacity-50 grayscale' : ''}`}>
                          {isLockedPhaseMode && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg border border-[var(--sa-warning)]">
                              <span className="text-[10px] font-black text-[var(--sa-ui-text)] text-center px-1">
                                🚫 Disabled in this mode
                              </span>
                            </div>
                          )}
                          <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">
                            Quick Mind Interval (s)
                          </label>
                          <input
                            type="number"
                            value={temp.quickMindInterval}
                            onChange={(e) => update('quickMindInterval', Number(e.target.value))}
                            disabled={!temp.timerOn || isLockedPhaseMode}
                            className="sa-input w-full text-center text-xl disabled:opacity-50"
                          />
                        </div>
                        <div className={`relative ${isLockedPhaseMode ? 'opacity-50 grayscale' : ''}`}>
                          {isLockedPhaseMode && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg border border-[var(--sa-warning)]">
                              <span className="text-[10px] font-black text-[var(--sa-ui-text)] text-center px-1">
                                🚫 Disabled in this mode
                              </span>
                            </div>
                          )}
                          <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">
                            Dark Mode Interval (s)
                          </label>
                          <input
                            type="number"
                            value={temp.darkModeInterval}
                            onChange={(e) => update('darkModeInterval', Number(e.target.value))}
                            disabled={!temp.timerOn || isLockedPhaseMode}
                            className="sa-input w-full text-center text-xl disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Phase Sequence' && (
                  <div
                    className={`sa-card p-6 shadow-sm border border-[var(--mf-options-section-divider)] animate-pop relative max-w-3xl mx-auto ${
                      isLockedPhaseMode ? 'opacity-50 grayscale' : ''
                    }`}
                  >
                    {isLockedPhaseMode && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-xl">
                        <span className="bg-[var(--sa-card)] border-2 border-[var(--sa-warning)] text-[var(--sa-ui-text)] text-sm px-6 py-4 rounded-xl font-black shadow-2xl text-center uppercase tracking-widest">
                          🚫 QMM & Dark Mode
                          <br />
                          disabled in this mode
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-6 border-b border-[var(--mf-options-section-divider)] pb-4">
                      <label className="text-xs font-black tracking-widest text-[var(--mf-options-section-title)] uppercase">
                        Phase Sequence Editor
                      </label>
                      <button
                        onClick={addPhase}
                        disabled={isLockedPhaseMode}
                        className="sa-btn px-5 py-2 text-xs font-bold bg-[var(--sa-ui-panel)] text-[var(--sa-ui-accent)] border-[var(--sa-ui-accent)]"
                      >
                        + Add Phase
                      </button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                      {temp.phaseSequence.map((phase, i) => {
                        let phaseClass = 'phase-normal';
                        if (phase.mode === 'qmm') phaseClass = 'phase-qmm';
                        if (phase.mode === 'dark') phaseClass = 'phase-dark';
                        return (
                          <div key={i} className={`flex gap-4 items-center p-3 rounded-xl border-2 ${phaseClass}`}>
                            <select
                              value={phase.mode}
                              disabled={isLockedPhaseMode}
                              onChange={(e) => updatePhase(i, 'mode', e.target.value)}
                              className="sa-input flex-1 p-3 text-sm font-black uppercase tracking-wider bg-white/80"
                            >
                              <option value="normal">Normal Mode</option>
                              <option value="qmm">Quick Mind</option>
                              <option value="dark">Dark Mode</option>
                            </select>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase opacity-60">Count</span>
                              <input
                                type="number"
                                min="1"
                                disabled={isLockedPhaseMode}
                                value={phase.count}
                                onChange={(e) => updatePhase(i, 'count', Number(e.target.value))}
                                className="sa-input w-20 p-3 text-center text-lg bg-white/80"
                              />
                            </div>
                            <button
                              disabled={isLockedPhaseMode}
                              onClick={() => removePhase(i)}
                              className="p-3 text-[var(--sa-error)] font-black text-xl hover:scale-110 transition-transform"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'Curriculum' && (
                  <div className="animate-pop space-y-6 max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
                    <div className="flex-1 sa-card p-6 border-2 border-[var(--sa-ui-accent-soft)] shadow-md bg-[var(--mf-options-passive-section-bg)]">
                      <label className="text-[11px] font-black tracking-widest text-[var(--sa-ui-accent)] uppercase block mb-4 border-b border-[var(--mf-options-section-divider)] pb-3">
                        📚 Preset Curriculum Library
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {PRESETS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => applyPreset(p)}
                            className="text-left px-5 py-4 rounded-xl border-2 border-[var(--mf-options-section-divider)] bg-white hover:border-[var(--sa-ui-accent)] hover:shadow-md transition-all font-bold text-[var(--sa-ui-text)] flex justify-between items-center text-sm group"
                          >
                            {p.name}
                            <span className="text-[10px] font-black uppercase text-[var(--sa-ui-accent)] bg-[var(--sa-ui-accent-soft)] px-3 py-1 rounded-full border border-[var(--sa-ui-accent)] group-hover:bg-[var(--sa-ui-accent)] group-hover:text-white transition-colors">
                              Load
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-[2] sa-card p-6 shadow-sm border border-[var(--mf-options-section-divider)]">
                      <label className="text-[11px] font-bold text-[var(--mf-options-section-title)] uppercase block mb-2">
                        Progression Engine
                      </label>
                      <select
                        value={temp.progressionMode}
                        onChange={(e) => update('progressionMode', e.target.value)}
                        className="sa-input w-full mb-6 text-lg"
                      >
                        <option value="curriculum">Curriculum (Lesson Plan)</option>
                        <option value="adaptive">Adaptive (Dynamic Engine)</option>
                      </select>
                      {temp.progressionMode === 'curriculum' && <CurriculumEditor />}
                    </div>
                  </div>
                )}

                {activeTab === 'Advanced & Audio' && (
                  <div className="animate-pop space-y-4 max-w-2xl mx-auto">
                    <label className="sa-card p-6 shadow-sm border border-[var(--mf-options-section-divider)] flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="font-bold text-[var(--sa-ui-text)] uppercase tracking-wide">Enable Logic Variables (x)</span>
                      <input
                        type="checkbox"
                        checked={temp.enableVariables}
                        onChange={(e) => update('enableVariables', e.target.checked)}
                        className="w-6 h-6 accent-[var(--sa-ui-accent)] cursor-pointer"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div 
          className="p-6 pt-5 border-t flex gap-4 shrink-0 z-20"
          style={{ borderColor: theme.tokens.panels.settings.panel.borderColor }}
        >
          <button onClick={onClose} className="flex-1 py-4 sa-btn text-[var(--sa-ui-text-muted)] font-black text-lg bg-[var(--sa-ui-bg)]">
            Cancel
          </button>
          <button
            onClick={() => {
              console.log("Apply button clicked", temp);
              onApply(temp);
            }}
            className="flex-[2] py-4 sa-btn !bg-[var(--sa-ui-accent)] !text-white !border-[var(--sa-ui-accent)] font-black text-lg shadow-xl hover:shadow-2xl"
          >
            Apply & Restart Session
          </button>
        </div>
      </div>
    </div>
  );
};
