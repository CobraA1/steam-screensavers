const DEFAULT_CONFIG = Object.freeze({
  maxPixelRatio: 2,
  particleCount: 72,
  rotationSpeed: 0.09,
  floatSpeed: 0.62,
  floatAmount: 0.014,
  baseTilt: -0.13,
  tiltAmount: 0.035,
  objectScale: 0.19,
  reducedMotionScale: 0.3,
  showFloorGrid: true,
});

const CONFIG = Object.freeze({ ...DEFAULT_CONFIG, ...(window.MONOLITH_CONFIG || {}) });
const MAX_STEP_MS = 100;
const canvas = document.getElementById("scene");
const context = canvas.getContext("2d", { alpha: false });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionScale = reducedMotion ? CONFIG.reducedMotionScale : 1;

const BASE_VERTICES = [
  [-0.72, -1.55, -0.48], [0.72, -1.55, -0.48],
  [0.72, 1.55, -0.48], [-0.72, 1.55, -0.48],
  [-0.72, -1.55, 0.48], [0.72, -1.55, 0.48],
  [0.72, 1.55, 0.48], [-0.72, 1.55, 0.48],
];

const FACES = [
  [0, 1, 5, 4], [3, 7, 6, 2], [0, 3, 2, 1],
  [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5],
];

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const state = {
  width: 0,
  height: 0,
  pixelRatio: 1,
  elapsed: 0,
  lastFrame: undefined,
  background: null,
  floor: null,
  vignette: null,
  particles: [],
};

function CreateParticle() {
  return {
    x: (Math.random() - 0.5) * 11,
    y: (Math.random() - 0.5) * 7,
    z: (Math.random() - 0.5) * 7,
    size: 0.35 + Math.random() * 1.15,
    drift: 0.04 + Math.random() * 0.09,
    phase: Math.random() * Math.PI * 2,
  };
}

function ResolutionChanged() {
  state.width = Math.max(1, window.innerWidth);
  state.height = Math.max(1, window.innerHeight);
  state.pixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);

  canvas.width = Math.round(state.width * state.pixelRatio);
  canvas.height = Math.round(state.height * state.pixelRatio);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  context.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);

  state.background = context.createRadialGradient(
    state.width * 0.5,
    state.height * 0.44,
    0,
    state.width * 0.5,
    state.height * 0.44,
    Math.max(state.width, state.height) * 0.72,
  );
  state.background.addColorStop(0, "#142027");
  state.background.addColorStop(0.34, "#0a1015");
  state.background.addColorStop(1, "#030506");

  const horizon = state.height * 0.69;
  state.floor = context.createLinearGradient(0, horizon, 0, state.height);
  state.floor.addColorStop(0, "rgba(105, 149, 157, 0.02)");
  state.floor.addColorStop(1, "rgba(86, 121, 128, 0.08)");

  state.vignette = context.createRadialGradient(
    state.width / 2,
    state.height / 2,
    Math.min(state.width, state.height) * 0.22,
    state.width / 2,
    state.height / 2,
    Math.max(state.width, state.height) * 0.74,
  );
  state.vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  state.vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
}

function CheckResolution() {
  const nextRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
  if (
    state.width !== window.innerWidth ||
    state.height !== window.innerHeight ||
    state.pixelRatio !== nextRatio
  ) {
    ResolutionChanged();
  }
}

function Rotate(vertex, angleX, angleY, angleZ) {
  let [x, y, z] = vertex;
  let cosine = Math.cos(angleX);
  let sine = Math.sin(angleX);
  [y, z] = [y * cosine - z * sine, y * sine + z * cosine];
  cosine = Math.cos(angleY);
  sine = Math.sin(angleY);
  [x, z] = [x * cosine + z * sine, -x * sine + z * cosine];
  cosine = Math.cos(angleZ);
  sine = Math.sin(angleZ);
  [x, y] = [x * cosine - y * sine, x * sine + y * cosine];
  return [x, y, z];
}

function Project(vertex, centerY = state.height * 0.46) {
  const [x, y, z] = vertex;
  const camera = 6.2;
  const perspective = camera / (camera - z);
  const scale = Math.min(state.width, state.height) * CONFIG.objectScale;
  return {
    x: state.width / 2 + x * scale * perspective,
    y: centerY + y * scale * perspective,
    z,
    perspective,
  };
}

function FaceNormal(a, b, c) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

function DrawBackdrop() {
  context.fillStyle = state.background;
  context.fillRect(0, 0, state.width, state.height);

  const horizon = state.height * 0.69;
  context.fillStyle = state.floor;
  context.fillRect(0, horizon, state.width, state.height - horizon);
  if (!CONFIG.showFloorGrid) return;

  context.strokeStyle = "rgba(135, 177, 183, 0.055)";
  context.lineWidth = 1;
  for (let i = -10; i <= 10; i += 1) {
    context.beginPath();
    context.moveTo(state.width / 2, horizon);
    context.lineTo(state.width / 2 + i * state.width * 0.12, state.height);
    context.stroke();
  }
  for (let i = 1; i <= 12; i += 1) {
    const progress = i / 12;
    const y = horizon + Math.pow(progress, 2.25) * (state.height - horizon);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(state.width, y);
    context.stroke();
  }
}

function DrawParticles(stepSeconds) {
  for (const particle of state.particles) {
    particle.y -= particle.drift * stepSeconds * motionScale;
    if (particle.y < -3.8) particle.y = 3.8;
    const point = Project([
      particle.x + Math.sin(state.elapsed * 0.18 + particle.phase) * 0.12,
      particle.y,
      particle.z,
    ]);
    if (point.x < 0 || point.x > state.width || point.y < 0 || point.y > state.height) continue;
    context.beginPath();
    context.arc(point.x, point.y, particle.size * point.perspective, 0, Math.PI * 2);
    context.fillStyle = `rgba(190, 220, 224, ${0.08 + point.perspective * 0.12})`;
    context.fill();
  }
}

function DrawShadow(floatOffset) {
  const x = state.width / 2;
  const y = state.height * 0.705 - floatOffset * 0.12;
  const radius = Math.min(state.width, state.height) * 0.17;
  const shadow = context.createRadialGradient(x, y, 0, x, y, radius);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.58)");
  shadow.addColorStop(0.42, "rgba(15, 34, 37, 0.28)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.beginPath();
  context.ellipse(x, y, radius, radius * 0.22, 0, 0, Math.PI * 2);
  context.fillStyle = shadow;
  context.fill();
}

function DrawMonolith() {
  const angleX = CONFIG.baseTilt + Math.sin(state.elapsed * 0.21) * CONFIG.tiltAmount * motionScale;
  const angleY = state.elapsed * CONFIG.rotationSpeed * motionScale;
  const angleZ = Math.sin(state.elapsed * 0.14) * CONFIG.tiltAmount * motionScale;
  const floatOffset = Math.sin(state.elapsed * CONFIG.floatSpeed) *
    Math.min(state.width, state.height) * CONFIG.floatAmount * motionScale;
  const transformed = BASE_VERTICES.map((vertex) => Rotate(vertex, angleX, angleY, angleZ));
  const projected = transformed.map((vertex) => Project(vertex, state.height * 0.45 + floatOffset));

  DrawShadow(floatOffset);

  const orderedFaces = FACES
    .map((face) => ({
      face,
      depth: face.reduce((sum, index) => sum + transformed[index][2], 0) / face.length,
    }))
    .sort((a, b) => a.depth - b.depth);
  const light = [-0.42, -0.68, 0.6];

  for (const { face } of orderedFaces) {
    const normal = FaceNormal(transformed[face[0]], transformed[face[1]], transformed[face[2]]);
    const lightAmount = Math.max(0, normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2]);
    const depth = face.reduce((sum, index) => sum + transformed[index][2], 0) / face.length;
    const brightness = 17 + lightAmount * 25 + depth * 1.5;

    context.beginPath();
    face.forEach((index, position) => {
      const point = projected[index];
      if (position === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fillStyle = `hsla(190, 28%, ${brightness}%, 0.9)`;
    context.fill();
    context.strokeStyle = `rgba(186, 223, 226, ${0.1 + lightAmount * 0.22})`;
    context.lineWidth = 1;
    context.stroke();
  }

  context.strokeStyle = "rgba(207, 241, 239, 0.16)";
  context.lineWidth = 0.7;
  for (const [start, end] of EDGES) {
    context.beginPath();
    context.moveTo(projected[start].x, projected[start].y);
    context.lineTo(projected[end].x, projected[end].y);
    context.stroke();
  }
}

function DrawVignette() {
  context.fillStyle = state.vignette;
  context.fillRect(0, 0, state.width, state.height);
}

function RunFrame(currentTime) {
  requestAnimationFrame(RunFrame);
  CheckResolution();

  if (state.lastFrame === undefined) state.lastFrame = currentTime;
  const elapsedMs = currentTime - state.lastFrame;
  state.lastFrame = currentTime;
  if (document.hidden) return;

  const stepSeconds = Math.min(elapsedMs, MAX_STEP_MS) / 1000;
  state.elapsed += stepSeconds;
  DrawBackdrop();
  DrawParticles(stepSeconds);
  DrawMonolith();
  DrawVignette();
}

function Init() {
  state.particles = Array.from({ length: CONFIG.particleCount }, CreateParticle);
  window.addEventListener("resize", ResolutionChanged);
  ResolutionChanged();
  requestAnimationFrame(RunFrame);
}

Init();
