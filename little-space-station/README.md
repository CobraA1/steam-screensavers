# The Little Space Station

Animation and narrative reviews follow the project-local [animation](docs/expectations/animation-expectations.md), [story](docs/expectations/story-expectations.md), and [dream](docs/expectations/dream-expectations.md) expectations.

Thanksgiving 2026 adds **Room for One More**, a 120-second Commons Deck gathering,
followed by the calculated four Sundays of Advent. See the [implementation and
preview guide](docs/thanksgiving-advent.md) for choreography, scheduling,
persistence compatibility, date controls, and Christmas scope.

Advent now adds a modular evergreen, gradual garland/lights and blue/gold/ivory
ornaments, a gold star, and five identifiable wrapped presents. Everything is
ready by December 23; gifts remain wrapped through Christmas in this phase.
See the [Phase 1 guide](docs/advent-tree-phase1.md) for dates, placement and preview
controls. [Phase 2A](docs/advent-decorating-phase2a.md) adds Pip's section checks,
strand adjustments, ornament and star placement, wrapped-present carrying, and
quiet final inspection. Preview every activity with playback, beat selection
and scrubbing under **Scenes → Pip Activities → Advent decorating**.
Installations remain pending until actual attachment or an explicit offscreen
fallback. Obsolete installations no longer replay as inspections.
[Phase 2B](docs/advent-wreath-phase2b.md) adds four peaceful weekly wreath
ceremonies. The unlit wreath is prepared before the first Sunday, and Pip's
tool lights each due wick at contact. Missed lighting stays pending until the
next Sunday (Christmas Eve for the fourth candle). Fallback quietly lights it
and retires the obsolete ceremony. See [action effects and deadlines](docs/action-driven-effects.md)
and the [shared scheduler contract](docs/event-scheduling.md).
Preview any Sunday under **Pip Activities → Wreath**.
Christmas Eve's Christ-candle and tree-lighting ceremonies, a possible returning visitor, and the Christmas
gift-opening gathering remain future work
in the [Advent/Christmas planning notes](docs/advent-christmas-story-planning.md).

The Phantom Visitor uses `phantom-choreography.js` for continuous cover/drone paths and shared target orientation. Pip reaches the cloth with the existing two-joint arm rig; both live and miniature covers have connected, downward-flared skirts. The 68-second live story now finishes its exit after committing the final payoff. Its dream retains the original memory identity/year/outcome, brings miniature Pip into contact with the cover, fades the departing drone independently, and preserves the empty-cover joke. Preview it under **Scenes → Stories → Phantom Visitor** and **Scenes → Dreams → Phantom Visitor dream**.

A passive, low-poly Three.js screensaver for Steam Deck. It opens directly on a small retro-futuristic station above a procedural planet. Production launches contain no controls or input listeners.

## Structure

- `index.html` and `styles.css` provide the full-viewport WebGL canvas and a dark fallback background.
- `config.js` contains all user-editable production settings.
- `random.js` provides deterministic, independently derived random streams.
- `simulation-world.js` owns absolute-time traffic, visit facts, Pip tasks, equipment state, and presentation checkpoints.
- `world.js` is the compatibility entry point; `station-identity.js` owns seeded visual identity.
- `environment.js` derives illumination, rotation, and seasons; `environment-renderer.js` maps that state onto existing lights and materials.
- `planet-geography.js` generates seeded, fixed continental silhouettes in planet-local coordinates; `scene.js` assigns per-face seasonal colors and integrates snow onto land.
- `scene.js` builds the Three.js diorama and visualizes simulation state.
- `camera-framing.js` owns the 140% production view and preview-only station-axis orthographic inspection from all six directions.
- `expansion-preview.js` builds lightweight wireframe layout studies; it is reachable only through the dynamically loaded preview tools.
- `pip-behavior.js`, `pip-animation.js`, and `station-details.js` map deterministic task stages to Pip's poses, equipment work, and physically attached cargo handling.
- `autumn-2026.js` derives the 2026 calendar, seasonal cargo manifests, background decorations, oddities, and cleanup without persisting routine state.
- `seasonal-service-deck.js` builds the temporary aft commons/service platform, utility cabin, deck lights, attachment passage, and shared seasonal/Pip anchors. `seasonal-renderer.js` places fall and Halloween decorations on that deck. `phantom-visitor.js` / `phantom-renderer.js` (with a shared open-bottom cloth shell in `phantom-cover-geometry.js`) and `lights-of-remembrance.js` / `remembrance-renderer.js` own the two interruption-safe seasonal stories.
- `dream-pip-visual.js` provides the consistent miniature robot for `dream-renderer.js` and `phantom-dream-renderer.js`, which render read-only memories while Pip charges.
- `app.js` owns startup, frame timing, visibility handling, resolution changes, and persistence commits.
- `preview-tools.js` is dynamically imported only when the URL contains `?preview=1`.
- `vendor/` contains the local Three.js r186 runtime used by this repository.

No network connection, package installation, or build step is required.

## Multi-view placement and animation review

Before accepting a 3D placement, attachment, movement or manipulation change, use the **Perspective**, **Top**, **Front**, and **Side** shortcuts in preview. When the station blocks an action, also use **Bottom**, **Back**, or **Other side** to inspect it from the opposite direction. The station-local orthographic views expose hidden depth gaps, collisions, clearance problems and missed hand-to-prop contact. They are diagnostic only; production retains the original perspective. See the [mandatory multi-view review procedure](docs/expectations/animation-expectations.md#mandatory-multi-view-3d-inspection).

## Project expectations

Project-specific rules now live in [docs/expectations/](docs/expectations/README.md), including [animation](docs/expectations/animation-expectations.md), [dreams](docs/expectations/dream-expectations.md), and [story design](docs/expectations/story-expectations.md). The root `AGENTS.md` remains the shared Steam Deck platform guide.

## Transparency rendering direction

Both **Stubborn Antenna and Phantom Visitor** now fade their entire thought-bubble presentation using one shared offscreen compositor. Independent actor fades remain inside the memory. See [dream compositing](docs/performance/dream-compositing.md) for bounded render targets, alpha handling, resource lifetime and the head-plane depth approximation, and the [October 2026 findings](docs/performance/transparency-findings-2026-10.md) for the original experimental motivation. Dream presentations are exempt from orthographic aesthetic review; live-world objects and incidents still require it.

## Transparency Lab (development only)

The [Transparency Lab](experiments/transparency-lab/README.md) is a separate browser experiment comparing **normal alpha blending**, **alpha hashing**, and **opaque-group offscreen compositing** with identical overlapping animated shapes. It includes FPS, frame/render submission time, optional asynchronous GPU timer queries, a sequential three-mode benchmark, configurable stress passes, draw calls, Chromium JS heap (when exposed), and a carefully labeled GPU allocation estimate. It is not loaded by the production screensaver. Start the repository preview server and open `/little-space-station/experiments/transparency-lab/index.html` directly.

## Traffic and station behavior

Traffic is derived from the world seed and absolute time instead of a repeating animation cycle. Visits have stable IDs, never overlap at the single berth, and are separated by deterministic quiet gaps. Default gaps are 6–22 minutes with occasional 25–55 minute gaps. Service durations depend on purpose:

- **Courier Stop:** 1–3 minutes for a quick dispatch-canister handoff.
- **Survey Call:** 2–5 minutes to synchronize the ship and station arrays.
- **Cargo Run:** 3–8 minutes to unload two ordinary crates, or a seasonal manifest of two to four packages, into the cargo hatch. Matching racks sit on both sides of the hull. Pip retrieves far-side packages by going around the engine end rather than through the ship.

Default approach, docking, and departure take 30, 14, and 40 seconds. Departure separates straight out, spends about 14 seconds turning, then accelerates along the new heading. Opposing RCS pairs accelerate the eased rotation and reverse to brake it; the main engine stays off until the turn ends. The cleared turning position remains close enough to see in the production camera.

Forced previews use the same maneuver durations, with 180 seconds for freight service and 45 seconds for courier/survey service. Seasonal packages share that larger freight window instead of being squeezed into a 30-second demo. Use preview speed controls when a faster test is useful.

Starting during a docked visit is expected. Jumping directly to any timestamp reconstructs the visit, transfer, antenna, light, and Pip task state without replaying missed frames.

During quiet periods Pip either rests, performs a restrained visual inspection, observes traffic, repairs the dedicated equipment light, or realigns the communications antenna. Tasks use stable time slots and explicit notice, travel, inspection, preparation, manipulation, verification, reaction, and return stages. The affected light or antenna visibly changes before, during, and after the work.

Pip also follows a separate seeded recharge rhythm. It is deliberately independent of the 97-minute orbital light cycle and only takes over during a quiet, conflict-free standby window. At the pad Pip settles, dims its visor and status light, and uses a soft pulse. Completed Stubborn Antenna and Phantom Visitor stories can appear in a softly outlined thought bubble connected to sleeping Pip. The selected memory retains its saved variant and outcome: antenna dreams replay the failed repair and plate installation, while Phantom dreams replay the white cover, trapped inspection drone, release, departure, and final joke. The bubble faces the viewer, fits the current camera view, and fades in and out. Dreams are read-only and leave real traffic, equipment, cargo, and story consequences unchanged. The All Saints' observance is deliberately not dream-eligible.

Pip approaches the equipment light from its exposed face and turns toward it before beginning repairs. It likewise turns back toward the mast and dish during antenna adjustment and synchronization. The raised cargo hatch has a dark recessed opening and an edge-mounted hinge, so its door is readable and swings outward instead of rotating through its center. Its task light sits above and to one side, identifying the work area without blocking Pip or the docking corridor.

The roof observation dome uses dark teal panes, cream framing, and a copper rim
on a hull-mounted collar. It sits aft of the antenna and behind the charging
stand, rather than sharing the mast's footprint. The antenna has a braced mast,
raised dish, rim and feed supports, with a fixed service panel facing Pip's
approach. Routine adjustments, survey synchronization, and the Stubborn Antenna
story use the same reachable panel; Pip's tool eases into contact while the dish
sweeps above and behind the work position. The recoil route stays clear of the
dome. The charging stand has a supporting plinth, struts, paired foot contacts,
and a front power socket while retaining its existing charging-light behavior.

Roof-equipment regression tests sample all three antenna gesture variants,
travel/recoil/return, tool contact, head/body clearance, beat boundaries, and
reverse seeking. Review these together using the preview camera shortcuts for
the overview and all three orthographic views after changing roof geometry.

Pip is a compact articulated robot with a teal body, cream head, luminous visor, chest indicator, elbow joints, and a wrist-mounted maintenance tool. Its pose vocabulary distinguishes curiosity, fault recognition, tool preparation, light repair, antenna manipulation, cargo grasp/carry/stow, verification, and a short satisfied reaction. Infrequent idle looks and seeded task variations add personality without continuous motion. Cargo follows a grip point on Pip while carried rather than moving on an unrelated path.

Courier visits use a small teal dispatch canister with dark end caps and an amber marking. It starts inside a hull-mounted bay whose door slides sideways on guides. Pip retrieves it with the camera-facing hand, carries it along the station's exposed side, places it in the receiver, verifies delivery, and returns. Both hands and payload use one deterministic transfer path; insertion keeps the payload at full size until the receiver conceals it. The courier has a restrained teal hull, swept fins, small nacelles, and a dark cockpit.

The freighter carries visible rectangular crates on matching, single-height side racks from arrival onward. The same crates are unloaded one at a time. After Pip carries the last package away from a side, its upper and lower supports slowly fold inward on visible hinges; both bays remain folded during departure. A bay stays open while any of its packages remain. Seasonal deliveries populate the racks with their actual manifest before arrival, and Pip approaches each slot individually, including the far side. Both courier and freight deliveries are performed from in front of the station hatch. The hatch jambs and separate light housing extend into the curved hull so they read as mounted equipment.

Visitor craft carry four axial RCS ports at both the fore and aft ends. Arrival uses the main engine while the craft crosses into view, then hands final braking and alignment to the forward RCS bank. Departure continues to back out on RCS, rotate clear, and engage the main engine only after the turn.

## Autumn 2026 seasonal story

The seasonal system uses device-local calendar dates and the existing absolute world clock. Ordinary state is reconstructed directly after a date jump or long absence; viewers never need to watch historical deliveries before decorations appear. Significant activities remain pending separately from scenery, until presented or explicitly retired when their physical setting is removed.

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
| January 6, 00:00–January 7, 00:00 local time | The temporary service deck dismantles in six distinct work stages with quiet periods; the last coupling departs by the annual-renewal boundary. |

Seasonal cargo reuses the deterministic traffic schedule and never adds a second ship or increases visit frequency. Selected cargo visits receive stable 2–4-package manifests. Packages move one at a time from the ship to Pip's grip and station storage, using separate fall, Halloween, and remembrance palettes and markings.

The seasonal service deck attaches to the station's aft `-X` port through a short offset passage. Its 4.6 × 3.1-unit platform includes a 0.6-unit aft extension for the Advent tree, with a clear central floor, narrow panel seams, clipped corners, and visible underfloor supports. A compact utility cabin occupies about 11% of the platform and has a Pip-sized pressure door, framed windows, a service locker, and a shallow roof cap. Waist-height rails and small shielded corner lamps keep the deck readable. The established `+X` visitor approach, docking, and departure corridor is unchanged. Gourds, lanterns, garlands, Halloween props, and the All Saints' fixture retain their shared anchors; Pip's work positions align its boots with the floor. Floor, beams, rails and corner lights all extend together within the original assembly/dismantling groups.

Deck assembly is calendar-derived rather than persisted. **Installation occupies September 22, 2026, 00:00–September 23, 00:00 local time; removal occupies January 6, 2027, 00:00–January 7, 00:00 local time.** Each takes 24 hours by default, configurable with `serviceDeck.transitionHours` in `config.js` (1–48 hours). Installation starts when autumn begins and removal always ends at the story-year renewal boundary. Reopening or jumping dates reconstructs the correct phase without replaying missed animation frames or requiring a shutdown callback.

`service-deck-lifecycle.js` still divides each transition into six ordered stages: coupling, supports, floor, cabin, railings, and lighting. Each stage spans four hours at the 24-hour default. **The rigid part actually moves only during a short lift around 40% into its stage (about 2.4 minutes at real pace),** and is fully seated or entirely absent during intervening quiet periods. Survey drones visit beforehand, leave, return for a fastening shift during installation (or to unfasten a part before removal), then come back to inspect. Several hours of the day remain quiet; construction is not a continuous stream of flying parts. Removal uses the reverse order: lighting, railings, cabin, floor, supports, coupling. Existing lights power up last and down first. The completed module remains available for decoration only when the installation has ended. Individual part transforms, riggers, and work-shift selection are derived directly from the world timestamp.

In preview, choose **Station Assembly → Install Commons Deck** or **Remove Commons Deck**. Playback defaults to 240× (six minutes for the full 24-hour sequence); choose real pace, 60× (24 minutes), or 1440× (one minute) using **Assembly preview speed**. Global simulation speed also multiplies preview playback. **Module sequence point** scrubs the entire day. **Module work stage**, **Work moment**, and **Jump to work stage** navigate directly to any part delivery, survey, fastening, inspection, or quiet period without waiting. The shared playback controls pause, resume, or stop the sequence. All preview overrides are read-only and never commit assembly state to storage.

Halloween preparations include a marked crate, jack-o'-lantern, orange/purple lights, a tethered ghost pennant, and an occasional cap for Pip. Four rare deterministic ambient oddities can briefly appear without persistence: a distant light, crossing shadow, shifted decoration, or harmless equipment flicker. Halloween cleanup is derived from the date and cannot strand stale props after an absence.

**Pip and the Phantom Visitor** is a 68-second story with eight readable beats. Pip follows an elusive white shape, discovers a tiny inspection drone caught in a cover, frees it, waves goodbye, and receives one last ambiguous surprise from the empty cover. Three checkpoints protect the reveal, release, and completion. An interruption resumes at a coherent chapter boundary. Successful completion occurs once in the 2026 story year and adds one bounded dream-eligible memory.

**The Lights of Remembrance** is a separate 42-second All Saints' Day observance. Pip approaches a blue-and-gold fixture, carefully checks and activates five soft golden lights, remains still while the station quietly operates, and returns to duty without a joke or malfunction. The `lights-lit` checkpoint resumes at the stillness beat; final completion is idempotent, leaves a meaningful non-dream memory, and permits the temporary lights to fade with the holiday window.

## Environment cycles

The world seed and absolute world timestamp drive a 97-minute stylized sunlight/shadow cycle, a 24-hour planet rotation, and a 365-day fictional year. Seeded offsets keep different worlds from sharing the same phase. No environment state is persisted, and date/time jumps reconstruct it immediately.

Sunset and sunrise use smooth transitions. In planetary shadow, direct sunlight and planetary bounce recede while cool hemisphere fill keeps the miniature readable; windows, equipment lights, Pip's tool, navigation lights, and a visitor cabin light become more prominent. The planet has deterministic, smaller faceted continents with bays, peninsulas, offshore islands and wide oceans, assembled as one vertex-colored low-poly globe. Coherent green, dry and upland regions vary the interiors. Each triangle gets a single land or ocean color, so geography remains recognizable as the world rotates. Coastlines do not move with the seasons. Seasons continuously blend four terrain palettes: spring greens, deeper summer greens and golds, autumn rust and sand, and winter snow. Polar snow is painted directly onto land faces, without the old separate transparent ice mesh. The subtle translucent atmospheric glow remains; no clouds are rendered. Atmosphere tint and a small light-angle bias change with the seasons without regenerating geometry.

## Previewing and event tools

From the screensavers directory, run:

```sh
python3 screensaver-preview.py
```

Select **The Little Space Station**. Both preview choices add `?preview=1`, which opens the console in the upper-right corner.

- **Scenes** searches and plays visits, stories, Pip activities, seasonal scenes, dreams, and deck assembly. Choosing a scene starts it; beat selection and scrubbing pause it. Use the shared playback controls to resume, restart, stop, step, or change speed. Pip's pose inspector is a still pose rather than a timed scene.
- **World** contains the local date and time, environment, planet, camera, and expansion controls. Planet rotation changes only the globe's appearance. **Return to live simulation** clears temporary overrides and restores the natural schedule and production framing.
- **Inspect** contains live diagnostics, shared scheduler priorities and waiting reasons, read-only conflict/catch-up/restart scenarios, seed selection, simulated interruption, and saved-data controls. Commits and deletion ask for confirmation; ordinary previews do not save story progress. Scheduler diagnostics also show exact absolute timestamps.
- Use the camera shortcuts above the tabs for the perspective and six orthographic views. Top/front/side are the default inspection angles; bottom/back/other side help when something is hidden. **Full screen** is available in the header. **Collapse** leaves a small playback strip without changing the scene or its framing.

Dreams use an eligible saved memory when available, otherwise a temporary example. Calendar presets reconstruct their date directly. Deck installation and removal retain their separate assembly speed and work-stage controls.

When adding a preview, register a scene and its supported playback adapter in `preview-console.js`, and place its controls in the scene's settings panel. Reuse the existing timeline and domain preview methods; do not add production input listeners or write narrative history from a temporary preview.

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
- `story.minimumSessionSeconds` controls the shared quiet lead-in (default 12 seconds, minimum 4). Old random opportunity fields no longer govern production selection; significant events remain pending instead of depending on lucky windows.
- Autumn/Halloween/All Saints' dates belong to the local 2026 calendar in `autumn-2026.js`; there is no production seasonal configuration screen.
- The inaugural service deck uses the same local story calendar and the explicit January 7, 2027 renewal boundary. It has no stored toggle or production controls.
- `testScenario` can be `auto`, `cargo-run`, `courier-stop`, `survey-call`, or `ambient`.

## Persistence

Procedural state is reconstructed from seed and absolute time rather than written continuously. The small versioned Local Storage v5 record retains presentation checkpoints and a bounded archive (12 entries) of completed narrative memories, including v2–v4 migration. A separate bounded `event-schedule:v1` companion stores pending, interrupted and completed occurrences with individual checkpoints. The old seasonal slot is not a global queue: completing another event never overwrites an older unfinished checkpoint. Checkpoints stay monotonic and completion is deduplicated. See [migration and scheduling](docs/event-scheduling.md).

Preview forcing, beat scrubbing, date jumps, and dream playback never silently write history. Only explicitly labeled commit/clear actions do so. Storage remains best effort, and a real write/read-back probe is used; failure never stops rendering.

## Tests

The pure environment, scheduler, maintenance, Pip pose/preview mapping, camera-framing model, seasonal dates/manifests, story timelines, safe-window directors, interruption recovery, persistence migration/idempotence, dream isolation, render staging, forced-preview, and clock regressions are in `tests/`. On a machine with Node.js installed:

```sh
npm test
TZ=UTC npm test
TZ=America/Chicago npm test
TZ=Pacific/Auckland npm test
```

No packages need to be installed. The Steam Deck screensaver runtime itself does not use Node or `package.json`.

Manual browser checks to perform on the Deck:

1. Open preview mode at 1280×800 and force each visitor; confirm the craft enters from off-screen, docks with RCS, remains quiet during idle service moments, backs out, turns clear, and then uses its main engine.
2. Jump within cargo service and confirm the container progresses from its rack to Pip to the cargo hatch without changing size. Repeat with the courier: its bay must open before extraction, and the canister should remain in the camera-facing hand until placed in the receiver. Check arrival and departure as well: loaded crates must follow the incoming ship and must not return on the empty rack after delivery.
3. Use ambient-only mode and time jumps to find both maintenance jobs; confirm the fault is visible before Pip acts and the light/antenna is restored afterward.
4. Pause and single-step at task and departure boundaries, then test 100× speed for clean reconstruction.
5. Change preview resolutions, including the current-browser-window option, and confirm camera framing and diagnostics remain usable.
6. Interrupt before and after a payoff, restart, test storage-off mode, and confirm forced events do not create automatic history.
7. Launch without `?preview=1` and confirm there are no visible controls or production input listeners.
8. Force full sunlight, sunset, deep shadow, and sunrise; confirm transitions are attractive, station geometry remains readable, and artificial lights do not overexpose.
9. Force all four seasons and use month-scale date jumps; confirm tint, atmosphere, polar cap, and light angle change without disturbing ship or Pip state.
10. At 1280×800, choose **Pip Activities → Pip pose inspector** and inspect standby, observe, notice, travel, inspect, prepare-tool, work, verify, react-success, and return. Confirm Pip's face and task remain readable from several feet away.
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
22. Inspect calendar fall scenery, early/full Halloween, all four oddities, cleanup, and November 4. Generic pretend installation/removal has been removed; scenery clears at its calendar boundary.
23. Scrub every Phantom Visitor beat at 1280×800 and 1920×1080, then play through at normal speed. Confirm the cover and drone stay distinct, Pip's investigation reads naturally, and interruption resumes at the reveal or trailing-cover boundary.
24. Complete a Phantom preview only through the explicit checkpoint control, then show its dream after Halloween cleanup. Confirm the miniature remains recognizable and neither traffic, equipment, nor completion records change during playback.
25. Force the Lights of Remembrance in sunlight and deep shadow at both target resolutions. Confirm the blue/gold fixture, five lamps, Pip's activation, prolonged stillness, and quiet return remain visible without Halloween lighting competing for attention.
26. Compare Local Storage before and after forced seasonal scenes, scrubbing, dates, and dreams. Confirm it remains byte-for-byte unchanged until an explicit commit or clear action is used.
27. In **Seasonal Scenes → Autumn scenery and activities**, compare **Before**, September 22, January 6, and **Reset**. Use **Station Assembly → Install Commons Deck** and **Remove Commons Deck** to play or scrub all six construction stages. Confirm assemblies lift clear of the cabin before departing, props wait until completion, backward seeks restore the correct parts, and returning to the calendar discards the preview. January 6 starts removal; Reset shows the module gone.
28. At 1280×800 and 1920×1080, inspect the empty module, fall decorations, full Halloween, and the active Lights of Remembrance stillness beat. Confirm the cabin and deck are readable, props rest on deck/cabin anchors, Pip stands naturally on the platform, and railings do not obscure the memorial.
29. Force every visitor while the module is present. Confirm the aft attachment and seasonal props never enter the existing front-dock approach, service, backing, rotation, or departure path.

## Known limitations and follow-up

- Autumn, Halloween, Phantom Visitor, Lights of Remembrance, and Thanksgiving stories are intentionally 2026-specific. Advent/Christmas scenery reconstructs from the calendar, with the tree and wrapped gifts clearing January 6 before the deck's January 7 removal. The Christmas gathering, gift opening, annual recurrence of the deck, and full January refurbishment story are not implemented.
- Seasonal inventories are inferred from calendar and seed rather than modeled as a generalized stock system. This keeps missed days recoverable and avoids a second simulation.
- The Phantom cover uses authored low-poly motion rather than cloth physics.
- The station has one layout family. Pip intentionally uses a lightweight procedural joint rig rather than skeletal animation; final hand-to-equipment alignment still requires Deck-side visual tuning.
- The activity-focus experiment centers Pip rather than computing a cinematic worksite-specific shot; nearby equipment should fit, but exact occlusion still needs visual evaluation per task.
- The 140% overview intentionally prioritizes current-station readability and may prove too tight for the developed mockup, especially at narrow aspect ratios. The experiment does not automatically reframe expansions.
- Final framing, occlusion, thrust direction, and living-room readability require manual visual testing in the Steam Deck browser and Gaming Mode.
- The eclipse is intentionally artistic rather than physical, and the planet has no separate procedural cloud layer.
