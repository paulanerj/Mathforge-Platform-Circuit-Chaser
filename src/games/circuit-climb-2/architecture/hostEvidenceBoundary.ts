/**
 * CC2-22 — Host-neutral, source-verified result evidence PORT.
 *
 * This is NOT the MathForge Gen2 SDK. The live SDK's precise capabilities,
 * lifecycle hooks, and persistence rules must be verified in CC2-30.
 *
 * This pure mapping cannot grant rewards or report school mastery. It can
 * only produce a sanitized, truthful end-of-run receipt when the original
 * run summary and original event ledger agree exactly.
 */
import type {GameEventV1, EndReasonV1} from '../core/CircuitClimbCore';
import type {RunSummaryV1} from '../progression/runSummary';

export interface HostNeutralRunEvidenceV1 {
  readonly schema: 'cc2-host-evidence/v1';
  readonly runId: string;
  readonly terminalEventId: string;
  readonly gameplayOutcome: EndReasonV1;
  readonly completedRows: number;
  readonly correctAttempts: number;
  readonly wrongAttempts: number;
  readonly accuracyPercent: number | null;
  readonly score: number;
  readonly solvedEquations: readonly {
    readonly row: number;
    readonly attemptId: string;
    readonly equation: string;
  }[];
  readonly achievementEvidenceIds: readonly string[];
  /** A death/capture is NOT a claim of mathematical failure. */
  readonly masteryInference: false;
  readonly hostRewardGranted: false;
}

export function projectHostNeutralEvidence(
  report: RunSummaryV1,
  coreEvents: readonly GameEventV1[],
): HostNeutralRunEvidenceV1 {
  if (report.schema !== 'cc2-run-summary/v1' ||
      !report.ended || report.endReason === null)
    throw new Error('CC2_HOST_REQUIRES_AUTHORITATIVE_TERMINAL');
  const events=coreEvents.filter(e=>e.runId===report.runId);
  const terminal=events.filter(e=>e.type==='RUN_ENDED');
  if (terminal.length!==1 || terminal[0].detail.reason!==report.endReason)
    throw new Error('CC2_HOST_TERMINAL_LEDGER_MISMATCH');
  const attempts=events.filter(e=>e.type==='ATTEMPT_EVALUATED');
  const correct=attempts.filter(e=>e.detail.correct===true);
  const wrong=attempts.filter(e=>e.detail.correct===false);
  const rows=events.filter(e=>e.type==='ROW_COMPLETED');
  if (report.attempts!==attempts.length ||
      report.correctAttempts!==correct.length ||
      report.wrongAttempts!==wrong.length ||
      report.rowsSolved!==rows.length ||
      report.equations.length!==rows.length ||
      report.powerCells!==Math.floor(rows.length/4))
    throw new Error('CC2_HOST_SOURCE_ACCOUNTING_MISMATCH');
  for(let i=0;i<rows.length;i++){
    const solved=report.equations[i],row=rows[i];
    if (solved.row!==i+1 ||
        solved.attemptId!==row.detail.attemptId ||
        !correct.some(e=>e.detail.attemptId===solved.attemptId))
      throw new Error('CC2_HOST_UNVERIFIED_SOLVED_EQUATION');
  }
  const result:HostNeutralRunEvidenceV1={
    schema:'cc2-host-evidence/v1',
    runId:report.runId,
    terminalEventId:terminal[0].id,
    gameplayOutcome:report.endReason,
    completedRows:rows.length,
    correctAttempts:correct.length,
    wrongAttempts:wrong.length,
    accuracyPercent:report.accuracyPercent,
    score:report.score,
    solvedEquations:report.equations.map(e=>({
      row:e.row,attemptId:e.attemptId,equation:e.equation,
    })),
    achievementEvidenceIds:report.achievements.map(a=>a.evidenceEventId),
    masteryInference:false,
    hostRewardGranted:false,
  };
  // The returned envelope and its nested arrays never expose a writable
  // reference into core state or the report's solved-equation ledger.
  return structuredClone(result);
}
