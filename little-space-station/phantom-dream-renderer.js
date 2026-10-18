import * as THREE from "./vendor/three.module.js";

const Smooth = (value) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

export class PhantomDreamVisual {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.name = "pip-phantom-dream";
    this.root.visible = false;
    scene.add(this.root);
    this.materials = [];
    const material = (color, opacity = 1) => {
      const result = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide });
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

    this.pip = new THREE.Group();
    this.bubble.add(this.pip);
    box(this.pip, teal, 0, 0.1, 0.12, 0.28, 0.34, 0.18);
    box(this.pip, cream, 0, 0.43, 0.12, 0.34, 0.24, 0.22);
    box(this.pip, dark, 0, 0.43, 0.25, 0.25, 0.09, 0.03);
    this.eye = box(this.pip, bright, 0, 0.43, 0.28, 0.16, 0.035, 0.02);
    this.pipArm = box(this.pip, orange, 0.22, 0.08, 0.15, 0.06, 0.3, 0.06);

    this.drone = new THREE.Group();
    this.bubble.add(this.drone);
    mesh(this.drone, sphereGeometry, teal, 0, 0, 0, 0.18, 0.12, 0.14);
    mesh(this.drone, sphereGeometry, bright, 0, 0, 0.14, 0.055, 0.035, 0.025);
    for (const side of [-1, 1]) {
      box(this.drone, orange, side * 0.22, 0, 0, 0.22, 0.04, 0.1);
      mesh(this.drone, sphereGeometry, dark, side * 0.35, 0.03, 0, 0.07, 0.035, 0.07);
    }

    this.cover = new THREE.Group();
    this.bubble.add(this.cover);
    mesh(this.cover, sphereGeometry, ghost, 0, 0.08, 0, 0.2, 0.17, 0.18);
    const skirt = mesh(this.cover, new THREE.ConeGeometry(0.26, 0.42, 7, 1, true), ghost, 0, -0.19, 0, 1);
    skirt.rotation.x = Math.PI;
    this.anchor = new THREE.Vector3();
    this.cameraAnchor = new THREE.Vector3();
  }

  update(dream, camera, robotHead) {
    this.root.visible = Boolean(dream && dream.type === "phantom-visitor-2026");
    if (!this.root.visible) return;
    robotHead.getWorldPosition(this.anchor);
    this.root.position.copy(this.anchor);
    this.root.quaternion.copy(camera.quaternion);
    camera.updateMatrixWorld();
    this.cameraAnchor.copy(this.anchor).applyMatrix4(camera.matrixWorldInverse);
    const halfHeight = -this.cameraAnchor.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfWidth = halfHeight * camera.aspect;
    const above = (halfHeight * 0.94 - this.cameraAnchor.y) / 2.54;
    const left = (halfWidth * 0.94 + this.cameraAnchor.x) / 2.76;
    this.root.scale.setScalar(Math.max(0.05, Math.min(1, above, left)));

    const p = Math.max(0, Math.min(1, dream.beatProgress || 0));
    const progress = Math.max(0, Math.min(1, dream.progress || 0));
    const fade = Smooth(progress / 0.06) * Smooth((1 - progress) / 0.08);
    for (const entry of this.materials) entry.material.opacity = entry.opacity * fade;
    const beat = dream.beatId;
    this.pip.position.set(-0.72, -0.34, 0.18);
    this.pip.rotation.z = 0;
    this.drone.position.set(0.45, 0, 0.18);
    this.drone.rotation.z = 0;
    this.cover.position.set(0.45, 0.12, 0.2);
    this.cover.rotation.z = 0;
    this.drone.visible = !["glimpse", "vanish", "search"].includes(beat);
    this.cover.visible = beat !== "search";
    let reach = 0;
    let surprise = 0;
    if (beat === "glimpse") this.cover.position.x = 1.05 - Smooth(p) * 0.8;
    if (beat === "vanish") this.cover.scale.setScalar(1 - Smooth(p) * 0.7);
    else this.cover.scale.setScalar(1);
    if (beat === "reveal") this.drone.scale.setScalar(0.6 + Smooth(p) * 0.4);
    else this.drone.scale.setScalar(1);
    if (beat === "untangle") {
      reach = Math.sin(p * Math.PI);
      this.cover.position.x = 0.45 + Smooth(p) * 0.52;
      this.cover.position.y = 0.12 + Smooth(p) * 0.28;
      this.cover.rotation.z = Smooth(p) * 0.55;
    }
    if (beat === "drone-departure") {
      this.drone.position.x = 0.45 + Smooth(p) * 0.62;
      this.drone.position.y = Smooth(p) * 0.48;
      this.drone.rotation.z = Math.sin(p * Math.PI * 5) * 0.15;
      this.cover.position.set(0.28, -0.18, 0.18);
    }
    if (beat === "trailing-cover") {
      this.pip.position.x = -0.2 - Smooth(p) * 0.55;
      this.cover.position.set(this.pip.position.x + 0.5, 0, 0.2);
      this.cover.rotation.z = Math.sin(p * Math.PI * 3) * 0.12;
      this.drone.visible = false;
    }
    if (beat === "final-surprise") {
      surprise = Math.sin(Math.min(1, p * 1.7) * Math.PI);
      this.cover.position.x = -0.1 + Smooth(p) * 1.3;
      this.cover.position.y = Math.sin(p * Math.PI) * 0.28;
      this.drone.visible = false;
    }
    this.pip.rotation.z = -surprise * 0.18;
    this.eye.scale.y = surprise ? 0.06 : 0.035;
    this.pipArm.rotation.z = -0.1 + reach * 1.05 + (beat === "drone-departure" ? 0.7 + Math.sin(p * Math.PI * 4) * 0.18 : 0);
  }
}
