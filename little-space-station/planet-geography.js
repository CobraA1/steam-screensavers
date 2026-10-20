import { CreateRandom, DeriveSeed } from "./random.js";

// These connected, overlapping lobes describe three distinct continents,
// not broad latitude bands. Smaller offshore lobes add recognizable islands.
// Coastline folds below supply bays and peninsulas without scattered noise.
const LAND_LOBES = [
  [[0.88, 0.10, 0.40], 0.60],
  [[0.77, 0.40, 0.44], 0.46],
  [[0.53, -0.42, 0.66], 0.43],
  [[-0.73, 0.12, 0.67], 0.59],
  [[-0.50, -0.37, 0.66], 0.39],
  [[-0.90, 0.40, 0.21], 0.43],
  [[-0.20, 0.12, -0.96], 0.64],
  [[-0.57, 0.42, -0.69], 0.41],
  [[0.33, -0.40, -0.87], 0.38],
  [[0, -1, 0], 0.48],
  [[0, 1, 0], 0.46],
  [[0.25, 0.05, 0.97], 0.24],
  [[-0.04, -0.36, 0.93], 0.23],
  [[0.10, 0.41, -0.90], 0.22],
  [[0.74, -0.48, -0.22], 0.22],
  [[-0.85, -0.27, -0.22], 0.23],
].map(([point, radius]) => {
  const length = Math.hypot(...point);
  return { x: point[0] / length, y: point[1] / length, z: point[2] / length, edge: Math.cos(radius) };
});

const Clamp01 = value => Math.max(0, Math.min(1, value));

// Planet-local sampling keeps coastlines stable through rotation and season
// changes. Only the seeded orientation and decorative terrain details vary.
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
    for (const lobe of LAND_LOBES) {
      const influence = nx * lobe.x + ny * lobe.y + nz * lobe.z - lobe.edge;
      if (influence > continental) continental = influence;
    }
    // Low/medium frequency folds create irregular shores at the existing
    // triangular resolution. Shapes stay connected; no per-face random mask.
    const coastalFold =
      0.045 * Math.sin(5.5 * nx + 2.5 * nz + phase) * Math.sin(6.5 * ny - 3 * nz + 2) +
      0.025 * Math.sin(12 * ny + 5 * nx + phase) * Math.sin(7 * nz - 3 * nx - 1) +
      0.050 * Math.sin(9 * nx + 4 * ny + phase) * Math.sin(6 * nz - 9 * ny) +
      0.036 * Math.sin(17 * ny + 9 * nx + phase) * Math.sin(11 * nz + 5 * nx) +
      0.024 * Math.sin(22 * nz - 4 * ny) * Math.sin(16 * nx - 7 * nz + phase);
    const coast = continental + coastalFold - 0.07;

    // Coherent inland variation creates forests, dry regions and occasional
    // uplands without introducing a texture or removing the faceted styling.
    const tone = Clamp01(0.5 +
      0.28 * Math.sin(4.2 * nx + 2.4 * nz + phase) * Math.cos(3.8 * ny - nz) +
      0.23 * Math.sin(8.6 * nz - 3.1 * nx) * Math.cos(5.2 * ny + phase));
    const moisture = Clamp01(0.5 +
      0.43 * Math.sin(4.1 * nx + 2.5 * ny - phase) * Math.cos(4.9 * nz - 2.2 * nx) +
      0.15 * Math.sin(11 * ny + 4 * nz + phase));
    const highland = Clamp01(0.5 +
      0.31 * Math.sin(6.7 * nx + 4.5 * nz) * Math.sin(8.4 * ny - 3.8 * nz + phase));

    return { land: coast >= 0, coast, latitude: Math.abs(ny), tone, moisture, highland };
  };
}

// IcosahedronGeometry supplies non-indexed triangle vertices. Classify each
// full face once to preserve deliberate hard-edged low-poly coastlines.
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
