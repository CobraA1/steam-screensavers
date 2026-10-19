import * as THREE from "./vendor/three.module.js";
import { CreateDreamPipVisual } from "./dream-pip-visual.js";
import { DreamOpacity, PlaceDream } from "./dream-compositor.js";

const Smooth = (value) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

// A small stage in the compositor's isolated scene. Its poses come only from the saved
// memory's beat; it owns no clock, story facts, lights, or secondary renderer.
export class AntennaDreamVisual {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.name = "pip-antenna-dream";
    this.root.visible = false;
    scene.add(this.root);
    this.materials = [];
    const material = (color, opacity = 1) => {
      const result = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity,
        depthWrite: opacity === 1, fog: false, toneMapped: false, side: THREE.DoubleSide });
      this.materials.push({ material: result, opacity });
      return result;
    };
    const backdrop = material(0x102c3b, 0.92);
    const rim = material(0x8edcda, 0.7);
    const cream = material(0xd9eee5);
    const teal = material(0x4f9c9c);
    const orange = material(0xe3b47d);
    const dark = material(0x193b49);
    const bright = material(0xc9fff3);
    this.faultMaterial = material(0xf2ab6a);
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const sphereGeometry = new THREE.SphereGeometry(1, 8, 6);
    const mesh = (parent, geometry, mat, x, y, z, sx, sy = sx, sz = sx) => {
      const object = new THREE.Mesh(geometry, mat);
      object.position.set(x, y, z);
      object.scale.set(sx, sy, sz);
      parent.add(object);
      return object;
    };
    const box = (parent, mat, x, y, z, sx, sy, sz) => mesh(parent, boxGeometry, mat, x, y, z, sx, sy, sz);

    this.bubble = new THREE.Group();
    this.bubble.position.set(-1.22, 1.6, 0);
    this.root.add(this.bubble);
    mesh(this.bubble, new THREE.CircleGeometry(1, 64), backdrop, 0, 0, -0.15, 1.52, 0.92, 1);
    mesh(this.bubble, new THREE.TorusGeometry(1, 0.012, 4, 64), rim, 0, 0, -0.12, 1.52, 0.92, 1);
    // Three small thought dots visually attach the memory to the sleeping Pip.
    for (const [x, y, radius] of [[-0.13, 0.26, 0.045], [-0.28, 0.48, 0.075], [-0.48, 0.72, 0.11]]) {
      mesh(this.root, new THREE.CircleGeometry(1, 16), backdrop, x, y, 0, radius);
      mesh(this.root, new THREE.TorusGeometry(1, 0.06, 4, 16), rim, x, y, 0.01, radius);
    }
    box(this.bubble, teal, 0, -0.52, 0.04, 2.15, 0.08, 0.22);
    for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) box(this.bubble, dark, x, -0.52, 0.16, 0.025, 0.08, 0.015);

    ({ pip: this.pip, head: this.head, eye: this.eye, arms: this.arms, tool: this.tool } =
      CreateDreamPipVisual(this.bubble, { cream, teal, orange, dark, bright }));
    box(this.bubble, teal, 0.56, -0.24, 0.04, 0.08, 0.52, 0.1);
    box(this.bubble, teal, 0.56, -0.46, 0.04, 0.32, 0.08, 0.22);
    this.plate = box(this.bubble, orange, 0.56, -0.24, 0.105, 0.21, 0.14, 0.025);
    for (const x of [-0.075, 0.075]) for (const y of [-0.045, 0.045]) {
      mesh(this.plate, sphereGeometry, bright, x / 0.21, y / 0.14, 0.6, 0.07, 0.1, 0.3);
    }
    this.dish = new THREE.Group();
    this.dish.position.set(0.56, 0.06, 0.1);
    this.bubble.add(this.dish);
    // A shallow concave bowl with a rim and feed, rather than an open cone.
    const profile = [[0, 0], [0.1, 0.012], [0.24, 0.065], [0.4, 0.18]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    mesh(this.dish, new THREE.LatheGeometry(profile, 16), cream, 0, 0, 0, 1);
    const dishRim = mesh(this.dish, new THREE.TorusGeometry(0.4, 0.018, 5, 20), teal, 0, 0.18, 0, 1);
    dishRim.rotation.x = Math.PI / 2;
    box(this.dish, orange, 0, 0.23, 0, 0.028, 0.36, 0.028);
    mesh(this.dish, sphereGeometry, bright, 0, 0.42, 0, 0.045);
    this.fault = mesh(this.bubble, sphereGeometry, this.faultMaterial, 1.05, 0.38, 0.1, 0.045);
    this.sweep = mesh(this.bubble, new THREE.TorusGeometry(0.51, 0.013, 4, 24, Math.PI * 1.35), rim, 0.56, 0.19, 0.02, 1, 0.55, 1);
    this.anchor = new THREE.Vector3();
    this.cameraAnchor = new THREE.Vector3();
  }

  update(dream, camera, robotHead) {
    this.root.visible = Boolean(dream && dream.type === "stubborn-antenna");
    if (!this.root.visible) { this.opacity = 0; return; }
    PlaceDream(this.root, camera, robotHead, this.anchor, this.cameraAnchor);
    // Hold the stage still and facing the viewer. Only the remembered actors move.
    const p = Math.max(0, Math.min(1, dream.beatProgress || 0));
    const progress = Math.max(0, Math.min(1, dream.progress || 0));
    this.opacity = DreamOpacity(progress);
    const beat = dream.beatId;
    const workX = 0.02;
    let x = -0.74;
    let reach = 0;
    let startled = 0;
    let tilt = -0.6;
    if (beat === "investigation") x += (workX - x) * Smooth(p);
    if (["first-repair", "false-success", "verification"].includes(beat)) x = workX;
    if (beat === "first-repair") reach = Smooth(p / 0.15) * Smooth((1 - p) / 0.15);
    if (beat === "runaway-spin") {
      startled = Smooth(p * 3);
      x = workX + (-0.8 - workX) * startled;
      tilt = -0.6 + p * Math.PI * 6;
    } else if (beat === "real-repair") {
      x = -0.8 + (workX + 0.8) * Smooth(p / 0.4);
      reach = Smooth((p - 0.3) / 0.15) * Smooth((1 - p) / 0.12);
      tilt = -0.6 + Smooth((p - 0.35) / 0.65) * 0.35;
    } else if (beat === "exit") {
      x = workX + (-0.74 - workX) * Smooth(p);
      tilt = -0.25;
    }
    else if (beat === "malfunction") tilt += Math.sin(p * 30) * 0.17;
    else if (beat === "first-repair") tilt += Math.sin(p * Math.PI) * 0.2;
    else if (beat === "verification") tilt = -0.25 + Math.sin(p * Math.PI * 2) * 0.07;
    const gesture = (dream.variant || 0) * 0.4;
    this.pip.position.set(x, -0.39, 0.18);
    this.pip.rotation.z = startled * 0.24;
    this.head.rotation.z = startled * 0.12 - reach * 0.15;
    this.eye.scale.y = startled ? 0.055 : 0.035;
    this.arms[0].rotation.z = -0.12 - startled * 1.7;
    this.arms[1].rotation.z = 0.12 + reach * (0.9 + Math.sin(p * 24 + gesture) * 0.07) + startled * 1.6;
    this.tool.visible = reach > 0.1;
    this.dish.rotation.set(0.4, 0, tilt);
    this.plate.visible = (beat === "real-repair" && p >= 0.38) || beat === "verification" || beat === "exit";
    this.sweep.visible = beat === "runaway-spin";
    this.sweep.rotation.z = p * Math.PI * 6;
    this.faultMaterial.color.setHex(this.plate.visible ? 0x9ff0d4 : 0xf2ab6a);
    this.fault.scale.setScalar(0.045 + (this.plate.visible ? 0 : Math.sin(p * 24) * 0.012));
  }
}
