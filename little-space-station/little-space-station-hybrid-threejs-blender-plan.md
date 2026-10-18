# The Little Space Station — Hybrid Three.js and Blender Asset Plan

Status: **Deferred implementation plan**

This document records the intended modeling workflow for *The Little Space Station*. It is a handoff for a future implementation session; none of the changes below are implemented yet.

## Decision

Keep native Three.js geometry as the normal way to build the screensaver. Use Blender selectively when a part benefits from visual mesh editing, baked Boolean cutouts, bevels, or other authored refinements that would be awkward in procedural JavaScript.

The resulting architecture should remain hybrid:

- Three.js owns the scene, renderer, lights, planet, starfield, procedural details, materials, simulation-driven transforms, and preview tools.
- Blender owns only selected static mesh shapes.
- Blender Boolean results are baked into exported GLB geometry. No runtime CSG library is required by this plan.
- Existing JavaScript continues to animate the dish, hatch, solar panels, visitor craft, Pip, cargo, stories, and seasonal activity.
- A missing or invalid authored asset must fall back to the current procedural model without preventing the screensaver from starting.

## Goals

1. Make it practical to create clean cutouts, recesses, openings, bevels, and silhouette refinements in Blender.
2. Preserve the current low-poly visual language and seeded color identity.
3. Preserve all existing deterministic simulation behavior and animation timing.
4. Keep runtime assets local and compatible with the offline Steam Deck screensaver host.
5. Introduce authored assets gradually, one bounded component at a time.
6. Retain procedural fallbacks while the asset workflow is being proven.

## Non-goals

- Do not rebuild the complete scene in Blender.
- Do not replace the traffic, environment, Pip behavior, story, persistence, or seasonal systems.
- Do not introduce physics or a new docking simulation.
- Do not convert Pip to a skeletal rig during the initial work.
- Do not add a runtime CSG dependency unless a future design truly requires seed-dependent Boolean geometry.
- Do not add network-hosted models, textures, libraries, or decoders.
- Do not add production controls or input listeners.
- Do not migrate existing procedural parts merely for consistency. A part should move to Blender only when there is a visible benefit.

## Recommended source and runtime layout

Add these directories when the first authored asset is implemented:

```text
little-space-station/
  art-source/
    little-space-station.blend
    README.md
  assets/
    models/
      station-pilot.glb
  vendor/
    addons/
      loaders/
        GLTFLoader.js
      utils/
        ...required r186 addon dependencies...
```

- `art-source/` contains editable Blender source and is never loaded by the screensaver.
- `assets/models/` contains the small, baked GLB files used at runtime.
- Vendor `GLTFLoader` and all of its transitive addon dependencies from the same Three.js r186 release already used by the project.
- Add an import map or equivalent local import adjustment so the loader uses the existing `vendor/three.module.js`. Do not ship a second Three.js instance.
- Begin with uncompressed GLB files. Do not add Draco, Meshopt, or KTX decoders until measured asset size or performance establishes a need.

The first version may use one `.blend` file containing organized collections for multiple assets. Split it later only if the source file becomes difficult to maintain.

## Runtime asset boundary

Add a small asset layer rather than placing loader behavior throughout `scene.js`.

Suggested new modules:

- `model-assets.js`: load local GLB files, clone asset roots, remap semantic materials, and return explicit success or fallback results.
- `model-contracts.js`: define required node names, orientation, dimensions, material tags, and validation helpers for each asset.

Expected responsibilities:

1. `app.js` begins asset loading automatically during startup.
2. Asset loading failures are caught and reported only in preview diagnostics.
3. `LittleSpaceStationScene` receives an asset library or an empty fallback library.
4. Each build method decides locally whether to install a validated authored component or construct the existing procedural version.
5. Rendering, simulation, and persistence must not depend on an asset load succeeding.

Keep fallback creation close to the corresponding authored installation code. For example, `BuildDish()` should remain able to make the native dish even after an authored dish option is added.

## Coordinate and hierarchy contracts

An authored asset is geometry plus named attachment points. It must not silently redefine simulation coordinates.

Runtime conventions currently worth preserving:

- Station: local +Y is up, the barrel runs along X, the dock and approach corridor are on +X, and the visible service side is generally +Z.
- Visitor craft: the nose points toward -X and the main engine is at +X.
- Pip: local +Y is up and the face/visor points toward +Z.
- Model roots should load at scale 1 with a predictable origin. Use wrapper groups in Three.js for world placement rather than baking scene placement into the mesh.

Blender is Z-up while glTF is Y-up. Use Blender's normal glTF exporter conversion and validate the loaded result in the preview rather than compensating with undocumented rotations in several files.

Apply scale and rotation on ordinary mesh objects before export. Do not destroy meaningful origins on hinge, pivot, or anchor objects.

### Named node examples

Use stable, unique, lower-snake-case names. Exact contracts should be defined per asset before it is modeled. Likely names include:

```text
station_root
dish_pivot
hatch_hinge
solar_left_pivot
solar_right_pivot
dock_anchor
cargo_anchor

pip_root
pip_head
pip_shoulder_left
pip_elbow_left
pip_hand_left
pip_shoulder_right
pip_elbow_right
pip_hand_right
pip_tool_anchor
pip_cargo_grip

visitor_root
visitor_engine_anchor
visitor_rcs_fore_1
visitor_rcs_aft_1
visitor_cargo_root
visitor_courier_root
visitor_survey_root
```

These are examples, not an instruction to put the entire station, visitor, or Pip in one initial GLB.

On load, validate every required node before using an asset. A partial match must select the complete procedural fallback rather than leaving half of an assembly missing.

## How existing animation should connect

The current code already animates Three.js groups at the correct conceptual joints. Imported nodes should replace the visual contents below those groups or be bound to the same scene properties.

Examples:

- The dish model may be authored, but `this.dishPivot` remains controlled by the existing antenna code.
- The hatch door may be authored, but `scene.hatchDoor.rotation.y` continues to drive an edge-mounted hinge.
- Authored panel meshes remain children of the existing solar pivots.
- Authored visitor geometry remains under `this.ship`; the existing approach, RCS, turn, and departure phases remain untouched.
- Authored Pip shells may replace boxes and rods later, but the existing head, shoulder, elbow, hand, tool, and cargo-grip hierarchy remains the animation rig.

Do not bake simulation-specific animation into Blender for the initial workflow. Blender animation clips can be reconsidered for a self-contained decorative prop, but they should not compete with deterministic world state.

## Material contract

Blender materials should act primarily as semantic assignments. JavaScript should continue to own the final runtime material behavior so the following features remain intact:

- Seeded station and visitor color variation
- Flat-shaded low-poly rendering
- Day, sunset, shadow, and sunrise lighting changes
- Window and equipment emissive intensity
- Seasonal presentation changes
- Preview overrides

Suggested semantic Blender material names:

```text
lss_ivory
lss_orange
lss_teal
lss_metal
lss_dark
lss_black
lss_solar
lss_window
lss_warm_window
```

During asset installation, traverse imported meshes and replace matching Blender materials with the existing entries from `scene.materials`. Reject or visibly flag unknown material tags in preview mode.

Unique authored materials should be added only when they provide a visual feature not represented by the shared palette. They must still use local glTF-compatible data and respond appropriately to environment lighting.

Do not rely on Blender viewport-only materials or shader nodes that cannot be represented by glTF. Avoid external textures during the pilot.

## Blender authoring checklist

For every authored asset:

1. Model at a deliberate, documented scale.
2. Keep Boolean cutters in a clearly named, non-exported collection.
3. Prefer nondestructive Boolean modifiers in the `.blend` source.
4. Use manifold operands where practical; inspect the baked result for holes, doubled faces, and bad normals.
5. Use the appropriate Blender Boolean solver. Prefer Manifold for valid closed operands and Exact when overlapping or coplanar faces require it.
6. Keep polygon density close to the current low-segment procedural geometry.
7. Use bevels sparingly and deliberately; avoid subdivision surfaces unless the visible result justifies the triangle cost.
8. Apply mesh transforms while preserving the origins of pivot and anchor objects.
9. Use flat shading or intentional sharp edges to match the screensaver style.
10. Give every runtime-relevant object and empty a stable unique name.
11. Recalculate and visually inspect outward-facing normals.
12. Export only the intended collection or selected objects.
13. Exclude Blender cameras, lights, backgrounds, cutter objects, and reference geometry.
14. Export as binary glTF (`.glb`) with default coordinate conversion.
15. Run the Khronos glTF validator and resolve errors before browser testing.
16. Test the exported asset through the real local preview server, not through a `file://` URL.

## Current-model export bridge

It may be useful to bring the current procedural model into Blender as a starting reference. If needed, add a preview-only export tool using the Three.js r186 `GLTFExporter`.

Before adding that tool:

- Assign stable names to exportable model roots and important parts.
- Export only the chosen model root, not the entire scene.
- Exclude the starfield, planet, cameras, runtime lights, preview diagnostics, dream visuals, and story-only staging unless intentionally requested.
- Decide whether hidden visitor variants or props should be included; the exporter's normal visible-only behavior may omit them.
- Treat the exported GLB as a starting reference, not as the authoritative runtime asset.

The export button and any download interaction must exist only under `?preview=1`. Production must remain passive.

This bridge is optional. A small part can instead be recreated directly in Blender from measurements and screenshots.

## Recommended migration order

### Slice A — Loader and contract foundation

- Vendor the r186 GLTF loader and its required addon utilities.
- Add the local Three.js import mapping without changing the existing module instance.
- Add `model-assets.js` and `model-contracts.js`.
- Implement complete-asset validation and procedural fallback.
- Add preview-only diagnostics for asset status, source filename, required-node validation, dimensions, and fallback reason.
- Add tests for valid binding, missing-node fallback, and load failure.

Do not migrate a major model in this slice. Use a tiny fixture GLB or proceed immediately to the pilot component.

### Slice B — Small pilot asset

Create one small station component that proves the complete round trip. A good pilot is a compact equipment or hatch module containing:

- One visible recessed or Boolean-cut detail
- One named hinge or attachment anchor
- Two or three semantic material slots
- A procedural fallback

The pilot should prove:

- Blender Boolean quality
- GLB orientation and scale
- Named-node lookup
- Material remapping
- Existing JavaScript-driven motion
- Offline loading in the Steam Deck browser
- Graceful failure behavior

Do not begin a wider migration until the pilot survives visual and production-path testing.

### Slice C — Optional current-model export tool

If recreating parts manually is inefficient:

- Vendor the matching r186 `GLTFExporter` only for preview/development use.
- Add a preview-only export command for a selected model root.
- Give exported parts stable names.
- Verify that using the exporter has no production imports, controls, listeners, or startup cost.

### Slice D — Selective model improvements

Move parts to Blender only as a specific visual task requires them. Likely candidates are:

1. Hull or module sections needing real openings and recessed panels
2. The cargo hatch and surrounding frame
3. Visitor hull refinements and engine sockets
4. Antenna or equipment housings
5. Special story props that benefit from a distinctive silhouette
6. Pip cosmetic shells, while retaining the current procedural joint hierarchy

Continue to use native Three.js for rods, pipes, lights, simple panels, particles, procedural variants, seasonal decorations, and shapes that are already clear and inexpensive.

## Preview diagnostics to add

All of these must be strictly preview-only:

- Loaded asset list and file size
- Authored/procedural status for each hybrid component
- Required-node and material-contract results
- Asset bounding-box dimensions
- Optional anchor/pivot markers
- Optional wireframe or normals inspection
- A forced asset-failure mode to exercise procedural fallback
- A side-by-side or toggle comparison between procedural and authored pilot geometry
- Resource-load errors surfaced in the event console

The ordinary Steam launch must create none of these controls or listeners.

## Testing requirements

### Automated

- Existing tests must remain green.
- Test node-contract validation with valid, missing, duplicate, and wrongly typed nodes.
- Test semantic material remapping.
- Test that an asset-load rejection selects the complete procedural fallback.
- Test that imported pivots remain driven by existing animation state.
- Test that production startup does not import preview-only exporter or diagnostic modules.
- Run `node --check` on new JavaScript modules.
- Validate every committed GLB with the Khronos glTF validator.

### Browser and visual

- Check the preview at 1280×800, 1920×1080, and 2560×1600.
- Inspect daylight, sunset, deep shadow, and sunrise.
- Compare the authored component with its procedural fallback.
- Exercise every existing animation attached to an imported pivot.
- Confirm flat shading, silhouette, cut surfaces, and material boundaries remain readable at Steam Deck distance.
- Monitor console errors, failed resources, triangle count, draw calls, frame rate, and initial load time.
- Test the URL without `?preview=1` and confirm there are no controls or input listeners.
- Test a deliberately missing GLB and a malformed node contract; both must still produce a functioning screensaver.
- Recheck the actual Gaming Mode screensaver host after desktop Chrome testing.

## Performance rules

- Perform no Boolean calculations at runtime under this plan.
- Load each authored model once and reuse or clone it appropriately.
- Avoid per-frame object lookup; bind named nodes during installation.
- Avoid per-frame allocations introduced by asset adapters.
- Keep shared runtime materials shared where mutation is intended globally; clone only materials requiring independent state.
- Dispose rejected or replaced geometry and unique materials carefully, without disposing shared scene materials.
- Do not generate edge overlays automatically for every imported mesh. Blender Boolean topology can expose unwanted triangulation through `EdgesGeometry`; decide edge treatment per component.
- Prefer geometry improvements that preserve or reduce draw calls. A GLB containing many material slots can be more expensive than several procedural primitives.

## Runtime CSG policy

No JavaScript CSG package is part of the initial implementation.

If a later feature requires geometry that cannot be authored because its cutouts vary by world seed or configuration, evaluate runtime CSG separately. At that point:

1. Confirm that native `ShapeGeometry`, `ExtrudeGeometry`, `LatheGeometry`, `TubeGeometry`, or composed meshes cannot solve the problem cleanly.
2. Prototype with low-poly watertight operands.
3. Compare a pinned `three-bvh-csg` build and the simpler `three-csg-ts` approach against Three.js r186.
4. Bundle the selected library locally while externalizing the existing Three.js module.
5. Run CSG only during initialization and cache the resulting geometry.
6. Add failure fallback, geometry disposal, visual tests, and Deck performance measurements.

Do not introduce runtime CSG merely to merge overlapping meshes whose intersection is not visible.

## Documentation changes during implementation

When the first asset is integrated:

- Update the project `README.md` structure section and explain which components are authored versus procedural.
- Document the exact Blender version and glTF export settings used.
- Add an `art-source/README.md` with the node, material, orientation, and export contracts.
- Record the validator command and any asset optimization step.
- Update the known limitations and manual test checklist.
- Update the root `AGENTS.md` only if the work establishes reusable requirements for all screensavers, rather than Little Space Station-specific conventions.

## Acceptance criteria for the first implementation milestone

The hybrid pipeline is established only when all of the following are true:

- A Blender-authored pilot component with a real cutout or recess renders correctly.
- Its named pivot or anchor is controlled by existing JavaScript animation.
- Seeded/shared runtime materials still work.
- Removing or corrupting the GLB produces the procedural fallback without stopping rendering.
- The asset and all loader dependencies work offline.
- Preview diagnostics clearly identify authored versus fallback behavior.
- The production URL remains passive and contains no development controls.
- Existing simulation, story, persistence, resolution handling, and tests remain unchanged in behavior.
- Visual and performance checks pass at all target preview resolutions.

After that milestone, Blender conversion remains optional and task-driven. Native Three.js should continue to be the default for most of the screensaver.
