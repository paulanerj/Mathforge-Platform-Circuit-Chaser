/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SafeStorage = {
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored) as T;
    } catch (e) {
      console.warn(`[SafeStorage] Failed to read or parse key "${key}"`, e);
      return defaultValue;
    }
  },
  
  setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[SafeStorage] Failed to set key "${key}"`, e);
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[SafeStorage] Failed to remove key "${key}"`, e);
      return false;
    }
  }
};
