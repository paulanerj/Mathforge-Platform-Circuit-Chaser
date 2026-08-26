# CIRCUIT_CLIMB_MANUAL_QA

This guide provides a comprehensive step-by-step testing script to verify visual parity, core game loops, input bindings, audio feedback, view tuning controls, and performance stability for the migrated "Circuit Climb" mode.


**Result: PASS**

---

## Test Case 1: Entry & Layout Verification
1. Open MathForge in your browser.
2. Navigate to the **Play Menu** screen.
3. Locate and click the **Circuit Climb** button (with the 🧗 icon).
4. Verify the visual layout:
   - The game frame is centered, framed inside a styled rounded card wrapper.
   - The **Intro Startup Screen** overlays the canvas, explaining the rules of the prototype.
   - Standard keyboard shortcuts hint text is visible at the bottom of the card.
   - "Start prototype" and "Back to Menu" buttons are displayed with elegant neon hover transitions.


**Result: PASS**

---

## Test Case 2: Standard Interaction & Math Mechanics
1. On the starting menu, click **Start prototype** (or press keyboard key `1`, `2`, or `3`).
2. Verify:
   - The intro screen slides out of view.
   - The canvas starts rendering the multi-layer starry sky backdrop and flowing grid traces.
   - The **Equation Card** at the top displays the math formula (e.g., `4 + ? = 10`).
   - The blue player spark sits at the bottom launchpad carrying value `4`.
   - Three glowing option platforms reside directly above the player (e.g., carrying `+2`, `+6`, `+9` values).
3. Use the mouse or keyboard (`1`, `2`, or `3`) to select the correct platform (e.g., `+6` if target is `10`):
   - Click/tap the correct platform tile directly on the canvas.
   - Or press keyboard key `1`, `2`, or `3` corresponding to Left, Middle, and Right columns.
4. Verify:
   - A soft retro synth pulse plays.
   - The blue player spark travels along the right-angle circuit grid corridor.
   - The spark lands on the chosen platform, adding `+6` to its charge and changing its value to `10`.
   - Green particle bursts explode outwards.
   - The camera scrolls up to center the new platform.
   - A new row of platforms and a new target equation appear.


**Result: PASS**

---

## Test Case 3: Strike & Penalty Mechanics
1. On a climb step, select an incorrect platform.
2. Verify:
   - A heavy warning alarm sound is heard.
   - The chosen platform flashes red, locks out with an "X" indicator, and becomes disabled.
   - Red spark particles burst outwards.
   - The player spark shakes/recovers but stays on their current base platform.
   - The red timing spark below gains ground, moving closer to the player.
   - The bottom ticker message updates: `Short circuit. The red timing spark gained ground.`


**Result: PASS**

---

## Test Case 4: Movement Mode Toggling
1. During gameplay, click the **Move: Circuit** button in the bottom action bar or press key `M` on the keyboard.
2. Confirm:
   - The bottom button text updates to **Move: Hop**.
   - The top stats card "MODE" indicator updates to `HOP`.
3. Select a correct platform.
4. Verify:
   - A high retro hop sound is heard.
   - The blue player spark leaps in a smooth parabolic trajectory upwards, bypassing the grid traces.
   - Click the button or press `M` again to switch back to **Circuit** mode and verify right-angle routing is restored.


**Result: PASS**

---

## Test Case 5: Sound Controls
1. Click the **Sound: On** button in the bottom action bar.
2. Verify:
   - The button text updates to **Sound: Off**.
   - Select a platform or toggle modes. Verify that all synth sound effects are silenced.
3. Click the button again to toggle sound back to **On**. Verify sounds are restored.


**Result: PASS**

---

## Test Case 6: Live View Settings & Configuration Export
1. Click the **View** button in the bottom action bar.
2. Verify:
   - The **Live view tuner** panel slides open from the side.
   - Active gameplay is paused automatically.
3. Drag the **World framing** range slider:
   - Dragging towards "More world" zooms the camera out, displaying more platforms.
   - Dragging towards "Closer view" zooms in on the player.
   - Verify the numerical readout updates in real-time.
4. Drag the **Circuit corners** range slider:
   - Confirm it updates from 6 to 12.
   - Choose a correct platform. Verify the right-angle path routes with the selected number of turns.
5. Click **Show config**:
   - Verify the exported JSON text configuration displays in the text area (e.g. `{"viewScale":100,"routeTurnCount":8}`).
   - Click **Copy config** and verify the message "Configuration copied." appears below.
6. Click **Reset** and verify view settings return to 100% scale and 8 turns.
7. Click the `×` button on the panel or the **Resume** button in the bottom bar to close settings and continue playing.


**Result: PASS**

---

## Test Case 7: Defeat & Persistence Validation
1. Start a play run, climb up several rows to achieve a score (e.g., score of 5).
2. Stop selecting platforms. Let the red timing spark patrol up and reach the player.
3. Upon collision, verify that:
   - The game halts immediately.
   - A danger synth tone is heard.
   - The **GameOver Screen** overlay appears.
   - The final altitude and best run record are displayed correctly.
4. Verify high scores are persisted by clicking **Climb again** and checking the "Best Run" statistic. High scores must persist across browser page reloads.

**Result: PASS**
