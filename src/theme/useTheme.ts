/**
 * useTheme Hook
 * Minimal safe hook for consuming the context later.
 * No visual surface should consume this hook until a later authorized pilot.
 */

import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
import { ResolvedMathForgeTheme } from './themeTypes';

export function useTheme(): ResolvedMathForgeTheme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
