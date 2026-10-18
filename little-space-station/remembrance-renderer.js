import * as THREE from "./vendor/three.module.js";
import { SERVICE_DECK_ANCHORS } from "./seasonal-service-deck.js";

const Clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const Smooth = (value) => { const t = Clamp01(value); return t * t * (3 - 2 * t); };

export class RemembranceVisual {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = "all-saints-remembrance-fixture";
    this.root.position.set(...SERVICE_DECK_ANCHORS.remembranceFixture);
    this.root.scale.setScalar(1.22);
    scene.station.add(this.root);

    const blue = new THREE.MeshStandardMaterial({ color: 0x294f72, roughness: 0.72, metalness: 0.16, flatShading: true });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4b664, emissive: 0x6d4b18, emissiveIntensity: 0.55, roughness: 0.52, metalness: 0.32, flatShading: true });
    this.lightMaterials = [];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.1, 10), blue);
    this.root.add(base);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.035), gold);
    plaque.position.set(0, 0.09, 0.28);
    plaque.rotation.x = -0.18;
    this.root.add(plaque);
    for (let index = 0; index < 5; index += 1) {
      const angle = -0.9 + index * 0.45;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.017, 0.3 + Math.cos(angle) * 0.1, 6), gold);
      stem.position.set(Math.sin(angle) * 0.29, 0.2 + Math.cos(angle) * 0.1, 0);
      this.root.add(stem);
      const material = new THREE.MeshStandardMaterial({ color: 0xe2b95e, emissive: 0xff8c2f, emissiveIntensity: 0, roughness: 0.3, flatShading: true });
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.082, 8, 6), material);
      light.position.set(stem.position.x, stem.position.y + 0.2, 0.02);
      this.root.add(light);
      this.lightMaterials.push(material);
    }
    this.haloMaterial = new THREE.MeshBasicMaterial({ color: 0xffcf76, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.halo = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), this.haloMaterial);
    this.halo.position.set(0, 0.34, -0.04);
    this.root.add(this.halo);
    this.pooledLight = new THREE.PointLight(0xffb45c, 0, 2.8, 2);
    this.pooledLight.position.set(0, 0.34, 0.38);
    this.root.add(this.pooledLight);
    this.root.visible = false;
  }

  update(state) {
    const seasonal = state.seasonal;
    const story = state.remembrance;
    const fixtureAvailable = Boolean(seasonal && seasonal.remembranceFixtureAvailable);
    this.root.visible = Boolean(seasonal && seasonal.serviceDeckActive !== false && (!seasonal.serviceDeck || seasonal.serviceDeck.ready)) && (fixtureAvailable || Boolean(story));
    if (!this.root.visible) return;
    let level = 0;
    if (story) level = story.lightLevel;
    else if (state.remembranceCompleted && seasonal && seasonal.remembranceLightsRemain) level = 0.72;
    level = Smooth(level);
    const shadowBoost = this.scene.environmentArtificialBoost || 0;
    const breath = 0.93 + Math.sin(this.scene.elapsed * 0.72) * 0.07;
    for (const material of this.lightMaterials) material.emissiveIntensity = level * (1.75 + shadowBoost * 1.2) * breath;
    this.haloMaterial.opacity = level * (0.12 + shadowBoost * 0.07) * breath;
    this.pooledLight.intensity = level * (0.42 + shadowBoost * 0.28) * breath;
    this.halo.scale.setScalar(0.92 + level * 0.1);
  }
}
