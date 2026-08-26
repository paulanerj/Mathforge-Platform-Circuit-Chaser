import React, { useState, useEffect } from 'react';
import { AppConfig, GameStep } from '../../types';
import { DifficultyPreviewResolver } from '../../services/difficulty/difficultyPreviewResolver';
import { DifficultyColorMapper } from '../../ui/difficultyColorMap';

interface DifficultySliderProps {
  config: AppConfig;
  onCommit: (level: number) => void;
  onChange?: (level: number) => void;
}

export const DifficultySlider: React.FC<DifficultySliderProps> = ({ config, onCommit, onChange }) => {
  const [level, setLevel] = useState(config.difficultyLevel || 5);
  const [previewStep, setPreviewStep] = useState<GameStep | null>(null);

  // Sync internal level with config prop
  useEffect(() => {
    setLevel(config.difficultyLevel || 5);
  }, [config.difficultyLevel]);

  // Debounced preview generation to prevent UI lag during drag
  useEffect(() => {
    const timer = setTimeout(() => {
      const step = DifficultyPreviewResolver.resolvePreview(level, config);
      setPreviewStep(step);
    }, 50); // 50ms debounce
    return () => clearTimeout(timer);
  }, [level, config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setLevel(val);
      if (onChange) onChange(val);
    }
  };

  const handleMouseUp = () => {
    onCommit(level);
  };

  const color = DifficultyColorMapper.getHexForLevel(level);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 bg-gray-900 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">Difficulty Level: {level}</h3>
      
      <div className="w-full px-2 mb-6">
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={level}
          onChange={handleChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-blue-500 sa-range-input"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${(level - 1) * 11.11}%, #4b5563 ${(level - 1) * 11.11}%, #4b5563 100%)`
          }}
        />
      </div>

      {previewStep && (
        <div className="w-full p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-sm text-gray-400 mb-2 text-center uppercase tracking-wider">Board Preview</h4>
          <div className="flex justify-center items-center h-32 relative">
            {/* Center Circle Preview */}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white z-10"
              style={{ 
                backgroundColor: '#1f2937',
                boxShadow: `0 0 20px ${DifficultyColorMapper.getColorForLevel(level)}`,
                border: `2px solid ${color}`
              }}
            >
              {previewStep.startNumber}
            </div>
            
            {/* Modifiers Preview */}
            {previewStep.modifiers.map((mod, i) => {
              const angle = (i / previewStep.modifiers.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 50;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <div 
                  key={i}
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    backgroundColor: '#374151',
                    border: `1px solid ${color}`,
                    color: color
                  }}
                >
                  {mod.operation}{mod.value}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 flex justify-center gap-2">
            {previewStep.distractors.concat(previewStep.correctAnswer).sort((a, b) => a - b).map((ans, i) => (
              <div 
                key={i}
                className="px-3 py-1 rounded text-sm font-bold text-white"
                style={{
                  backgroundColor: '#374151',
                  border: `1px solid ${color}`
                }}
              >
                {ans}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
