# CC2-06A — Production Visual Direction Concept 01

Date: 2026-11-12
Parent: validated CC2-05B `0d46b5576369da96a212cfb8782daa975d7eddeb`
Branch: `feature/cc2-06a-production-visual-pass`
Status: engineering candidate, owner visual acceptance required; **NOT** a production release

## Problem observed in the owner's screenshot

CC2-05B guaranteed three row levels above and below at all sizes by scaling both axes to roughly the same small factor. It then **moved only the HTML choice buttons** sideways for touch accessibility, while Canvas columns and platform pedestals remained close together in the center. This created a visibly false tower: selectable numbers and underlying platforms were not aligned. An overly large empty perimeter, tiny characters and many empty three-card placeholders compounded the issue.

The 05B browser tests verified nonoverlap but did **not** prove semantic alignment. This phase repairs the projection itself and adds explicit screen-space alignment assertions for every real choice.

## Owner-directed visual acceptance

- **Exactly two visible row levels each way as the camera's minimum**: user explicitly preferred a compact, legible five-tier field over the earlier over-zoomed seven-tier demonstration. View auto-fit targets two above and two below; it never forces three or four across all devices.
- **One unified tower**: Canvas and DOM platform locations use the same camera coordinate system. No responsive CSS trick may spread only the hitboxes.
- **Independent horizontal and vertical camera scales**: horizontal spacing is about 22%, 50%, 78% of board width; vertical framing fits four row gaps plus physical platform height and margin. These affect only drawing and hitboxes in the screen, never the actual world, Pursuer, collisions or arithmetic.
- **Visual hierarchy**: one primary equation, architectural five-tier tower with three precise translucent lanes, physically grounded active cards, blue learner Spark and red character Pursuer. Nonexistent future math is represented solely by subtle **one-piece** tier rails and empty sockets, never three fake interactive platforms.
- **MathForge production style**: restrained Monument Valley-influenced geometry, dark architectural depth, aqua/silver internal illumination, champagne-gold accents, no green plasma or noisy overloaded controls. Distinct source-backed states for correct landings, wrong shorts, Pulse effects and bot moods. Header explicitly says **PRODUCTION LOOK · CONCEPT 01** to avoid confusing this approved engineering preview with a released product.
- **Mobile first**: 320 / 390 / 768 / 826 px Chromium screenshots and actual DOM-card world-projection center parity, minimum 64px option width, no overlapping touch areas. Player's numeric glyph and Pursuer expression stay circular and readable under anisotropic camera scaling.

## Preserved technical authority

- No modification to `src/games/circuit-climb/` original SOT-02.
- No change to `src/games/circuit-climb-2/math/`, `core/`, pursuit controller, AI finite-sense firewall, feature ledger, game clock or replay logic.
- The CC2-05B intermediate bot remains search 1.44 and chase 2.28, learner 26, with Curious personality; audio/VFX mappings remain present and configurable.
- Preview rails are presentation objects only. They have no path IDs, options, values or hit targets.
- The standalone builder bundles the exact source HTML+TypeScript into one portable HTML, no CDN and offline-compatible.

## Evidence gates

1. 2+2 actual camera reach and three x-aligned DOM/Canvas choices (new productionCamera unit and browser fixtures).
2. Same seed/mode math and pursuer snapshot signatures when the camera zoom changes.
3. Full inherited CC2 and original SOT test suite, Q2 mathematical browser, previous achievements browser, protected original browser, production build.
4. 320/390/768/826 screenshots reviewed visually, no overflows.
5. File-protocol offline Chromium smoke with HTTP blocked, and owner download of an HTML that opens on Windows.
6. Owner acceptance is separate. A production-looking engineering build is not yet a fully qualified or artist-approved release.

## Next PM gate

CC2-06B — Visual refinement and device qualification: responsive control safe areas; visual accessibility and reduced motion; clean celebration math-event animation; Pursuer threat marker if more than two rows below the learner; screen-shape validation on iPhone Safari and Galaxy Tab; actual listening and volume balance; owner approval of the visual treatment. Avoid altering mathematics and intelligent Pursuer rules without independently qualified workstreams.
