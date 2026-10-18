# Procedural Narrative Screensavers: Design Principles

**Purpose:** A reusable design philosophy for passive, event-driven screensavers with the charm of *Johnny Castaway*: small worlds with ordinary routines, occasional surprises, and stories that develop over time. The same principles can support a space station, lighthouse, castaway island, workshop, colony, or other miniature setting.

**Status:** Design guidance, not a fixed implementation specification. Examples and timings are illustrative.

## 1. A living world, not a sequence of clips

The screensaver should feel like a place that exists independently of the viewer. Characters have routines; vehicles arrive and depart; systems operate; weather, lighting, and scenery change. Most activity is ordinary. Some combinations of circumstances lead to humor, mishaps, discoveries, or longer story arcs.

- **Reward incidental observation.** A viewer who looks up for ten seconds should see something worth noticing without needing any context.
- **Preserve quiet moments.** Constant spectacle makes extraordinary events feel ordinary.
- **Show causes and consequences.** Prefer an event that changes the world, even subtly, over an unrelated animation that simply resets.
- **Never require interaction.** The viewer can watch, leave, or dismiss the screensaver at any time without breaking the experience.

## 2. Separate world time, presentation time, and animation time

These clocks answer different questions and must not be conflated.

| Clock | Meaning | Typical use |
| --- | --- | --- |
| **World time** | Real-world date and time, including periods when the screensaver is closed | Schedules, seasons, construction progress, background developments |
| **Presentation time** | Eligible on-screen time devoted to an event | Introductions, pacing, checkpoints, deciding when an event has been sufficiently presented |
| **Animation time** | Frame-to-frame elapsed time | Smooth movement, particles, rotations, camera transitions |

World time may jump hours or days between launches. Reconstruct or analytically advance world state; do not attempt to replay every missed frame. Animation time must be clamped after rendering hitches. Presentation time should advance only while the event can meaningfully play; do not count time spent hidden or before the scene is ready.

## 3. Generate deterministically where possible

A stable seed and time-dependent inputs can recreate a coherent world without storing every occurrence:

`world state = f(world seed, world time, stable rules)`

Use separate, stable seeds for the world's identity, calendar periods, entities, and event IDs. For example, the world seed determines the station layout, a weekly seed generates incoming traffic, and a particular cargo-ship event ID determines its cargo and crew. Evaluate the current phase directly from the clock instead of running the entire history.

- Do not use fresh, unseeded randomness for facts that must remain consistent between launches.
- Make calendar boundaries and time zones deliberate; avoid events jumping unpredictably at midnight or daylight-saving transitions.
- Keep procedural generation reproducible and debuggable through explicit seeds and simulated timestamps.
- Allow variety within stable rules; avoid making every day feel mechanically identical.

Determinism is especially suitable for background traffic, environmental changes, ambient behavior, and scheduled possibilities. It does **not** by itself record whether a particular story was presented or whether an outcome should be withheld pending a reveal.

## 4. Use persistence selectively, not reflexively

Persistence should store the facts that cannot safely be reconstructed from a seed and clock: event presentation progress, chosen story branches, durable world changes, continuity flags, and perhaps the world's original seed.

Prefer to **derive** routine movement and schedules, **save** narrative commitments and presentation checkpoints, and **rebuild** transient graphics on launch. Treat saved state as optional for rendering, not a prerequisite for showing a coherent scene.

The storage model should survive normal relaunches but must still tolerate missing, corrupt, incompatible, or evicted data. Use versioned schemas, namespaced keys, recoverable defaults, and infrequent meaningful writes. Do not persist every frame.

## 5. Design for brief and unpredictable viewing sessions

The opening moments are disproportionately valuable. An important event should become recognizable **soon after launch**, once the scene has stabilized. This does not mean every launch requires an important event.

A useful default rhythm is:

1. **Immediate:** Render a complete, believable ambient scene without setup screens or blank loading states.
2. **First few seconds:** Establish a focal point or subtle cue if a notable event is pending.
3. **Early session:** Begin the meaningful sequence while attention is relatively likely.
4. **Longer session:** Let the event resolve, return to routine, or transition into a later chapter.

Make some incidents self-contained in 5–15 seconds and give more elaborate events concise, recognizable chapters. Avoid lengthy mandatory introductions or an identical spectacular opening every time.

## 6. An event is not complete merely because it started

Starting an important animation is not equivalent to presenting its meaningful content. A screensaver might be dismissed two seconds after launch or terminated without notice.

Represent important events with an explicit lifecycle, such as:

`eligible → pending → presenting → checkpoint(s) → presented → resolved`

- **Eligible:** The procedural/world rules permit the event.
- **Pending:** The event has been selected and awaits a suitable presentation window.
- **Presenting:** Its current chapter is playing; starting alone does not consume it.
- **Checkpoint:** A meaningful scene milestone has actually been reached and can be saved.
- **Presented:** The essential payoff or required visual information has run for an adequate interval.
- **Resolved:** Any associated world-state consequences have been applied consistently.

These stages may be combined for trivial incidents, but major events need interruption-safe handling. Checkpoint during playback rather than depending on an unload or shutdown callback. Writes should be idempotent, so an interrupted or retried commit cannot award the same consequence twice.

On the next launch, resume at a clear checkpoint or replay a short introduction. Do not resume mid-gesture or assume viewers remember several seconds of unexplained setup. A run of very short sessions should not permanently consume a major event.

**Important limitation:** A screensaver can know that something was *presented*, not that a human *saw* it. Do not label state as “watched” or promise guaranteed observation.

## 7. Give important events an event director

Keep the underlying world simulation separate from a lightweight **event director** responsible for narrative pacing and presentation.

The director should:

- Select suitable events from procedural opportunities and saved pending events.
- Prioritize interrupted chapters when doing so remains coherent.
- Schedule a noteworthy moment early without forcing drama on every launch.
- Prevent overlapping major sequences and protect the viewer's focal point.
- Apply cooldowns, rarity, and variation so surprises remain surprising.
- Coordinate start, checkpoints, completion, and any persistent consequences.

Most ambient activity should operate independently. The director intervenes only when a sequence needs clear presentation. If the world says a ship has already arrived but its arrival is an unpresented story beat, either delay the *visible reveal* or present a coherent aftermath; never show mutually contradictory states.

## 8. Layer events by importance

| Layer | Behavior | Interruption policy |
| --- | --- | --- |
| **Ambient** | Routine traffic, maintenance, wildlife, day/night cycles | Freely recomputed; no progress tracking needed |
| **Minor incident** | Brief joke, mishap, visitor, curious action | Usually expendable; repetition acceptable within limits |
| **Major event** | Distinctive encounter, discovery, change to the setting | Queue and checkpoint; give its payoff a fair presentation window |
| **Story arc** | Related events spanning sessions or days | Persist or reconstruct chapter state; maintain causal continuity |

The most enjoyable variety may come from independent systems interacting: a delivery arrives during a repair, a storm interrupts a routine job, or an unexpected visitor reacts to an existing object. Favor readable combinations over a large inventory of disconnected random animations.

## 9. Make missed events leave a trace

Even a carefully timed event may play while nobody watches. Significant incidents can leave visible consequences: a new module, damaged antenna, unusual cargo, recurring visitor, or small memorial of a previous event.

This supports discovery without demanding perfect attendance. Background world progression can continue regardless of viewing. Story-critical reveals, however, should be distinguished from world facts so that advancing the clock does not silently consume all the most interesting moments.

## 10. Separate simulation, direction, and rendering

A maintainable architecture has distinct responsibilities:

- **World model:** Entities, stable properties, rules, time-derived state, and durable changes.
- **Procedural scheduler:** Deterministic event opportunities and world activity.
- **Event director:** Presentation priority, interruption handling, cooldowns, and checkpoints.
- **Persistence adapter:** Versioned reads/writes with graceful fallback.
- **Renderer:** Reads the current scene and animates it; does not own narrative truth.

A scene's event system should not be coupled to Three.js geometry or to a particular setting. Shared rules can power a space station, island, or workshop while each supplies its own actors, events, and visuals.

## 11. Passive presentation and technical restraint

The screensaver belongs to the host environment. It must display itself automatically, fill the screen, and disappear when the host receives ordinary input. It should not demand clicks, show settings interfaces, intercept dismissal, or assume a fixed resolution.

Optimize for stable, long-running performance: bounded object counts, reusable assets, predictable memory use, no unnecessary per-frame allocations, graceful renderer failure, and reduced work when hidden. Favor legibility from across a room; use readable silhouettes and pacing rather than text-heavy exposition or rapid flashes.

Keep configuration and debug controls **outside the normal viewing interface**. Development builds should support fixed seeds, simulated dates, accelerated clocks, forced event IDs, and deliberate interruption tests.

## 12. Test for narrative correctness, not just animation quality

At minimum, verify these scenarios:

- Start and dismiss within 1–3 seconds; an important event remains available.
- Dismiss during the introduction, middle, and payoff; subsequent launches replay or resume coherently.
- Keep the screensaver open for an hour; behavior remains varied, stable, and performant.
- Close it for days or weeks; derived world state catches up without an expensive historical replay.
- Reboot, switch screensavers, or relaunch; state and event IDs remain consistent.
- Simulate missing storage, failed writes, clock changes, resolution switches, and interrupted initialization.
- Replay a fixed seed and timestamp; the same generated facts and event opportunities recur.
- Confirm saved consequences are never applied twice after crashes or retries.

## 13. Steam Deck implementation notes (verified project context)

These host-specific notes complement the general principles above and reflect the project's `AGENTS.md` and subsequent testing:

- Steam screensavers are HTML-based, one folder per saver with `index.html`; bundle assets and libraries locally.
- In Gaming Mode, screensavers should be passive and should not register input handlers or manage fullscreen.
- Use `requestAnimationFrame`; respond to resize and also detect viewport/pixel-ratio changes that may arrive without a useful resize event.
- Local Storage, IndexedDB, Cache Storage, cookies, and OPFS were writable and persisted across launches in tests on **2026-10-14**. Subsequent tests confirmed survival across a **full Deck reboot** and **switching between screensavers**.
- Web SQL was unusable. Storage retention is still reported as **best effort**, not guaranteed. IndexedDB is the likely primary choice for structured narrative state; Local Storage suits small settings.
- Keep stored data namespaced; screensavers may share a browser origin. A storage error should never prevent the scene from rendering.

See `AGENTS.md` for the authoritative current host rules and test findings. This document is a design guide, not a replacement for those platform instructions.

---

### Guiding principle

> **Generate the ordinary world freely; preserve the extraordinary moments carefully.**

The goal is not to ensure that every viewer sees every event. It is to create a believable, continuously developing place where interesting things happen, important stories have a fair chance to be noticed, and interruptions never punish the viewer.
