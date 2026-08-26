# SpeedMath Architecture Constitution v1

This document defines the core architectural principles of the SpeedMath application. All future development, refactoring, and feature additions must strictly adhere to these five laws to ensure system stability, determinism, and maintainability.

## I. Engine Authority Law
* **Absolute State:** The `gameReducer` is the single, absolute source of truth for the application's state.
* **Immutability:** State transitions occur strictly through defined, immutable action dispatches. Direct state mutation is strictly forbidden.
* **Pure Logic:** The reducer contains only pure logic. It must never trigger side effects, generate random numbers, interact with the DOM, or call external services.

## II. Mode Isolation Law
* **Contract-Driven:** Game modes (Normal, QMM, Dark, Survival, Hidden) operate via strict, decoupled contracts (`modeContract.ts`).
* **Agnostic Core:** The core game loop and reducer must not contain hardcoded mode-specific branching (e.g., `if (mode === 'dark')`). Instead, they query the active mode's contract to determine behavior.
* **Visual Encapsulation:** Modes dictate visual projection rules (e.g., hiding the center node, obscuring modifiers) without altering the underlying mathematical truth or structure of the `GameStep`.

## III. Difficulty Engine Law
* **Blueprint Resolution:** Difficulty is governed by static, predefined blueprints (`difficultyLevels.ts`). The `DifficultyEngine` resolves a `DifficultyLevel` and `RampPhase` into a concrete `DifficultyVector`.
* **Separation of Concerns:** The Difficulty Engine knows nothing about the UI, the current score, the game loop, or the player's state. It is a pure translation layer mapping probabilities to vectors.
* **Determinism:** Resolution relies entirely on the seeded `RandomService` to ensure 100% reproducible difficulty curves and game sessions.

## IV. Generator Law
* **Procedural Tape:** The `ProblemGenerator` pre-compiles a "tape" of `GameStep` objects before a level or phase begins, rather than generating steps just-in-time.
* **Vector Consumption:** The generator strictly obeys the constraints of the `DifficultyVector` (e.g., `jumpSize`, `operandMagnitude`, `modifierMagnitude`) to bound numerical generation and step complexity.
* **Statelessness:** The generator does not hold or mutate active game state. It accepts configuration and difficulty parameters as input and outputs a deterministic array of steps.

## V. UI Projection Law
* **Pure Projection:** The UI layer (React components) is a pure, stateless projection of the `GameState`.
* **No Local Game Logic:** Components must not calculate math, determine answer correctness, manage game timers, or alter game rules. They only dispatch intents (actions like `SUBMIT_ANSWER`, `TIME_TICK`) to the engine.
* **Dumb Components:** Visual elements (nodes, distractors, modifiers) react to the `GameState` and `modeContract` to determine their visibility, styling, and animations. They do not decide *what* to show, only *how* to show what the engine dictates.
