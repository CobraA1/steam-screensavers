# Transparency Lab findings — October 2026

**Status:** the observations below describe the original experiment. The two production dream presentations now implement its recommendation through the shared [offscreen dream compositor](dream-compositing.md); other transparency effects are unchanged.

This note summarizes user-run tests of [the standalone Transparency Lab](../../experiments/transparency-lab/README.md) on a **Steam Deck**, including an external Acer monitor at 1920×1080 / 144 Hz and an external TV displaying 4K output. The benchmark deliberately forces many overlapping animated low-poly meshes. It is **not representative of normal Little Space Station scene composition**.

## Visual observations

- **Ordinary alpha blending** looks smooth and truly layered but opacity accumulates through overlapping surfaces, washing out the intentionally dense cluster.
- **Alpha hashing** reduces some ordering/overlap artifacts and keeps surfaces distinguishable but shows strong stippling at the tested opacity; the noisy look is undesirable for the cozy low-poly dream bubbles without additional smoothing.
- **Offscreen group compositing** renders the overlapping shapes as opaque, depth-tested surfaces in a render target, then fades the whole resulting image once. It produces clear, cohesive silhouettes and avoids transparency building up at overlaps. It does **not** preserve see-through visibility of hidden members, nor automatically handle correct occlusion against live-world actors.

These are different visual semantics: *fade an assembled object or group as one image* versus *render truly translucent layers*. Do not assume the techniques are interchangeable for windows, atmospheres, exhaust or characters crossing the group boundary.

## Observed benchmark snapshots

All figures below were read from screenshots supplied during the test session. They are rounded UI measurements, not repeated controlled benchmarks or independently verified GPU timings.

| Context | Normal alpha | Alpha hashing | Offscreen composite | Notes |
| --- | ---: | ---: | ---: | --- |
| Steam Deck / external 144 Hz monitor, 1,024 overlapping shapes, 1× pass | 105.1 FPS | 113.5 FPS | 112.5 FPS | Sequential ~24-second browser benchmark; 55% opacity, 100% lab render scale |
| Steam Deck / TV with 4K output, 1,024 shapes, 8× passes | 10.8 FPS | 28.2 FPS | 28.6 FPS | Sequential benchmark, 55% opacity; deliberately extreme workload |
| Steam Deck, normal alpha only, 256 shapes, 8× passes | 57.5 FPS | — | — | 13 ms CPU-side render submission |
| Steam Deck, normal alpha only, 512 shapes, 8× passes | 42.2 FPS | — | — | 22 ms CPU-side render submission |
| Steam Deck, offscreen only, 512 shapes, 8× passes | — | — | 58.3 FPS | 14 ms CPU-side render submission |

The first two rows are the meaningful like-for-like sequential comparisons. For the 4K-output stress test, offscreen was roughly **2.65× normal-alpha FPS**, while offscreen and hashing were essentially tied; one run does not establish a stable ranking. The 256/512 rows were taken under potentially differing display conditions and should not be treated as controlled comparisons. At ordinary 96-shape / 1× workloads, frame rates were refresh-limited near 59.94 or 144 Hz.

**Timing/measurement limits:**

- On the tested browser, `EXT_disjoint_timer_query_webgl2` was **unavailable**. GPU elapsed measurements were `N/A`; the displayed render-submission figures are **CPU-side wall time**, which can include waiting/backpressure, not measured GPU execution time.
- The browser also reported JavaScript heap RAM as `N/A`. The lab's GPU allocation figures cover known geometry buffers and offscreen attachments only; they are **not true VRAM usage**.
- A 4K display mode is not proof that the WebGL canvas internally renders at exactly 3840×2160. Internal size depends on CSS viewport, browser scaling, DPR and the lab's quality cap.
- At extreme loads the Deck became unstable and experienced crashes. The cause was **not identified**: high GPU activity was observed, but temperature, memory, GPU driver and power contributions were not isolated. **Do not repeat crash-inducing loads for routine development.**

## Working decision

For new fades that should make a **compound object or a whole staged presentation** appear/disappear uniformly, **offscreen composite is the preferred first technique to evaluate**. It is visually suitable for a cohesive miniature presentation, and the tested Steam Deck can render it efficiently under normal and moderate synthetic loads.

This is **not** a blanket change to all transparency: retain conventional materials for genuine translucency and additive light effects, use continuous geometry where possible (e.g. the Phantom covering), and apply offscreen rendering only when a bounded buffer and a correct relationship to the rest of the 3D scene can be demonstrated. Alpha hashing remains a possible specialized alternative if its grain is acceptable or can be smoothed.

**Implemented production use:** both **Stubborn Antenna** and **Phantom Visitor** dreams now composite the whole memory/bubble presentation before fading. Their palettes, shared miniature Pip, beat choreography, independent actor fades, and deterministic seeking remain intact. The bounded target, head-plane occlusion approximation, alpha handling and resource lifetime are documented in [dream compositing](dream-compositing.md). This does not convert other station transparency effects.

### Acceptance requirements retained from the original prototype recommendation

1. Reuse one shared offscreen-bubble composition approach; avoid separate per-dream infrastructure that drifts.
2. Verify **whole-bubble fade** is uniform; children must not independently accumulate opacity during the group transition. Preserve story-specific actor fades *inside* the fully composed dream.
3. Check proper framing and occlusion of the bubble against Pip, the station and screen edges at 1280×800, 1920×1080 and 4K output. Watch for stretched/shifted render-target imagery and halos/premultiplication errors.
4. Bound render-target sizes to the actual bubble footprint and capped device-pixel ratio; allocate only when needed, resize deliberately, reuse rather than recreate per frame, and dispose/disable when not used.
5. Ensure preview seeks, rapid dream switches, rest-to-awake transitions and reduced-performance conditions do not leave stale textures, visible actors or leaked GPU resources.
6. Benchmark the **real station** with and without dream compositing, including 4K output; avoid extreme stress-test settings. Compare visible draw calls, triangles, CPU submission and FPS. If genuine GPU query results are unavailable, say so.
7. Keep the Transparency Lab opt-in; never load benchmark UI, event listeners or stress-test settings in production.

**Safety/performance direction:** The screensaver is meant to run unattended for hours on a Steam Deck. Smooth pacing, modest resource consumption, clean lifecycle management and reliability are more important than maximizing stress-test FPS. The production compositor uses one bounded dream pass; the extreme benchmark figures above must not be presented as its measured performance.
