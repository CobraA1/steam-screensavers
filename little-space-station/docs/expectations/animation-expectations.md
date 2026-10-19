# Animation expectations

These requirements apply specifically to The Little Space Station. Read them before changing character movement, prop handling, arrivals, departures, or camera-dependent staging. The root [AGENTS.md](../../../AGENTS.md) remains the platform contract.

## Readable action

- Stage the action for the production camera, including the approved 140% framing, first. The face, working hand, target, and result should be distinguishable at 1280×800 without debug labels.
- A character notices a target, turns toward it, approaches, performs the action, inspects the result, and returns naturally. Match gaze and body orientation to the actual target, rather than assuming a yaw is correct.
- Preserve the cozy, low-poly, retro-futuristic style. Pauses, anticipation, and small reactions are useful; constant motion and flashing are not substitutes for intent.
- Establish visible cause and effect. A hand must reach a carried or manipulated object. A hatch rotates at its hinge; a cloth hem connects to its skirt; an engine exhaust points away from the force it represents.

## Mandatory multi-view 3D inspection

For changes to **3D object placement, dimensions, orientation, geometry, attachments, movement paths, or physical interactions**, review **all four views** before declaring the change visually verified:

1. **Production perspective** (default camera and approved framing): primary acceptance view for composition, storytelling, readability, and cause/effect.
2. **Top orthographic** (station-local +Y): horizontal clearances, fore/aft and port/starboard alignment, approach paths, and hidden intersections.
3. **Front orthographic** (station-local +Z): heights, floor/deck contact, hand-to-prop reach, vertical separation, and horizontal alignment.
4. **Side orthographic** (station-local +X): hidden depth offsets, docking clearance, relative elevation, attachments, and movement through or behind structures.

Switch among them with **Preview mode → Camera experiment → View**. An orbiting perspective view is not a substitute for a true orthographic projection. The three inspection cameras are preview-only: production perspective remains the visual/storytelling authority.

For animations, examine **setup, contact, transfer/release, reaction, and exit**, intermediate travel, and both sides of relevant beat boundaries at matching timestamps in all four views. For static objects, check the assembled placement and neighboring surfaces. Where practical, pair screenshot evidence with world-space anchor/distance assertions; one camera angle can conceal a geometry error.

Report which views, states, and screenshots were actually inspected. If an orthographic inspection could not be done, disclose the gap and residual risk rather than claiming complete verification. Purely 2D overlay, text-only, or documentation changes may omit the extra views with a brief justification.

## Shared miniature character quality

- Dream scenes must use the shared `dream-pip-visual.js` model. Keep Pip's cream head, teal body, visor, chest light, paired articulated arms, elbow joints and wrist tool available across memories.
- Story-specific gestures may hide the tool, change Pip's pose or adjust a reach, but must not replace the shared model with a simplified robot.
- When changing miniature geometry, inspect both the antenna and Phantom dreams and confirm hand-to-prop contact is still clear.

## Motion and ownership

- Each prop has an identifiable location and owner. Transfer between hand, fixture, ship, and free flight at matching world transforms. Do not teleport or shrink an object to conceal a broken handoff.
- Adjacent beats agree in position, orientation, scale, visibility, and opacity for actors that remain visible. Plan both the first and last poses of every beat.
- Every preview seek reconstructs a complete pose: reset rotations, scale, opacity, and visibility that a later beat may have changed. Scrubbing backward must match a fresh render at the same time.
- Move incoming objects from offscreen or a plausible occluder. Departures clear the station and other geometry before accelerating. Use gentle fades only when they communicate the intended visual effect or an offscreen exit.
- A narrative checkpoint must not remove actors mid-exit. Persisting an outcome and finishing its visible animation are separate responsibilities.
- Use existing time and animation systems. Prefer bounded procedural transforms and simple joint posing; do not add physics or a second simulation to solve staging problems.
- Keep transforms and motion deterministic where practical. Decorative motion should vanish at beat endpoints or use a continuous shared phase. Avoid unnecessary per-frame allocations.

## Verification

1. Exercise the actual preview controls and watch playback, not just isolated poses. For 3D changes, check production perspective **and** top/front/side orthographic projections.
2. Inspect setup, contact, release, reaction, and exit, plus immediately before/after beat boundaries. Scrub forward, backward, and from the last beat to the first.
3. Compare 1280×800, 1920×1080, and 2560×1600 when framing changes; inspect sunlight and shadow. Check a narrow viewport for viewport-bound overlays.
4. Test meaningful geometry relationships: joint reach, front-facing target direction, boundary continuity, offscreen exits, and reset behavior. Source-string assertions do not prove these properties.
5. Check browser errors, missing resources, and the passive production path. State which screenshots and playback intervals were actually inspected; distinguish desktop testing from Gaming Mode testing.

See also [story expectations](story-expectations.md) and [dream expectations](dream-expectations.md).
