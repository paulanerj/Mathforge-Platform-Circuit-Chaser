/**
 * TEST NOTES (04C).
 *
 * A place for a human to write down what a pursuer FELT like, attached to the
 * exact configuration they played.
 *
 * The 04B acceptance failed on a sentence — "the bot gets lost very quickly...
 * at one point after waiting I concluded the bot got lost" — that no metric in
 * the suite reported and that took a full reproduction cycle to turn into a
 * defect. That sentence was worth more than the diagnostic export it arrived
 * with, and it very nearly did not get written down.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THESE NOTES ARE NEVER INTERPRETED BY CODE.
 *
 * Nothing scores them, thresholds them, averages them, or selects a
 * configuration because of them. They are recorded verbatim, exported
 * verbatim, and read by a person. A five on THREAT is a tester's word, not a
 * measurement, and the moment code starts treating it as one, the evidence
 * stops being human product evidence and becomes a number nobody checked.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** The prompts, in the order the addendum lists them. */
export const TEST_NOTE_DIMENSIONS = [
  {
    key: 'threat',
    label: 'THREAT',
    prompt: 'Did it feel dangerous?',
  },
  {
    key: 'purposefulMovement',
    label: 'PURPOSEFUL MOVEMENT',
    prompt: 'Did it look like it was going somewhere on purpose?',
  },
  {
    key: 'tooStaggered',
    label: 'TOO STAGGERED',
    prompt: 'Did the stop-start motion read as broken rather than deliberate? (5 = far too staggered)',
  },
  {
    key: 'seemsToGetLost',
    label: 'SEEMS TO GET LOST',
    prompt: 'Did it lose you and fail to find you again? (5 = lost constantly)',
  },
  {
    key: 'mathThinkingTime',
    label: 'MATH THINKING TIME',
    prompt: 'Was there enough time to actually think about the maths? (5 = plenty)',
  },
  {
    key: 'fairness',
    label: 'FAIRNESS',
    prompt: 'Did being caught feel fair? (5 = entirely fair)',
  },
] as const;

export type TestNoteDimensionKey = (typeof TEST_NOTE_DIMENSIONS)[number]['key'];

/** 1..5, or null for "not rated". Never defaulted to a middle value. */
export type TestNoteRating = 1 | 2 | 3 | 4 | 5 | null;

export interface TestSessionNotes {
  ratings: Record<TestNoteDimensionKey, TestNoteRating>;
  /** Whatever the tester wants to say. The most valuable field here. */
  freeText: string;
  /** ISO-8601 when the tester wrote them. */
  recordedAt: string | null;
}

export function emptyTestSessionNotes(): TestSessionNotes {
  return {
    ratings: {
      threat: null,
      purposefulMovement: null,
      tooStaggered: null,
      seemsToGetLost: null,
      mathThinkingTime: null,
      fairness: null,
    },
    freeText: '',
    recordedAt: null,
  };
}

export function hasAnyTestNote(notes: TestSessionNotes): boolean {
  return notes.freeText.trim().length > 0
    || TEST_NOTE_DIMENSIONS.some((d) => notes.ratings[d.key] !== null);
}

/**
 * Read notes back from an untrusted source (storage, a paste) without ever
 * inventing a rating. Anything unrecognised becomes null, not a default.
 */
export function normalizeTestSessionNotes(value: unknown): TestSessionNotes {
  const notes = emptyTestSessionNotes();
  if (typeof value !== 'object' || value === null) return notes;
  const source = value as Record<string, unknown>;
  const ratings = (typeof source.ratings === 'object' && source.ratings !== null)
    ? source.ratings as Record<string, unknown> : {};
  for (const dimension of TEST_NOTE_DIMENSIONS) {
    const rating = ratings[dimension.key];
    if (rating === 1 || rating === 2 || rating === 3 || rating === 4 || rating === 5) {
      notes.ratings[dimension.key] = rating;
    }
  }
  if (typeof source.freeText === 'string') notes.freeText = source.freeText;
  if (typeof source.recordedAt === 'string') notes.recordedAt = source.recordedAt;
  return notes;
}
