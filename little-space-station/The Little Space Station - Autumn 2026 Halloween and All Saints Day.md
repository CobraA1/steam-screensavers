# The Little Space Station — Autumn 2026, Halloween, and All Saints' Day

Implement the first seasonal celebration system for *The Little Space Station*, our procedural, narrative-driven Steam Deck screensaver.

This assignment covers **autumn 2026 only**, including fall decorations, seasonal deliveries, Halloween festivities, and All Saints' Day.

We're not implementing a generalized multi-year holiday content system yet.

The objective is to make the station feel as though its inhabitants are preparing for and celebrating the season, rather than simply having decorations appear on predetermined dates.

**Work directly in the existing project workspace. Implement the changes, not merely a plan.**

## 1. Review the project

Before modifying anything:

- Read `AGENTS.md`, including its browser testing and screenshot instructions.
- Review the latest simulation, traffic, cargo, maintenance, rendering, persistence, and event-director code.
- Examine the existing *Pip and the Stubborn Antenna* incident and its checkpoint system.
- Review Pip's charging and dream-replay functionality.
- Examine the existing browser preview harness.
- Read the project's procedural narrative design documents if available.

Follow existing patterns wherever practical.

Preserve working functionality and the established retro-futuristic visual style.

## 2. Seasonal design philosophy

Seasonal content should develop naturally through the station's existing routines.

The general progression is:

**Season begins → Supplies arrive → Pip installs decorations → Station celebrates → Decorations are removed or replaced → Ordinary routines continue.**

Important principles:

- Decorations and supplies should have an apparent origin.
- Pip should visibly participate in preparations.
- Seasonal activities should complement ordinary station operations.
- The station shouldn't become continuously busy.
- Events should remain coherent when the screensaver is inactive for days.
- Significant stories should use the existing interruption-safe presentation system.
- Seasonal content should look appropriate at the established camera framing and Steam Deck resolution.

The seasonal progression should add personality without overwhelming the ordinary simulation.

## 3. Autumn 2026 timeline

Use the existing absolute world clock and deterministic scheduling.

Use these initial calendar windows:

| Dates | Seasonal activity |
|---|---|
| September 22 | Astronomical autumn begins |
| September 22–30 | Initial autumn shipments and decorations |
| October 1–22 | General autumn decorations remain; occasional seasonal deliveries |
| October 23–27 | Halloween supplies arrive and Halloween decorations begin appearing |
| October 28–30 | Final Halloween preparations; Phantom Visitor incident becomes eligible |
| October 31 | Halloween celebration and special incidents |
| November 1 | All Saints' Day observance |
| November 2–3 | Halloween decorations are removed |
| November 4 onward | General autumn decorations remain |

The astronomical fall season continues until December 21, but Christmas and other later seasonal content will eventually overlap and partially replace the general fall decorations.

Do not implement Thanksgiving or Christmas content in this assignment.

Use deterministic variations within the date windows rather than requiring every decoration to appear at one exact timestamp.

### Catching up with the calendar

The current date is already in October 2026.

If the screensaver starts on October 17, it should show the appropriate autumn decorations immediately, even if it was not running during September's scheduled deliveries.

Do not replay every missed cargo transfer or require the user to observe historical deliveries before decorations can appear.

Reconstruct ordinary seasonal world state directly from the date, seed, and stable rules.

## 4. Seasonal cargo deliveries

Extend the existing cargo system to support seasonal shipments.

This is an important part of the assignment.

**Seasonal supplies should arrive aboard ordinary visiting cargo ships whenever practical.**

Avoid increasing overall traffic frequency substantially.

Select suitable existing cargo visits for seasonal shipments, preserving the deterministic schedule and non-overlapping docking rules.

### Multiple themed packages

Unlike an ordinary single-container delivery, seasonal shipments may contain multiple packages.

Aim for approximately 2–4 visible packages per seasonal delivery.

Packages should have distinct themed colors, markings, and optionally different shapes.

Possible fall package designs:

- Rust-orange containers with cream trim.
- Harvest-gold crates.
- Deep red or brown boxes.
- Simple leaf or harvest emblems.

Halloween packages:

- Orange and black.
- Purple and dark teal.
- Pumpkins, moons, stars, and ghost symbols.

All Saints' Day packages:

- Deep blue, ivory, and gold.
- Stars, lights, and understated decorative markings.

Use simple Three.js geometry, procedural details, or locally generated textures.

Avoid introducing a complex texture-asset pipeline.

### Unloading

Reuse Pip's existing cargo handling system.

Pip should unload multiple packages in a recognizable sequence.

Packages should appear to move from the ship into station storage, rather than simply disappearing or teleporting.

However, do not require a lengthy real-time unloading animation for every package if it makes cargo visits excessively long.

Use a sensible balance of visible activity and pacing.

Cargo manifests should remain stable for a particular visit.

## 5. Autumn decorations

Create a modest collection of general fall-themed decorations.

Possible items:

- Small decorative pumpkins or gourds.
- Orange, gold, and rust-colored accent lights.
- A short decorative garland around a hatch.
- A few stylized autumn leaves or leaf-shaped ornaments.
- A harvest-colored decoration near Pip's charging pad.

These are artificial decorations installed aboard a space station, not naturally occurring autumn foliage.

Keep the appearance compatible with the station's 1960s–1970s retro-futuristic design.

### Installation behavior

Where practical, Pip should visibly install selected decorations after their deliveries.

For example:

1. Pip retrieves a package from storage.
2. Pip transports it to a decoration location.
3. Pip performs an installation animation.
4. The decoration becomes visible.
5. Pip briefly inspects its work.

Reuse existing task and cargo animation components.

Do not create an elaborate construction system.

When the screensaver has been inactive, already-scheduled decorations should appear in their expected installed state.

## 6. Halloween decorations and atmosphere

Beginning around October 23, the station should gradually acquire Halloween decorations.

Possible additions:

- A glowing jack-o'-lantern near a hatch.
- Orange and purple decorative lights.
- A small ghost decoration.
- Seasonal markings on a cargo container.
- An occasional Halloween accessory for Pip.

Decorations should appear in stages rather than all at once.

The normal station lighting cycle should continue.

In planetary shadow, pumpkins and decorative lights may become especially noticeable.

Avoid excessive flashing or making the station look like a haunted-house attraction.

Halloween should feel playful and slightly mysterious, not frightening or disturbing.

## 7. Main Halloween story — Pip and the Phantom Visitor

Implement one significant Halloween narrative incident using the existing story architecture.

### Story concept

Pip notices a strange white shape drifting near the station.

It disappears whenever Pip tries to investigate.

Pip becomes curious, then increasingly uneasy.

After cautiously pursuing the object, Pip discovers that the apparent ghost is actually a tiny inspection drone tangled in a white covering.

Pip removes the covering, freeing the drone.

The drone happily flies away.

As Pip returns to its normal activities, the empty ghost covering begins floating again behind it.

Pip turns around in surprise.

End the scene with a touch of ambiguity and humor.

### Implementation

Use a simple low-poly ghost covering and drone model.

No realistic cloth physics is required.

The incident should include:

- Clear setup.
- Suspenseful but gentle anticipation.
- Pip's investigation.
- Humorous reveal.
- Resolution.
- Final visual joke.

Target approximately 50–75 seconds initially, but adjust for readable pacing.

Reuse Pip's existing expressive poses and animations.

### Narrative lifecycle

Integrate with the existing incident system:

- Stable incident ID.
- Eligibility during the Halloween window.
- Seeded variation in appropriate gestures and timing.
- Meaningful presentation checkpoints.
- Interruption-safe replay or continuation.
- Completion record.
- Dream eligibility following successful completion.

Do not mark the incident completed merely because it started.

If interrupted, preserve an opportunity to see its important payoff.

Do not disrupt active ship docking, critical maintenance, or other major incidents.

The Phantom Visitor should generally occur once during the 2026 story year.

## 8. Small Halloween ambient oddities

Implement a very small collection of optional ambient effects.

Examples:

- A distant unidentified light.
- A tiny shadow crossing part of the station.
- A Halloween decoration briefly moving unexpectedly.
- Pip pausing to examine a strange flicker.

These should be subtle, rare, and brief.

They do not need full narrative checkpoints.

Do not create constant supernatural activity or distract from the main incident.

Use deterministic scheduling and avoid unnecessary persistent state.

## 9. All Saints' Day — The Lights of Remembrance

November 1 should have a distinctly different atmosphere from Halloween.

Create a short, peaceful, reflective observance.

### Narrative concept

A small blue-and-gold shipment containing memorial-light supplies arrives shortly before November 1, possibly alongside other seasonal cargo.

On All Saints' Day, Pip approaches a designated memorial fixture.

Pip carefully activates the lights.

A collection of soft golden lights illuminates the station, perhaps arranged near a window or small exterior memorial structure.

Pip remains still for a few moments.

The station continues quietly operating.

After a respectful pause, Pip returns to its ordinary duties.

### Creative direction

This scene should be calm and contemplative.

No comedy, scares, equipment malfunctions, or surprise endings.

Avoid making it a continuation of the Phantom Visitor story.

Use gentle animation, restrained lighting, and clear visual staging.

The memorial should feel appropriate to the meaning of All Saints' Day rather than being another Halloween decoration.

The lighting should work during both sunlight and planetary shadow, although it may be especially beautiful in shadow.

Make the event eligible around November 1, with a reasonable grace period for interrupted or briefly missed presentations.

Unlike the one-time Phantom Visitor story, the memorial concept may eventually become an annual tradition, but only implement its 2026 occurrence now.

## 10. Holiday cleanup and transition

After Halloween, Pip should gradually remove Halloween-specific decorations.

Where practical, include simple removal animations:

- Retrieve decorations.
- Carry them to storage.
- Restore ordinary station equipment appearance.

Do not require viewers to observe every removal.

Past cleanup should be reconstructed correctly from world time.

By November 4, the station should have returned to its general autumn appearance, with Halloween decorations removed.

The All Saints' Day memorial event should leave a meaningful completion record, but its temporary lights should not necessarily remain illuminated indefinitely.

Preserve ordinary autumn decorations for subsequent seasonal content.

## 11. Dream and memory integration

The existing dream system can replay completed incidents, including *Pip and the Stubborn Antenna*.

Extend it where necessary to support the Phantom Visitor.

A completed Halloween incident should be eligible for Pip's dreams.

The dream must:

- Use the saved story identity and outcome.
- Be visually recognizable as a memory.
- Not replay the incident in the actual station world.
- Not change equipment or cargo state.
- Not apply narrative consequences a second time.
- Remain coherent after the Halloween decorations have been removed.

A simplified miniature dream representation is acceptable.

Prefer reusing the existing dream presentation architecture rather than building a second system.

The All Saints' Day remembrance scene does not need a dream implementation in this assignment.

## 12. Persistence and determinism

Distinguish between:

**Derived seasonal state**
- Calendar windows.
- Routine deliveries.
- Decoration availability and installation.
- Seasonal package appearances.
- Normal holiday cleanup.

**Persistent narrative state**
- Started or interrupted important stories.
- Meaningful presentation checkpoints.
- Completed incidents.
- Dream-memory records.
- Significant story outcomes.

Do not persist every ordinary seasonal animation.

Preserve the current story-year approach and use 2026-specific content identifiers where appropriate.

Avoid incompatible or destructive persistence changes.

Existing saves, especially the Stubborn Antenna incident and Pip's dream memories, must remain recoverable.

## 13. Extend the browser preview

Add a collapsible **Seasonal Events** section.

Provide controls to inspect and force:

- General autumn decorations.
- Halloween preparation stages.
- Seasonal cargo deliveries.
- Multiple themed cargo packages.
- Phantom Visitor story beats.
- All Saints' Day remembrance.
- Post-holiday cleanup.

Allow inspecting:

- Current seasonal phase.
- Active holiday.
- Scheduled seasonal shipments.
- Package contents.
- Installed decorations.
- Pending incidents.
- Completed incident records.
- Dream eligibility.

Preserve existing date/time controls.

It should be easy to jump to September 22, October 24, October 31, November 1, and November 4.

Preview overrides must not silently modify real persistent world state.

Keep all interactive controls exclusive to preview mode.

## 14. Visual testing and screenshots

Follow the browser testing instructions in `AGENTS.md`.

Use the existing screenshot capabilities where available.

Capture representative frames showing:

- The station with initial autumn decorations.
- A seasonal delivery with multiple packages.
- Pip installing a decoration.
- The fully decorated Halloween station.
- Important Phantom Visitor story beats.
- All Saints' Day memorial lights.
- The station after Halloween cleanup.

Check camera framing and readability at 1280×800 and 1920×1080.

Verify that important characters, packages, decorations, and narrative actions aren't hidden behind station geometry.

Pay attention to clipping, detached objects, inappropriate lighting, and composition.

Don't claim visual verification unless it was actually performed.

## 15. Regression testing

Extend the existing tests where practical.

Check:

1. Seasonal dates produce deterministic results.
2. Starting after a scheduled delivery reconstructs the expected decorations.
3. Seasonal deliveries don't overlap existing ships at the docking port.
4. Multiple-package cargo handling remains coherent.
5. Time jumps don't require replaying every missed animation.
6. Decorations appear and disappear in the appropriate windows.
7. Preview forcing doesn't corrupt persisted state.
8. Interrupted Phantom Visitor presentations remain recoverable.
9. Completion records aren't applied twice.
10. Halloween dreams don't reapply real-world consequences.
11. All Saints' Day remains independent of Halloween.
12. Production screensaver behavior remains passive.

Run the existing tests, plus appropriate new tests.

If a test fails, investigate and repair the underlying issue rather than merely changing the expected result.

## 16. Scope and implementation order

This is a substantial assignment, so implement it in manageable slices.

**Slice 1 — Autumn foundation**
- Calendar-derived seasonal state.
- Themed multi-package cargo.
- General fall decorations.
- Basic installation behavior.
- Preview controls and tests.

**Slice 2 — Halloween preparations**
- Gradually delivered and installed Halloween decorations.
- Seasonal ambient details.
- Post-holiday cleanup.

**Slice 3 — Phantom Visitor**
- Story choreography.
- Narrative checkpoints and persistence.
- Dream integration.

**Slice 4 — All Saints' Day**
- Memorial-light shipment.
- Peaceful observance.
- Completion and cleanup behavior.

Validate each slice before continuing.

Do not significantly redesign the existing station, Pip, ships, or camera.

Do not implement Thanksgiving, Christmas, or 2027 content.

Avoid generalized holiday authoring frameworks, inventory-management engines, complex physics, or elaborate AI character systems.

Favor small, reusable helpers and well-defined behaviors.

## 17. Deliverables

Implement the changes directly in the existing `little-space-station/` workspace.

Do not export a ZIP or create a duplicate project.

Update the README with:

- 2026 seasonal timeline.
- Seasonal delivery behavior.
- New event descriptions.
- Preview controls.
- Relevant configuration options.
- Testing instructions.
- Known limitations.

At completion, summarize:

- Files created or modified.
- Seasonal systems implemented.
- Decorations and package designs.
- Phantom Visitor implementation.
- All Saints' Day implementation.
- Persistence and dream integration.
- Tests and screenshots produced.
- Any unfinished work or visual issues.

Do not stop after planning.

## Guiding creative principle

The station's inhabitants don't simply wake up one day to find Halloween decorations mysteriously installed.

**They receive supplies, prepare their home, celebrate together, and eventually put everything away.**

The enjoyment should come from watching a small community go about its seasonal traditions.

Halloween should be playful, curious, and occasionally surprising.

All Saints' Day should be quiet, beautiful, and reflective.

And throughout it all, The Little Space Station should remain the cozy, autonomous miniature world we've been building.
