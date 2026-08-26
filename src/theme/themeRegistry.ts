/**
 * Theme Registry
 * During SKIN-3A:
 * - register only the default formal theme;
 * - do not register a new Crystal Forge theme;
 * - do not convert current `forge` CSS into a registered formal theme;
 * - do not remove or affect existing `uiSkin === 'forge'` behavior.
 */

import { DefaultMathForgeTheme, PartialMathForgeTheme, ResolvedMathForgeTheme } from './themeTypes';
import { defaultTheme } from './defaultTheme';
import { crystalForgeProofTheme } from './proofThemes';
import { resolveTheme } from './resolveTheme';

const registry = new Map<string, DefaultMathForgeTheme | PartialMathForgeTheme>();

registry.set('default', defaultTheme);
registry.set('crystal-forge-proof', crystalForgeProofTheme);

export function getRegisteredThemeIds(): string[] {
  return Array.from(registry.keys());
}

export function getThemeById(id: string): DefaultMathForgeTheme | PartialMathForgeTheme | undefined {
  return registry.get(id);
}

export function getDefaultTheme(): DefaultMathForgeTheme {
  return defaultTheme;
}

export function resolveRegisteredTheme(themeId?: string): ResolvedMathForgeTheme {
  if (!themeId) {
    return resolveTheme();
  }
  
  const theme = getThemeById(themeId);
  if (!theme) {
    return resolveTheme();
  }
  
  if (theme.id === 'default') {
    return resolveTheme();
  }
  
  return resolveTheme(theme as PartialMathForgeTheme);
}
