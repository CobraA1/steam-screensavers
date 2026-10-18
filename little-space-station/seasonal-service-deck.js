import * as THREE from "./vendor/three.module.js";
import { DeckPartPose } from "./service-deck-lifecycle.js";

// All coordinates are station-local. The floor stays at the original height;
// the extra space extends aft and toward +Z, clear of the solar array roots.
const FLOOR_Y = -0.43;
const PIP_STANDING_Y = FLOOR_Y + 0.35 * 0.84;
const DECK = Object.freeze({ x: -4.8, z: 1.1, width: 4, depth: 3.1 });

export const SERVICE_DECK_ANCHORS = Object.freeze({
  pipSeasonalWork: Object.freeze([-4.68, PIP_STANDING_Y, 1.38]),
  pipRemembranceWork: Object.freeze([-5.88, PIP_STANDING_Y, 1.85]),
  remembranceFixture: Object.freeze([-5.12, FLOOR_Y + 0.061, 2.12]),
  decorations: Object.freeze({
    "gourd-cluster": Object.freeze([-6.05, FLOOR_Y + 0.125, 1.02]),
    "harvest-lantern": Object.freeze([-3.38, FLOOR_Y + 0.12, 1.53]),
    "warm-garland": Object.freeze([-3.98, 0.8, 1.03]),
    "leaf-sprig": Object.freeze([-4.1, 0.66, 1.04]),
    "marked-seasonal-crate": Object.freeze([-6.12, FLOOR_Y + 0.16, 0.05]),
    "jack-o-lantern": Object.freeze([-5.2, FLOOR_Y + 0.153, 0.48]),
    "halloween-lights": Object.freeze([-5.66, 0.1, 2.57]),
    "ghost-pennant": Object.freeze([-6.2, FLOOR_Y + 0.24, 2.06]),
  }),
});

function Rod(start, end, radius, material, segments = 6) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), material);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return rod;
}

function Box(group, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

// Clipped corners echo the station's faceted barrels. Extruded shapes keep the
// silhouette simple without a CSG dependency or a dense bevel modifier.
function ChamferedPrism(width, height, depth, corner) {
  const x = width / 2;
  const y = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + corner, -y);
  for (const point of [[x - corner, -y], [x, -y + corner], [x, y - corner],
    [x - corner, y], [-x + corner, y], [-x, y - corner], [-x, -y + corner]]) {
    shape.lineTo(...point);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function FloorPlate(group, width, depth, thickness, position, material, corner = 0.16) {
  const mesh = new THREE.Mesh(ChamferedPrism(width, depth, thickness, corner), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

export class SeasonalServiceDeckVisual {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = "seasonal-service-deck";
    this.root.visible = false;
    scene.station.add(this.root);
    this.glowMaterials = [];
    this.parts = [];
    this.Build();
  }

  Build() {
    const m = this.scene.materials;
    const part = (name) => {
      const group = new THREE.Group();
      group.name = "service-deck-" + name;
      this.root.add(group);
      this.parts.push(group);
      return group;
    };
    const coupling = part("coupling");
    const supports = part("supports");
    const platform = part("floor");
    const cabinCarrier = part("cabin");
    const rails = part("railings");
    const lights = part("lighting");
    const surface = (color, metalness = 0.16) => new THREE.MeshStandardMaterial({
      color, metalness, roughness: 0.72, flatShading: true,
    });
    const cream = surface(0xcac6ad);
    const floor = surface(0x638780);
    const floorAlternate = surface(0x6b8b82);
    const floorSeams = surface(0x425f59);
    const darkTeal = surface(0x284b49, 0.3);
    const trim = surface(0xc48a43, 0.24);
    const glass = new THREE.MeshStandardMaterial({ color: 0xffd89b, emissive: 0xffb04d,
      emissiveIntensity: 0.9, roughness: 0.3 });
    this.glowMaterials.push(glass);

    // Rear port and pressure passage. The collar is the attachment datum; all
    // platform structure is built explicitly rather than reparented by index.
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.54, 10), m.metal);
    collar.rotation.z = Math.PI / 2;
    collar.position.set(-2.92, 0, 0);
    coupling.add(collar);
    coupling.add(Rod(new THREE.Vector3(-3.05, 0, 0), new THREE.Vector3(-3.58, 0, 0.38), 0.37, m.ivory, 10));
    coupling.add(Rod(new THREE.Vector3(-3.19, 0, 0.1), new THREE.Vector3(-3.27, 0, 0.16), 0.405, trim, 10));
    FloorPlate(platform, DECK.width, DECK.depth, 0.15, [DECK.x, -0.58, DECK.z], m.dark, 0.22);
    FloorPlate(platform, DECK.width - 0.04, DECK.depth - 0.04, 0.065, [DECK.x, -0.485, DECK.z], cream, 0.21);
    FloorPlate(platform, DECK.width - 0.23, DECK.depth - 0.23, 0.022, [DECK.x, FLOOR_Y - 0.012, DECK.z], floorSeams, 0.15);

    // Large, almost continuous floor panels make usable area obvious. Narrow
    // seams and a restrained palette keep the floor from competing with Pip.
    for (let column = 0; column < 5; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        Box(platform, [0.722, 0.014, 0.676],
          [-6.28 + column * 0.74, FLOOR_Y - 0.007, 0.06 + row * 0.69],
          (column + row) % 4 === 0 ? floorAlternate : floor);
      }
    }
    // Underfloor beams and diagonal braces give the larger slab a credible
    // load path back into the aft coupling.
    for (const z of [-0.08, 2.25]) {
      Box(supports, [3.58, 0.13, 0.12], [-4.8, -0.71, z], darkTeal);
      supports.add(Rod(new THREE.Vector3(-2.94, -0.32, 0.12),
        new THREE.Vector3(-4.75, -0.72, z), 0.045, m.metal));
    }
    for (const x of [-6.42, -4.82, -3.16]) {
      Box(supports, [0.13, 0.13, 2.7], [x, -0.69, 1.1], darkTeal);
    }

    // Cabin: Pip-sized pressure door, clipped shoulders, shallow roof cap and
    // short vents. Its footprint occupies only about 13% of the platform.
    const cabin = new THREE.Group();
    cabin.name = "service-deck-utility-cabin";
    cabin.position.set(-3.98, FLOOR_Y, 0.38);
    cabinCarrier.add(cabin);
    FloorPlate(cabin, 1.58, 1.28, 0.09, [0, 0.045, 0], darkTeal, 0.12);
    const shell = new THREE.Mesh(ChamferedPrism(1.46, 1.34, 1.14, 0.16), m.ivory);
    shell.position.y = 0.7;
    cabin.add(shell);
    FloorPlate(cabin, 1.53, 1.24, 0.09, [0, 1.37, 0], cream, 0.16);
    for (const x of [-0.56, 0.56]) {
      Box(cabin, [0.07, 0.045, 0.93], [x, 1.435, 0], trim);
      Box(cabin, [0.055, 0.93, 0.04], [x, 0.66, 0.589], trim);
    }
    const doorFrame = new THREE.Mesh(ChamferedPrism(0.7, 1.2, 0.055, 0.1), darkTeal);
    doorFrame.position.set(-0.12, 0.64, 0.59);
    cabin.add(doorFrame);
    const door = new THREE.Mesh(ChamferedPrism(0.57, 1.08, 0.03, 0.08), trim);
    door.position.set(-0.12, 0.64, 0.63);
    cabin.add(door);
    Box(cabin, [0.29, 0.24, 0.025], [-0.12, 0.93, 0.654], m.dark);
    Box(cabin, [0.235, 0.185, 0.028], [-0.12, 0.93, 0.67], glass);
    Box(cabin, [0.035, 0.18, 0.045], [0.065, 0.52, 0.67], m.metal);
    Box(cabin, [0.68, 0.055, 0.19], [-0.12, 0.025, 0.65], m.metal);
    Box(cabin, [0.24, 0.34, 0.035], [0.44, 0.91, 0.59], m.dark);
    Box(cabin, [0.18, 0.27, 0.04], [0.44, 0.91, 0.615], glass);

    const porthole = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.045, 6, 10), darkTeal);
    porthole.rotation.y = Math.PI / 2;
    porthole.position.set(-0.744, 0.79, 0);
    cabin.add(porthole);
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.188, 10), glass);
    pane.rotation.y = -Math.PI / 2;
    pane.position.copy(porthole.position);
    pane.position.x -= 0.006;
    cabin.add(pane);
    // The +X wall is prominent in the default overview. A framed window and
    // modest service locker give it the same visual scale as the doorway.
    Box(cabin, [0.045, 0.41, 0.67], [0.738, 0.87, 0.04], darkTeal);
    Box(cabin, [0.028, 0.3, 0.54], [0.771, 0.87, 0.04], glass);
    Box(cabin, [0.035, 0.32, 0.025], [0.789, 0.87, 0.04], m.metal);
    Box(cabin, [0.052, 0.3, 0.55], [0.74, 0.31, 0.03], darkTeal);
    for (let i = 0; i < 3; i += 1) {
      Box(cabin, [0.025, 0.025, 0.36], [0.774, 0.24 + i * 0.065, 0.03], m.metal);
    }
    for (const z of [-0.41, 0.43]) {
      Box(cabin, [0.035, 0.92, 0.055], [0.743, 0.66, z], trim);
    }
    Box(cabin, [0.3, 0.085, 0.35], [0.18, 1.45, -0.18], darkTeal);
    for (let i = 0; i < 3; i += 1) {
      Box(cabin, [0.23, 0.015, 0.025], [0.18, 1.5, -0.29 + i * 0.1], m.metal);
    }

    // Waist-height guard rails, regular stanchions and recessed corner lamps.
    // The lamp housings are smaller than Pip's head and share the rail height.
    const corners = [[-6.59, -0.27], [-3.01, -0.27], [-3.01, 2.47], [-6.59, 2.47]];
    const posts = [];
    for (let edge = 0; edge < 4; edge += 1) {
      const a = corners[edge];
      const b = corners[(edge + 1) % 4];
      const segments = edge % 2 === 0 ? 4 : 3;
      for (let i = 0; i < segments; i += 1) {
        const t = i / segments;
        posts.push([THREE.MathUtils.lerp(a[0], b[0], t), THREE.MathUtils.lerp(a[1], b[1], t)]);
      }
      for (const [y, radius, material] of [[0.13, 0.027, trim], [-0.15, 0.018, darkTeal]]) {
        rails.add(Rod(new THREE.Vector3(a[0], y, a[1]), new THREE.Vector3(b[0], y, b[1]), radius, material));
      }
      rails.add(Rod(new THREE.Vector3(a[0], -0.39, a[1]), new THREE.Vector3(b[0], -0.39, b[1]), 0.023, darkTeal));
    }
    for (const [x, z] of posts) {
      Box(rails, [0.065, 0.57, 0.065], [x, -0.145, z], darkTeal);
      Box(rails, [0.13, 0.045, 0.13], [x, -0.407, z], m.metal);
    }
    for (const [x, z] of corners) {
      Box(lights, [0.14, 0.18, 0.14], [x, 0.2, z], darkTeal);
      Box(lights, [0.1, 0.075, 0.15], [x, 0.22, z], glass);
      Box(lights, [0.17, 0.035, 0.17], [x, 0.31, z], cream);
      Box(supports, [0.24, 0.2, 0.24], [x, -0.56, z], darkTeal);
    }

    // Flush rings leave a broad, unoccupied center for seasonal gatherings.
    const ringGeometry = new THREE.TorusGeometry(0.055, 0.011, 5, 8);
    for (const [x, z] of [[-6.2, 0.7], [-6.2, 2.13], [-4.5, 2.13], [-3.27, 1.48]]) {
      const ring = new THREE.Mesh(ringGeometry, m.metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, FLOOR_Y + 0.009, z);
      platform.add(ring);
    }
    // Autonomous riggers escort rigid assemblies; no physics or traffic AI.
    this.riggers = new THREE.Group();
    this.riggers.name = "service-deck-riggers";
    this.root.add(this.riggers);
    this.workLight = new THREE.MeshStandardMaterial({ color: 0xffc267,
      emissive: 0xff981f, emissiveIntensity: 1, roughness: 0.4 });
    for (const z of [-0.8, 2.9]) {
      const drone = new THREE.Group();
      drone.position.set(-5.1, 0.65, z);
      Box(drone, [0.32, 0.22, 0.28], [0, 0, 0], trim);
      Box(drone, [0.18, 0.08, 0.3], [0, 0.13, 0], this.workLight);
      for (const x of [-0.23, 0.23]) {
        Box(drone, [0.09, 0.12, 0.39], [x, -0.02, 0], darkTeal);
        Box(drone, [0.04, 0.045, 0.12], [x, -0.02, 0.22], m.window);
      }
      this.riggers.add(drone);
    }
  }

  update(state) {
    const seasonal = state && state.seasonal;
    this.root.visible = Boolean(seasonal && seasonal.serviceDeckActive);
    if (!this.root.visible) return;
    const lifecycle = seasonal.serviceDeck;
    const assembly = lifecycle ? lifecycle.assembly : 1;
    for (let index = 0; index < this.parts.length; index += 1) {
      const pose = DeckPartPose(assembly, index);
      const part = this.parts[index];
      part.visible = pose.visible;
      part.position.set(pose.x, pose.y, pose.z);
      part.rotation.y = pose.yaw;
    }
    this.riggers.visible = Boolean(lifecycle && lifecycle.action && lifecycle.progress > 0 && lifecycle.progress < 1);
    if (this.riggers.visible) {
      const pose = DeckPartPose(assembly, Math.min(5, Math.floor(assembly * 6)));
      // Travel offscreen during handoffs before escorting the next assembly.
      const handoff = Math.max(0, (pose.progress - 0.85) / 0.15);
      const retreat = handoff * handoff * (3 - 2 * handoff);
      this.riggers.position.set(pose.x - 38 * retreat, pose.y + 2 * retreat, pose.z + 8 * retreat);
      const seconds = (state.worldTimeMs || 0) / 1000;
      for (let i = 0; i < this.riggers.children.length; i += 1) {
        const drone = this.riggers.children[i];
        drone.position.y = 0.65 + Math.sin(seconds * 0.45 + i * Math.PI) * 0.065;
        drone.rotation.z = Math.sin(seconds * 0.3 + i) * 0.035;
      }
      this.workLight.emissiveIntensity = 0.65 + 0.5 * Math.pow(Math.sin(seconds * 1.4), 2);
    }
    const boost = this.scene.environmentArtificialBoost || 0;
    const power = THREE.MathUtils.smoothstep(assembly, 0.975, 1);
    for (const material of this.glowMaterials) material.emissiveIntensity = (0.85 + boost * 0.85) * power;
  }
}
