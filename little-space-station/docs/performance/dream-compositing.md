# Offscreen dream compositing

Both Stubborn Antenna and Phantom Visitor use `dream-compositor.js`. The main scene owns one `DreamCompositor`; the two dream roots belong exclusively to its isolated scene. Only a single textured quad belongs to the live scene, so dream geometry is never drawn twice there.

## Presentation and alpha

After the existing dream update reconstructs its pose, `prepare()` renders the active bubble, rim, three connecting dots, miniature stage, shared Pip, and all props into one transparent RGBA8 render target. It crops a copy of the active camera projection to a padded envelope around the presentation. No second renderer, simulation, clock, or persistent state is introduced.

The final quad applies `DreamOpacity(progress)` once: the existing smoothstep entrance over the first 6% and exit over the last 8% are unchanged. Opaque actor materials now write depth within the memory. Intrinsic translucency remains on the bubble, rim, and covering; the Phantom drone and covering retain their independent story-specific opacity. Whole-dream fading never modifies those material values.

The target contains premultiplied linear RGB. The composite shader unpremultiplies before output color-space conversion, then premultiplies by the final alpha exactly once for blending. This preserves palettes and avoids dark halos or double multiplication at translucent edges. The target clears to transparent black on every active frame, including switches and backwards seeks.

## Placement and depth

The original head anchor, camera-facing rotation, ellipse shape and viewport fitting remain in use. Orthographic preview cameras have a finite placement calculation, but miniature dreams are deliberately exempt from top/front/side aesthetic review. Review the production camera at fade boundaries, key beats, and narrow/wide resolutions. Live-world incidents and geometry still require the four-view checks in [animation expectations](../expectations/animation-expectations.md).

The quad uses Pip's head depth, participates in ordinary transparent sorting, tests against opaque world depth, and does not write depth. Thus nearer solid station geometry can occlude it. All memory pixels share that plane: this is not accurate per-actor occlusion against the live world, and intersecting transparent world objects retain the normal sorting limitations. Thought bubbles are composed above the station; do not stage physical interactions across that boundary. Changing the size or travel of memory actors also requires checking the shared padded envelope for clipping.

## Resource lifetime and cost

- Allocate lazily for a visible dream with nonzero overall opacity. No target and no extra render pass exist while idle or at fully faded endpoints.
- Size from the cropped footprint and the renderer's already-capped drawing-buffer resolution. Quantize to 32-pixel blocks and cap each edge at 1024 pixels. Use up to four MSAA samples, limited by renderer support, to smooth the rim and miniature silhouettes.
- Keep the same target across frames and direct dream switches. Within a viewport it grows only when necessary, avoiding resize churn from camera drift. A drawing-buffer resize permits shrinking. `setSize()` releases old attachments; it does not create a new target object each frame.
- Release the target as soon as the dream becomes inactive. Retain the small geometry/material sets for later dreams. `dispose()` also releases unique miniature geometries/materials, the quad and its material, and detaches the quad.
- Restore the caller's target, viewport, scissor, clear settings and automatic-clear state even when the offscreen render throws.

The maximum resolved RGBA8 image is 4 MiB, plus depth and multisample attachments; that image size alone is not total GPU memory. Typical Deck targets are considerably smaller. At extreme zoom/high DPR the 1024-pixel cap can soften details. No stress-lab workloads are needed for validation.

See [dream expectations](../expectations/dream-expectations.md) and [transparency findings](transparency-findings-2026-10.md). Desktop Chrome verification does not establish Steam Gaming Mode performance or host-specific compatibility.

## Implementation review — 2026-10-19

The working branch already contained the orthographic inspection implementation and explicit dream exemption. No camera-controller or live-story choreography changes were needed.

Changed runtime files: new `dream-compositor.js`, plus `dream-renderer.js`, `phantom-dream-renderer.js`, and `scene.js`. Added `tests/dream-compositor.test.js`; updated the antenna fade assertion in `tests/dream-renderer.test.js`. Two existing numerical assertions in `tests/shared-dream-pip.test.js` and `tests/transparency-lab.test.js` were corrected to accept signed zero and ordinary floating-point rounding. Documentation updates cover this note, the README, dream expectations, and the original transparency findings.

Browser verification used the dedicated Chrome Flatpak profile and the actual preview controls. Both 20-second dreams played through completion; one-second playback frames were inspected, along with both sides of all seven internal beat boundaries per dream. Forward/backward seeks, 25/50/75% entrance and exit fades, complete disappearance, and rapid type switches were checked. Baseline versions of the old renderer modules were served only to the test tab for before/after screenshots. The new partial fades preserve the composed silhouette instead of showing brighter overlapping robot parts. No rectangular background, halo, palette shift, or crop/stretch artifact was observed.

Both presentations were reviewed at 1280×800, 1920×1080, 2560×1600, 3840×2160, and 700×1000. A top orthographic preview smoke check remained finite; this was not an aesthetic review. The unmarked production URL created no preview controls and no idle dream target. No application errors or failed resources were reported.

Short, sequential real-scene measurements (about 2.2 seconds per sample, Chrome desktop, DPR 1) are indicative only:

| Viewport | Presentation | FPS | Median CPU render submission | Calls / triangles | Dream target |
| --- | --- | ---: | ---: | ---: | --- |
| 1280×800 | Idle | 59.5 | 2.8 ms | 253 / 8,937 | none |
| 1280×800 | Antenna | 60.0 | 3.2 ms | 301 / 12,143 | 320×256 |
| 1280×800 | Phantom | 60.0 | 3.2 ms | 302 / 12,543 | 320×256 |
| 3840×2160 | Idle | 60.0 | 2.8 ms | 253 / 8,937 | none |
| 3840×2160 | Antenna | 60.1 | 3.5 ms | 301 / 12,143 | 864×672 |
| 3840×2160 | Phantom | 59.9 | 3.6 ms | 302 / 12,543 | 864×672 |

These figures include the offscreen pass. Frame rates were near the refresh limit; CPU submission is not GPU elapsed time. This browser exposed the GPU timer extension, but no GPU query timings were collected. The 4K check used a 3840×2160 browser viewport, not a verified external-TV output mode. No synthetic stress workload was run.

Twelve alternating dream switches held the renderer's texture count at two; returning to recharge restored one texture and no target. All 105 automated tests passed, including repeated frames, resizing, backwards seeks, inactive endpoints, disposal, and renderer-state restoration after an exception.

Review artifacts are temporary files under `/tmp`: `review-{antenna,phantom}-playback.png`, `review-{antenna,phantom}-fades.png`, `review-{antenna,phantom}-exit.png`, `review-{antenna,phantom}-sizes.jpg`, and `review-{antenna,phantom}-boundaries.jpg`. Individual full-resolution screenshots use `dream-{antenna,phantom}-{1920,2560,3840,700}.png`.

Remaining limits: verify long-running performance and compatibility in Gaming Mode. The head-plane depth approximation and target-resolution cap are intentional. Existing antenna choreography drops its startled pose at the runaway-spin/real-repair boundary; this compositor-only change preserves that behavior rather than rewriting the memory animation.
