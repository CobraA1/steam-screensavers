# Story expectations

Read this before changing incident selection, narrative beats, checkpoints, or outcomes in The Little Space Station. The original story briefs are creative authority; this document makes their recurring requirements explicit.

## Structure and tone

A story needs an understandable setup, motivation, investigation or effort, payoff, and return to ordinary life. Its outcome should be apparent without reading the preview console. Give viewers enough time to recognize the problem and the action that resolves it.

Pip is curious, conscientious, and occasionally startled. Halloween is playful and gently mysterious. All Saints' Day is quiet and reflective; do not add pranks or scares to it. Preserve meaningful pauses and quiet periods between exceptional incidents.

Variants may change gestures and temperament, but must preserve the story's cause, result, and essential joke. Timing adjustments require checking that the scene remains readable at normal speed.

## Phantom Visitor acceptance sequence

The [Autumn 2026 brief](../../The%20Little%20Space%20Station%20-%20Autumn%202026%20Halloween%20and%20All%20Saints%20Day.md) specifies these beats:

| Beat | What the viewer should understand |
| --- | --- |
| Glimpse | Pip notices an unfamiliar white shape drifting near the station. |
| Vanish | Pip approaches; the shape slips away, prompting curiosity and unease. |
| Search | Pip deliberately looks for it. This is a searching pause, not a frozen scene. |
| Reveal | The white covering conceals a small inspection drone. Both objects become distinguishable. |
| Untangle | Pip faces the drone, reaches the covering, and visibly lifts it free. |
| Departure | The uncovered drone responds happily and leaves; the same empty covering remains behind. |
| Trailing cover | Pip returns toward the charging pad while the empty covering follows. The drone must not reappear. |
| Final surprise | Pip notices the covering, reacts, and settles as it drifts away. Keep the humorous ambiguity and allow the exit to finish. |

The current live sequence is 68 seconds. Its dream is a shortened memory of the same events, covered by [dream expectations](dream-expectations.md).

## Scheduling and persistence

- Keep calendar-derived scenery separate from presented stories. A date jump may reconstruct decorations immediately; it must not manufacture a completed incident.
- Significant incidents start in suitable quiet windows. Respect docking, loaded cargo, critical work, other incidents, and the remaining time before scheduled traffic.
- Use stable instance IDs, original story year, and seeded variants. Do not restart a once-per-year story merely because the screensaver reopened.
- Save meaningful milestones only after their payoffs are presented. Completion is not equivalent to selection or start, and presentation does not prove a human saw it.
- Resume interrupted stories at coherent chapter boundaries that preserve the opportunity to see the important payoff. Never roll a saved milestone backward.
- Keep completion writes idempotent and storage failures nonfatal. Do not modify unrelated records or change schema without a compatibility plan.
- Allow the current presentation's exit to finish after its completion record is saved. A resumed already-completed story should not run again.
- Explicit preview playback/scrubbing is temporary; saving or clearing records requires an explicit preview storage action.

## Review and tests

Review both the full sequence and transitions around each checkpoint. Verify scheduling eligibility, quiet-window exclusion, interruption/resume, monotonic milestones, once-per-year completion, and dream eligibility. Inspect the actual character/prop interactions using [animation expectations](animation-expectations.md), not just timeline labels.

The larger creative direction is in [Story Year, Dreams, and Seasonal Events](../../little-space-station-story-year-and-seasonal-ideas.md).
