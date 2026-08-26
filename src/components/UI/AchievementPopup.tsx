import React, { useEffect, useState } from 'react';
import { Achievement } from '../../types/achievement';

export const AchievementPopup = () => {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);

  useEffect(() => {
    const handleUnlocked = (e: any) => {
      const newAchievements: Achievement[] = e.detail;
      setQueue(prev => [...prev, ...newAchievements]);
    };

    window.addEventListener('achievementsUnlocked', handleUnlocked);
    return () => window.removeEventListener('achievementsUnlocked', handleUnlocked);
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    } else if (current) {
      const duration = current.priority === 'high' ? 3000 : current.priority === 'medium' ? 2500 : 2000;
      const timer = setTimeout(() => {
        setCurrent(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [current, queue]);

  if (!current) return null;

  let containerClass = "fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 bg-white p-4 rounded-2xl pointer-events-none transition-all ";
  let titleClass = "text-xs font-black uppercase tracking-widest mb-1 ";
  let descClass = "font-bold ";
  let icon = "🏆";
  let iconSizeClass = "text-4xl";

  if (current.priority === 'high') {
    containerClass += "animate-pop scale-105 border-4 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]";
    titleClass += "text-amber-600";
    descClass += "text-slate-800 text-base";
    icon = "🌟";
  } else if (current.priority === 'medium') {
    containerClass += "animate-pop border-4 border-amber-300 shadow-2xl";
    titleClass += "text-amber-500";
    descClass += "text-slate-800 text-sm";
  } else {
    containerClass += "animate-in fade-in slide-in-from-top-4 duration-500 border-2 border-slate-200 shadow-md";
    titleClass += "text-slate-500";
    descClass += "text-slate-600 text-sm";
    iconSizeClass = "text-2xl";
    icon = "✓";
  }

  return (
    <div className={containerClass}>
      <div className={iconSizeClass}>{icon}</div>
      <div className="text-left pr-4">
        <h4 className={titleClass}>{current.title}</h4>
        <p className={descClass}>{current.description}</p>
      </div>
    </div>
  );
};
