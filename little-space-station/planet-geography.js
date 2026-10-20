import { CreateRandom, DeriveSeed } from "./random.js";

// A handful of overlapping spherical lobes form three recognizable continents,
// with a smaller polar landmass. Unlike per-vertex random colors, a continuous
// spherical mask produces the same coastlines on every visit and every season.
const LOBES = [
  [[0.88, 0.10, 0.40], 0.80],
  [[0.75, 0.43, 0.50], 0.54],
  [[0.57, -0.42, 0.69], 0.49],
  [[-0.73, 0.12, 0.67], 0.79],
  [[-0.62, -0.40, 0.63], 0.51],
  [[-0.88, 0.45, 0.24], 0.51],
  [[-0.20, 0.12, -0.96], 0.84],
  [[-0.60, 0.40, -0.73], 0.56],
  [[0.36, -0.40, -0.85], 0.48],
  [[0, -1, 0], 0.60],
  [[0, 1, 0], 0.60],
].map(([point, radius]) => {
  const length = Math.hypot(...point);
  return { x: point[0] / length, y: point[1] / length, z: point[2] / length, edge: Math.cos(radius) };
});

const Clamp01 = (value) => Math.max(0, Math.min(1, value));

// Sample a continuous mask in planet-local space, not world or camera space.
// A seed-dependent longitude offset changes the globe without changing its
// continental layout during rotation or seasonal color interpolation.
export function CreatePlanetGeography(worldSeed) {
  const random = CreateRandom(DeriveSeed(worldSeed, "planet-geography-v2"));
  const longitude = random() * Math.PI * 2;
  const phase = random() * Math.PI * 2;
  const c = Math.cos(longitude), s = Math.sin(longitude);

  return function SamplePlanet(x, y, z) {
    const length = Math.hypot(x, y, z) || 1;
    const nx = (x * c + z * s) / length;
    const ny = y / length;
    const nz = (z * c - x * s) / length;

    let continental = -Infinity;
    for (const lobe of LOBES) {
      const influence = nx * lobe.x + ny * lobe.y + nz * lobe.z - lobe.edge;
      if (influence > continental) continental = influence;
    }
    // Low-frequency folds break up circular lobe boundaries. The coast remains
    // a connected region instead of scattered random land/water triangles.
    const coastalFold =
      0.045 * Math.sin(5.5 * nx + 2.5 * nz + phase) * Math.sin(6.5 * ny - 3 * nz + 2) +
      0.025 * Math.sin(12 * ny + 5 * nx + phase) * Math.sin(7 * nz - 3 * nx - 1);
    const coast = continental + coastalFold - 0.07;
    const tone = Clamp01(0.5 +
      0.25 * Math.sin(4.2 * nx + 2.4 * nz + phase) * Math.cos(3.8 * ny - nz) +
      0.18 * Math.sin(8.6 * nz - 3.1 * nx) * Math.cos(5.2 * ny + phase));

    return { land: coast >= 0, coast, latitude: Math.abs(ny), tone };
  };
}

// IcosahedronGeometry is non-indexed, so each set of three positions belongs
// to one triangle. One geographic sample per face gives crisp, faceted shores.
export function SamplePlanetFaces(positionAttribute, worldSeed) {
  if (positionAttribute.count % 3 !== 0) throw new Error("Planet positions must contain complete triangles");
  const sample = CreatePlanetGeography(worldSeed);
  const faces = [];
  for (let first = 0; first < positionAttribute.count; first += 3) {
    const x = (positionAttribute.getX(first) + positionAttribute.getX(first + 1) + positionAttribute.getX(first + 2)) / 3;
    const y = (positionAttribute.getY(first) + positionAttribute.getY(first + 1) + positionAttribute.getY(first + 2)) / 3;
    const z = (positionAttribute.getZ(first) + positionAttribute.getZ(first + 1) + positionAttribute.getZ(first + 2)) / 3;
    faces.push(sample(x, y, z));
  }
  return faces;
}
