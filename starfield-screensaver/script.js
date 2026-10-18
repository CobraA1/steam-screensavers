const DEFAULT_CONFIG = Object.freeze({
  maxPixelRatio: 2,
  starCount: 760,
  dustCount: 42,
  speed: 0.8,
  shootingStars: true,
  shootingStarDelayMinMs: 3500,
  shootingStarDelayMaxMs: 10000,
  horizontalDrift: 0.045,
  verticalDrift: 0.035,
  reducedMotionScale: 0.25,
});

const CONFIG = Object.freeze({ ...DEFAULT_CONFIG, ...(window.STARFIELD_CONFIG || {}) });
const MAX_STEP_MS = 100;
const canvas = document.getElementById("starfield");
const context = canvas.getContext("2d", { alpha: false });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionScale = reducedMotion ? CONFIG.reducedMotionScale : 1;

const state = {
  width: 0,
  height: 0,
  pixelRatio: 1,
  lastFrame: undefined,
  elapsed: 0,
  centerX: 0,
  centerY: 0,
  background: null,
  hazeSprite: null,
  nextShooter: 0,
  stars: [],
  dust: [],
  shooters: [],
};

function RandomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function CreateStar(initial = false) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.pow(Math.random(), 0.55) * Math.max(state.width, state.height) * 0.86;
  const z = initial ? Math.max(0.02, Math.random()) : 1;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z,
    previousZ: z,
    size: RandomBetween(0.25, 1.4),
    brightness: RandomBetween(0.35, 1),
    hue: Math.random() < 0.14 ? (Math.random() < 0.5 ? 215 : 32) : 230,
  };
}

function ResetStar(star) {
  Object.assign(star, CreateStar(false));
}

function CreateDust() {
  return {
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    size: RandomBetween(28, 113),
    opacity: RandomBetween(0.2, 0.7),
    drift: RandomBetween(4, 12),
  };
}

function CreateHazeSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = 128;
  sprite.height = 128;
  const spriteContext = sprite.getContext("2d");
  const gradient = spriteContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(135, 157, 255, 0.12)");
  gradient.addColorStop(1, "rgba(80, 100, 210, 0)");
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, 128, 128);
  return sprite;
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

  state.centerX = state.width / 2;
  state.centerY = state.height / 2;
  state.background = context.createRadialGradient(
    state.width / 2,
    state.height * 0.46,
    0,
    state.width / 2,
    state.height * 0.46,
    Math.max(state.width, state.height) * 0.76,
  );
  state.background.addColorStop(0, "#0a0d1d");
  state.background.addColorStop(0.45, "#050713");
  state.background.addColorStop(1, "#020308");

  state.stars = Array.from({ length: CONFIG.starCount }, () => CreateStar(true));
  state.dust = Array.from({ length: CONFIG.dustCount }, CreateDust);
  state.shooters.length = 0;
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

function DrawBackground(stepSeconds) {
  context.fillStyle = state.background;
  context.fillRect(0, 0, state.width, state.height);

  for (const mote of state.dust) {
    mote.x += mote.drift * stepSeconds * CONFIG.speed * motionScale;
    if (mote.x - mote.size > state.width) mote.x = -mote.size;
    context.globalAlpha = mote.opacity;
    context.drawImage(
      state.hazeSprite,
      mote.x - mote.size,
      mote.y - mote.size,
      mote.size * 2,
      mote.size * 2,
    );
  }
  context.globalAlpha = 1;
}

function DrawStars(stepMs) {
  state.centerX = state.width * (
    0.5 + Math.sin(state.elapsed * 0.071) * CONFIG.horizontalDrift * motionScale
  );
  state.centerY = state.height * (
    0.5 + Math.cos(state.elapsed * 0.053) * CONFIG.verticalDrift * motionScale
  );
  const travel = (0.00024 + CONFIG.speed * 0.00145) * stepMs * motionScale;

  for (const star of state.stars) {
    star.previousZ = star.z;
    star.z -= travel;
    if (star.z < 0.018) ResetStar(star);

    const sx = state.centerX + star.x / star.z;
    const sy = state.centerY + star.y / star.z;
    const px = state.centerX + star.x / star.previousZ;
    const py = state.centerY + star.y / star.previousZ;

    if (sx < -100 || sx > state.width + 100 || sy < -100 || sy > state.height + 100) {
      ResetStar(star);
      continue;
    }

    const proximity = 1 - star.z;
    const alpha = Math.min(1, star.brightness * (0.25 + proximity * 0.95));
    const radius = Math.min(3.2, star.size * (0.45 + proximity * 1.8));
    const saturation = star.hue === 230 ? 22 : 55;
    const lightness = star.hue === 32 ? 82 : 88;

    context.beginPath();
    context.moveTo(px, py);
    context.lineTo(sx, sy);
    context.lineWidth = Math.max(0.35, radius * 0.62);
    context.strokeStyle = `hsla(${star.hue}, ${saturation}%, ${lightness}%, ${alpha * Math.min(0.85, CONFIG.speed * 0.36)})`;
    context.stroke();

    context.beginPath();
    context.arc(sx, sy, radius, 0, Math.PI * 2);
    context.fillStyle = `hsla(${star.hue}, ${saturation}%, 94%, ${alpha})`;
    context.fill();
  }
}

function CreateShootingStar() {
  state.shooters.push({
    x: state.width * RandomBetween(0.25, 0.9),
    y: state.height * RandomBetween(0.03, 0.35),
    length: RandomBetween(75, 195),
    speed: RandomBetween(700, 1400),
    life: 1,
  });
}

function DrawShooters(stepMs) {
  if (!CONFIG.shootingStars || reducedMotion) return;

  state.nextShooter -= stepMs;
  if (state.nextShooter <= 0) {
    CreateShootingStar();
    state.nextShooter = RandomBetween(
      CONFIG.shootingStarDelayMinMs,
      CONFIG.shootingStarDelayMaxMs,
    );
  }

  const stepSeconds = stepMs / 1000;
  for (let i = state.shooters.length - 1; i >= 0; i -= 1) {
    const meteor = state.shooters[i];
    meteor.x -= meteor.speed * stepSeconds;
    meteor.y += meteor.speed * 0.48 * stepSeconds;
    meteor.life -= stepSeconds * 1.2;

    const gradient = context.createLinearGradient(
      meteor.x,
      meteor.y,
      meteor.x + meteor.length,
      meteor.y - meteor.length * 0.48,
    );
    gradient.addColorStop(0, `rgba(235, 241, 255, ${Math.max(0, meteor.life)})`);
    gradient.addColorStop(1, "rgba(170, 190, 255, 0)");
    context.beginPath();
    context.moveTo(meteor.x, meteor.y);
    context.lineTo(meteor.x + meteor.length, meteor.y - meteor.length * 0.48);
    context.lineWidth = 1.4;
    context.strokeStyle = gradient;
    context.stroke();

    if (meteor.life <= 0) state.shooters.splice(i, 1);
  }
}

function RunFrame(currentTime) {
  requestAnimationFrame(RunFrame);
  CheckResolution();

  if (state.lastFrame === undefined) state.lastFrame = currentTime;
  const elapsedMs = currentTime - state.lastFrame;
  state.lastFrame = currentTime;
  if (document.hidden) return;

  const stepMs = Math.min(elapsedMs, MAX_STEP_MS);
  const stepSeconds = stepMs / 1000;
  state.elapsed += stepSeconds;
  DrawBackground(stepSeconds);
  DrawStars(stepMs);
  DrawShooters(stepMs);
}

function Init() {
  state.hazeSprite = CreateHazeSprite();
  state.nextShooter = RandomBetween(
    CONFIG.shootingStarDelayMinMs,
    CONFIG.shootingStarDelayMaxMs,
  );
  window.addEventListener("resize", ResolutionChanged);
  ResolutionChanged();
  requestAnimationFrame(RunFrame);
}

Init();
