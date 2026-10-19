import * as THREE from "./vendor/three.module.js";
import { CreatePhantomCoverMesh } from "./phantom-cover-geometry.js";
import { Ease, PhantomActors } from "./phantom-choreography.js";

const Clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function BasicMaterial(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.76, metalness: 0.04, flatShading: true, depthWrite: opacity >= 1 });
}

function BuildCover() {
  const root = new THREE.Group();
  const material = BasicMaterial(0xe8e5d7, 0.9);
  root.add(CreatePhantomCoverMesh(material));
  root.userData.materials = [material];
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
    // A soft, unshadowed fill preserves the reveal in planetary night without
    // changing the station's orbital lighting or flattening the whole scene.
    this.storyFill = new THREE.PointLight(0xb6d8de, 2.2, 6, 2);
    this.storyFill.position.set(-1.5, 3.2, 3.8);
    this.root.add(this.storyFill);
    this.droneMaterials = [];
    this.drone.traverse(object => {
      if (!object.material || this.droneMaterials.includes(object.material)) return;
      object.material.transparent = true;
      this.droneMaterials.push(object.material);
    });
    this.hide();
  }

  hide() {
    this.root.visible = false;
    this.cover.visible = false;
    this.looseCover.visible = false;
    this.drone.visible = false;
  }

  SetCoverOpacity(cover, opacity) {
    for (const material of cover.userData.materials) material.opacity = opacity * 0.9;
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
    this.storyFill.intensity = 2.2 * (beat === "glimpse" ? Ease(p / 0.2)
      : beat === "final-surprise" ? Ease((1 - p) / 0.25) : 1);
    const actorScale = 1.28;
    this.cover.scale.setScalar(actorScale);
    this.looseCover.scale.setScalar(actorScale);
    this.drone.scale.setScalar(actorScale);

    const actors = PhantomActors(beat, p, this.scene.robotHome.toArray());
    const loose = ["drone-departure", "trailing-cover", "final-surprise"].includes(beat);
    const cover = loose ? this.looseCover : this.cover;
    cover.visible = actors.coverOpacity > 0;
    cover.position.fromArray(actors.cover);
    cover.rotation.set(0, 0, actors.roll);
    this.SetCoverOpacity(cover, actors.coverOpacity);
    this.drone.visible = actors.droneOpacity > 0;
    this.drone.position.fromArray(actors.drone);
    this.drone.rotation.set(0, 0, beat === "drone-departure" ? Math.sin(p * Math.PI * 4) * 0.12 : 0);
    for (const material of this.droneMaterials) material.opacity = actors.droneOpacity;
    if (this.drone.visible) {
      const happy = beat === "drone-departure" ? 1 + Math.sin(p * Math.PI * 8) * 0.22 : 1;
      this.drone.userData.eye.scale.set(1.25 * happy, 0.72 / happy, 0.45);
    }
  }
}
