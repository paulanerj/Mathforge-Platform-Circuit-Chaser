# Fixtures and shipped results

`baseline-results.json` — all twelve fixtures for every built-in Brain under
P0, plus the 60/120/144Hz comparison under both timebases. Regenerate with
`npx tsx tools/generateArtifacts.mts`.

`oracle-diagnostic.json` — every Brain against every perception model on three
scripts. This is the file to read first: it is the evidence that the shipped
chassis reaches DELIBERATE_PURSUIT_CAPTURE under P3 ORACLE on scripts where it
scores LIKELY_SEARCH_COLLISION under P0 PRODUCTION.

The scripted learner behaviours these run against are in
`src/learner/scripts.ts`: STRAIGHT_CENTRE, ZIGZAG, CROSS_BOARD, WAIT_THEN_MOVE, FAST_CLIMBER, SLOW_CLIMBER, LONG_THINK, MOVE_STOP_MOVE, RETURN_DOWNWARD.
