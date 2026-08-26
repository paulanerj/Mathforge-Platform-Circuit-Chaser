# P2 Persistence Contract

## 1. Storage Keys
- `speedMathSettings`: User global settings.
- `speedMathHighScores`: Saved high scores.
- `sa_xp_data`: User experience points and leveling.
- `speedMathProgress`: General progress logging.
- `speedmath_curriculum`: Instructor custom curriculum blocks.
- `speedmath_lesson_plans`: Saved `PracticePlan` configurations (with versions).
- `speedmath_active_session`: Currently active learning session.

## 2. Safe Storage Wrapper (`SafeStorage`)
All access to `localStorage` for plans and active sessions must route through the `SafeStorage` helper in `src/services/safeStorage.ts`. This ensures:
- Safe JSON parsing and fallback defaults on corruption.
- Implicit QuotaExceededError handling (fails silently by returning `false` rather than crashing the app).
- Fallbacks for private browsing modes.

## 3. Active Session Schema
Key: `speedmath_active_session`
```typescript
export interface ActiveSessionData {
  version: number; // Schema version (1)
  currentPlan: PracticePlan; // The currently active lesson
  currentLevelIndex: number; // The user's active level within the lesson
  progress: PracticePlanProgress; // Tracking of stars, completion history
  timestamp: number; // Date.now() when last updated
}
```
**Recovery Rules:**
- Read on app-load by `PracticePlanController` constructor. 
- Overwritten every time a user changes levels or finishes an activity.
- Cleared intentionally by `clearPlan()` (e.g. going to Home manually) or when finishing a lesson completely.
- In case of format misversioning or JSON error, `SafeStorage` yields `null` and the session fails gracefully (no session resumed).

## 4. Lesson Plan Schema
Key: `speedmath_lesson_plans`
Contains a list of `PracticePlan` objects.
**Versioning Changes:**
- `version`: Lightweight integer to signal object shape.
- `updatedAt`: Timestamp for last modification (can display cleanly in UI).

## 5. Export & Import
- Format: A JSON file wrapped in a standard `version` object.
- Validates the import structure `Array.isArray(parsed.plans)`.
- Replaces matches based on `planId`, appends new plans.
- Alert provided for end users gracefully on corrupted/malformed import files.
