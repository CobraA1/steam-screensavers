# Transparency Lab (developer-only)

This is a standalone opt-in browser experiment. It is **not** imported by the passive Steam Deck screensaver and does not request fullscreen or write station history.

From the **repository root**, run:

```sh
python3 screensaver-preview.py --port 8765 --no-open
```

Open:

`http://127.0.0.1:8765/little-space-station/experiments/transparency-lab/index.html`

Use **Compare all three** to see ordinary alpha blending, alpha hashing, and opaque-to-texture offscreen compositing side by side. They show the same deterministic low-poly objects with overlapping surfaces and matching animation; change shape count (6–96), opacity, internal rendering scale, and animation. For FPS comparisons, switch **Display** to one technique at a time, keeping shape count, opacity, render scale, viewport, and browser conditions unchanged. The comparison itself measures all three pipelines together, not an individual pipeline's FPS. Change opacity during motion, and test 25%, 50%, and 75%.

- **Normal alpha**: each object blends individually, potentially producing ordering and opacity buildup artifacts.
- **Alpha hashing**: per-fragment stochastic alpha coverage with depth writes avoids some transparency ordering issues, at the cost of visible dither/grain.
- **Offscreen composite**: depth-test overlapping *opaque* objects into an RGBA8 transparent-background render target, then composite the visible group once at the selected opacity. This prevents group self-overlap darkening but does **not** show hidden shapes through the front objects or handle correct three-dimensional occlusion with unrelated scene content. The offscreen pass adds an additional render pass and texture allocation.

Measurements: FPS is a rolling requestAnimationFrame rate for the entire displayed mode(s). Frame interval is derived from FPS. Render submission (ms) is CPU-side wall-clock time; it is **not GPU timer-query data**. Draw calls/triangles are from `WebGLRenderer.info`. `performance.memory.usedJSHeapSize` is shown only in browsers that expose it (typically Chromium), and it is **not total process or system RAM**. Graphics memory cannot be queried reliably from WebGL; the displayed **GPU allocation estimate** only includes unique geometry buffer array lengths plus the offscreen color/depth attachments, assuming RGBA8 color and four bytes per depth pixel. It excludes the browser swapchain, driver allocation overhead, shaders, caches, antialias buffers and other resources. `renderer.info.memory` shows geometry and texture *counts*, not bytes.

Run automated pure-metrics checks with `npm test` from `little-space-station/`. For meaningful GPU results inspect the browser preview on Steam Deck and record device, browser, resolution, quality setting, and shape count. GPU timings or accurate process RAM/VRAM require browser/OS diagnostics outside this page. Do not automatically integrate either rendering technique into production based only on this benchmark.
