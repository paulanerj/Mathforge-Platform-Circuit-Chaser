import React, { useEffect, useState } from 'react';
import { getRegisteredThemeIds } from './themeRegistry';

export const setDevPreviewThemeId = (id?: string) => {
  if (import.meta.env.DEV) {
    window.dispatchEvent(new CustomEvent('devThemeChange', { detail: id }));
  }
};

export const useDevPreviewThemeId = () => {
  const [themeId, setThemeId] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    if (import.meta.env.DEV) {
      const handler = (e: Event) => {
        setThemeId((e as CustomEvent).detail);
      };
      window.addEventListener('devThemeChange', handler);
      return () => window.removeEventListener('devThemeChange', handler);
    }
  }, []);
  
  return themeId;
};

export const ThemePreviewDevPanel: React.FC = () => {
  if (!import.meta.env.DEV) return null;

  const currentThemeId = useDevPreviewThemeId() || 'default';
  const availableIds = getRegisteredThemeIds();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900/90 text-white p-3 rounded-lg border border-slate-700 shadow-2xl flex flex-col gap-2 font-mono text-xs backdrop-blur">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-slate-400 font-bold tracking-widest text-[10px] uppercase">Dev Theme Preview</span>
        <span className="text-slate-500">{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-1 mt-1">
          {availableIds.map(id => (
            <button
              key={id}
              className={`px-3 py-1.5 rounded transition-colors text-left ${currentThemeId === id ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              onClick={() => setDevPreviewThemeId(id === 'default' ? undefined : id)}
            >
              {id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
