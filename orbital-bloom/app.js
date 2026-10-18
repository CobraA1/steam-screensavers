import * as THREE from "./vendor/three.module.js";
import USER_CONFIG from "./config.js";

const DEFAULT_CONFIG = Object.freeze({
  maxPixelRatio: 2,
  particleCount: 900,
  reducedMotionScale: 0.32,
  bloomRotationSpeed: 0.09,
  knotRotationSpeed: 0.06,
  cameraDistance: 8.2,
  cameraDriftX: 0.34,
  cameraDriftY: 0.2,
  fogDensity: 0.052,
  exposure: 1.1,
});

const CONFIG = Object.freeze({ ...DEFAULT_CONFIG, ...USER_CONFIG });
const MAX_STEP_MS = 100;
const canvas = document.getElementById("scene");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionScale = reducedMotion ? CONFIG.reducedMotionScale : 1;

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.exposure;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020306, CONFIG.fogDensity);

const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 60);
camera.position.set(0, 0.25, CONFIG.cameraDistance);

const bloom = new THREE.Group();
scene.add(bloom);

const knotGeometry = new THREE.TorusKnotGeometry(1.52, 0.42, 220, 32, 2, 3);
const knotMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x3faba8,
  emissive: 0x05282b,
  emissiveIntensity: 0.65,
  metalness: 0.58,
  roughness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.16,
});
const knot = new THREE.Mesh(knotGeometry, knotMaterial);
bloom.add(knot);

const glow = new THREE.Mesh(
  knotGeometry,
  new THREE.MeshBasicMaterial({
    color: 0x47d7d1,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.055,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
glow.scale.setScalar(1.075);
bloom.add(glow);

const wire = new THREE.LineSegments(
  new THREE.WireframeGeometry(knotGeometry),
  new THREE.LineBasicMaterial({
    color: 0xc6fffb,
    transparent: true,
    opacity: 0.045,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
bloom.add(wire);

const baseRingMaterial = new THREE.LineBasicMaterial({
  color: 0x96d6d5,
  transparent: true,
  opacity: 0.16,
  blending: THREE.AdditiveBlending,
});
const rings = [];
const orbiters = [];

function CreateOrbit(radius, tilt, rotation, color, speed, offset) {
  const points = [];
  for (let i = 0; i < 160; i += 1) {
    const angle = (i / 160) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }

  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    baseRingMaterial.clone(),
  );
  ring.rotation.set(tilt, 0, rotation);
  bloom.add(ring);
  rings.push(ring);

  const pivot = new THREE.Group();
  pivot.rotation.copy(ring.rotation);
  bloom.add(pivot);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 16),
    new THREE.MeshBasicMaterial({ color }),
  );
  moon.add(new THREE.PointLight(color, 2.2, 4.6, 2));
  pivot.add(moon);
  orbiters.push({ moon, radius, speed, offset });
}

CreateOrbit(2.45, 0.42, 0.18, 0x73fff4, 0.34, 0.2);
CreateOrbit(2.78, 1.07, -0.54, 0x9d8cff, -0.24, 2.3);
CreateOrbit(3.08, 0.78, 1.02, 0xffc592, 0.18, 4.1);

scene.add(new THREE.HemisphereLight(0x8edbd9, 0x090712, 1.35));
const keyLight = new THREE.PointLight(0x7afff2, 38, 16, 2);
keyLight.position.set(-3.5, 3.2, 4.5);
scene.add(keyLight);
const violetLight = new THREE.PointLight(0x8c68ff, 30, 14, 2);
violetLight.position.set(4, -2.2, 2.8);
scene.add(violetLight);

const particleCount = reducedMotion
  ? Math.max(1, Math.round(CONFIG.particleCount * 0.47))
  : CONFIG.particleCount;
const particlePositions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);
const particleColor = new THREE.Color();

for (let i = 0; i < particleCount; i += 1) {
  const radius = 5 + Math.random() * 19;
  const theta = Math.random() * Math.PI * 2;
  const vertical = Math.random() * 2 - 1;
  const spread = Math.sqrt(1 - vertical * vertical);
  particlePositions[i * 3] = radius * spread * Math.cos(theta);
  particlePositions[i * 3 + 1] = radius * vertical * 0.68;
  particlePositions[i * 3 + 2] = radius * spread * Math.sin(theta);

  particleColor.setHSL(0.48 + Math.random() * 0.18, 0.25, 0.58 + Math.random() * 0.28);
  particleColors[i * 3] = particleColor.r;
  particleColors[i * 3 + 1] = particleColor.g;
  particleColors[i * 3 + 2] = particleColor.b;
}

const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
const particles = new THREE.Points(
  particleGeometry,
  new THREE.PointsMaterial({
    size: 0.028,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
scene.add(particles);

const state = {
  width: 0,
  height: 0,
  pixelRatio: 0,
  elapsed: 0,
  lastFrame: undefined,
};

function ResolutionChanged() {
  state.width = Math.max(1, window.innerWidth);
  state.height = Math.max(1, window.innerHeight);
  state.pixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
  camera.aspect = state.width / state.height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(state.pixelRatio);
  renderer.setSize(state.width, state.height, false);
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

function UpdateScene(stepSeconds) {
  state.elapsed += stepSeconds * motionScale;
  bloom.rotation.x = Math.sin(state.elapsed * 0.18) * 0.15;
  bloom.rotation.y = state.elapsed * CONFIG.bloomRotationSpeed;
  bloom.rotation.z = Math.cos(state.elapsed * 0.14) * 0.08;
  knot.rotation.x = state.elapsed * CONFIG.knotRotationSpeed;
  knot.rotation.z = state.elapsed * CONFIG.knotRotationSpeed * 0.75;
  glow.rotation.copy(knot.rotation);
  wire.rotation.copy(knot.rotation);

  rings.forEach((ring, index) => {
    ring.material.opacity = 0.1 + Math.sin(state.elapsed * 0.5 + index * 1.7) * 0.035;
  });

  for (const orbiter of orbiters) {
    const angle = state.elapsed * orbiter.speed + orbiter.offset;
    orbiter.moon.position.set(
      Math.cos(angle) * orbiter.radius,
      0,
      Math.sin(angle) * orbiter.radius,
    );
  }

  particles.rotation.y = state.elapsed * 0.008;
  particles.rotation.x = Math.sin(state.elapsed * 0.04) * 0.04;
  camera.position.x = Math.sin(state.elapsed * 0.11) * CONFIG.cameraDriftX;
  camera.position.y = 0.25 + Math.cos(state.elapsed * 0.083) * CONFIG.cameraDriftY;
  camera.position.z = CONFIG.cameraDistance;
  camera.lookAt(0, 0, 0);
}

function RunFrame(currentTime) {
  requestAnimationFrame(RunFrame);
  CheckResolution();

  if (state.lastFrame === undefined) state.lastFrame = currentTime;
  const elapsedMs = currentTime - state.lastFrame;
  state.lastFrame = currentTime;
  if (document.hidden) return;

  UpdateScene(Math.min(elapsedMs, MAX_STEP_MS) / 1000);
  renderer.render(scene, camera);
}

function Init() {
  window.addEventListener("resize", ResolutionChanged);
  ResolutionChanged();
  requestAnimationFrame(RunFrame);
}

Init();
