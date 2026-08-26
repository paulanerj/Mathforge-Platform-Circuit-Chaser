import React, { useEffect, useState } from 'react';
import { SkillProgress } from '../../types/skillProgress';
import { SkillProgressService } from '../../services/skillProgressService';

interface SkillMapProps {
  onClose: () => void;
  onNodeClick?: (skillKey: string) => void;
}

interface MapNode {
  skillKey: string;
  label: string;
  progress?: SkillProgress;
}

const MULTIPLICATION_NODES: MapNode[] = [2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
  skillKey: `multiplication.table.${n}`,
  label: `${n}`
}));

const SKIP_COUNTING_NODES: MapNode[] = [2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
  skillKey: `skipcount.step.${n}`,
  label: `${n}`
}));

const PATTERN_NODES: MapNode[] = [
  { skillKey: 'pattern.arithmetic.+2', label: '+2' },
  { skillKey: 'pattern.arithmetic.+3', label: '+3' },
  { skillKey: 'pattern.arithmetic.+4', label: '+4' },
]

const PATTERN_NODES_2: MapNode[] = [
  { skillKey: 'pattern.geometric.x2', label: '×2' },
  { skillKey: 'pattern.alternating.mix', label: 'ALT' }
];

const SKIP_RHYTHM_NODES: MapNode[] = [2, 3, 4, 5, 6].map(n => ({
  skillKey: `skip_rhythm.step.${n}.standard`,
  label: `${n}`
}));

  export const SkillMap: React.FC<SkillMapProps> = ({ onClose, onNodeClick }) => {
  const [progressData, setProgressData] = useState<Record<string, SkillProgress>>({});

  useEffect(() => {
    const data = SkillProgressService.loadAll();
    setProgressData(data);
  }, []);

  const handleNodeClick = (skillKey: string) => {
    if (onNodeClick) {
      onNodeClick(skillKey);
    } else {
      console.log(skillKey);
    }
  };

  const renderNode = (node: MapNode) => {
    const prog = progressData[node.skillKey];
    
    if (!prog) {
      // Locked / Empty state
      return (
        <button 
          key={node.skillKey}
          onClick={() => handleNodeClick(node.skillKey)}
          className="relative group flex flex-col items-center justify-center w-24 h-24 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 hover:border-slate-300 opacity-60 hover:opacity-100 active:scale-95 transition-all cursor-pointer"
        >
          <div className="font-black text-slate-400 text-2xl leading-none">{node.label}</div>
          <div className="text-[8px] font-bold text-slate-400 mt-2 uppercase">LOCKED</div>

          <div className="absolute -top-12 left-1/2 min-w-44 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            <div className="bg-slate-800 text-white text-[10px] font-bold px-3 py-2 rounded-lg text-center shadow-lg uppercase tracking-wider">
              No data yet — start practice
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
          </div>
        </button>
      );
    }

    const colorMap = {
      weak: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', stars: 'text-red-400' },
      developing: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', stars: 'text-blue-400' },
      strong: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', stars: 'text-green-500' },
      mastered: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', stars: 'text-amber-500' }
    };

    const c = colorMap[prog.masteryLevel] || colorMap.weak;

    return (
      <button 
        key={node.skillKey}
        onClick={() => handleNodeClick(node.skillKey)}
        className={`group flex flex-col items-center justify-center w-24 h-24 rounded-xl ${c.bg} border-2 ${c.border} hover:shadow-md active:scale-95 transition-all shadow-sm relative`}
      >
        <div className={`font-black ${c.text} text-2xl leading-none`}>{node.label}</div>
        <div className={`text-[10px] tracking-tighter mt-1 ${c.stars}`}>
          {'⭐'.repeat(prog.stars)}
        </div>
        <div className={`text-[9px] font-bold mt-1 uppercase ${c.text} opacity-80 flex flex-col items-center leading-tight`}>
           <span>Speed: {prog.lastAvgTime > 0 ? prog.lastAvgTime.toFixed(1) + 's' : '-'}</span>
           <span>Streak: {prog.maxStreak || 0}</span>
        </div>

        <div className="absolute -top-12 left-1/2 min-w-[200px] -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
          <div className="bg-slate-800 text-white text-[10px] font-bold px-3 py-2 rounded-lg text-center shadow-lg uppercase tracking-wider">
            Click for Targeted Practice
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
        </div>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-[var(--sa-ui-bg)] flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-4xl h-full flex flex-col bg-slate-50 shadow-2xl overflow-hidden rounded-2xl border-4 border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Skill Map</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Visual Mastery Grid</p>
          </div>
          <button 
            onClick={onClose}
            className="sa-pill px-4 py-2 text-sm font-black bg-white hover:bg-slate-100 shadow-sm border border-slate-200"
          >
            CLOSE
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-10 items-center">

          {/* Multiplication */}
          <div className="w-full max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Multiplication
            </h2>
            <div className="flex flex-wrap gap-3">
              {MULTIPLICATION_NODES.map(renderNode)}
            </div>
          </div>

          {/* Skip Counting */}
          <div className="w-full max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Skip Counting
            </h2>
            <div className="flex flex-wrap gap-3">
              {SKIP_COUNTING_NODES.map(renderNode)}
            </div>
          </div>

          {/* Patterns */}
          <div className="w-full max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Patterns
            </h2>
            <div className="flex flex-wrap gap-3 mb-3">
              {PATTERN_NODES.map(renderNode)}
            </div>
            <div className="flex flex-wrap gap-3">
              {PATTERN_NODES_2.map(renderNode)}
            </div>
          </div>

          {/* Skip Rhythm */}
          <div className="w-full max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-12">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Skip Rhythm
            </h2>
            <div className="flex flex-wrap gap-3">
              {SKIP_RHYTHM_NODES.map(renderNode)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
