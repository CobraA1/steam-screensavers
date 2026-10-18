# Animation expectations

These requirements apply to custom screensavers, especially The Little Space Station. Read them before changing character movement, prop handling, arrivals, departures, or camera-dependent staging. The root [AGENTS.md](../AGENTS.md) remains the platform contract.

## Readable action

- Stage the action for the production camera, including the approved 140% framing, first. The face, working hand, target, and result should be distinguishable at 1280×800 without debug labels.
- A character notices a target, turns toward it, approaches, performs the action, inspects the result, and returns naturally. Match gaze and body orientation to the actual target, rather than assuming a yaw is correct.
- Preserve the cozy, low-poly, retro-futuristic style. Pauses, anticipation, and small reactions are useful; constant motion and flashing are not substitutes for intent.
- Establish visible cause and effect. A hand must reach a carried or manipulated object. A hatch rotates at its hinge; a cloth hem connects to its skirt; an engine exhaust points away from the force it represents.

## Motion and ownership

- Each prop has an identifiable location and owner. Transfer between hand, fixture, ship, and free flight at matching world transforms. Do not teleport or shrink an object to conceal a broken handoff.
- Adjacent beats agree in position, orientation, scale, visibility, and opacity for actors that remain visible. Plan both the first and last poses of every beat.
- Every preview seek reconstructs a complete pose: reset rotations, scale, opacity, and visibility that a later beat may have changed. Scrubbing backward must match a fresh render at the same time.
- Move incoming objects from offscreen or a plausible occluder. Departures clear the station and other geometry before accelerating. Use gentle fades only when they communicate the intended visual effect or an offscreen exit.
- A narrative checkpoint must not remove actors mid-exit. Persisting an outcome and finishing its visible animation are separate responsibilities.
- Use existing time and animation systems. Prefer bounded procedural transforms and simple joint posing; do not add physics or a second simulation to solve staging problems.
- Keep transforms and motion deterministic where practical. Decorative motion should vanish at beat endpoints or use a continuous shared phase. Avoid unnecessary per-frame allocations.

## Verification

1. Exercise the actual preview controls and watch playback, not just isolated poses.
2. Inspect setup, contact, release, reaction, and exit, plus immediately before/after beat boundaries. Scrub forward, backward, and from the last beat to the first.
3. Compare 1280×800, 1920×1080, and 2560×1600 when framing changes; inspect sunlight and shadow. Check a narrow viewport for viewport-bound overlays.
4. Test meaningful geometry relationships: joint reach, front-facing target direction, boundary continuity, offscreen exits, and reset behavior. Source-string assertions do not prove these properties.
5. Check browser errors, missing resources, and the passive production path. State which screenshots and playback intervals were actually inspected; distinguish desktop testing from Gaming Mode testing.

See also [story expectations](story-expectations.md) and [dream expectations](dream-expectations.md).
