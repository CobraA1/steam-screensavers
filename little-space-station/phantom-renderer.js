import * as THREE from "./vendor/three.module.js";

const Clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const Smooth = (value) => { const t = Clamp01(value); return t * t * (3 - 2 * t); };

function BasicMaterial(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.76, metalness: 0.04, flatShading: true, depthWrite: opacity >= 1 });
}

function BuildCover() {
  const root = new THREE.Group();
  const material = BasicMaterial(0xe8e5d7, 0.84);
  const rim = BasicMaterial(0xb8c5c2, 0.68);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), material);
  crown.scale.set(1, 0.84, 0.9);
  root.add(crown);
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 7, 1, true), material);
  skirt.position.y = -0.28;
  skirt.rotation.x = Math.PI;
  root.add(skirt);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.018, 5, 9), rim);
  edge.position.y = -0.53;
  edge.rotation.x = Math.PI / 2;
  root.add(edge);
  root.userData.materials = [material, rim];
  return root;
}

function BuildDrone() {
  const root = new THREE.Group();
  const teal = BasicMaterial(0x367b7b);
  const orange = BasicMaterial(0xd27637);
  const dark = BasicMaterial(0x26343b);
  const glow = new THREE.MeshStandardMaterial({ color: 0xb1fff0, emissive: 0x54e6c8, emissiveIntensity: 2.5, roughness: 0.18 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 6), teal);
  body.scale.set(1.15, 0.72, 0.82);
  root.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), glow);
  eye.position.set(0, 0.02, 0.18);
  eye.scale.set(1.25, 0.72, 0.45);
  root.add(eye);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.14), orange);
    wing.position.x = side * 0.27;
    wing.rotation.z = side * 0.12;
    root.add(wing);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 8), dark);
    rotor.position.set(side * 0.4, 0.04, 0);
    root.add(rotor);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), glow);
  beacon.position.y = 0.18;
  root.add(beacon);
  root.userData.eye = eye;
  return root;
}

export class PhantomVisitorVisual {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = "phantom-visitor-story";
    scene.station.add(this.root);
    this.cover = BuildCover();
    this.looseCover = BuildCover();
    this.drone = BuildDrone();
    this.root.add(this.cover, this.looseCover, this.drone);
    this.workPosition = new THREE.Vector3(-2.7, 1.92, 1.72);
    this.glimpseStart = new THREE.Vector3(-4.15, 2.48, 1.3);
    this.droneExit = new THREE.Vector3(-4.5, 3.55, 0.6);
    this.scratchStart = new THREE.Vector3();
    this.scratchEnd = new THREE.Vector3();
    this.hide();
  }

  hide() {
    this.root.visible = false;
    this.cover.visible = false;
    this.looseCover.visible = false;
    this.drone.visible = false;
  }

  SetCoverOpacity(cover, opacity) {
    for (const material of cover.userData.materials) material.opacity = opacity * (material === cover.userData.materials[0] ? 0.9 : 0.7);
  }

  update(story) {
    if (!story || story.id !== "phantom-visitor-2026") {
      this.hide();
      return;
    }
    this.root.visible = true;
    this.cover.visible = false;
    this.looseCover.visible = false;
    this.drone.visible = false;
    const p = Clamp01(story.progress);
    const beat = story.beatId;
    const variant = story.variant || 0;
    const bob = Math.sin(this.scene.elapsed * (1.6 + variant * 0.16)) * 0.045;
    const actorScale = 1.28;
    this.cover.scale.setScalar(actorScale);
    this.looseCover.scale.setScalar(actorScale);
    this.drone.scale.setScalar(actorScale);

    if (beat === "glimpse") {
      this.cover.visible = true;
      this.cover.position.lerpVectors(this.glimpseStart, this.workPosition, Smooth(p));
      this.cover.position.y += bob;
      this.cover.rotation.z = -0.12 + Math.sin(p * Math.PI * 2) * 0.1;
      this.SetCoverOpacity(this.cover, Math.sin(Math.min(1, p * 1.15) * Math.PI * 0.72));
    } else if (beat === "vanish") {
      this.cover.visible = p < 0.88;
      this.cover.position.copy(this.workPosition);
      this.cover.position.y += bob;
      this.cover.scale.setScalar(actorScale * (1 - Smooth(p) * 0.42));
      this.SetCoverOpacity(this.cover, 1 - Smooth(p));
    } else if (beat === "reveal") {
      this.cover.visible = true;
      this.drone.visible = p >= 0.28;
      this.cover.position.copy(this.workPosition);
      this.cover.scale.setScalar(actorScale);
      this.SetCoverOpacity(this.cover, 0.92 - Smooth(p) * 0.28);
      this.drone.position.copy(this.workPosition);
      this.drone.position.set(this.drone.position.x + 0.02, this.drone.position.y - 0.08, this.drone.position.z + 0.01);
      this.drone.rotation.z = 0.38 - p * 0.12;
      this.drone.scale.setScalar(actorScale * (0.72 + Smooth(p) * 0.28));
    } else if (beat === "untangle") {
      this.cover.visible = true;
      this.drone.visible = true;
      this.drone.position.copy(this.workPosition);
      this.drone.position.y += Math.sin(p * Math.PI * 4) * 0.018;
      this.drone.rotation.z = (1 - Smooth(p)) * 0.24;
      this.drone.scale.setScalar(actorScale);
      this.cover.position.copy(this.workPosition);
      this.cover.position.set(this.cover.position.x - Smooth(p) * 0.52, this.cover.position.y + Smooth(p) * 0.3, this.cover.position.z + 0.08);
      this.cover.rotation.z = -Smooth(p) * 0.62;
      this.cover.scale.setScalar(actorScale * (1 - Smooth(p) * 0.15));
      this.SetCoverOpacity(this.cover, 0.82);
    } else if (beat === "drone-departure") {
      this.drone.visible = p < 0.96;
      this.looseCover.visible = true;
      this.drone.position.lerpVectors(this.workPosition, this.droneExit, Smooth(p));
      this.drone.position.y += Math.sin(p * Math.PI * 5) * 0.08;
      this.drone.rotation.z = Math.sin(p * Math.PI * 2) * 0.2;
      this.looseCover.position.copy(this.workPosition);
      this.looseCover.position.set(this.looseCover.position.x - 0.48, this.looseCover.position.y + 0.12 + bob, this.looseCover.position.z + 0.04);
      this.looseCover.rotation.z = -0.5 + Math.sin(this.scene.elapsed * 0.8) * 0.08;
      this.SetCoverOpacity(this.looseCover, 0.75);
    } else if (beat === "trailing-cover") {
      this.looseCover.visible = true;
      this.looseCover.position.copy(this.scene.robot.position);
      this.looseCover.position.set(this.looseCover.position.x - 0.58 + p * 0.2, this.looseCover.position.y + 0.62 + bob, this.looseCover.position.z - 0.04);
      this.looseCover.rotation.z = -0.24 + Math.sin(p * Math.PI * 3) * 0.12;
      this.SetCoverOpacity(this.looseCover, 0.78);
    } else if (beat === "final-surprise") {
      this.looseCover.visible = p < 0.9;
      this.scratchStart.copy(this.scene.robot.position).set(
        this.scene.robot.position.x - 0.45,
        this.scene.robot.position.y + 0.62,
        this.scene.robot.position.z - 0.02,
      );
      this.scratchEnd.copy(this.scene.robot.position).set(
        this.scene.robot.position.x + 1.7,
        this.scene.robot.position.y + 1.05,
        this.scene.robot.position.z + 0.2,
      );
      this.looseCover.position.lerpVectors(this.scratchStart, this.scratchEnd, Smooth(p));
      this.looseCover.position.y += Math.sin(p * Math.PI * 3) * 0.12;
      this.looseCover.rotation.z = -0.2 + p * 0.8;
      this.SetCoverOpacity(this.looseCover, (1 - Smooth(Math.max(0, (p - 0.65) / 0.35))) * 0.82);
    }
    if (this.drone.visible) {
      const happy = beat === "drone-departure" ? 1 + Math.sin(p * Math.PI * 8) * 0.22 : 1;
      this.drone.userData.eye.scale.set(1.25 * happy, 0.72 / happy, 0.45);
    }
  }
}
