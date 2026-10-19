# The Little Space Station

Animation and narrative reviews follow the shared [animation](../docs/animation-expectations.md), [story](../docs/story-expectations.md), and [dream](../docs/dream-expectations.md) expectations.

The Phantom Visitor uses `phantom-choreography.js` for continuous cover/drone paths and shared target orientation. Pip reaches the cloth with the existing two-joint arm rig; both live and miniature covers have connected, downward-flared skirts. The 68-second live story now finishes its exit after committing the final payoff. Its dream retains the original memory identity/year/outcome, brings miniature Pip into contact with the cover, fades the departing drone independently, and preserves the empty-cover joke. Preview it under **Story · Phantom Visitor** (beat/point or **Force / play**) and **Pip recharge & memory → Show Phantom dream** (whole-dream scrubber).

A passive, low-poly Three.js screensaver for Steam Deck. It opens directly on a small retro-futuristic station above a procedural planet. Production launches contain no controls or input listeners.

## Structure

- `index.html` and `styles.css` provide the full-viewport WebGL canvas and a dark fallback background.
- `config.js` contains all user-editable production settings.
- `random.js` provides deterministic, independently derived random streams.
- `simulation-world.js` owns absolute-time traffic, visit facts, Pip tasks, equipment state, and presentation checkpoints.
- `world.js` is the compatibility entry point; `station-identity.js` owns seeded visual identity.
- `environment.js` derives illumination, rotation, and seasons; `environment-renderer.js` maps that state onto existing lights and materials.
- `scene.js` builds the Three.js diorama and visualizes simulation state.
- `camera-framing.js` owns the 140% production view and the preview framing comparison controls.
- `expansion-preview.js` builds lightweight wireframe layout studies; it is reachable only through the dynamically loaded preview tools.
- `pip-behavior.js`, `pip-animation.js`, and `station-details.js` map deterministic task stages to Pip's poses, equipment work, and physically attached cargo handling.
- `autumn-2026.js` derives the 2026 calendar, seasonal cargo manifests, decorations, installations, oddities, and cleanup without persisting routine state.
- `seasonal-service-deck.js` builds the temporary aft commons/service platform, utility cabin, deck lights, attachment passage, and shared seasonal/Pip anchors. `seasonal-renderer.js` places fall and Halloween decorations on that deck. `phantom-visitor.js` / `phantom-renderer.js` (with a shared open-bottom cloth shell in `phantom-cover-geometry.js`) and `lights-of-remembrance.js` / `remembrance-renderer.js` own the two interruption-safe seasonal stories.
- `dream-pip-visual.js` provides the consistent miniature robot for `dream-renderer.js` and `phantom-dream-renderer.js`, which render read-only memories while Pip charges.
- `app.js` owns startup, frame timing, visibility handling, resolution changes, and persistence commits.
- `preview-tools.js` is dynamically imported only when the URL contains `?preview=1`.
- `vendor/` contains the local Three.js r186 runtime used by this repository.

No network connection, package installation, or build step is required.

## Project expectations

Project-specific rules now live in [docs/expectations/](docs/expectations/README.md), including [animation](docs/expectations/animation-expectations.md), [dreams](docs/expectations/dream-expectations.md), and [story design](docs/expectations/story-expectations.md). The root `AGENTS.md` remains the shared Steam Deck platform guide.

## Transparency Lab (development only)

The [Transparency Lab](experiments/transparency-lab/README.md) is a separate browser experiment comparing **normal alpha blending**, **alpha hashing**, and **opaque-group offscreen compositing** with identical overlapping animated shapes. It includes FPS, frame/render submission time, draw calls, Chromium JS heap (when exposed), and a carefully labeled GPU allocation estimate. It is not loaded by the production screensaver. Start the repository preview server and open `/little-space-station/experiments/transparency-lab/index.html` directly.

## Traffic and station behavior

Traffic is derived from the world seed and absolute time instead of a repeating animation cycle. Visits have stable IDs, never overlap at the single berth, and are separated by deterministic quiet gaps. Default gaps are 6–22 minutes with occasional 25–55 minute gaps. Service durations depend on purpose:

- **Courier Stop:** 1–3 minutes to exchange a dispatch container.
- **Survey Call:** 2–5 minutes to synchronize the ship and station arrays.
- **Cargo Run:** 3–8 minutes to transfer one visible container into the cargo hatch.

Starting during a docked visit is expected. Jumping directly to any timestamp reconstructs the visit, transfer, antenna, light, and Pip task state without replaying missed frames.

During quiet periods Pip either rests, performs a restrained visual inspection, observes traffic, repairs the dedicated equipment light, or realigns the communications antenna. Tasks use stable time slots and explicit notice, travel, inspection, preparation, manipulation, verification, reaction, and return stages. The affected light or antenna visibly changes before, during, and after the work.

Pip also follows a separate seeded recharge rhythm. It is deliberately independent of the 97-minute orbital light cycle and only takes over during a quiet, conflict-free standby window. At the pad Pip settles, dims its visor and status light, and uses a soft pulse. Completed Stubborn Antenna and Phantom Visitor stories can appear in a softly outlined thought bubble connected to sleeping Pip. The selected memory retains its saved variant and outcome: antenna dreams replay the failed repair and plate installation, while Phantom dreams replay the white cover, trapped inspection drone, release, departure, and final joke. The bubble faces the viewer, fits the current camera view, and fades in and out. Dreams are read-only and leave real traffic, equipment, cargo, and story consequences unchanged. The All Saints' observance is deliberately not dream-eligible.

Pip approaches the equipment light from its exposed face and turns toward it before beginning repairs. It likewise turns back toward the mast and dish during antenna adjustment and synchronization. The cargo hatch uses an edge-mounted hinge, so its door swings outward instead of rotating through its center.

Pip is a compact articulated robot with a teal body, cream head, luminous visor, chest indicator, elbow joints, and a wrist-mounted maintenance tool. Its pose vocabulary distinguishes curiosity, fault recognition, tool preparation, light repair, antenna manipulation, cargo grasp/carry/stow, verification, and a short satisfied reaction. Infrequent idle looks and seeded task variations add personality without continuous motion. Cargo follows a grip point on Pip while carried rather than moving on an unrelated path.

Visitor craft carry four axial RCS ports at both the fore and aft ends. Arrival uses the main engine while the craft crosses into view, then hands final braking and alignment to the forward RCS bank. Departure continues to back out on RCS, rotate clear, and engage the main engine only after the turn.

## Autumn 2026 seasonal story

The seasonal system uses UTC calendar dates and the existing absolute world clock. Ordinary state is reconstructed directly after a date jump or long absence; viewers never need to watch historical deliveries before decorations appear.

| Window | World state |
| --- | --- |
| September 22–30 | Autumn begins; the Commons Deck assembles over September 22, then fall supplies arrive and Pip may install gourds, a harvest lantern, warm garland, and copper leaf trim. |
| October 1–22 | General fall decorations remain, with occasional themed packages on existing cargo visits. |
| October 23–27 | Halloween supplies and decorations begin appearing in stages. |
| October 28–30 | Final preparations; the Phantom Visitor becomes eligible in a safe quiet window. |
| October 30 noon–November 1 | Blue, ivory, and gold remembrance supplies can arrive on ordinary cargo visits. |
| October 31 | The fully decorated Halloween station and the one-time 2026 Phantom Visitor incident. |
| November 1 | The independent Lights of Remembrance observance. Halloween illumination is subdued so the memorial remains distinct. |
| November 2–3 | Pip may remove Halloween props; missed or interrupted remembrance presentations retain a short grace period. |
| November 4–December 20 | Halloween and temporary memorial props are gone; general fall decorations remain. |
| December 21–January 6 | Ordinary fall props are gone, but the cleared service deck remains as story-year infrastructure. |
| January 6, 00:00–January 7, 00:00 UTC | The temporary service deck dismantles in six distinct work stages with quiet periods; the last coupling departs by the annual-renewal boundary. |

Seasonal cargo reuses the deterministic traffic schedule and never adds a second ship or increases visit frequency. Selected cargo visits receive stable 2–4-package manifests. Packages move one at a time from the ship to Pip's grip and station storage, using separate fall, Halloween, and remembrance palettes and markings.

The seasonal service deck attaches to the station's aft `-X` port through a short offset passage. Its 4 × 3.1-unit platform has about 2.3 times the first draft's footprint, with a clear central floor, narrow panel seams, clipped corners, and visible underfloor supports. A compact utility cabin occupies about 13% of the platform and has a Pip-sized pressure door, framed windows, a service locker, and a shallow roof cap. Waist-height rails and small shielded corner lamps keep the deck readable. The established `+X` visitor approach, docking, and departure corridor is unchanged. Gourds, lanterns, garlands, Halloween props, and the All Saints' fixture use shared deck anchors arranged around the perimeter; Pip's work positions align its boots with the floor.

Deck assembly is calendar-derived rather than persisted. **Installation occupies September 22, 2026, 00:00–September 23, 00:00 UTC; removal occupies January 6, 2027, 00:00–January 7, 00:00 UTC.** Each takes 24 hours by default, configurable with `serviceDeck.transitionHours` in `config.js` (1–48 hours). Installation starts when autumn begins and removal always ends at the story-year renewal boundary. Reopening or jumping dates reconstructs the correct phase without replaying missed animation frames or requiring a shutdown callback.

`service-deck-lifecycle.js` still divides each transition into six ordered stages: coupling, supports, floor, cabin, railings, and lighting. Each stage spans four hours at the 24-hour default. **The rigid part actually moves only during a short lift around 40% into its stage (about 2.4 minutes at real pace),** and is fully seated or entirely absent during intervening quiet periods. Survey drones visit beforehand, leave, return for a fastening shift during installation (or to unfasten a part before removal), then come back to inspect. Several hours of the day remain quiet; construction is not a continuous stream of flying parts. Removal uses the reverse order: lighting, railings, cabin, floor, supports, coupling. Existing lights power up last and down first. The completed module remains available for decoration only when the installation has ended. Individual part transforms, riggers, and work-shift selection are derived directly from the world timestamp.

In preview, expand **Seasonal Events · 2026 Story Year** and choose **Install module** or **Remove module**. Playback defaults to 240× (six minutes for the full 24-hour sequence); choose real pace, 60× (24 minutes), or 1440× (one minute) using **Assembly preview speed**. Global simulation speed also multiplies preview playback. **Module sequence point** scrubs the entire day. **Module work stage**, **Work moment**, and **Jump to work stage** navigate directly to any part delivery, survey, fastening, inspection, or quiet period without waiting. **Play / pause module** resumes the playback; **Follow deck calendar** returns to natural world time. All preview overrides are read-only and never commit assembly state to storage.

Halloween preparations include a marked crate, jack-o'-lantern, orange/purple lights, a tethered ghost pennant, and an occasional cap for Pip. Four rare deterministic ambient oddities can briefly appear without persistence: a distant light, crossing shadow, shifted decoration, or harmless equipment flicker. Halloween cleanup is derived from the date and cannot strand stale props after an absence.

**Pip and the Phantom Visitor** is a 68-second story with eight readable beats. Pip follows an elusive white shape, discovers a tiny inspection drone caught in a cover, frees it, waves goodbye, and receives one last ambiguous surprise from the empty cover. Three checkpoints protect the reveal, release, and completion. An interruption resumes at a coherent chapter boundary. Successful completion occurs once in the 2026 story year and adds one bounded dream-eligible memory.

**The Lights of Remembrance** is a separate 42-second All Saints' Day observance. Pip approaches a blue-and-gold fixture, carefully checks and activates five soft golden lights, remains still while the station quietly operates, and returns to duty without a joke or malfunction. The `lights-lit` checkpoint resumes at the stillness beat; final completion is idempotent, leaves a meaningful non-dream memory, and permits the temporary lights to fade with the holiday window.

## Environment cycles

The world seed and absolute world timestamp drive a 97-minute stylized sunlight/shadow cycle, a 24-hour planet rotation, and a 365-day fictional year. Seeded offsets keep different worlds from sharing the same phase. No environment state is persisted, and date/time jumps reconstruct it immediately.

Sunset and sunrise use smooth transitions. In planetary shadow, direct sunlight and planetary bounce recede while cool hemisphere fill keeps the miniature readable; windows, equipment lights, Pip's tool, navigation lights, and a visitor cabin light become more prominent. Seasons continuously blend four terrain palettes: bright meadow greens in spring, darker forest greens and dry golds in summer, rust and sand in autumn, and broad snow cover in winter. Atmosphere tint, polar-cap appearance, and a small light-angle bias change with them without regenerating geometry.

## Previewing and event tools

From the screensavers directory, run:

```sh
python3 screensaver-preview.py
```

Select **The Little Space Station**. Both preview choices add `?preview=1`, which loads a development console in the upper-right corner. It can:

- Follow the natural schedule or immediately force a cargo, courier, survey, or ambient-only scenario.
- Use **Full screen** in the preview-console header to enter or leave browser fullscreen while inspecting the scene. Header actions use a separate row so they remain readable in the compact collapsed console.
- Jump to an event phase, set a seed or date, or jump the world clock by an hour, day, or week.
- Pause, resume, restart, single-step, or run at 1×, 5×, 20×, or 100× speed.
- Simulate interruption, unavailable storage, explicit commits, and clearing this screensaver's narrative record.
- Show visit identity and purpose, next arrival, departure time, Pip task/stage, equipment state, last activity, checkpoint, storage, and frame rate.
- Expand **Environment** to inspect illumination, rotation, and season or temporarily force daylight, sunset, shadow, sunrise, spring, summer, autumn, or winter.
- Expand **Pip animation** to force a task and stage, scrub within that stage, choose a seeded gesture style, and inspect the resolved pose and reaction. **Follow simulation** removes the temporary override.
- Expand **Pip recharge & memory** and click **Show antenna dream** to play the complete memory. **Dream point** scrubs and holds any moment; the main Pause, Speed, and Step controls also work during playback. Preview uses a saved antenna memory when available, otherwise a clearly identified temporary example; neither writes story history. **Follow rhythm** removes the temporary preview and any projection.
- Expand **Seasonal Events · 2026 Story Year** to force fall/Halloween/remembrance cargo, decoration stages, installation, oddities, or cleanup; jump to **Before**, September 22, October 24, October 31, November 1, November 4, January 6, or **Reset**; and inspect service-deck status, phase, holiday, shipments, package contents, installed props, and story records. January 6 shows the cleared module alone; Reset crosses the January 7 renewal boundary.
- Expand **Story · Phantom Visitor** or **Story · Lights of Remembrance** to select a seeded gesture variant, scrub any beat, or play the full incident. Forced and scrubbed previews are temporary. The separately labeled checkpoint buttons are the only seasonal preview actions that write, resume, or clear saved story state.
- **Pip recharge & memory** also has **Show Phantom dream**. It uses a completed saved Phantom memory when available or an explicitly temporary example, and remains read-only.
- Expand **Camera experiment** to compare Original (100%), Slightly closer (115%), Closer (125%), and Very close (140%) framing, or switch manually between station overview and a smooth Pip-centered activity focus. **Reset original overview** restores the baseline without resetting the simulation.
- Expand **Station expansion** to compare the current station with moderate (three additions) and developed (six additions) translucent wireframe studies, or hide the studies without changing the selected layout.

The console and all of its input listeners are created only in preview mode. An ordinary Steam launch stays passive.

The framing percentages are approximate perspective size changes. They move the perspective camera toward its existing target rather than scaling the world, so ship paths, docking coordinates, Pip tasks, narrative checkpoints, and persistence remain untouched. Activity focus follows Pip's rendered world position, including the charging-pad position when idle. Camera easing uses wall-frame time, so controls remain responsive while simulation time is paused.

The expansion studies are deliberately nonfunctional. Moderate adds an aft habitat barrel, upper greenhouse/observation dome, and lower cargo module. Developed also studies an aft-side science barrel, lateral secondary docking ring, and lower/rear equipment pod. These positions avoid the existing +X approach and departure corridor. Shared low-segment geometry and two unlit wireframe materials keep the experiment inexpensive; it adds no lights, shadows, collision objects, storage, or simulation records.

## Configuration

Edit `config.js` and relaunch:

- `worldSeed` changes the reproducible schedule and visual identity.
- `simulationSpeed` scales visual time; preview speeds also advance its simulated world clock.
- `visualQuality` controls star density and geometry detail.
- `maxPixelRatio` caps WebGL backing resolution to control heat and power use.
- `cameraFraming` selects the production perspective framing; it defaults to `"very-close"` (140%).
- `environment` controls the day/night period, shadow fraction, rotation period, fictional year, minimum shadow brightness, and seasonal strength.
- `traffic` controls quiet-gap odds/ranges, per-visit service ranges, and approach, docking, departure, and afterglow durations.
- `maintenance` controls Pip's deterministic task-slot length and active-task probability.
- `pipRhythm` controls Pip's separate seeded recharge interval, duration, memory duration/chance, and the minimum visible session before it can begin.
- `story.minimumSessionSeconds` controls the initial quiet-session requirement shared by the narrative directors. The antenna story also uses the remaining `story` opportunity fields; Phantom Visitor uses safe defaults for optional `phantomOpportunityWindowMinutes` and `phantomOpportunityChance` values when absent.
- Autumn/Halloween/All Saints' dates are intentionally fixed to UTC 2026 in `autumn-2026.js`; there is no production seasonal configuration screen.
- The inaugural service deck uses the same UTC story calendar and the explicit January 7, 2027 renewal boundary. It has no stored toggle or production controls.
- `testScenario` can be `auto`, `cargo-run`, `courier-stop`, `survey-call`, or `ambient`.

## Persistence

Procedural state is reconstructed from seed and absolute time rather than written continuously. The small versioned Local Storage v5 record is reserved for presentation checkpoints and a bounded archive (12 entries) of completed narrative memories. It preserves older v2–v4 visit, antenna, consequence, and memory records during migration. The single seasonal incident slot holds an incomplete Phantom Visitor or Lights of Remembrance presentation; completing the latter does not remove the former's archived memory. Checkpoints are monotonic and completion records are deduplicated.

Preview forcing, beat scrubbing, date jumps, and dream playback never silently write history. Only explicitly labeled commit/clear actions do so. Storage remains best effort, and a real write/read-back probe is used; failure never stops rendering.

## Tests

The pure environment, scheduler, maintenance, Pip pose/preview mapping, camera-framing model, seasonal dates/manifests, story timelines, safe-window directors, interruption recovery, persistence migration/idempotence, dream isolation, render staging, forced-preview, and clock regressions are in `tests/`. On a machine with Node.js installed:

```sh
npm test
```

No packages need to be installed. The Steam Deck screensaver runtime itself does not use Node or `package.json`.

Manual browser checks to perform on the Deck:

1. Open preview mode at 1280×800 and force each visitor; confirm the craft enters from off-screen, docks with RCS, remains quiet during idle service moments, backs out, turns clear, and then uses its main engine.
2. Jump within cargo service and confirm the container progresses from ship to Pip to the cargo hatch without popping through station geometry.
3. Use ambient-only mode and time jumps to find both maintenance jobs; confirm the fault is visible before Pip acts and the light/antenna is restored afterward.
4. Pause and single-step at task and departure boundaries, then test 100× speed for clean reconstruction.
5. Change preview resolutions, including the current-browser-window option, and confirm camera framing and diagnostics remain usable.
6. Interrupt before and after a payoff, restart, test storage-off mode, and confirm forced events do not create automatic history.
7. Launch without `?preview=1` and confirm there are no visible controls or production input listeners.
8. Force full sunlight, sunset, deep shadow, and sunrise; confirm transitions are attractive, station geometry remains readable, and artificial lights do not overexpose.
9. Force all four seasons and use month-scale date jumps; confirm tint, atmosphere, polar cap, and light angle change without disturbing ship or Pip state.
10. At 1280×800, expand **Pip animation** and inspect standby, observe, notice, travel, inspect, prepare-tool, work, verify, react-success, and return. Confirm Pip's face and task remain readable from several feet away.
11. Compare light repair, antenna adjustment, routine inspection, and cargo transfer. Confirm their arm/head poses are visibly different, the tool stays connected to the wrist, and Pip faces the relevant equipment.
12. Scrub cargo through retrieve, deliver, and stow. Confirm the container moves into Pip's grip, follows Pip without sliding, reaches the hatch, and does not pass through the robot's torso.
13. Test the **Clumsy / startled** gesture during a light-repair notice and all gesture styles during react-success; confirm reactions remain brief and contextual.
14. Repeat Pip checks in full daylight and deep shadow. Confirm the visor, chest indicator, tool, silhouette, and nearby equipment remain readable without blooming excessively.
15. Pause during travel or work, step by one second, jump world time, and restart. Confirm animation freezes, resumes coherently, and reconstructs a valid stage without stale cargo or tool state.
16. At 1280×800, 1920×1080, and 2560×1600, compare all four camera presets with current, moderate, and developed layouts. Check Pip and docked-craft readability, solar-panel/module clipping, planet balance, and breathing room.
17. For each expansion layout, force approach and departure. Confirm the existing +X flight corridor remains visually clear and that selecting or hiding a layout never moves the visitor, Pip, or station.
18. During an idle period and each maintenance task, switch to **Activity focus**, then back to overview. Confirm the move is restrained, Pip and the nearby worksite remain legible, and the task continues without restarting.
19. While paused, change framing, layout, and preview resolution. Confirm the camera still eases, the selected modes survive resolution changes, and simulation diagnostics do not advance.
20. Launch the same URL without `?preview=1`; confirm the original drifting camera remains, no mockup objects or controls are created, and no production input listeners are registered.
21. Force each autumn cargo theme and scrub its package sequence. Confirm there are 2–4 distinct attached packages, one coherent active package, and no changed traffic timing.
22. Inspect fall installation, early/full Halloween, all four oddities, cleanup, and November 4. Confirm props originate from cargo/storage activity, do not clip through the station, and are absent after their derived window.
23. Scrub every Phantom Visitor beat at 1280×800 and 1920×1080, then play through at normal speed. Confirm the cover and drone stay distinct, Pip's investigation reads naturally, and interruption resumes at the reveal or trailing-cover boundary.
24. Complete a Phantom preview only through the explicit checkpoint control, then show its dream after Halloween cleanup. Confirm the miniature remains recognizable and neither traffic, equipment, nor completion records change during playback.
25. Force the Lights of Remembrance in sunlight and deep shadow at both target resolutions. Confirm the blue/gold fixture, five lamps, Pip's activation, prolonged stillness, and quiet return remain visible without Halloween lighting competing for attention.
26. Compare Local Storage before and after forced seasonal scenes, scrubbing, dates, and dreams. Confirm it remains byte-for-byte unchanged until an explicit commit or clear action is used.
27. In **Seasonal Events · 2026 Story Year**, compare **Before**, September 22, January 6, and **Reset**. Use **Install module** and **Remove module** to play or scrub all six construction stages. Confirm assemblies lift clear of the cabin before departing, props wait until completion, backward seeks restore the correct parts, and returning to the calendar discards the preview. January 6 starts removal; Reset shows the module gone.
28. At 1280×800 and 1920×1080, inspect the empty module, fall decorations, full Halloween, and the active Lights of Remembrance stillness beat. Confirm the cabin and deck are readable, props rest on deck/cabin anchors, Pip stands naturally on the platform, and railings do not obscure the memorial.
29. Force every visitor while the module is present. Confirm the aft attachment and seasonal props never enter the existing front-dock approach, service, backing, rotation, or departure path.

## Known limitations and follow-up

- The courier reuses the simple transfer-container visual rather than a dedicated canister model.
- Autumn, Halloween, Phantom Visitor, and Lights of Remembrance are intentionally 2026-specific. The service deck's January 7 removal is implemented as a deterministic first renewal consequence; Thanksgiving, Christmas, recurrence rules, and the full January refurbishment story are not implemented.
- Seasonal inventories are inferred from calendar and seed rather than modeled as a generalized stock system. This keeps missed days recoverable and avoids a second simulation.
- The Phantom cover uses authored low-poly motion rather than cloth physics.
- The station has one layout family. Pip intentionally uses a lightweight procedural joint rig rather than skeletal animation; final hand-to-equipment alignment still requires Deck-side visual tuning.
- The activity-focus experiment centers Pip rather than computing a cinematic worksite-specific shot; nearby equipment should fit, but exact occlusion still needs visual evaluation per task.
- The 140% overview intentionally prioritizes current-station readability and may prove too tight for the developed mockup, especially at narrow aspect ratios. The experiment does not automatically reframe expansions.
- Final framing, occlusion, thrust direction, and living-room readability require manual visual testing in the Steam Deck browser and Gaming Mode.
- The eclipse is intentionally artistic rather than physical, and the planet has no separate procedural cloud layer.
