/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTheme } from '../../theme/useTheme';

const SkyScene = ({ isActive }: { isActive: boolean }) => {
  const theme = useTheme();
  const sky = theme.tokens.shell.scenes.sky;
  
  return (
    <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${sky.backgroundTop}, ${sky.backgroundBottom})`,
        }}
      ></div>
      <svg viewBox="0 0 24 24" fill={sky.cloud1Fill} className="animate-float-cloud absolute top-[10%] left-0 w-64 h-64 blur-sm opacity-50">
        <path d="M18.5 12c.2 0 .5 0 .7.1 1.2.3 2.1 1.3 2.3 2.6.2 1.3-.5 2.6-1.6 3.3-.5.3-1.1.5-1.7.5H6.5c-1.9 0-3.5-1.6-3.5-3.5 0-1.7 1.2-3.1 2.9-3.4.1-.6.4-1.2.8-1.7 1.1-1.2 2.8-1.5 4.3-.8.6-1.8 2.3-3.1 4.3-3.1 2.1 0 3.9 1.4 4.5 3.3.6-.2 1.3-.3 1.9-.3 2.8 0 5 2.2 5 5 0 .3 0 .7-.1 1H18.5V12z" />
      </svg>
      <svg viewBox="0 0 24 24" fill={sky.cloud2Fill} style={{ animationDuration: '35s', animationDelay: '5s' }} className="animate-float-cloud absolute top-[40%] left-0 w-48 h-48 drop-shadow-sm opacity-80">
        <path d="M6.05 13.5C6.05 11.01 8.06 9 10.55 9c.4 0 .78.06 1.14.16C12.35 7.36 14.04 6 16.05 6c2.76 0 5 2.24 5 5 0 .34-.04.67-.1.99C22.18 12.56 23 13.95 23 15.5c0 2.49-2.01 4.5-4.5 4.5h-12c-2.49 0-4.5-2.01-4.5-4.5 0-2.22 1.61-4.06 3.73-4.43-.12-.35-.18-.72-.18-1.07z" />
      </svg>
    </div>
  );
};

const SunsetScene = ({ isActive }: { isActive: boolean }) => {
  const theme = useTheme();
  const sunset = theme.tokens.shell.scenes.sunset;

  return (
    <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${sunset.backgroundTop}, ${sunset.backgroundBottom})`,
        }}
      ></div>
      <svg viewBox="0 0 24 24" fill={sunset.cloudFill} style={{ animationDuration: '45s', animationDelay: '2s' }} className="animate-float-cloud absolute top-[20%] left-0 w-56 h-56 blur-[2px] opacity-40">
        <path d="M18.5 12c.2 0 .5 0 .7.1 1.2.3 2.1 1.3 2.3 2.6.2 1.3-.5 2.6-1.6 3.3-.5.3-1.1.5-1.7.5H6.5c-1.9 0-3.5-1.6-3.5-3.5 0-1.7 1.2-3.1 2.9-3.4.1-.6.4-1.2.8-1.7 1.1-1.2 2.8-1.5 4.3-.8.6-1.8 2.3-3.1 4.3-3.1 2.1 0 3.9 1.4 4.5 3.3.6-.2 1.3-.3 1.9-.3 2.8 0 5 2.2 5 5 0 .3 0 .7-.1 1H18.5V12z" />
      </svg>
    </div>
  );
};

const NightScene = ({ isActive }: { isActive: boolean }) => {
  const theme = useTheme();
  const night = theme.tokens.shell.scenes.night;

  return (
    <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${night.backgroundTop}, ${night.backgroundBottom})`,
        }}
      ></div>
      <div className="absolute top-[15%] left-[20%] w-1 h-1 rounded-full opacity-60" style={{ backgroundColor: night.star1Fill }}></div>
      <div className="absolute top-[35%] left-[70%] w-2 h-2 rounded-full opacity-40 blur-[1px]" style={{ backgroundColor: night.star1Fill }}></div>
      <div className="absolute top-[65%] left-[10%] w-1.5 h-1.5 rounded-full opacity-80" style={{ backgroundColor: night.star2Fill }}></div>
      <div className="absolute top-[80%] left-[80%] w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: night.star1Fill }}></div>
    </div>
  );
};

const SpaceScene = ({ isActive }: { isActive: boolean }) => {
  const theme = useTheme();
  const space = theme.tokens.shell.scenes.space;

  return (
    <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${space.backgroundTop}, ${space.backgroundBottom})`,
        }}
      ></div>
      <div className="absolute top-[20%] left-[50%] w-96 h-96 rounded-full opacity-20 blur-[100px] -translate-x-1/2" style={{ backgroundColor: space.nebulaFill }}></div>
      <div className="absolute top-[10%] left-[15%] w-1 h-1 rounded-full opacity-90" style={{ backgroundColor: space.star1Fill, boxShadow: space.star1Shadow }}></div>
      <div className="absolute top-[40%] left-[85%] w-1 h-1 rounded-full opacity-80" style={{ backgroundColor: space.star2Fill, boxShadow: space.star2Shadow }}></div>
      <div className="absolute top-[75%] left-[25%] w-2 h-2 rounded-full opacity-60 blur-[1px]" style={{ backgroundColor: space.star3Fill }}></div>
      <div className="absolute top-[50%] left-[10%] w-1 h-1 rounded-full opacity-40" style={{ backgroundColor: space.star1Fill }}></div>
      <div className="absolute top-[85%] left-[60%] w-1.5 h-1.5 rounded-full opacity-70" style={{ backgroundColor: space.star1Fill }}></div>
    </div>
  );
};

export const SceneContainer = ({
  activeScene,
  themeClass,
  shake,
  children,
}: {
  activeScene: string;
  themeClass: string;
  shake: boolean;
  children: React.ReactNode;
}) => (
  <div data-guide-id="app-root" className={`sa-app ${themeClass} flex flex-col items-center relative h-[100dvh] overflow-hidden ${shake ? 'animate-shake' : ''}`}>
    <div className="absolute inset-0 z-0 pointer-events-none">
      <SkyScene isActive={activeScene === 'sky'} />
      <SunsetScene isActive={activeScene === 'sunset'} />
      <NightScene isActive={activeScene === 'night'} />
      <SpaceScene isActive={activeScene === 'space'} />
    </div>
    <div className="relative z-10 w-full h-full flex flex-col items-center overflow-hidden">{children}</div>
  </div>
);
