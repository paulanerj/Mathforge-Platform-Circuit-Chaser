import { execSync } from 'child_process';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

/**
 * Git identity for the pursuit log. Diagnostics that cannot name their build
 * are hard to act on, and a failed git call must never fail a build, so this
 * degrades to 'unknown' rather than throwing.
 */
const git = (command: string) => {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __CIRCUIT_CLIMB_COMMIT__: JSON.stringify(git('git rev-parse --short HEAD')),
      __CIRCUIT_CLIMB_BRANCH__: JSON.stringify(git('git rev-parse --abbrev-ref HEAD')),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    test: {
      environment: 'jsdom',
      // The pursuer intelligence lab (CC-RD-PURSUER-01) is a separate,
      // portable R&D package with its own package.json, tsconfig and test
      // run. Production must not depend on it, so production's build and
      // test surface does not reach into it.
      exclude: ['**/node_modules/**', '**/dist/**', 'pursuer-intelligence-lab/**'],
    }
  };
});
