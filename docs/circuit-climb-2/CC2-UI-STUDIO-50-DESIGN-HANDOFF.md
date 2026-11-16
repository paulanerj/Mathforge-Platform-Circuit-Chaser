# Circuit Climb 2.0 — 50-Concept UI Studio

Status: independent owner-review prototype, not an approved live-game redesign.

Branch: feature/cc2-ui-studio-50-concepts
Protected baseline commit: 876907daed183ff3c52b35b626f4d3afa08fe80b
Standalone studio: public/cc2-ui-studio/index.html
Configuration schema: mathforge-cc2-ui-studio/v1

## What is built

An offline-capable standalone single HTML file containing all CSS and JS. Fifty concepts are formed by ten visual families multiplied by five compositional systems, allowing controlled comparison.

Visual directions: Mineral, Porcelain, Midnight, Sage, Obsidian, Sandstone, Arctic, Amethyst, Slate, Dawn.

Compositions:
- Horizon: balanced top HUD and playfield.
- Tower: immersive vertical board and floating telemetry.
- Focus: maximal board and minimal competing interface.
- Tactical: angular geometry and high-information layout.
- Floating: layered cards and distinct controls.

Every concept retains the same mathematical demonstration: 2 + ? = 10 with choices 5, 1, 8; blue Spark; red Pursuer; simple source-inspired platform network; World 03, level, progress, charge and primary bottom actions. Tapping a choice demonstrates correct or incorrect feedback, but does not run the authoritative game engine.

## Apple-aligned design principles

- Primary-task clarity, hierarchy, predictable control positions and coherent materials.
- iOS and iPadOS responsive layout with 44-point touch targets, safe-area awareness and comfortable reach.
- Legible text, high-contrast semantic colors, non-color feedback, and reduced-motion controls.
- Lower emphasis on administrative details. One compact top information row and bottom player actions.
- Match the existing MathForge number palette when a selected concept is later integrated into the suite.

Research:
- https://developer.apple.com/design/human-interface-guidelines/design-principles/
- https://developer.apple.com/design/human-interface-guidelines/designing-for-ios
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/tips/

Apple design guidance does not establish one universally optimal game UI. Owner comparison and child playtesting are required for selection.

## Owner workflow

1. Browse all 50 options. Search or filter by favorites, light or dark.
2. Compare two options using Set A, Set B, then Compare A/B.
3. Edit material, layout, density, contrast, motion, radius, font, grid and atmosphere.
4. Adjust 12 semantic color tokens using the native color controls.
5. Favorite candidates and export JSON from the preferred concept.
6. Import the JSON to reproduce the chosen design or reset to baseline.
7. Provide exported JSON to PM to create a separate real-game UI integration branch.

The exported JSON contains selected design ID, schema version, source commit, layout and design tokens, not engine state or math options.

## Mandatory future integration qualification

- Freeze owner-selected preset and immutable original approved UI reference.
- Map semantic tokens into the real game without touching math, bot AI, collisions, camera, scoring, music, achievements or the already accepted Spark death choreography.
- Preserve the original math identity, number-specific colors, fixed gameplay input targets and the single top/bottom MathForge control rows.
- Play-test all states: beginning, selected answer, actual landing, wrong answer, Pulse, capture, win, pause, summary and replay.
- Test iPhone Safari and Chrome, 320/360/390/428 mobile widths, tablets, desktop, rotation, reduced motion, touch target size and contrast.
- Require full source-digest parity and owner visual approval prior to merge.
- Do not automatically merge or promote this prototype to the production game.

## Qualification target

50 concepts; five actual layout compositions; 10 palette/material directions; six browser widths; A/B comparison; correct/incorrect feedback; JSON export/import/reset; fully offline portable single file; zero accepted game-source changes.

This UI Studio is a design-choice application only. It is not a real gameplay build, a published MathForge Gen2 component, or an accepted design until the owner chooses it.
