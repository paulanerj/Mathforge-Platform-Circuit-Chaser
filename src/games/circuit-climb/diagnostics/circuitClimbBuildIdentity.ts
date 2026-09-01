/**
 * Which build produced a pursuit log.
 *
 * A log that cannot name the build it came from is a log the PM cannot act on:
 * "the bot did X" is only useful alongside "in this commit". The values are
 * injected by vite.config at build time from git; when git is unavailable —
 * a bare tarball, an unusual CI — they read `unknown`, which is honest and
 * still leaves the rest of the log usable. They are never guessed.
 */
declare const __CIRCUIT_CLIMB_COMMIT__: string | undefined;
declare const __CIRCUIT_CLIMB_BRANCH__: string | undefined;

const read = (value: string | undefined) =>
  typeof value === 'string' && value.length > 0 ? value : 'unknown';

export const CIRCUIT_CLIMB_BUILD = {
  commit: read(typeof __CIRCUIT_CLIMB_COMMIT__ === 'undefined' ? undefined : __CIRCUIT_CLIMB_COMMIT__),
  branch: read(typeof __CIRCUIT_CLIMB_BRANCH__ === 'undefined' ? undefined : __CIRCUIT_CLIMB_BRANCH__),
} as const;
