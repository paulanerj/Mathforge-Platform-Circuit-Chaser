# CC2-CREATURE-EXPERIENCE-03 — Presentation, Creature Sound, Encounter Storyboards and Acceptance
**Design only.** This document specifies experience that can be evaluated *before* building gameplay. It does not claim the behavior is live.

## Visual north star
Maintain approved Slate / Focus 43 clarity and Monument-Valley-like controlled simple geometry. Creatures have *substantial physical presence* rather than icons sitting on tile corners. Express a living internal material while keeping outlines crisp and numbers readable. Never turn the level into green fog or plasma-noise wallpaper. Creature body, platform occupation, outgoing cast and residue must be different objects/semantics with a coherent cause and effect.

### Layering / hit safety
0. Background large objective target and environment grid.
1. Read-only platform residue and finite stability/charge indicators, BELOW numeric labels.
2. Actual primary numbered platform hit areas (frontmost and always tap-safe).
3. Creature body and directional cast, rendered in bounded, transparent platform-local segments; creature interaction target is separate and >44 CSS px.
4. Creature challenge bubble anchored to its real body with a secure top/bottom fallback near screen edges; never overlays both all three number platforms at once.
5. UI primary objective phrase and live math expression, Pulse, pause, sound, settings.

The player must always recognize primary vs optional math at a glance. Primary phrase is quiet persistent **SUM TO / SKIP BY / MAKE TARGET** with large background numeral. Optional bubble has a different silhouette and species sound signature and a visible `OPTIONAL · CREATURE` caption. The question uses only 2–3 answer buttons, always includes an obvious Skip/Ignore action without trapping the user.

## Green liquid Guardian storyboard (9 meaningful frames / event transitions)
1. **Hops toward new platform:** mild asymmetric squash; motion lags a few pixels relative to center, recovered with springy mass. Body translucent olive/sea-glass green, outline 2px clean at 50px size.
2. **Observes real nearby Pursuer:** nozzle/head turns to perceived angle with bounded smooth angular velocity. No aim snap to hidden off-screen Spark.
3. **Compressions/windup:** gel squeezes into a visible front bulb; a discrete pulse travels backward through its body.
4. **Casts from occupied platform:** a single broad, contiguous thick fluid volume launches from the head, retaining internal nonlooping turbulence but a well-defined front surface.
5. **Advects and thickens:** thick firehose liquid bends under mass/inertia, spreads outward from actual physical facing, stops within a maximum one-row corridor. Not just a beam line. Two narrow satellite droplets may follow but no spray covering main equation.
6. **Pooled field:** near-transparent green pooled sheet connects creature origin to obstruction; approaching Pursuer deforms it. A distinct visual viscosity fringe reflects resistance; colored/stippled legibility survives high contrast.
7. **Contact:** only real body/field overlap triggers source `PURSUER_GEL_ENTER`; bot compresses, loses acceleration, visibly pushes through. A low “stuck” wet friction sound emits *once*, with a short musical slowed-time phrase.
8. **Release:** field loses stress, contracts and detaches, bot restores speed gradually, voice resolves. No sudden stop/resume.
9. **Afterimage:** short platform-local clear gel stain remains and evaporates when source TTL expires, not when an arbitrary GIF completes.

Visual knobs: directionalFacing, dischargeDelay, frontSpeed, maxLength, width, strandEdgeTightness, stretch, squeeze, internalNoiseScale, gelClarity, hue/saturation, liquidGlassRefractiveHint, surfaceResidueAlpha, shadowSoftness, particlesMax, materialPreset. Audio knobs: scrapeGain, fluidLowpass, releasePitch, motifTension, voicePriority, eventCooldown.

## Tether Slug storyboard (8 transitions)
1. Slow compressive hop, fat body with discernible underside.
2. A dark-tinted adhesive gland exposes a transparent tether.
3. Threat icon and short warning arrive BEFORE contact.
4. Tether anchors from actual platform footprint to Spark body only after source-confirmed collision.
5. Elastic filament stretches as Spark moves, with angle and curvature based on *relative world coordinates*. The attachment is a **causal connection**, not a sticker over Spark.
6. Spark travel slows (source physical travel multiplier), while pointer/button response remains immediate; visible displacement causes a thinned/stressed tether, not blur.
7. Pursuer naturally closes the distance if still seeing the player; does not receive an unexplained supernatural speed multiplier.
8. After <= two actual rows or TTL, the filament snaps (musical pluck), recoils with limited inertia, residue fades and full player mobility returns.

Distinguish Guardian from Slug without relying on hue: Guardian = **outward flowing ribbon**, broad advancing front; Slug = **inward taut line**, stretching between anchor and Spark. Sound: flowing drag vs dry elastic pull. Creature silhouettes: wide mouth vessel vs round heavy anchor with trailing tendril.

## Cap / Relay / Prism / Fracture storyboards (per creature)
**Capacitor Sprite:** dart and wobble > stop and absorb charge into 3–5 visible small facets > bounce energy ring on platform > offer passkey > correct response turns facets full > one contained spark emission travels toward player > charge meter/source receipt increments > residue decays. On wrong response facets empty without damage. A short bright two-note phrase becomes a longer arpeggio only when power actually arrives.

**Relay Weaver:** short triangular steps between source legal adjacency points > stretched cyan thread stays physically connected > platform contact imprint > passkey proposal > on success emit a packet following thread in actual hop-graph order > arrival shields/grounds chosen target source > thread fades link-by-link. On wrong, thread is cut; no bonus. Audio plays compact two-voice response that follows exact edge activations.

**Prism Shuffler:** prismatic lunge onto next-row precursor > visibly announces `UPCOMING ROW MAY MOVE` > angular mirror rotates once > source-atomic permutation of upcoming complete option identities before input allowed > **numbers and hitboxes settle together** > final glassy click, clear ready state. No flashy slot-machine reordering while player is mid-tap. On solved passkey, a wave resolves back and no permutation occurs.

**Fracture Wisp:** leap up under future platform > pre-crack tremor, sharp bounded edges with clear warning, no fog > passkey offer > successful solve stitches visual plate and cancels state; failure causes bounded decay > stability meter drains with countdown > normal correct-answer route remains possible > on final expiry enter designated source recovery state if approved. First proof forbids physical row-drop until separately qualified. Sounds are distinct dry tension clicks, and a short downward interval only if an actual source row drop occurs.

## Dynamic micro-puzzle UX
Use a creature-originated compact bubble, but maintain stable primary objective stack and pointer feedback:
- Example Guardian: `A little more every hop · 3, 6, 9, ?` then `10 | 12 | 15`.
- Example Slug: `Cut the line · 2, 4, ?, 8` then `5 | 6 | 7`.
- Example Relay: `Connect the pattern · 5, 10, 15, ?` then `18 | 20 | 25`.
- Creature speech is organic in tone, but the *math* remains unambiguous; playful prose cannot hide the operation. Distinct bubble tail points to actual creature body.
- On correct response, pulse action visually propagates from the selected number **through the creature to the world target**, making causality understandable.
- On wrong response, explain briefly in one line `The pattern steps by 3: 3, 6, 9, 12` if learning settings enable hints; do not fill the whole screen or bury the original game.
- If a user taps a primary math platform while a creature bubble is open, resolve/cancel the optional challenge in a defined source command before normal platform selection, never swallow the main input. Disabled buttons mean actual source phase not a cosmetic animation.

## Musical solo/voice contract
Every creature has a mini musical score with clear motifs and phase-specific transformations. The existing accepted Speed Grid reference five-role score stays the master transport/tempo. A creature voice gets a **two-beat to one-bar primary musical phrase**, with at most one distinct voice prominent at any moment; later encounters may counterpoint but avoid constant overlapping scales.
| Creature | Movement phrase | Passkey offered | Correct / resolved | Danger / failed |
| --- | --- | --- | --- | --- |
| Guardian | low-mid round triplet swelling | suspended two-note water-drop | widening soft fourth and descending warm release | puff dissipates |
| Capacitor | quick rising segmented arpeggio | short repeated 3-note figure | top-register bright motif + clear one-shot charge | soft uncharged fall |
| Relay | alternating left/right pings | held call note | interlocking call/response at verified link | broken two-note answer |
| Tether | lower drag/offbeat slide | thin steady tension pulse | snapped release, upward interval | short low gritty drag, no continuous noisy loop |
| Prism | displaced offbeat bell flecks | symmetrical bouncing two tones | clean resolving chord | one brief reversed-glass gesture |
| Fracture | scattered clipped staccato | tightening clock motif | calming reduction to pulse | bounded falling two-note figure |

Use note-rate limitation: no more than one cue per source event ID; fades and ducking ≤ available headroom; one shared AudioContext; muted and low-sensory override all voices. Generate source-linked debug graph of source event -> scheduled beat -> instrument/voice -> actual audio node for verification. Timbral choices are proposed and subject to owner testing; no existing copyrighted melody is required.

## 12 early evidence scenes for prototype acceptance
1. Guardian idle/loaded, clear enough against light Slate.
2. Guardian side shoots viscous stream along correct world facing; field physically reaches a corridor.
3. Pursuer enters real field -> slows, strains visibly, recovers on exit. Compare matched seed vs no Guardian to prove distance effect.
4. Guardian puzzle solved vs failed, same seed, spell authorized vs absent.
5. Slug lands on platform -> visible warning, tether binds source-player on contact.
6. Spark moves slower while button acceptance remains immediate; after <= two rows tether snaps and speed returns.
7. Hostile micro-passkey solved exactly as threat starts -> cancellation beats penalty under documented tick priority.
8. Primary question still visible and all three platform choices usable while creature is active.
9. Capacitor success increases actual source charge by exactly one when not capped, no invented doubled score.
10. Relay protective link appears only if source effect exists; visually dissipates when TTL expires.
11. Prism attempts rearrangement during in-flight selection and is correctly deferred/rejected; new row options never lie to the player.
12. Fracture threatens a future row but no unresolved math board, fake wrong answer, or unearned capture results.

## PM acceptance checklist (human observable)
A 9–10-year-old learner should be able to answer unaided:
- “Which creature is helpful or dangerous?”
- “What will happen if I touch it?”
- “Can I keep climbing without solving the creature puzzle?”
- “What did I just earn or prevent by answering it?”
- “Why is my Spark slower / why is the Pursuer stuck?”
- “Did the platform actually change, or was it just an animation?”
- “How many rows will this last?”
- “Did I lose because I chose the wrong math answer, because of a creature, or because the bot physically caught me?”
- “Could I have avoided that?”
- “Can I hear the creature's signature without drowning out the actual game music?”

If those questions cannot be answered consistently from playing a short encounter, visuals and music are decoration rather than game design.
