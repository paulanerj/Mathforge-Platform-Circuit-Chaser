import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Deliberately minimal, and deliberately NOT the production config.
 *
 * The lab must build and run with nothing but `npm install` in this directory:
 * no Tailwind, no environment variables, no git shell-outs, no MathForge host.
 * Anything that would make the archive fail to start on somebody else's
 * machine has been left out.
 */
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 3200, allowedHosts: true },
  // Node, not jsdom: nothing in the lab's test suite touches the DOM, and
  // dropping jsdom removes the only dependency in the tree with an optional
  // peer that npm 10 cannot resolve. A portable archive that will not
  // `npm install` on somebody else's machine is not portable.
  test: { environment: 'node' },
});
