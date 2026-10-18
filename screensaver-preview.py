#!/usr/bin/env python3
"""Local desktop previewer for the Steam Deck screensaver folder.

Run from this directory:
    python3 screensaver-preview.py
"""

from __future__ import annotations

import argparse
import html
import re
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse


ROOT = Path(__file__).resolve().parent
TITLE_PATTERN = re.compile(r"<title>\s*(.*?)\s*</title>", re.IGNORECASE | re.DOTALL)
PRESETS = ((1280, 800, "Steam Deck"), (1920, 1080, "1080p"), (2560, 1600, "Deck native ×2"))
PREVIEW_QUERY = "preview=1"


def screensavers() -> list[dict[str, str]]:
    """Find folder-local screensavers without treating the previewer as one."""
    found: list[dict[str, str]] = []
    for folder in sorted(ROOT.iterdir(), key=lambda path: path.name.lower()):
        index = folder / "index.html"
        if not folder.is_dir() or not index.is_file():
            continue
        source = index.read_text(encoding="utf-8", errors="replace")[:16384]
        match = TITLE_PATTERN.search(source)
        title = re.sub(r"\s+", " ", match.group(1)).strip() if match else folder.name
        found.append(
            {
                "folder": folder.name,
                "title": title,
                "reference": "true" if folder.name == "bouncinglogo" else "false",
                "config": "true" if (folder / "config.js").is_file() else "false",
            }
        )
    return found


def html_page(title: str, body: str, script: str = "") -> bytes:
    document = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>{html.escape(title)}</title>
    <style>
      :root {{ color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }}
      * {{ box-sizing: border-box; }}
      body {{ min-height: 100vh; margin: 0; color: #e9f2f3; background: #081014; }}
      a {{ color: inherit; }}
      .masthead {{ padding: clamp(2rem, 7vw, 6rem) clamp(1.5rem, 6vw, 7rem) 2rem; background: radial-gradient(circle at 74% 10%, #17444b 0, transparent 31%), linear-gradient(145deg, #0c1c22, #071014 64%); border-bottom: 1px solid #23363b; }}
      .eyebrow {{ margin: 0 0 .8rem; color: #82d8d3; font: 600 .68rem/1 ui-monospace, monospace; letter-spacing: .17em; text-transform: uppercase; }}
      h1 {{ max-width: 58rem; margin: 0; font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 300; letter-spacing: -.055em; line-height: .95; }}
      .lede {{ max-width: 43rem; margin: 1.35rem 0 0; color: #b5c7ca; font-size: 1rem; line-height: 1.65; }}
      .content {{ max-width: 1400px; margin: 0 auto; padding: 2rem clamp(1.5rem, 6vw, 7rem) 4rem; }}
      .notice {{ margin-bottom: 1.5rem; padding: 1rem 1.1rem; border: 1px solid #294147; border-radius: .7rem; color: #9eb5b8; background: #0b171b; font-size: .85rem; line-height: 1.5; }}
      .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }}
      .card {{ display: flex; min-height: 180px; flex-direction: column; padding: 1.3rem; border: 1px solid #273b40; border-radius: .9rem; background: linear-gradient(145deg, rgba(18, 34, 39, .9), rgba(10, 20, 24, .9)); box-shadow: 0 12px 30px rgba(0, 0, 0, .13); }}
      .card__tag {{ color: #79cfc7; font: 600 .6rem/1 ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; }}
      .card h2 {{ margin: .8rem 0 .5rem; font-size: 1.35rem; font-weight: 500; letter-spacing: -.03em; }}
      .card p {{ margin: 0; color: #91a8ac; font-size: .82rem; line-height: 1.5; }}
      .actions {{ display: flex; flex-wrap: wrap; gap: .55rem; margin-top: auto; padding-top: 1.3rem; }}
      .button {{ display: inline-flex; align-items: center; min-height: 2.35rem; padding: .45rem .75rem; border: 1px solid #3f6268; border-radius: .5rem; color: #dff5f3; background: #12363a; font-size: .76rem; font-weight: 600; text-decoration: none; }}
      .button--secondary {{ border-color: #334a50; color: #b9cccf; background: transparent; }}
      .preview-header {{ display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; min-height: 4rem; padding: .8rem 1rem; border-bottom: 1px solid #263b40; background: #0c171b; }}
      .preview-header strong {{ font-weight: 600; }}
      .preview-header small {{ margin-left: .65rem; color: #93aaad; font-family: ui-monospace, monospace; }}
      .preset-list {{ display: flex; flex-wrap: wrap; gap: .5rem; }}
      .preset-list a, .preset-list button {{ padding: .45rem .65rem; border: 1px solid #304a50; border-radius: .4rem; color: #a8c0c3; background: transparent; font: .68rem ui-monospace, monospace; text-decoration: none; cursor: pointer; }}
      .preset-list button:hover {{ border-color: #70c7bf; color: #dff5f3; }}
      .preview-area {{ display: grid; min-height: calc(100vh - 4rem); place-items: center; overflow: hidden; padding: 1.5rem; background: repeating-linear-gradient(45deg, #0a1418, #0a1418 10px, #0c171b 10px, #0c171b 20px); }}
      .frame-wrap {{ width: var(--frame-width); height: var(--frame-height); transform: scale(var(--frame-scale)); transform-origin: center; box-shadow: 0 25px 70px rgba(0, 0, 0, .62); }}
      iframe {{ display: block; width: 100%; height: 100%; border: 0; background: #000; }}
      .error {{ max-width: 40rem; padding: 2rem; border: 1px solid #6d3838; border-radius: .8rem; color: #f3b7b1; background: #291617; line-height: 1.6; }}
    </style>
  </head>
  <body>{body}<script>{script}</script></body>
</html>"""
    return document.encode("utf-8")


def dashboard() -> bytes:
    cards: list[str] = []
    for saver in screensavers():
        folder = quote(saver["folder"])
        tag = "Valve reference" if saver["reference"] == "true" else "Screensaver"
        config = "Config file available" if saver["config"] == "true" else "No config.js detected"
        cards.append(
            f"""<article class="card">
  <span class="card__tag">{tag}</span>
  <h2>{html.escape(saver["title"])}</h2>
  <p>{html.escape(config)}</p>
  <div class="actions">
    <a class="button" href="/__preview__?saver={folder}&amp;width=1280&amp;height=800">Deck preview</a>
    <a class="button button--secondary" href="/{folder}/?{PREVIEW_QUERY}" target="_blank" rel="noopener">Open tab</a>
  </div>
</article>"""
        )

    body = f"""<header class="masthead">
  <p class="eyebrow">Local desktop utility</p>
  <h1>Screensaver Preview</h1>
  <p class="lede">Preview every folder-local screensaver through a localhost server. This keeps Three.js modules and browser storage available while giving each preview an exact Steam Deck-sized viewport.</p>
</header>
<main class="content">
  <p class="notice">The framed preview uses an exact 1280 × 800 iframe. “Open tab” uses the browser window size. Localhost is ideal for visual and resolution testing, but its browser-storage origin is not the same as Steam&apos;s screensaver host.</p>
  <section class="grid">{"".join(cards) or "<p>No screensaver folders with index.html were found.</p>"}</section>
</main>"""
    return html_page("Screensaver Preview", body)


def integer_parameter(query: dict[str, list[str]], name: str, default: int) -> int:
    try:
        return max(240, min(3840, int(query.get(name, [str(default)])[0])))
    except ValueError:
        return default


def preview(query: dict[str, list[str]]) -> bytes:
    saver_name = query.get("saver", [""])[0]
    known = {saver["folder"]: saver for saver in screensavers()}
    saver = known.get(saver_name)
    if saver is None:
        return html_page(
            "Preview unavailable",
            '<main class="preview-area"><p class="error">That screensaver folder was not found. Return to <a href="/">the preview dashboard</a>.</p></main>',
        )

    width = integer_parameter(query, "width", 1280)
    height = integer_parameter(query, "height", 800)
    saver_url = quote(saver_name)
    preset_links = "".join(
        f'<button class="preset-button" type="button" data-width="{preset_width}" data-height="{preset_height}">{label} · {preset_width}×{preset_height}</button>'
        for preset_width, preset_height, label in PRESETS
    )
    body = f"""<header class="preview-header">
  <div><a href="/">← All screensavers</a><small>Previewing</small> <strong>{html.escape(saver["title"])}</strong><small id="frameSize">{width}×{height}</small></div>
  <nav class="preset-list" aria-label="Preview size presets">{preset_links}<button id="browserSize" type="button">Use browser size</button></nav>
</header>
<main class="preview-area" id="previewArea">
  <div class="frame-wrap" id="frameWrap" style="--frame-width: {width}px; --frame-height: {height}px; --frame-scale: 1">
    <iframe id="previewFrame" src="/{saver_url}/?{PREVIEW_QUERY}" title="{html.escape(saver["title"])} preview"></iframe>
  </div>
</main>"""
    script = f"""const frame = document.getElementById('frameWrap');
const area = document.getElementById('previewArea');
const frameSize = document.getElementById('frameSize');
const browserSize = document.getElementById('browserSize');
let width = {width};
let height = {height};
let followBrowserSize = false;
function setFrameSize(nextWidth, nextHeight) {{
  width = Math.max(240, Math.round(nextWidth));
  height = Math.max(240, Math.round(nextHeight));
  frame.style.setProperty('--frame-width', width + 'px');
  frame.style.setProperty('--frame-height', height + 'px');
  frameSize.textContent = width + '×' + height + (followBrowserSize ? ' · browser' : '');
}}
function fitPreview() {{
  if (followBrowserSize) setFrameSize(window.innerWidth, window.innerHeight);
  const scale = Math.min(1, (area.clientWidth - 32) / width, (area.clientHeight - 32) / height);
  frame.style.setProperty('--frame-scale', Math.max(0.1, scale));
}}
browserSize.addEventListener('click', () => {{
  followBrowserSize = true;
  fitPreview();
}});
document.querySelectorAll('.preset-button').forEach((button) => {{
  button.addEventListener('click', () => {{
    followBrowserSize = false;
    setFrameSize(Number(button.dataset.width), Number(button.dataset.height));
    fitPreview();
  }});
}});
window.addEventListener('resize', fitPreview);
fitPreview();"""
    return html_page(f"Preview · {saver['title']}", body, script)


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.respond_html(dashboard())
            return
        if parsed.path == "/__preview__":
            self.respond_html(preview(parse_qs(parsed.query)))
            return
        self.path = parsed.path
        super().do_GET()

    def respond_html(self, content: bytes) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format: str, *args) -> None:
        sys.stdout.write("[preview] " + format % args + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Preview Steam Deck screensavers in a desktop browser.")
    parser.add_argument("--port", type=int, default=0, help="Loopback port; 0 chooses an available port.")
    parser.add_argument("--no-open", action="store_true", help="Do not open the default browser automatically.")
    arguments = parser.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", arguments.port), PreviewHandler)
    address, port = server.server_address
    url = f"http://{address}:{port}/"
    print(f"Screensaver preview running at {url}")
    print("Press Ctrl+C in this terminal to stop it.")

    if not arguments.no_open:
        threading.Timer(0.2, webbrowser.open, args=(url, 2)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nPreview server stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
