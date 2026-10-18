# Steam Deck Screensaver Guidelines

This directory contains HTML screensavers for Steam Deck. Treat `bouncinglogo/` as the platform reference and do not modify it.

## Animation and narrative expectations

Before changing the corresponding systems, read the applicable expectations:

- [Animation expectations](docs/animation-expectations.md): staging, target-facing poses, physical contact, continuous beat boundaries, safe travel, deterministic seeking, and visual verification.
- [Story expectations](docs/story-expectations.md): narrative intent, Phantom Visitor acceptance beats, scheduling, checkpoints, interruption recovery, and complete visual exits.
- [Dream and memory expectations](docs/dream-expectations.md): faithful completed memories, readable miniature actors, bubble framing, identity retention, and isolation from live world state.

These supplement the original story briefs. Changes spanning live stories and their dream adaptations must be checked in both presentations.

## Required structure

- Put each screensaver in its own folder with `index.html` as the entry point.
- Keep runtime files inside that folder and use relative paths. Vendor third-party libraries locally; do not require network access while the screensaver is running.
- Prefer separate HTML, CSS, configuration, and JavaScript files. Load classic scripts with `defer`; load configuration before the renderer.
- Start the animation automatically when `index.html` loads. Do not show a launch, setup, or configuration screen.

## Screensaver behavior

- Screensavers are passive. Do not add pointer, mouse, touch, keyboard, click, wheel, focus, or gamepad listeners. Steam uses input to dismiss the screensaver.
- Do not request, exit, or detect fullscreen. Steam owns the fullscreen window.
- Do not add visible controls, instructions, status labels, buttons, sliders, or hover UI.
- Put user-editable settings in a clearly commented `config.js` file. Rendering code should read that configuration and supply safe defaults.
- Fill the viewport: reset margins and padding, set `html` and `body` to `width: 100%` and `height: 100%`, hide overflow, and provide a stable background color.

### Preview-only development behavior

- `screensaver-preview.py` appends `?preview=1` to screensaver URLs in both framed and open-tab previews.
- Detect it with `new URLSearchParams(window.location.search).get("preview") === "1"`. Do not infer preview mode from the hostname, referrer, or iframe state.
- Debug overlays, development controls, and input listeners are permitted only when their creation and listener registration are strictly guarded by that preview flag.
- The unmarked code path is the production Steam path and must remain completely passive. Preview features must never be required for initialization or normal rendering.

## Resolution and animation lifecycle

- Define a resolution-change function, register it with `window.addEventListener("resize", ...)`, and invoke it during initialization.
- Canvas renderers must update both the CSS display size and backing-store size. Account for `devicePixelRatio` and cap it when necessary for Steam Deck performance.
- WebGL renderers must also update renderer size, pixel ratio, camera aspect, and the projection matrix.
- Some display-mode transitions may not emit a useful resize event. Cache `innerWidth`, `innerHeight`, and `devicePixelRatio`, compare them once per animation frame, and run the resolution-change function when any value changes.
- Use `requestAnimationFrame` for animation. Track frame time and clamp large hitches to at most 100 ms before updating simulation state.
- Recompute size-dependent layout and cached drawing resources after a resolution change. Do not assume 1280×800 or a landscape aspect ratio.


## Persistent storage

The following behavior was verified in the Steam Deck screensaver host on 2026-10-14. Counters stored by each successful backend survived a full screensaver restart and advanced on the next launch.

| Storage backend | Verified result | Appropriate use |
| --- | --- | --- |
| Local Storage | Available and persistent across launches | Small settings, flags, and short scalar values. Keep synchronous reads and writes infrequent. |
| IndexedDB | Available and persistent across launches | Preferred store for structured or larger application data. |
| Cache Storage | Available and persistent across launches | Locally generated or fetched request/response resources. Do not use it as a general key/value database. |
| Cookies | Available and persistent across launches | Only when cookie semantics are specifically useful; prefer Local Storage for ordinary settings. |
| Origin Private File System (OPFS) | Available and persistent across launches | File-like data and larger binary or text artifacts. |
| Web SQL | Unusable; transactions fail with `InvalidStateError` | Do not use. The presence of `window.openDatabase` is not sufficient feature detection. |

- `navigator.storage.persisted()` reports `false` in the tested host, so all working storage is under a **best-effort** retention policy. Data can survive normal launches but may still be evicted; never treat it as irreplaceable.
- Do not request durable-storage permission by default. A passive screensaver must not prompt for permissions or depend on a persistence grant.
- Treat quota estimates as informational only. The tested host reported roughly 564 GB of quota, which must not be interpreted as a safe allocation budget.
- Namespace every key, database, cache, cookie, and OPFS filename with the screensaver folder or another unique identifier. Screensavers may share the same browser origin; never clear or enumerate unrelated application storage.
- Detect availability by completing a real read/write/read-back operation and catching exceptions. API-property checks alone are insufficient.
- Storage failures must degrade gracefully without stopping rendering. Start the visual loop independently of asynchronous storage initialization.
- Version IndexedDB schemas and persisted record formats when their structure may evolve.

## Performance and compatibility

- Target smooth operation on Steam Deck hardware. Avoid unnecessary per-frame allocations, excessive pixel ratios, and unbounded particle or geometry counts.
- Pause expensive simulation work when `document.hidden` where practical, while allowing the next visible frame to recover without a large time jump.
- Keep a solid fallback background in HTML/CSS so a renderer failure never exposes an unstyled white page.
- Keep source readable and configuration values named by purpose. Document unusual platform constraints in the screensaver's `README.md`.

## Local testing tools

This setup was verified on 2026-10-15. Use it rather than assuming Node or browser automation is unavailable. Keep development tools in the home directory; routine testing does not require modifying SteamOS system files.

### Node.js

- Node v24.22.0 is installed under `/home/deck/.local/opt/node-v24.22.0-linux-x64`.
- `/home/deck/.local/bin/node`, `npm`, and `npx` link to this installation. This directory is on the current terminal's PATH; use absolute paths if needed in other sessions.
- Run `npm test` from `little-space-station/`. All 27 existing tests passed when this setup was verified.
- Prefer behavioral tests for simulation and transforms. Source-string assertions and successful HTTP responses do not prove that an animation renders correctly.

### Chrome Flatpak and host access

The terminal currently runs inside VSCodium's Flatpak (`com.vscodium.codium`). The host's `/usr/bin/flatpak` is not available at that path inside this environment. The working bridge is:

```sh
flatpak-spawn --host /usr/bin/flatpak info com.google.Chrome
```

Check `http://127.0.0.1:9222/json/version` for an existing test browser before launching another. Use the dedicated testing profile, not the user's normal Chrome session:

```sh
flatpak-spawn --host /usr/bin/flatpak run \
  --branch=stable --arch=x86_64 --command=/app/bin/chrome \
  com.google.Chrome \
  --user-data-dir=/home/deck/.var/app/com.google.Chrome/config/screensaver-testing \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
  --no-first-run --no-default-browser-check about:blank
```

- Keep the debugging endpoint on localhost and reuse the installed Chrome Flatpak. No Playwright browser download is needed.
- If execution fails with `bwrap: No permissions to create a new namespace`, use the execution tool's approved escalation mechanism for the scoped command. Do not change host sandbox settings.

### Preview server and browser automation

#### Startup and troubleshooting

- The preview server and dedicated test browser are separate processes. Neither is guaranteed to survive between sessions. A normal Chrome window does not provide the debugging endpoint unless launched with the documented debugging flags.
- Check both endpoints independently with short, explicit timeouts and visible errors:

```sh
curl --noproxy '*' -sS --connect-timeout 2 --max-time 4 -I http://127.0.0.1:8765/little-space-station/index.html
curl --noproxy '*' -sS --connect-timeout 2 --max-time 4 http://127.0.0.1:9222/json/version
```

- Do not join these checks with `&&`: failure of the first must not suppress the second.
- Connection refused means no service is accepting connections at that address and port. During authorized preview testing, start the missing server or dedicated Chrome instance using the commands in this document, then check again. Do not stop at reporting an unavailable endpoint when its service has not been started.
- `--no-open` starts only the preview server; it deliberately opens no browser window. Launch the dedicated Chrome test profile separately when browser automation is needed.
- To distinguish an installation problem from a stopped browser, use `flatpak-spawn --host /usr/bin/flatpak info com.google.Chrome` and `flatpak-spawn --host /usr/bin/flatpak ps --columns=application,pid`. The editor's process list alone may not show host/browser processes across Flatpak boundaries.
- Keep long-running server/browser launch sessions alive and retain their session IDs. Wait for readiness, then make an actual HTTP/CDP connection before claiming that the setup works.
- A pending execution/approval call or `Script running with cell ID ...` is not an endpoint timeout. Await its result using the appropriate wait tool; if it remains unresolved, report that execution is pending. A cancelled call with no output establishes no network diagnosis. Record completed commands' errors and exit codes.
- The known `bwrap` namespace error occurs before the requested shell command runs. Retry the scoped command through approved escalation; do not interpret this as a browser or server failure.

From the screensavers root, start the preview server if it is not already serving this project:

```sh
python3 screensaver-preview.py --port 8765 --no-open
```

`playwright-core` is installed outside the screensaver runtime at `/home/deck/.local/share/screensaver-testing/node_modules/playwright-core`. Run the following JavaScript with `node --input-type=module` to connect to Chrome:

```js
import { chromium } from '/home/deck/.local/share/screensaver-testing/node_modules/playwright-core/index.mjs';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = await browser.contexts()[0].newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('response', response => {
  if (response.status() >= 400) console.log(response.status(), response.url());
});
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:8765/little-space-station/index.html?preview=1');
await page.locator('.preview-tools').waitFor();
await page.bringToFront();
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/little-space-station-check.png' });
console.log({ errors });
await page.close();
await browser.close(); // Disconnect this CDP client from the existing browser.
```

- For visual changes, inspect rendered screenshots and exercise the affected preview controls. Sample multiple stages for animation changes; one still does not establish natural motion.
- Keep the test page visible: the screensaver pauses updates when `document.hidden`.
- For framing or resolution changes, compare 1280×800, 1920×1080, and 2560×1600. Also load the URL without `?preview=1` to check the passive production path.
- Record runtime errors and failed resource URLs. The server currently returns 404 for `/favicon.ico`; distinguish this from missing application modules or assets.
- Save screenshots under `/tmp` or a dedicated test-artifact directory. If the image viewer hits the known sandbox error, an approved terminal read can return screenshot base64 for image inspection.
- Close only test tabs/processes you created. Reuse existing test services when practical and report any browser/server left running.
- Preview may offer a user-operated fullscreen toggle; its API calls and listeners must remain guarded by the preview flag. Production must not access fullscreen APIs.
- Report what was actually executed and visually inspected. Desktop Chrome does not establish behavior in Steam's Gaming Mode screensaver host: dismissal, storage origin, compatibility, and performance still need host-specific checks.
