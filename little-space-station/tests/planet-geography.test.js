import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "../vendor/three.module.js";
import { CreatePlanetGeography, SamplePlanetFaces } from "../planet-geography.js";

test("continent geography is seeded, deterministic, and unchanged by sampling order", () => {
  const first = CreatePlanetGeography("planet-seed-a");
  const again = CreatePlanetGeography("planet-seed-a");
  const different = CreatePlanetGeography("planet-seed-b");
  const positions = [[1, 0.3, 0.2], [-0.4, 0.2, 0.8], [0.1, -0.6, -0.9]];
  assert.deepEqual(positions.map(p => first(...p)), positions.map(p => again(...p)));
  assert.deepEqual(first(1, 0.3, 0.2), first(10, 3, 2));
  assert.ok(positions.some(p => Math.abs(first(...p).coast - different(...p).coast) > 0.01));
});

test("the globe contains sizeable oceans and continents, not arbitrary latitudinal stripes", () => {
  const sample = CreatePlanetGeography("little-station-001");
  let landArea = 0, totalArea = 0;
  const shorelineByLatitude = new Set();
  for (let lat = -80; lat <= 80; lat += 5) {
    let landHere = 0;
    for (let longitude = -180; longitude < 180; longitude += 5) {
      const phi = lat * Math.PI / 180;
      const theta = longitude * Math.PI / 180;
      const x = Math.cos(phi) * Math.cos(theta);
      const y = Math.sin(phi);
      const z = Math.cos(phi) * Math.sin(theta);
      const weight = Math.cos(phi);
      const geography = sample(x, y, z);
      totalArea += weight;
      if (geography.land) { landHere += 1; landArea += weight; }
    }
    if (landHere > 0 && landHere < 72) shorelineByLatitude.add(lat);
  }
  const landFraction = landArea / totalArea;
  assert.ok(landFraction > 0.22 && landFraction < 0.40, `Expected ocean-dominant geography with smaller continents, got ${landFraction}`);
  assert.ok(shorelineByLatitude.size >= 8, "Expected coastlines spanning several latitudes");
});

test("each triangle uses one spherical geography sample", () => {
  const coords = [
    [1, 0, 0], [0.9, 0.1, 0], [0.9, 0, 0.1],
    [0, 1, 0], [0.1, 0.9, 0], [0, 0.9, 0.1],
  ];
  const positionAttribute = {
    count: coords.length,
    getX: i => coords[i][0], getY: i => coords[i][1], getZ: i => coords[i][2],
  };
  const facets = SamplePlanetFaces(positionAttribute, "planet-faces");
  assert.equal(facets.length, 2);
  assert.deepEqual(facets[0], CreatePlanetGeography("planet-faces")(2.8 / 3, 0.1 / 3, 0.1 / 3));
  assert.throws(() => SamplePlanetFaces({ count: 5 }, "planet-faces"), /complete triangles/);
});

test("actual low-poly geometry has triangle-local colors and both surface types", () => {
  const geometry = new THREE.IcosahedronGeometry(5.7, 5);
  try {
    // The color buffers depend on these non-indexed triangle triplets.
    assert.equal(geometry.index, null);
    const positions = geometry.getAttribute("position");
    const facets = SamplePlanetFaces(positions, "little-station-001");
    assert.equal(facets.length * 3, positions.count);
    const landCount = facets.filter(face => face.land).length;
    assert.ok(landCount > facets.length * 0.2);
    assert.ok(landCount < facets.length * 0.8);
    assert.ok(facets.some(face => face.land && face.latitude > 0.9), "Polar terrain should belong to the globe");
    assert.ok(facets.some(face => !face.land && face.latitude < 0.3), "Open equatorial oceans should exist");
  } finally {
    geometry.dispose();
  }
});
