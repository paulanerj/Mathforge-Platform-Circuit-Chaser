import React from 'react';

interface HelpButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      data-guide-id="help-button"
      className={`sa-pill flex items-center justify-center font-black text-xl hover:scale-105 transition-all w-12 h-12 relative group ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      aria-label="Help and Tutorials"
      id="help-button"
    >
      <span className="text-xl">?</span>
      
      {/* Tooltip for desktop hover */}
      <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-transform origin-bottom duration-150 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-xl z-50 pointer-events-none whitespace-nowrap">
        Help & Tutorials
      </span>
    </button>
  );
};
