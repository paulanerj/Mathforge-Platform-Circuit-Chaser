/**
 * PURSUER 04C — regenerate the parameter-authority document.
 *
 *   npx tsx src/games/circuit-climb/tools/circuitClimbPursuerAuthorityDoc.mts
 *
 * The audit's authority is the code, so the document is GENERATED from
 * `PARAMETER_AUTHORITY` rather than transcribed from it. A hand-written table
 * of thirty numbers is a table that will disagree with the source within a
 * month, and disagreeing about what the pursuer is set to is the exact
 * failure 04C exists to end.
 */
import { writeFileSync } from 'node:fs';
import {
  PARAMETER_AUTHORITY, AUTHORITY_CONFLICTS, ABSENT_PARAMETERS,
} from '../pursuer-v2/config/parameterAuthority';
import { PARAMETER_BOUNDS } from '../pursuer-v2/config/validatePursuerConfiguration';
import { BASELINE_04B_R1, BASELINE_AUTHORITY_COMMIT, DECLARED_EXPERIMENTS } from '../pursuer-v2/config/configurationLibrary';
import { configurationHash, canonicalizeConfiguration } from '../pursuer-v2/config/configurationHash';
import { SAFE_TRANSITION_BOUNDARIES } from '../pursuer-v2/config/resolvePursuerConfiguration';
import { PURSUER_CONFIG_SCHEMA_VERSION } from '../pursuer-v2/config/pursuerConfigurationSchema';

const cell = (value: unknown) => (value === null ? '—' : `\`${String(value)}\``);
const lines: string[] = [];
const w = (...text: string[]) => lines.push(...text);

w('# Circuit Climb — Graph V2 parameter authority (04C)', '');
w('**GENERATED.** Run `npx tsx src/games/circuit-climb/tools/circuitClimbPursuerAuthorityDoc.mts`.');
w('Do not edit by hand — the code is the authority and this is a rendering of it.', '');
w(`Schema: \`${PURSUER_CONFIG_SCHEMA_VERSION}\``);
w(`Baseline: \`04B-R1 BASELINE\` · behaviour hash \`${configurationHash(BASELINE_04B_R1)}\``);
w(`Authority commit: \`${BASELINE_AUTHORITY_COMMIT}\``, '');

w('## What the audit was for', '');
w('Before 04C, every number that shaped GRAPH_PURSUER_V2 lived wherever it was first written, and');
w('there was no single answer to "what is the pursuer set to?". The audit walked the code to build');
w('one. It found three quantities whose declared default is **not** what production runs, and two');
w('quantities a configuration brief naturally asks for that **do not exist**.', '');

w('## Authority conflicts', '');
w('| symbol | declares | production runs | resolved by |');
w('| --- | --- | --- | --- |');
for (const conflict of AUTHORITY_CONFLICTS) {
  w(`| \`${conflict.symbol}\` | \`${conflict.declares}\` | \`${conflict.productionRuns}\` | ${conflict.resolvedBy} |`);
}
w('');
w('Anyone reading `DEFAULT_GRAPH_PURSUER_CONFIG` to describe the shipped pursuer would have been');
w('wrong on all three. That is the argument for the configuration contract, stated as evidence.', '');

w('## Parameters a brief asks for that do not exist', '');
w('| requested | the real quantity | why |');
w('| --- | --- | --- |');
for (const absent of ABSENT_PARAMETERS) {
  w(`| \`${absent.requested}\` | ${absent.realQuantity} | ${absent.why} |`);
}
w('');

w('## Every behaviour-affecting parameter', '');
w('`SETTABLE` a human may change it here · `FROZEN` in the payload, not editable in this build ·');
w('`DERIVED` computed from the live board · `RESERVED` a layer exists, nothing authorized into it.', '');
w('| path | declared | production | authority | unit | where | note |');
w('| --- | --- | --- | --- | --- | --- | --- |');
for (const row of PARAMETER_AUTHORITY) {
  w(`| ${row.path ? `\`${row.path}\`` : '—'} | ${cell(row.declaredDefault)} | ${cell(row.productionEffective)}`
    + ` | ${row.authority} | ${row.unit} | \`${row.symbol}\` | ${row.note} |`);
}
w('');

w('## Validation bounds', '');
w('One table, read by both the validator and the tuning sliders, so a slider cannot offer a value');
w('the validator then refuses. Every bound is about the game, not about taste.', '');
w('| path | min | max | step | reason |');
w('| --- | --- | --- | --- | --- |');
for (const [path, bound] of Object.entries(PARAMETER_BOUNDS)) {
  w(`| \`${path}\` | ${bound.min} | ${bound.max} | ${bound.step} | ${bound.reason} |`);
}
w('');

w('## Safe transition boundaries', '');
w('Documented, and all but one deliberately inactive.', '');
w('| boundary | safe | active | why |');
w('| --- | --- | --- | --- |');
for (const boundary of SAFE_TRANSITION_BOUNDARIES) {
  w(`| ${boundary.boundary} | ${boundary.safe ? 'yes' : 'no'} | ${boundary.active ? '**YES**' : 'no'} | ${boundary.why} |`);
}
w('');

w('## Declared experiments', '');
w('Declared, and deliberately not instantiated — the values are not this build\'s to choose.', '');
for (const experiment of DECLARED_EXPERIMENTS) {
  w(`### ${experiment.label}`, '');
  w(`- **Parent:** \`${experiment.parentConfigurationId}\``);
  w(`- **Hypothesis:** ${experiment.hypothesis}`);
  w(`- **Intended player-visible effect:** ${experiment.intendedPlayerVisibleEffect}`);
  w(`- **May change:** ${experiment.allowedPaths.length ? experiment.allowedPaths.map((p) => `\`${p}\``).join(', ') : 'to be decided once A, B and C have been read'}`);
  w(`- **BLOCKED:** ${experiment.blockedBy}`, '');
}

w('## The baseline, canonically', '');
w('This is exactly the text the behaviour hash is taken over. Metadata, labels and ids are absent');
w('by design: renaming a configuration must not make it look like a different pursuer.', '');
w('```');
w(canonicalizeConfiguration(BASELINE_04B_R1));
w('```', '');

writeFileSync('src/games/circuit-climb/docs/CIRCUIT_CLIMB_PURSUER_PARAMETER_AUTHORITY_04C.md', lines.join('\n'));
console.log(`wrote ${lines.length} lines`);
