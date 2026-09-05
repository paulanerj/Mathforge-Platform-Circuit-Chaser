/**
 * Build the portable archive.
 *
 *   node tools/package.mjs
 *
 * Produces `circuit-climb-pursuer-intelligence-lab-01.zip` one directory up:
 * everything an external model needs, and nothing it does not. Excludes
 * `node_modules` and `dist`; INCLUDES `package-lock.json`, because `npm ci`
 * from a lockfile is the install that reliably works.
 */
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PARENT = resolve(LAB, '..');
const NAME = 'circuit-climb-pursuer-intelligence-lab-01.zip';

rmSync(resolve(PARENT, NAME), { force: true });
execFileSync('zip', [
  '-qr', NAME, 'pursuer-intelligence-lab',
  '-x', 'pursuer-intelligence-lab/node_modules/*',
  '-x', 'pursuer-intelligence-lab/dist/*',
  '-x', 'pursuer-intelligence-lab/dist-single/*',
], { cwd: PARENT, stdio: 'inherit' });

const listing = execFileSync('unzip', ['-l', NAME], { cwd: PARENT }).toString();
console.log(listing.split('\n').slice(-3).join('\n'));
console.log(`\n${resolve(PARENT, NAME)}`);
