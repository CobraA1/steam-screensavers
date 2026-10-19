import * as THREE from "../../vendor/three.module.js";
import {
  MODES, SHAPE_OPTIONS, Clamp, FormatBytes, EstimateTargetBytes,
  EstimateGeometryBytes, WindowFps, MakeLayout,
} from "./metrics.js";

// This opt-in diagnostic has its own DOM and animation loop. No production
// screensaver file imports it; the station remains completely passive.
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const canvas = $("canvas");
const labels = $("labels");
const message = $("message");
const display = $("display");
const shapesSelect = $("shapes");
const alphaSlider = $("opacity");
const resolution = $("resolution");
const animateInput = $("animate");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
} catch (error) {
  message.textContent = `WebGL could not initialize: ${error.message}`;
  throw error;
}
renderer.autoClear = false;
renderer.info.autoReset = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);

const colors = [0x7dd9ca, 0xefb87b, 0x9cb6e9, 0xffdb94, 0xeaa9be, 0x96c2ad];
const geometries = [
  new THREE.IcosahedronGeometry(0.62, 1),
  new THREE.BoxGeometry(0.96, 0.96, 0.96),
  new THREE.TorusGeometry(0.55, 0.2, 7, 15),
  new THREE.ConeGeometry(0.67, 1.25, 7),
  new THREE.DodecahedronGeometry(0.63, 0),
];
const back = new THREE.Scene();
const grid = new THREE.GridHelper(7.4, 12, 0x638498, 0x33576a);
grid.rotation.x = Math.PI / 2;
grid.position.z = -2.7;
back.add(grid);
const accent = new THREE.Mesh(
  new THREE.TorusGeometry(2.7, 0.015, 4, 80),
  new THREE.MeshBasicMaterial({ color: 0x496c7a })
);
accent.position.z = -2.6;
back.add(accent);

function makeActors(mode) {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-3, 4, 6);
  scene.add(sun);
  const objects = [];
  for (let index = 0; index < 96; index += 1) {
    // Deterministic layout: matching indices use identical geometry/transforms
    // and colors in all three modes, including at every animation timestamp.
    const seed = (index * 214013 + 2531011) >>> 0;
    const random = (shift) => ((Math.imul(seed ^ (seed >>> shift), 1664525) + 1013904223) >>> 0) / 4294967296;
    const geometry = geometries[index % geometries.length];
    const mat = new THREE.MeshStandardMaterial({
      color: colors[index % colors.length], flatShading: true,
      roughness: 0.68, metalness: 0.02,
      // Hash uses alpha test via stochastic discard and writes depth; it should
      // not also enable conventional transparent sorting/blending.
      transparent: mode === "blend", alphaHash: mode === "hash",
      depthWrite: mode !== "blend", opacity: mode === "offscreen" ? 1 : 0.55,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    const base = {
      x: (random(5) - 0.5) * 2.3,
      y: (random(9) - 0.5) * 1.9,
      z: (random(13) - 0.5) * 1.2,
      phase: random(2) * Math.PI * 2,
      speed: 0.3 + random(17) * 0.55,
      scale: 0.73 + random(19) * 0.52,
    };
    mesh.scale.setScalar(base.scale);
    scene.add(mesh);
    objects.push({ mesh, base });
  }
  return { scene, objects };
}
const sets = Object.fromEntries(MODES.map(mode => [mode, makeActors(mode)]));
const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 60);
camera.position.set(0, 0, 9.3);
camera.lookAt(0, 0, 0);
const fullscreen = new THREE.Scene();
const fullscreenQuadMaterial = new THREE.MeshBasicMaterial({
  transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
  opacity: 0.55,
});
const fullscreenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fullscreenQuadMaterial);
fullscreen.add(fullscreenQuad);
const fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let offscreen = null;
let currentSize = { width: 0, height: 0, ratio: 0 };
let layout;
let count = 12;
let alpha = 0.55;
let motion = 0;
let lastFrame = performance.now();
let renderTimeMs = 0;
let frameHistory = [];
let lastMetrics = 0;
let running = true;

const modeLabels = {
  blend: ["Normal alpha", "Individual surfaces blend; opacity builds up"],
  hash: ["Alpha hashing", "Dithered coverage with depth writing"],
  offscreen: ["Offscreen composite", "Opaque depth-tested group, then one fade"],
};
function visibleModes() { return display.value === "compare" ? MODES : [display.value]; }

function updateLabels() {
  const modes = visibleModes();
  labels.style.gridTemplateColumns = window.innerWidth >= 900 || modes.length === 1 ? `repeat(${modes.length}, 1fr)` : "1fr";
  labels.style.gridTemplateRows = window.innerWidth >= 900 || modes.length === 1 ? "1fr" : `repeat(${modes.length}, 1fr)`;
  labels.replaceChildren(...modes.map(mode => {
    const el = document.createElement("article");
    const h = document.createElement("h2"); h.textContent = modeLabels[mode][0];
    const p = document.createElement("p"); p.textContent = modeLabels[mode][1];
    el.append(h, p);
    return el;
  }));
  // Portrait layout needs three taller, vertically stacked panes.
  stage.classList.toggle("single", modes.length === 1);
  stage.classList.toggle("vertical", window.innerWidth < 900 && modes.length > 1);
}

function ensureTarget(width, height) {
  if (offscreen && offscreen.width === width && offscreen.height === height) return;
  if (offscreen) offscreen.dispose();
  offscreen = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
    samples: 0,
  });
  offscreen.texture.name = "transparency-lab-opaque-group";
  fullscreenQuadMaterial.map = offscreen.texture;
  fullscreenQuadMaterial.needsUpdate = true;
}

function resize() {
  const width = Math.max(1, Math.round(stage.clientWidth));
  const height = Math.max(1, Math.round(stage.clientHeight));
  const ratio = Math.min(1.5, window.devicePixelRatio || 1) * Number(resolution.value);
  if (width === currentSize.width && height === currentSize.height && ratio === currentSize.ratio) return;
  currentSize = { width, height, ratio };
  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  layout = MakeLayout(width, height, visibleModes().length, ratio);
  updateLabels();
}

function drawActors(time) {
  for (const mode of MODES) {
    for (let i = 0; i < sets[mode].objects.length; i += 1) {
      const {mesh, base} = sets[mode].objects[i];
      mesh.visible = i < count;
      mesh.position.set(
        base.x + Math.sin(time * base.speed + base.phase) * 0.19,
        base.y + Math.cos(time * base.speed * 0.67 + base.phase) * 0.16,
        base.z + Math.sin(time * 0.19 + base.phase) * 0.07,
      );
      mesh.rotation.set(time * 0.15 + base.phase * 0.2, time * base.speed * 0.48 + base.phase, time * 0.11);
    }
  }
}

function renderPane(mode, pane) {
  camera.aspect = pane.w / pane.h;
  camera.updateProjectionMatrix();
  // An offscreen render target has its own viewport, clear alpha, and depth.
  // Do this FIRST so the final compositing pass does not mix viewport states.
  if (mode === "offscreen") {
    ensureTarget(pane.physicalWidth, pane.physicalHeight);
    renderer.setScissorTest(false);
    renderer.setRenderTarget(offscreen);
    renderer.setViewport(0, 0, offscreen.width, offscreen.height);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(sets.offscreen.scene, camera);
  }
  renderer.setRenderTarget(null);
  renderer.setScissorTest(true);
  // Three.js converts these CSS-pixel viewports to backing-pixel coordinates.
  const bottom = currentSize.height - (pane.y + pane.h);
  renderer.setViewport(pane.x, bottom, pane.w, pane.h);
  renderer.setScissor(pane.x, bottom, pane.w, pane.h);
  renderer.setClearColor(0x0c2131, 1);
  renderer.clear(true, true, true);
  renderer.render(back, camera);
  if (mode === "offscreen") {
    fullscreenQuadMaterial.opacity = alpha;
    renderer.render(fullscreen, fullscreenCamera);
  } else {
    renderer.render(sets[mode].scene, camera);
  }
}

function updateStats(now) {
  if (now - lastMetrics < 550) return;
  const fps = WindowFps(frameHistory);
  $("fps").textContent = fps === null ? "—" : `${fps.toFixed(1)} FPS`;
  $("frame-time").textContent = fps === null ? "—" : `${(1000 / fps).toFixed(1)} ms`;
  $("render-time").textContent = `${renderTimeMs.toFixed(1)} ms`;
  $("draws").textContent = `${renderer.info.render.calls} / ${renderer.info.render.triangles.toLocaleString()}`;
  const heap = performance.memory?.usedJSHeapSize;
  $("heap").textContent = Number.isFinite(heap) ? FormatBytes(heap) : "N/A";
  $("heap-note").textContent = Number.isFinite(heap) ? "Chromium JS heap only; not total RAM" : "Browser does not expose JS heap usage";
  const targetBytes = offscreen ? EstimateTargetBytes(offscreen.width, offscreen.height) : 0;
  const gpu = EstimateGeometryBytes([...geometries, grid.geometry, accent.geometry, fullscreenQuad.geometry]);
  $("gpu").textContent = FormatBytes(gpu + targetBytes);
  $("objects").textContent = `${renderer.info.memory.geometries} geo / ${renderer.info.memory.textures} tex`;
  lastMetrics = now;
}

function frame(now) {
  if (!running) return;
  const dt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (!document.hidden && animateInput.checked) motion += dt;
  resize();
  if (layout) {
    drawActors(motion);
    renderer.info.reset();
    const start = performance.now();
    visibleModes().forEach((mode, i) => renderPane(mode, layout.panes[i]));
    renderer.setScissorTest(false);
    renderTimeMs = performance.now() - start;
    if (!document.hidden) {
      frameHistory.push(now);
      while (frameHistory.length && now - frameHistory[0] > 1200) frameHistory.shift();
      updateStats(now);
    }
  }
  requestAnimationFrame(frame);
}
function applyConfig() {
  count = SHAPE_OPTIONS.includes(Number(shapesSelect.value)) ? Number(shapesSelect.value) : 12;
  alpha = Clamp(Number(alphaSlider.value) / 100, 0, 1);
  $("opacity-value").textContent = `${Math.round(alpha * 100)}%`;
  for (const mode of ["blend", "hash"]) {
    for (const {mesh} of sets[mode].objects) mesh.material.opacity = alpha;
  }
  // Set alpha only on the compositing quad for offscreen mode.
  fullscreenQuadMaterial.opacity = alpha;
  currentSize.width = -1; // recompute layout when mode/quality changes
  frameHistory = [];
}
for (const control of [display, shapesSelect, resolution, alphaSlider]) control.addEventListener("input", applyConfig);
$("reset").addEventListener("click", () => {
  display.value = "compare"; shapesSelect.value = "12"; alphaSlider.value = "55";
  resolution.value = "1"; animateInput.checked = true; motion = 0; applyConfig();
});
window.addEventListener("resize", () => { currentSize.width = -1; });
window.addEventListener("pagehide", () => {
  running = false;
  offscreen?.dispose();
  renderer.dispose();
});
applyConfig();
requestAnimationFrame(frame);
