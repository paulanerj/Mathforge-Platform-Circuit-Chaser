import React, { useState } from 'react';
import { DifficultyColorMapper } from '../../ui/difficultyColorMap';
import { DifficultySlider } from './DifficultySlider';
import { AppConfig } from '../../types';

interface DifficultyIndicatorProps {
  level: number;
  config: AppConfig;
  actions: any;
}

export const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({ level, config, actions }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localLevel, setLocalLevel] = useState(level);
  const color = DifficultyColorMapper.getHexForLevel(localLevel);

  // Sync local level with prop if it changes from outside
  React.useEffect(() => {
    setLocalLevel(level);
  }, [level]);

  const handleLevelCommit = (newLevel: number) => {
    actions.setConfig({ ...config, difficultyLevel: newLevel });
    actions.startGame({ ...config, difficultyLevel: newLevel });
    setIsExpanded(false);
  };

  return (
    <div className="relative flex flex-col items-center">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-md transition-all hover:scale-105 active:scale-95"
        style={{
          backgroundColor: '#3b82f6', // Bright Blue (blue-500)
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
        }}
      >
        Level {localLevel}
      </button>

      {isExpanded && (
        <div className="absolute top-full mt-4 z-[100] w-72 animate-pop">
          <div className="bg-gray-900 border-2 rounded-xl shadow-2xl overflow-hidden" style={{ borderColor: color }}>
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Manual Override</span>
              <button onClick={() => setIsExpanded(false)} className="text-gray-500 hover:text-white px-2 text-xs">✕</button>
            </div>
            <DifficultySlider 
              config={config} 
              onCommit={handleLevelCommit} 
              onChange={setLocalLevel}
            />
          </div>
        </div>
      )}
    </div>
  );
};
