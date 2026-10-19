import * as THREE from "./vendor/three.module.js";
import { CreatePhantomCoverMesh } from "./phantom-cover-geometry.js";
import { CreateDreamPipVisual } from "./dream-pip-visual.js";
import { DreamOpacity, PlaceDream } from "./dream-compositor.js";

const Smooth = (value) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

export class PhantomDreamVisual {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.name = "pip-phantom-dream";
    this.root.visible = false;
    scene.add(this.root);
    this.materials = [];
    const material = (color, opacity = 1) => {
      const result = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1, fog: false, toneMapped: false, side: THREE.DoubleSide });
      this.materials.push({ material: result, opacity });
      return result;
    };
    const backdrop = material(0x17162d, 0.92);
    const rim = material(0xb8a6e2, 0.76);
    const cream = material(0xe7eadf);
    const teal = material(0x4e9f9a);
    const orange = material(0xe09553);
    const dark = material(0x1e3540);
    const bright = material(0xc8fff2);
    const ghost = material(0xf0eee2, 0.82);
    this.ghostMaterial = ghost;
    ghost.side = THREE.FrontSide;
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
    for (const [x, y, radius] of [[-0.13, 0.26, 0.045], [-0.28, 0.48, 0.075], [-0.48, 0.72, 0.11]]) {
      mesh(this.root, new THREE.CircleGeometry(1, 16), backdrop, x, y, 0, radius);
      mesh(this.root, new THREE.TorusGeometry(1, 0.06, 4, 16), rim, x, y, 0.01, radius);
    }
    box(this.bubble, teal, 0, -0.52, 0.04, 2.15, 0.08, 0.22);

    ({ pip: this.pip, head: this.head, eye: this.eye, arms: this.arms,
      hands: this.hands, tool: this.tool } = CreateDreamPipVisual(this.bubble, {
      cream: material(0xd9eee5), teal: material(0x4f9c9c),
      orange: material(0xe3b47d), dark: material(0x193b49), bright: material(0xc9fff3),
    }));
    this.pipArm = this.arms[1];
    this.hand = this.hands[1];
    this.tool.visible = false;

    this.drone = new THREE.Group();
    this.bubble.add(this.drone);
    mesh(this.drone, sphereGeometry, teal, 0, 0, 0, 0.18, 0.12, 0.14);
    mesh(this.drone, sphereGeometry, bright, 0, 0, 0.14, 0.055, 0.035, 0.025);
    for (const side of [-1, 1]) {
      box(this.drone, orange, side * 0.22, 0, 0, 0.22, 0.04, 0.1);
      mesh(this.drone, sphereGeometry, dark, side * 0.35, 0.03, 0, 0.07, 0.035, 0.07);
    }
    // Dedicated material instances let the departing memory drone fade without
    // dimming Pip, the platform, or the bubble, which share the base palette.
    this.droneMaterials = [];
    this.drone.traverse(object => {
      if (!object.material) return;
      object.material = object.material.clone();
      object.material.transparent = true;
      object.material.depthWrite = false;
      this.droneMaterials.push(object.material);
    });

    this.cover = new THREE.Group();
    this.bubble.add(this.cover);
    // Keep the dream cover's original miniature height and open hem.
    this.cover.add(CreatePhantomCoverMesh(ghost, { scale: 0.86, offsetY: 0.08 }));
    this.anchor = new THREE.Vector3();
    this.cameraAnchor = new THREE.Vector3();
  }

  update(dream, camera, robotHead) {
    this.root.visible = Boolean(dream && dream.type === "phantom-visitor-2026");
    if (!this.root.visible) { this.opacity = 0; return; }
    PlaceDream(this.root, camera, robotHead, this.anchor, this.cameraAnchor);

    const p = Math.max(0, Math.min(1, dream.beatProgress || 0));
    const progress = Math.max(0, Math.min(1, dream.progress || 0));
    this.opacity = DreamOpacity(progress);
    const beat = dream.beatId;
    this.pip.position.set(-0.72, -0.39, 0.18);
    this.head.rotation.set(0, 0, 0);
    for (const arm of this.arms) { arm.rotation.set(0, 0, 0); arm.scale.set(1, 1, 1); }
    this.tool.visible = false;
    this.pip.rotation.z = 0;
    this.drone.position.set(0.35, 0, 0.18);
    this.drone.rotation.z = 0;
    this.cover.position.set(0.35, 0.12, 0.2);
    this.cover.rotation.z = 0;
    let droneAlpha = 0;
    let coverAlpha = 1;
    this.cover.scale.setScalar(1);
    this.drone.scale.setScalar(1);
    let reach = 0;
    let surprise = 0;
    if (beat === "glimpse") {
      this.cover.position.x = 1 - Smooth(p) * 0.65;
      coverAlpha = Smooth(p / 0.15);
    }
    if (beat === "vanish") {
      this.pip.position.x += Smooth(p) * 0.35;
      this.cover.position.x += Smooth(p) * 0.45;
      coverAlpha = 1 - Smooth(p);
    }
    if (beat === "search") {
      this.pip.position.x = -0.37 - Math.sin(p * Math.PI) * 0.18;
      this.pip.rotation.z = Math.sin(p * Math.PI * 2) * 0.1;
      this.cover.position.x = 0.8;
      coverAlpha = 0;
    }
    if (beat === "reveal") {
      this.pip.position.x = -0.37 + Smooth(p) * 0.32;
      this.cover.position.x = 0.8 - Smooth(p / 0.5) * 0.45;
      this.cover.position.y += Smooth((p - 0.5) / 0.5) * 0.08;
      coverAlpha = Smooth(p / 0.25);
      droneAlpha = Smooth((p - 0.25) / 0.35);
      reach = Smooth((p - 0.6) / 0.4);
    }
    if (beat === "untangle") {
      this.pip.position.x = -0.05;
      droneAlpha = 1;
      reach = 1;
      this.cover.position.x = 0.35 - Smooth(p) * 0.13;
      this.cover.position.y = 0.2 + Smooth(p) * 0.22;
      this.cover.rotation.z = -Smooth(p) * 0.5;
    }
    if (beat === "drone-departure") {
      this.pip.position.x = -0.05;
      reach = 1 - Smooth(p / 0.3);
      this.drone.position.x = 0.35 + Smooth(p) * 0.7;
      this.drone.position.y = Smooth(p) * 0.35;
      droneAlpha = 1 - Smooth((p - 0.55) / 0.4);
      this.drone.rotation.z = Math.sin(p * Math.PI * 5) * 0.15;
      this.cover.position.set(0.22 + Smooth(p) * 0.16, 0.42 - Smooth(p) * 0.3, 0.2);
      this.cover.rotation.z = -0.5;
    }
    if (beat === "trailing-cover") {
      this.pip.position.x = -0.05 - Smooth(p) * 0.67;
      this.cover.position.set(0.38 - Smooth(p) * 0.6, 0.12, 0.2);
      this.cover.rotation.z = -0.5 + Smooth(p) * 0.3;
    }
    if (beat === "final-surprise") {
      surprise = Math.sin(Math.min(1, p * 1.7) * Math.PI);
      const exit = Smooth((p - 0.35) / 0.65);
      this.cover.position.x = -0.22 + exit * 1.2;
      this.cover.position.y = 0.12 + exit * 0.13;
      this.cover.rotation.z = -0.2 + Smooth(p) * 0.6;
      coverAlpha = 1 - Smooth((p - 0.65) / 0.3);
    }
    this.drone.visible = droneAlpha > 0;
    this.cover.visible = coverAlpha > 0;
    for (const material of this.droneMaterials) material.opacity = droneAlpha;
    this.ghostMaterial.opacity = 0.82 * coverAlpha;
    this.pip.rotation.z += -surprise * (0.13 + (dream.variant || 0) * 0.035);
    this.head.rotation.z = -surprise * 0.16 - reach * 0.08;
    this.arms[0].rotation.z = -0.12 - surprise * 1.1;
    this.eye.scale.y = surprise ? 0.06 : 0.035;
    // Pivot at the shoulder and end the hand on the moving hem. A modest
    // telescoping toy arm keeps the miniature action readable without IK.
    const dx = this.cover.position.x - this.pip.position.x - this.pipArm.position.x;
    const dy = this.cover.position.y - 0.18 - this.pip.position.y - this.pipArm.position.y;
    const angle = Math.atan2(dx, -dy);
    const wave = beat === "drone-departure" ? Math.sin(p * Math.PI) * (0.7 + Math.sin(p * Math.PI * 4) * 0.18) : 0;
    this.pipArm.rotation.z = 0.12 + (angle - 0.12) * reach + wave * (1 - reach);
    this.pipArm.scale.y = 1 + (Math.max(0.65, Math.min(2.2, Math.hypot(dx, dy) / 0.26)) - 1) * reach;
  }
}
