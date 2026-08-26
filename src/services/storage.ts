/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STORAGE_KEYS, DEFAULT_CONFIG } from '../constants';
import { AppConfig } from '../types';

export const SettingsStore = {
  load(): AppConfig {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const saved = savedRaw ? JSON.parse(savedRaw) : {};
      return {
        ...DEFAULT_CONFIG,
        ...saved,
        opsEnabled: { ...DEFAULT_CONFIG.opsEnabled, ...(saved.opsEnabled || {}) },
        phaseSequence: saved.phaseSequence || DEFAULT_CONFIG.phaseSequence,
      };
    } catch (e) {
      return { ...DEFAULT_CONFIG };
    }
  },
  save(config: AppConfig) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(config));
  },
};
