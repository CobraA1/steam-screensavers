# The Little Space Station — Pip and the Stubborn Antenna

**Story ID:** `stubborn-antenna`  
**Status:** Implementation-ready narrative incident design  
**Project:** The Little Space Station  
**Prepared:** 2026-10-16  
**Related concept:** `little-space-station-story-year-and-seasonal-ideas.md`

## 1. Objective

Deliver the screensaver's **first memorable, world-changing incident**. The communications antenna malfunctions, Pip tries to repair it, apparently succeeds, is startled by an unexpected violent spin, and ultimately installs a conspicuous but modest repair plate. That plate remains visible through the current story year and can later be remembered in a dream.

The scene must be understandable **without reading a debug panel**, enjoyable at the existing 140% production camera framing, interruption-safe, deterministic, and inexpensive to render on Steam Deck.

**This is not a new ambient maintenance loop.** Unlike the existing routine antenna adjustment, it is a rare, staged, narratively directed episode with an enduring outcome.

### Scope boundaries

- **Implement now:** One clear incident, a handful of seeded variants, one final outcome, a persistent repair-plate consequence, safe replay/resume checkpoints, natural eligibility, and focused preview/testing support.
- **Prepare for later:** A compact completed-story record that Pip's future dream system could safely replay, and a story-year key so an annual reset can remove the plate.
- **Do not implement now:** Pip dreams/charging overhaul, Halloween or Christmas events, annual refurbishment animation, more station modules, general agent AI, new ship classes, or a giant event framework.

## 2. Storyboard and comedic timing

Target **about 40–55 seconds** of *eligible presentation time*, tuned from actual visual inspection. The durations are guidance, not absolute timers.

| Beat | Approx. time | What the viewer sees | Narratively important state |
| --- | --- | --- | --- |
| **A. Malfunction** | 5–7 s | Dish tracking hesitates, stutters and sticks at a conspicuously wrong angle. A small equipment indicator reacts. | Fault has been introduced; not yet "seen" or consumed. |
| **B. Investigation** | 8–10 s | Pip notices, turns, crosses to the antenna worksite, tilts head, examines the drive. | Clearly establishes Pip's intention. |
| **C. First repair / false success** | 8–10 s | Pip takes out its tool, works deliberately. Dish begins behaving normally. Pip relaxes for a beat. Then the dish sticks again. | Anticipation; do not commit the payoff yet. |
| **D. Unexpected spin** | 4–6 s | Dish swings/spins alarmingly fast. Pip ducks, braces or recoils, narrowly clearing the moving assembly. Brief pause after the surprise. | **Core comedic payoff.** |
| **E. Real repair** | 10–15 s | Pip cautiously returns, installs a small **orange repair plate** on the drive/mount, secures it, makes a final adjustment. | Consequence is visually installed, not merely declared. |
| **F. Verification and exit** | 5–7 s | Dish settles into steady tracking. Pip inspects, gives a reserved satisfied nod, then heads toward charging/standby. | Complete episode; committed repair plate may remain. |

### Direction notes

- The best joke is the pause after the **false success**. Give Pip and the viewer time to relax before the sudden spin.
- The malfunction should be evident from the *dish's actual movement*, not just a blinking light or on-screen text.
- Exaggeration is welcome but bounded. Pip is startled, not grievously injured; don't throw Pip off the station or create harsh flashes.
- Stage the work so the dish, Pip, Pip's tool, and the repair plate can be read at 1280×800 and from across a room.
- Use the existing default 140% overview for the first version. Activity-focus camera may be inspected in preview but should not activate automatically until it proves advantageous.

## 3. Seeded variation without branching explosion

Preserve the same **beginning → surprise → successful repair** in v1. Vary small recognizable details only:

| Variation axis | Examples |
| --- | --- |
| Failure | Repeated stutter, brief oscillation, or abrupt stop |
| Pip's attitude | Measured, eager, or cautious |
| Initial adjustment | Tightening movement, tapping the housing, or short recalibration |
| Startle pose | Duck, backward recoil, or protective brace |
| Final reaction | Relieved inspection, nod, or understated celebration |

Resolve variants once per stable **incident instance seed**, not via per-frame randomness. Variations must fit the same physical scene and should never change the result in the first version. One repair plate and working dish is the final state.

## 4. Narrative lifecycle and interruption recovery

Separate the *world fact* that an unusual antenna incident has been selected from what the viewer has **actually been presented**. Presentation time must advance only while the scene is visible and meaningfully rendering.

Suggested lifecycle:

`eligible → pending → presenting → payoff-presented → repair-presented → resolved`

A short stage may replay after interruption; the story must not resume with the dish already spinning in Pip's face or with a nonsensical half-gesture.

### Suggested durable checkpoints

| Durable point | Minimum evidence | On next start |
| --- | --- | --- |
| **Pending / no milestone** | Eligible or started, but nothing meaningful completed | Begin from the introductory malfunction, with a short safe lead-in. |
| **Surprise presented** | The spin-and-recoil sequence reached its readable payoff, not merely its first frame | Replay a brief cue, then continue from the **final repair** chapter. |
| **Repair verified** | The plate installation and subsequent stabilized antenna were actually presented | Resolve permanently for the story year; show plate and normal behavior. |

Do not store every moment of animation; store **chapter and checkpoint**. Commit the surprise only after its visible payoff; commit final success only after plate installation and verification. Store an instance ID and monotonic milestone so retries cannot regress or duplicate the consequences.

**Important:** The software knows only that a sequence was *presented*, not that any person actually saw it. A future dream may offer another encounter even after successful presentation.

### Missing storage or abrupt dismissal

Persist during meaningful milestones; do not rely on `beforeunload`. With storage disabled, corrupt, or evicted, render a coherent station and degrade gracefully, potentially replaying the incident within a bounded in-memory session. Avoid writing continuously or creating an endless instant replay loop on each frame.

## 5. Eligibility and director behavior

Make the incident **rare** and effectively once per active story year; the first implementation may allow forcing in preview for immediate testing. An incident may be eligible because of seeded world/time opportunities, but must *not* run during every launch.

Start naturally only when:

- The antenna is not already synchronizing with a survey vessel.
- Pip is available or can conclude its current ordinary task coherently.
- A visitor is not actively relying on the single dock or Pip's cargo transfer. Do **not** teleport Pip away mid-delivery.
- There is sufficient presentation room before an unavoidable competing action; delay the incident rather than rewriting the absolute-time traffic schedule.
- No other major story is currently active.

The incident may be selected as **pending** and offered early in a suitable active viewing session (e.g., after a short stabilizing period), but quiet sessions should remain possible. Make director pacing and cooldowns configurable rather than introducing a compulsory opening scene.

**Beware world-time jumps:** A time jump must not fast-forward through story presentation or silently award its repair plate. Reconstruct ordinary traffic/equipment from world time; keep unpresented narrative chapters pending separately.

### Consequences during the incident

The story temporarily owns Pip's actions and the dish malfunction state. Ambient jobs should be paused/deferred or represented coherently, never layered on top of the incident as contradictory poses. Likewise, an ordinary antenna repair should not "fix" the story fault before the payoff.

Traffic continues to be scheduled from absolute time. If a conflict develops, use a safe interruption/chapter return or select a later presentation window rather than altering ships' stable visit IDs or making them vanish.

## 6. Visual assets and animations

Reuse existing Three.js geometry and Pip's procedural joint rig.

**Antenna:** The current scene constructs `dishPivot` in `scene.js` and already supports `tracking`, `drifted`, `adjusting`, and `synchronizing` states. Add incident-specific motion states (names are flexible) such as `stuttering`, `false-normal`, `stuck-again`, `runaway-spin`, `settling`, `patched-tracking`. Keep its rotation continuous at phase boundaries where possible. Use deterministic bounded motion functions rather than uncontrolled spin accumulation.

**Pip:** Extend `pip-behavior.js` and `pip-animation.js` with only the extra stages/poses needed to tell this story: notice unusual motion, deliberate inspection, first attempt, false relief, startled recoil or duck, cautious return, repair-plate placement, verification, satisfied exit. Reuse existing tool, face/visor, arms, and gait. A small number of differentiated poses is more valuable than numerous generic arm loops.

**Repair plate:** Build an orange/metal contrasting patch with fasteners using simple geometry. It should be attached to the antenna mount or visible drive housing, not to an arbitrary floating position, and should not rotate incorrectly with the dish if installed on its fixed base. It should survive normal camera and environmental changes. Keep it modest but clearly observable at native resolution.

**Equipment indicator:** The existing dedicated equipment light is **not automatically the antenna fault lamp**. Consider a separate small antenna-drive indicator or a contextual color/state change at the antenna mount, avoiding contradictory light-repair behavior.

**Safety/readability:** Avoid geometry clipping with Pip, crossing the dish during a surprise spin, strong repeated light flashes, expensive particle systems, and sudden camera jumps. Test in daylight and planetary shadow.

### Visual state rules

- **Before repair completed:** Incident owns the broken/abnormal dish behavior.
- **After repair completed:** Normal dish tracking is restored; the patch becomes visible and remains visible during the story year.
- **After annual renewal (future feature):** Patch is absent; new story-year effects may be eligible independently.
- **During future dream playback:** Use replay-only visuals; never alter the real current antenna state or duplicate plate installation.

## 7. Persistence design — important change to the current code

As of the latest source, `persistence.js` uses one namespaced v2 Local Storage record with one visit/checkpoint. `app.js` reads it but does not yet restore a durable multi-chapter incident. `simulation-world.js` currently owns traffic and ordinary task states, and the checkpoint logic is coupled mainly to ship visits.

**Do not squeeze the incident into a fake ship visit.** Introduce a small **incident director / story-state layer**, or a narrow extension of `EventDirector`, with dedicated story IDs, pending status, presentation milestones and precedence rules. Keep ambient visit IDs unchanged.

Suggested logical record shape (design sketch, not a required API):

```json
{
  "schemaVersion": 3,
  "worldSeed": "little-station-001",
  "activeStoryYear": 2026,
  "incident": {
    "instanceId": "2026:stubborn-antenna:example",
    "type": "stubborn-antenna",
    "variantSeed": "example",
    "checkpoint": "surprise-presented",
    "lifecycle": "presenting"
  },
  "completedStories": [],
  "consequences": {
    "antennaRepairPlateYear": null
  }
}
```

Choose an actual versioned schema based on existing code; the example is **not** a demand to use those exact property names. If evolving v2, explicitly preserve/migrate relevant information or fail safely; do not silently clobber unrelated screensaver records. Keep keys namespaced.

On committed completion:

- Mark this **instance** complete once.
- Record its fixed seeded variant/outcome for future dreams.
- Set the current story-year antenna repair plate consequence.
- Ensure retrying a commit cannot install a duplicate plate or create duplicate completed-story entries.

Persistence is still best effort. Avoid using Local Storage for every animation frame; a small record suffices at this stage. A future annual/dream system can extend the schema thoughtfully.

## 8. Preview harness and regression tests

Extend the existing `?preview=1` console with a compact **Incident: Stubborn Antenna** panel or adapt its current forcing controls. This should offer:

- Force the incident without waiting for rare eligibility.
- Select a stable variant seed or predefined measured/eager/clumsy variations.
- Jump to each story beat; scrub locally without committing narrative progress.
- Pause/step/accelerate, interrupt, reload, and resume from saved chapter checkpoints.
- Explicitly commit or clear **only Little Space Station's** incident record.
- Show instance ID, story year, chapter, checkpoint, pending status, and repair-plate presence.
- Toggle storage-off simulation and validate safe behavior.

Avoid coupling debug scrubbing to permanent history. A forced "final repair" preview should **not** install a permanent plate unless the explicit commit operation says to.

### Automated regression checklist

At minimum:

1. Same world seed, story year and incident instance reproduce the same story variations.
2. At most one completion/repair consequence is recorded per instance.
3. A three-second launch does not consume the incident.
4. Interrupt before the surprise: restart coherently at the introduction or safe pre-payoff checkpoint.
5. Interrupt during the spin: do **not** mark the surprise presented prematurely.
6. Interrupt after surprise checkpoint: resume with the final-repair chapter and a clear recap cue.
7. Interrupt during plate installation: no permanent patch without completed repair verification.
8. Resolve and relaunch: antenna behaves normally and the patch is present.
9. Jump over days/weeks: world schedules reconstruct without silently finishing the story.
10. Preview forcing, phase selection, and scrubbing never commit automatically.
11. Missing/corrupt storage doesn't crash the scene.
12. Incident cannot overlap Pip's cargo carrying or survey antenna sync in contradictory ways.
13. Later dreams, when implemented, cannot modify the true incident completion record or patch.

Run `npm test` if Node is available. Honor current workspace `AGENTS.md` guidance for browser/screenshot support, and add **manual visual checks** at 1280×800, 1920×1080, daylight and deep shadow. If browser automation is available to Codex, use screenshots at key beats and confirm rendered alignments; distinguish automated tests from human visual judgment.

## 9. Suggested Codex implementation slices

**Slice A — Choreography and visibility (no natural eligibility yet)**

- Add preview-forced staged event state and visual behavior, including clear fault, false success, surprise and final plate placement.
- Get Pip's real worksite, gaze, tool, dish motion and stage transitions readable on a fixed overview.
- Use screenshots/preview to tune timing and occlusion. The appearance of a patch while scrubbing remains temporary.

**Slice B — Durable chapter and consequence**

- Add a small dedicated, versioned narrative record and migration/fallback strategy.
- Implement checkpoints, replay/resume logic, idempotent plate consequence and saved completed-story facts.
- Test forced preview modes versus explicitly committed narrative state.

**Slice C — Natural director integration**

- Add rare annual eligibility and suitable idle-window selection.
- Ensure major-story ownership doesn't conflict with deterministic traffic and ordinary Pip tasks.
- Verify post-restart, after-days-away, and no-storage cases.

Keep each slice small and testable. Ask for human visual review after Slice A **before** investing heavily in narrative machinery if the first sequence is not yet entertaining.

## 10. Acceptance criteria

This incident is successful when an ordinary viewer can tell, with no explanatory text:

1. The antenna has malfunctioned.
2. Pip notices and deliberately tries to fix it.
3. Pip thinks it worked, then something unexpected and funny happens.
4. Pip recovers, makes a real repair, and verifies the result.
5. A small orange plate remains as evidence in the active story year.

It should replay/resume coherently after an abrupt dismissal; presenting only the first second must not "consume" the scene. Fixed seed/time/record inputs must yield stable decisions. The current station and robot routines should continue undisturbed when no incident is active. Production remains passive, offline, low-overhead, and Steam Deck compatible.

### What Codex should report when implementing

- Files/modules created or changed and how story state fits the existing architecture.
- Which beats and seeded variants were actually implemented.
- What exactly triggers each committed milestone and durable consequence.
- Automated tests executed and results; browser/screenshot scenarios actually inspected.
- Known rough visual edges (occlusion, recoil clearance, antenna pivot continuity, patch visibility) and any follow-up recommendations.

**Design principle:** The antenna's problem, Pip's effort, the surprise, and the lasting patch should form a coherent tiny story—not six disconnected animations.
