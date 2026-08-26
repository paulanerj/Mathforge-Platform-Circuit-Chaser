/**
 * Theme Provider
 * Minimal React context provider for foundation.
 * 
 * SKIN-3A-R Restrictions:
 * - exposes resolved default formal theme
 * - must not inject CSS variables
 * - must not add theme classes to the DOM
 * - must not mount decorative assets
 * - must not change current presentation
 * - must not alter existing uiSkin state or current forge behavior
 * - must not store a selected theme preference
 * - must not include a theme switcher
 */

import React, { createContext, useMemo } from 'react';
import { ResolvedMathForgeTheme } from './themeTypes';
import { resolveRegisteredTheme } from './themeRegistry';
import { ThemePreviewDevPanel, useDevPreviewThemeId } from './ThemePreviewDevPanel';

export const ThemeContext = createContext<ResolvedMathForgeTheme | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read dev-only preview ID (always undefined in production)
  const devThemeId = useDevPreviewThemeId();
  
  // Expose resolved default formal theme, or dev-preview theme if present
  const resolved = useMemo(() => resolveRegisteredTheme(devThemeId), [devThemeId]);

  return (
    <ThemeContext.Provider value={resolved}>
      {children}
      <ThemePreviewDevPanel />
    </ThemeContext.Provider>
  );
};

