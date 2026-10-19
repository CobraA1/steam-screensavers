# Dream and memory expectations

Read this before changing dream selection, memory records, miniature actors, or the thought-bubble presentation. Dreams follow the [story-year direction](../../little-space-station-story-year-and-seasonal-ideas.md) and the corresponding original incident brief.

## Meaning and eligibility

- A dream recalls a completed experience. Production selects only saved, dream-eligible completed stories; an interrupted or merely scheduled incident is not a memory.
- Preserve the original type, instance ID, story year, variant, and outcome through the renderer-facing descriptor. Later calendar dates must not relabel an old memory as a new event.
- Initial dreams should faithfully summarize the original story. Exaggerated or alternative outcomes require explicit creative direction.
- Preview may synthesize an example memory, clearly identified in its controls, without adding it to saved history.
- All Saints' Day currently has no dream adaptation. Do not silently include it because it has a completion record.

## Visual language

- Show a recognizable thought bubble or miniature memory scene connected to sleeping/recharging Pip. The actual station continues to exist outside the memory.
- Keep the miniature stage stable and camera-facing. Avoid a free-floating abstract object that does not communicate which experience Pip remembers.
- Match the actors' important shapes and colors to the live incident. Pip needs a readable face and working arm; the drone and its white covering must remain separate identifiable objects.
- Condense pacing, not cause and effect: notice, investigate, reveal, act, resolve, react. The Phantom memory must retain the empty-cover joke after the drone leaves.
- Move miniature Pip into reaching distance. A hand waving remotely while the cover moves by itself does not read as removing it.
- Preserve visible prop continuity and reset all transforms/material state on seeks, just as for live animation. Fade the drone on departure without fading unrelated actors that share materials.
- Keep actors inside the bubble or fade them before they cross its rim. Fit the bubble at the production camera, wide and narrow viewports, and all supported display sizes.
- Use restrained, legible colors independent of orbital shadow. Fade the whole memory in and out smoothly, while leaving the real station's materials untouched.

## Whole-dream transparency and fades

- Both existing dreams use the shared [offscreen dream compositor](../performance/dream-compositing.md) for the complete presentation's **entry/exit fade**. Bubble, rim, thought dots, stage, actors, and props render together before that fade is applied once. Do not reintroduce whole-dream opacity multiplication in child materials. This implements the original [Steam Deck transparency experiment recommendation](../performance/transparency-findings-2026-10.md); it is not a universal rule for translucent objects.
- Retain independent fades **inside** a dream when needed for the narrative, such as the Phantom's departing drone. Do not replace actual see-through materials with a flat opaque-group result where their layered transparency is intentional.
- The composited bubble must remain anchored to Pip. Its billboard tests against live-world depth at Pip's head plane, with no depth writes. This is an intentional approximation for a camera-facing thought bubble, not per-actor world occlusion; inspect overlaps from the production camera when changing placement.
- Keep render targets small, reusable, resizable, and disposed when unused. Fade transitions must be deterministic and fully reconstructible after seek, pause, resume and dream switches. No preview controls or additional production input handling.
- Compare complete dreams at native Deck resolution, 1080p and 4K output before accepting a new approach. Watch for seams, halos, group opacity, crop/stretch, lost actor visibility, and FPS or resource regressions.

## Consistent Pip model across dreams

- Dream renderers must reuse `dream-pip-visual.js` rather than reconstructing a weaker miniature Pip. Maintain the same silhouette, cream head, readable visor, teal body, chest indicator, paired articulated arms, elbow details and wrist-mounted tool.
- Story renderers own their poses and beat timing. Phantom Pip must visibly reach and lift the covering with the shared arm rig; the repair tool may stay hidden when unnecessary.
- Bubble background and rim colors may vary by story mood; bubble shape, thought dots and the quality of miniature Pip should remain consistent.
- Reset Pip's head, eyes, arm pivots, scale and tool visibility during deterministic seeks. After changing the shared model, visually check both dreams during full playback and at key contact frames.

## Isolation

A dream may set Pip's recharge pose and supply temporary memory visuals. It must not advance a live incident, repair equipment, consume or deliver cargo, move real visitors, reschedule traffic, change the world clock, or write completion again. It should remain coherent after the relevant seasonal decorations and module are removed.

Reuse the existing dream clock and renderer architecture. Do not run a second simulation or attach memory actors to live story actors. Disposal or stopping a dream must leave no visible memory props or altered live materials behind.

## Acceptance checks

1. Play a complete dream at its configured pace, then inspect every beat and its boundaries with the preview scrubber.
2. Check manipulation contact, separation of cover/drone, departure, final joke, and fade-out. Verify that seeking backward restores opacity and transforms. **Dream presentations are exempt from orthographic review**: inspect the camera-facing production perspective at matching key timestamps, including fade boundaries and narrow/wide viewports. Live-story actors and station geometry retain the four-view requirement in the [animation expectations](animation-expectations.md).
3. Confirm that saved identity, variant, year, and outcome reach the memory descriptor and that source memory records remain unchanged.
4. Snapshot live equipment, cargo, traffic, and world-time facts before applying a dream; verify that they are unchanged afterward.
5. Preview the memory after Halloween cleanup and after January renewal. Inspect bubble containment at Deck, desktop, and narrow viewport sizes.

See [animation expectations](animation-expectations.md) for geometry and visual verification requirements, and [story expectations](story-expectations.md) for narrative lifecycle rules.
