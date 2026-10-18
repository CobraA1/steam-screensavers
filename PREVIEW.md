# Desktop Screensaver Preview

Run the preview utility from this folder:

```sh
python3 screensaver-preview.py
```

It opens a local dashboard with all folders that contain an `index.html`. Choose **Deck preview** for an exact 1280×800 viewport, or **Open tab** to use the browser window size. Framed previews also provide a **Use browser size** button: it makes the iframe use the current browser viewport dimensions and continues tracking browser resizes until a fixed preset is selected.

The utility serves files through localhost so ECMAScript modules and browser storage work normally. Its storage origin is localhost, not Steam's screensaver host, so use the Deck itself to confirm Steam-specific persistence behavior.

## Detecting preview mode

Both **Deck preview** and **Open tab** launch the screensaver with `?preview=1`. A screensaver can detect the development environment with:

```js
const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
```

Use this flag to guard development-only diagnostics, controls, or input listeners. Keep all such setup inside the conditional so an ordinary Steam launch remains passive:

```js
if (isPreview) {
  EnablePreviewDiagnostics();
}
```

Do not infer preview mode from the hostname or from being inside an iframe; the query parameter is the supported marker.

Options:

```sh
python3 screensaver-preview.py --no-open
python3 screensaver-preview.py --port 8765
```
