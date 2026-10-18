import * as THREE from "./vendor/three.module.js";
import { SERVICE_DECK_ANCHORS } from "./seasonal-service-deck.js";

function MakeMaterial(color, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness: 0.72, metalness: 0.08, flatShading: true });
}

function MakeRod(start, end, radius, material, segments = 6) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), material);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return rod;
}

function AddGourd(group, position, scale, bodyMaterial, stemMaterial) {
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bodyMaterial);
  body.position.copy(position);
  body.scale.set(scale, scale * 0.78, scale * 0.9);
  group.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.11, 5), stemMaterial);
  stem.position.copy(position);
  stem.position.y += 0.14 * scale;
  stem.rotation.z = 0.18;
  group.add(stem);
}

export class Autumn2026Visual {
  constructor(scene) {
    this.scene = scene;
    this.station = scene.station;
    this.scratchWorld = new THREE.Vector3();
    this.scratchLocal = new THREE.Vector3();
    this.targetPositions = Object.freeze({
      ...Object.fromEntries(Object.entries(SERVICE_DECK_ANCHORS.decorations)
        .map(([id, position]) => [id, new THREE.Vector3(...position)])),
      "pip-halloween-cap": new THREE.Vector3(-0.2, 2.04, 0.72),
    });
    this.items = new Map();
    this.glowMaterials = [];
    this.halloweenGlowMaterials = [];
    this.Build();
  }

  Build() {
    const orange = MakeMaterial(0xd56f32);
    const ochre = MakeMaterial(0xc99a42);
    const cream = MakeMaterial(0xe1c47a);
    const green = MakeMaterial(0x607342);
    const copper = MakeMaterial(0xa74c31);
    const dark = MakeMaterial(0x3e3930);
    const purple = MakeMaterial(0x5f3974);
    const ghostWhite = MakeMaterial(0xe9e1cc, 0x8169a1, 0.22);
    const nearBlack = MakeMaterial(0x191724);

    const gourds = new THREE.Group();
    gourds.position.copy(this.targetPositions["gourd-cluster"]);
    AddGourd(gourds, new THREE.Vector3(-0.14, 0, 0), 1, orange, green);
    AddGourd(gourds, new THREE.Vector3(0.13, -0.025, 0.03), 0.76, ochre, green);
    AddGourd(gourds, new THREE.Vector3(0, 0.035, -0.08), 0.58, cream, green);
    this.station.add(gourds);
    this.items.set("gourd-cluster", gourds);

    const lantern = new THREE.Group();
    lantern.position.copy(this.targetPositions["harvest-lantern"]);
    const lanternGlow = MakeMaterial(0xffbd58, 0xff7829, 2.2);
    this.glowMaterials.push(lanternGlow);
    lantern.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.18), lanternGlow));
    const lanternTop = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.06, 6), dark);
    lanternTop.position.y = 0.15;
    lantern.add(lanternTop);
    lantern.add(MakeRod(new THREE.Vector3(-0.09, 0.16, 0), new THREE.Vector3(0, 0.3, 0), 0.012, copper, 5));
    lantern.add(MakeRod(new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.09, 0.16, 0), 0.012, copper, 5));
    this.station.add(lantern);
    this.items.set("harvest-lantern", lantern);

    const garland = new THREE.Group();
    garland.position.copy(this.targetPositions["warm-garland"]);
    const cord = MakeRod(new THREE.Vector3(-0.72, 0.06, 0), new THREE.Vector3(0.72, -0.04, 0), 0.018, green, 6);
    garland.add(cord);
    for (let index = 0; index < 7; index += 1) {
      const t = index / 6;
      const bulbMaterial = MakeMaterial(index % 2 ? 0xe99b3e : 0xc95b35, index % 2 ? 0xff9d36 : 0xef542c, 1.8);
      this.glowMaterials.push(bulbMaterial);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.048, 7, 5), bulbMaterial);
      bulb.position.set(-0.7 + t * 1.4, 0.055 - t * 0.1 - Math.sin(t * Math.PI) * 0.11, 0.025);
      garland.add(bulb);
    }
    this.station.add(garland);
    this.items.set("warm-garland", garland);

    const sprig = new THREE.Group();
    sprig.position.copy(this.targetPositions["leaf-sprig"]);
    sprig.add(MakeRod(new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(0.3, 0, 0), 0.014, green, 5));
    for (let index = 0; index < 5; index += 1) {
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.075, 5), index % 2 ? copper : ochre);
      const t = index / 4;
      leaf.scale.set(0.55, 1, 1);
      leaf.position.set(-0.25 + t * 0.5, index % 2 ? -0.035 : 0.035, 0.018);
      leaf.rotation.z = index % 2 ? -0.82 : 0.82;
      sprig.add(leaf);
    }
    this.station.add(sprig);
    this.items.set("leaf-sprig", sprig);

    const markedCrate = new THREE.Group();
    markedCrate.position.copy(this.targetPositions["marked-seasonal-crate"]);
    markedCrate.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.24), purple));
    const crateBand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.27), orange);
    markedCrate.add(crateBand);
    const crateMoon = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 5, 9, Math.PI * 1.45), cream);
    crateMoon.position.z = 0.135;
    crateMoon.rotation.z = 0.45;
    markedCrate.add(crateMoon);
    this.station.add(markedCrate);
    this.items.set("marked-seasonal-crate", markedCrate);

    const jack = new THREE.Group();
    jack.position.copy(this.targetPositions["jack-o-lantern"]);
    AddGourd(jack, new THREE.Vector3(), 1.22, orange, green);
    const jackGlow = MakeMaterial(0xffc457, 0xff6a22, 2.4);
    this.glowMaterials.push(jackGlow);
    this.halloweenGlowMaterials.push(jackGlow);
    for (const x of [-0.065, 0.065]) {
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.028, 3), jackGlow);
      eye.position.set(x, 0.025, 0.153);
      eye.rotation.z = x < 0 ? 0.2 : -0.2;
      jack.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.062, 6, 1, Math.PI * 0.15, Math.PI * 0.7), jackGlow);
    mouth.position.set(0, -0.05, 0.155);
    mouth.rotation.z = 0.08;
    jack.add(mouth);
    this.station.add(jack);
    this.items.set("jack-o-lantern", jack);

    const halloweenLights = new THREE.Group();
    halloweenLights.position.copy(this.targetPositions["halloween-lights"]);
    halloweenLights.add(MakeRod(new THREE.Vector3(-0.66, 0.05, 0), new THREE.Vector3(0.66, -0.04, 0), 0.015, nearBlack, 6));
    for (let index = 0; index < 7; index += 1) {
      const t = index / 6;
      const bulbMaterial = MakeMaterial(index % 2 ? 0x864ba1 : 0xea7134, index % 2 ? 0x8f48c5 : 0xff6328, 2.1);
      this.glowMaterials.push(bulbMaterial);
      this.halloweenGlowMaterials.push(bulbMaterial);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 5), bulbMaterial);
      bulb.position.set(-0.64 + t * 1.28, 0.04 - t * 0.09 - Math.sin(t * Math.PI) * 0.09, 0.025);
      halloweenLights.add(bulb);
    }
    this.station.add(halloweenLights);
    this.items.set("halloween-lights", halloweenLights);

    const ghostPennant = new THREE.Group();
    ghostPennant.position.copy(this.targetPositions["ghost-pennant"]);
    const pennantMast = MakeRod(new THREE.Vector3(-0.24, -0.24, 0), new THREE.Vector3(-0.24, 0.36, 0), 0.02, dark, 6);
    ghostPennant.add(pennantMast);
    ghostPennant.add(MakeRod(new THREE.Vector3(-0.24, 0.3, 0), new THREE.Vector3(0.02, 0.3, 0), 0.015, dark, 6));
    const ghost = new THREE.Group();
    ghost.position.set(0.08, 0.13, 0.03);
    const ghostHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), ghostWhite);
    ghost.add(ghostHead);
    const ghostSkirt = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 7, 1, true), ghostWhite);
    ghostSkirt.position.y = -0.17;
    ghostSkirt.rotation.x = Math.PI;
    ghost.add(ghostSkirt);
    for (const x of [-0.045, 0.045]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), nearBlack);
      eye.position.set(x, 0.025, 0.12);
      ghost.add(eye);
    }
    ghostPennant.add(ghost);
    ghostPennant.userData.ghost = ghost;
    this.station.add(ghostPennant);
    this.items.set("ghost-pennant", ghostPennant);
    this.ghostPennant = ghostPennant;

    const pipCap = new THREE.Group();
    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 10), nearBlack);
    pipCap.add(capBrim);
    const capCone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 8), purple);
    capCone.position.y = 0.14;
    capCone.rotation.z = -0.16;
    pipCap.add(capCone);
    pipCap.position.set(0, 0.23, 0);
    pipCap.scale.setScalar(0.78);
    this.scene.robotHead.add(pipCap);
    this.items.set("pip-halloween-cap", pipCap);

    const distantMaterial = new THREE.MeshBasicMaterial({ color: 0xc8b1ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.distantOddity = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), distantMaterial);
    this.distantOddity.visible = false;
    this.scene.scene.add(this.distantOddity);

    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x050510, transparent: true, opacity: 0.22, depthWrite: false });
    this.crossingShadow = new THREE.Mesh(new THREE.CircleGeometry(0.52, 12), shadowMaterial);
    this.crossingShadow.scale.set(1.8, 0.52, 1);
    this.crossingShadow.visible = false;
    this.station.add(this.crossingShadow);

    this.carriedDecoration = new THREE.Group();
    const carriedBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), orange.clone());
    carriedBody.scale.set(0.72, 1, 0.3);
    this.carriedDecoration.add(carriedBody);
    this.carriedBodyMaterial = carriedBody.material;
    const carriedStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.1, 5), green);
    carriedStem.position.y = 0.18;
    carriedStem.rotation.z = 0.38;
    this.carriedDecoration.add(carriedStem);
    this.carriedDecoration.visible = false;
    this.station.add(this.carriedDecoration);
  }

  Update(state) {
    const seasonal = state.seasonal;
    const installed = new Set(seasonal && seasonal.installedDecorations || []);
    const installation = seasonal && seasonal.installation;
    for (const [id, object] of this.items) {
      let visible = installed.has(id);
      if (installation && installation.targetId === id) {
        visible = installation.action === "remove"
          ? visible && installation.overallProgress < 0.48
          : visible && installation.overallProgress >= 0.76;
      }
      object.visible = visible;
    }

    this.carriedDecoration.visible = false;
    const carryingInstall = installation && ["collect-decoration", "carry-decoration", "install-decoration"].includes(state.pipTaskStage);
    const carryingCleanup = installation && ["remove-decoration", "carry-away", "stow-decoration"].includes(state.pipTaskStage);
    if (carryingInstall || carryingCleanup) {
      this.carriedDecoration.visible = true;
      this.carriedBodyMaterial.color.setHex(installation.targetId.includes("halloween") || installation.targetId.includes("ghost") || installation.targetId.includes("jack") ? 0x6d3d82 : 0xd56f32);
      this.scene.robotCargoGrip.getWorldPosition(this.scratchWorld);
      this.scratchLocal.copy(this.scratchWorld);
      this.station.worldToLocal(this.scratchLocal);
      const target = this.targetPositions[installation.targetId] || this.targetPositions["warm-garland"];
      if (state.pipTaskStage === "install-decoration") {
        this.carriedDecoration.position.lerpVectors(this.scratchLocal, target, Math.min(1, state.pipTaskProgress * 1.25));
        this.carriedDecoration.scale.setScalar(1 - Math.min(0.42, state.pipTaskProgress * 0.42));
      } else if (state.pipTaskStage === "remove-decoration") {
        this.carriedDecoration.position.lerpVectors(target, this.scratchLocal, Math.min(1, state.pipTaskProgress * 1.35));
        this.carriedDecoration.scale.setScalar(0.8);
      } else {
        this.carriedDecoration.position.copy(this.scratchLocal);
        this.carriedDecoration.scale.setScalar(1);
      }
      this.carriedDecoration.rotation.z = Math.sin(this.scene.elapsed * 2.2) * 0.06;
    }

    const oddity = seasonal && seasonal.ambientOddity;
    this.distantOddity.visible = Boolean(oddity && oddity.id === "distant-light");
    if (this.distantOddity.visible) {
      const sweep = oddity.progress * 2 - 1;
      this.distantOddity.position.set(-7 + sweep * 10, 4.2 + Math.sin(oddity.progress * Math.PI) * 1.1, -10);
      this.distantOddity.material.opacity = Math.sin(oddity.progress * Math.PI) * 0.85;
      this.distantOddity.scale.setScalar(0.7 + Math.sin(this.scene.elapsed * 7) * 0.18);
    }
    this.crossingShadow.visible = Boolean(oddity && oddity.id === "crossing-shadow");
    if (this.crossingShadow.visible) {
      this.crossingShadow.position.set(-2.4 + oddity.progress * 4.8, 0.66, 1.25);
      this.crossingShadow.rotation.z = -0.18;
      this.crossingShadow.material.opacity = Math.sin(oddity.progress * Math.PI) * 0.28;
    }
    if (this.ghostPennant) {
      const ghost = this.ghostPennant.userData.ghost;
      ghost.rotation.z = oddity && oddity.id === "decor-shift"
        ? Math.sin(oddity.progress * Math.PI * 5) * Math.sin(oddity.progress * Math.PI) * 0.3
        : Math.sin(this.scene.elapsed * 0.42) * 0.018;
    }

    const shadowBoost = this.scene.environmentArtificialBoost || 0;
    const pulse = 0.88 + Math.sin(this.scene.elapsed * 1.25) * 0.12;
    for (const material of this.glowMaterials) {
      const halloweenQuiet = seasonal && seasonal.phase === "all-saints" && this.halloweenGlowMaterials.includes(material);
      material.emissiveIntensity = halloweenQuiet ? 0.12 : (1.55 + shadowBoost * 1.4) * pulse;
    }
  }
}
