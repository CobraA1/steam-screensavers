# Transparency Lab (developer-only)

This is a standalone opt-in browser experiment. It is **not** imported by the passive Steam Deck screensaver and does not request fullscreen or write station history.

From the **repository root**, run:

```sh
python3 screensaver-preview.py --port 8765 --no-open
```

Open:

`http://127.0.0.1:8765/little-space-station/experiments/transparency-lab/index.html`

Use **Compare all three** to see ordinary alpha blending, alpha hashing, and opaque-to-texture offscreen compositing side by side. They show the same deterministic low-poly objects with overlapping surfaces and matching animation; change shape count (6–1024), 1×/2×/4×/8× complete drawing passes, opacity, internal rendering scale, and animation. For FPS comparisons, switch **Display** to one technique at a time, keeping shape count, opacity, render scale, viewport, and browser conditions unchanged. **Run three-mode benchmark (~24s)** performs a sequential, per-technique comparison using the current settings: each technique gets 2 seconds of warmup plus 6 seconds of sampling. The results include FPS, CPU submission median/p95, and GPU median when available. It returns to your previous display selection when finished and can be stopped. The comparison itself measures all three pipelines together, not an individual pipeline's FPS. Change opacity during motion, and test 25%, 50%, and 75%.

- **Normal alpha**: each object blends individually, potentially producing ordering and opacity buildup artifacts.
- **Alpha hashing**: per-fragment stochastic alpha coverage with depth writes avoids some transparency ordering issues, at the cost of visible dither/grain.
- **Offscreen composite**: depth-test overlapping *opaque* objects into an RGBA8 transparent-background render target, then composite the visible group once at the selected opacity. This prevents group self-overlap darkening but does **not** show hidden shapes through the front objects or handle correct three-dimensional occlusion with unrelated scene content. The offscreen pass adds an additional render pass and texture allocation.

**Stress testing:** High shape counts are created lazily per technique. The workload multiplier repeats the whole scene render and clears between passes, producing the same last image while multiplying GPU/CPU work. Start with 96 objects and 1× passes; increase to 256, 512, 1024, then consider 2×/4×/8× passes. Very heavy settings may stall the browser or heat the Deck. Benchmark **single modes** for method-to-method comparisons; the three-way display is for visual comparison, not isolated performance.

**GPU timing:** When `EXT_disjoint_timer_query_webgl2` is supported, each displayed frame is measured with an asynchronous `TIME_ELAPSED_EXT` query. A bounded pending queue prevents unbounded memory growth. Timer results are discarded on GPU disjoint and shown only for the current display/workload; the readout and benchmark correctly show `N/A` if unsupported. This includes the full chosen render pipeline (background + target + compositing when relevant), not the JavaScript scene updates. Even at a display-capped 60/144 FPS, GPU timing can expose differences.

Measurements: FPS is a rolling requestAnimationFrame rate for the entire displayed mode(s). Frame interval is derived from FPS. Render submission (ms) is CPU-side wall-clock time; it is **not GPU timer-query data**. Draw calls/triangles are from `WebGLRenderer.info`. `performance.memory.usedJSHeapSize` is shown only in browsers that expose it (typically Chromium), and it is **not total process or system RAM**. Graphics memory cannot be queried reliably from WebGL; the displayed **active GPU allocation estimate** only includes unique geometry buffer array lengths plus the offscreen color/depth attachments, assuming RGBA8 color and four bytes per depth pixel. It excludes the browser swapchain, driver allocation overhead, shaders, caches, antialias buffers and other resources. `renderer.info.memory` shows geometry and texture *counts*, not bytes.

Run automated pure-metrics checks with `npm test` from `little-space-station/`. For meaningful GPU results inspect the browser preview on Steam Deck and record device, browser, resolution, quality setting, and shape count. GPU timings use timer queries when supported, but accurate process RAM/VRAM still requires browser/OS diagnostics outside this page. The allocation estimate is scoped to the active technique (an offscreen target is disposed when no longer used), but it is **not** a live total VRAM measurement. Do not automatically integrate either rendering technique into production based only on this benchmark.

## Test results and production relevance

See [October 2026 Steam Deck findings](../../docs/performance/transparency-findings-2026-10.md) for recorded sequential comparisons, visual evaluation, limitations and the planned first production trial (whole-dream/bubble fades). The high-load tests triggered Deck instability/crashes; avoid repeating them unnecessarily. The offscreen demo is a **2D group composite**, not a direct reusable replacement for every transparent 3D object.
