import * as THREE from "./vendor/three.module.js";

function Clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function Smooth(value) { const t = Clamp01(value); return t * t * (3 - 2 * t); }

function CargoGripPosition(scene) {
  scene.robotCargoGrip.getWorldPosition(scene.robotCargoWorldPosition);
  scene.station.worldToLocal(scene.robotCargoWorldPosition);
  return scene.robotCargoWorldPosition;
}

function BuildCargoPackage(materials) {
  const group = new THREE.Group();
  const bodyMaterial = materials.ivory.clone();
  const railMaterial = materials.orange.clone();
  const markMaterial = new THREE.MeshStandardMaterial({ color: 0xf0d889, roughness: 0.62, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.38), bodyMaterial);
  group.add(body);
  for (const x of [-0.19, 0.19]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.4, 0.43), railMaterial);
    rail.position.x = x;
    group.add(rail);
  }
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), markMaterial);
  leaf.scale.set(0.62, 1, 1);
  leaf.rotation.z = -0.62;
  leaf.position.set(0, 0, 0.198);
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), markMaterial);
  gourd.scale.set(1.05, 0.78, 0.28);
  gourd.position.set(0, 0, 0.202);
  const sun = new THREE.Mesh(new THREE.RingGeometry(0.042, 0.09, 8), markMaterial);
  sun.position.set(0, 0, 0.201);
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 5, 9, Math.PI * 1.45), markMaterial);
  moon.position.set(0, 0, 0.201);
  moon.rotation.z = 0.48;
  const ghost = new THREE.Group();
  const ghostHead = new THREE.Mesh(new THREE.CircleGeometry(0.065, 7), markMaterial);
  ghost.add(ghostHead);
  const ghostTail = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 6), markMaterial);
  ghostTail.position.y = -0.075;
  ghostTail.rotation.x = Math.PI;
  ghost.add(ghostTail);
  ghost.position.set(0, 0.035, 0.202);
  group.add(leaf, gourd, sun, moon, ghost);
  group.userData.packageParts = { bodyMaterial, railMaterial, markMaterial, leaf, gourd, sun, moon, ghost };
  group.visible = false;
  return group;
}

function SetPackageStyle(group, descriptor) {
  const parts = group.userData.packageParts;
  const styleKey = descriptor ? descriptor.id : "ordinary";
  if (group.userData.styleKey === styleKey) return;
  group.userData.styleKey = styleKey;
  parts.bodyMaterial.color.setHex(descriptor ? descriptor.bodyColor : 0xe7dcc0);
  parts.railMaterial.color.setHex(descriptor ? descriptor.railColor : 0xb95532);
  parts.markMaterial.color.setHex(descriptor ? descriptor.markColor : 0xf0d889);
  parts.leaf.visible = descriptor && descriptor.symbol === "leaf";
  parts.gourd.visible = descriptor && descriptor.symbol === "gourd";
  parts.sun.visible = descriptor && descriptor.symbol === "sun";
  parts.moon.visible = descriptor && descriptor.symbol === "moon";
  parts.ghost.visible = descriptor && descriptor.symbol === "ghost";
}

function CargoStartPosition(scene, index, count, target) {
  const column = index % 2;
  const row = Math.floor(index / 2);
  target.copy(scene.cargoStart);
  target.y += count === 2 ? (index - 0.5) * 0.34 : (row - (count > 2 ? 0.5 : 0)) * 0.34;
  target.z += count > 1 ? (column - 0.5) * 0.42 : 0;
  return target;
}

export function BuildStationDetails(station, materials) {
  const lightHousing = new THREE.Group();
  lightHousing.position.set(0.82, 0.72, 0.94);
  station.add(lightHousing);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.12), materials.dark);
  lightHousing.add(housing);
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0x91f4ce,
    emissive: 0x54ffc1,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const equipmentLight = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.13, 0.06), lightMaterial);
  equipmentLight.position.z = 0.09;
  lightHousing.add(equipmentLight);
  const equipmentGlow = new THREE.PointLight(0x62f0c0, 1.6, 2.4, 2);
  equipmentGlow.position.z = 0.18;
  lightHousing.add(equipmentGlow);

  const cargoHatch = new THREE.Group();
  cargoHatch.position.set(1.12, 0.34, 0.94);
  station.add(cargoHatch);
  const hatchFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.58, 0.12), materials.metal);
  cargoHatch.add(hatchFrame);
  const hatchDoor = new THREE.Group();
  hatchDoor.position.set(-0.265, 0, 0.09);
  cargoHatch.add(hatchDoor);
  const hatchDoorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.4, 0.07), materials.orange);
  hatchDoorPanel.position.x = 0.265;
  hatchDoor.add(hatchDoorPanel);

  const cargoContainers = [];
  for (let index = 0; index < 4; index += 1) {
    const cargoPackage = BuildCargoPackage(materials);
    station.add(cargoPackage);
    cargoContainers.push(cargoPackage);
  }
  const cargoContainer = cargoContainers[0];

  const cargoStart = new THREE.Vector3(2.92, 0.48, 0.68);
  const cargoEnd = new THREE.Vector3(1.3, 0.58, 0.88);
  return { equipmentLight, equipmentGlow, lightHousing, cargoHatch, hatchDoor, cargoContainer, cargoContainers, cargoPackageStart: new THREE.Vector3(), lightMaterial, cargoStart, cargoEnd };
}

export function UpdateStationDetails(scene, state) {
  const lightState = state.equipmentLightState || "normal";
  let lightLevel = 1;
  if (lightState === "flickering") {
    const irregular = Math.sin(scene.elapsed * 31) + Math.sin(scene.elapsed * 13.7 + 1.8);
    lightLevel = irregular > 0.45 ? 1 : 0.03;
  } else if (lightState === "repairing") {
    lightLevel = 0.15 + Math.abs(Math.sin(scene.elapsed * 8.5)) * 0.45;
  }
  const shadowBoost = 1 + (scene.environmentArtificialBoost || 0) * 0.7;
  scene.lightMaterial.emissiveIntensity = 3.1 * lightLevel * shadowBoost;
  scene.equipmentGlow.intensity = 1.8 * lightLevel * shadowBoost;
  scene.equipmentLight.scale.setScalar(0.96 + lightLevel * 0.09);

  const cargoState = state.cargoState || "none";
  const manifest = Array.isArray(state.cargoManifest) && state.cargoManifest.length ? state.cargoManifest : [null];
  const count = Math.min(scene.cargoContainers.length, state.cargoPackageCount || (cargoState === "none" ? 0 : 1));
  const currentIndex = Math.min(count, Math.max(0, state.cargoPackageIndex || 0));
  for (let index = 0; index < scene.cargoContainers.length; index += 1) {
    const cargoPackage = scene.cargoContainers[index];
    SetPackageStyle(cargoPackage, manifest[index] || null);
    cargoPackage.visible = index < count && index >= currentIndex;
    cargoPackage.scale.setScalar(manifest[index] ? manifest[index].scale : 1);
    if (cargoPackage.visible) CargoStartPosition(scene, index, count, cargoPackage.position);
  }
  const cargoContainer = currentIndex < count ? scene.cargoContainers[currentIndex] : scene.cargoContainer;
  const baseScale = manifest[currentIndex] ? manifest[currentIndex].scale : 1;
  cargoContainer.visible = currentIndex < count && cargoState !== "none" && cargoState !== "stored";
  cargoContainer.scale.setScalar(baseScale);
  if (cargoState === "ship") {
    CargoStartPosition(scene, currentIndex, count, cargoContainer.position);
    scene.hatchDoor.rotation.y = 0;
  } else if (cargoState === "carried") {
    const grip = CargoGripPosition(scene);
    if (state.pipTaskStage === "retrieve-cargo") {
      CargoStartPosition(scene, currentIndex, count, scene.cargoPackageStart);
      cargoContainer.position.lerpVectors(scene.cargoPackageStart, grip, Smooth(state.pipTaskProgress));
    } else {
      cargoContainer.position.copy(grip);
    }
    scene.hatchDoor.rotation.y = 0;
  } else if (cargoState === "stowing") {
    const stow = Smooth(state.pipTaskProgress);
    cargoContainer.position.lerpVectors(CargoGripPosition(scene), scene.cargoEnd, stow);
    cargoContainer.position.z += stow * 0.12;
    cargoContainer.scale.setScalar(baseScale * (1 - stow * 0.82));
    scene.hatchDoor.rotation.y = -stow * Math.PI * 0.42;
  } else if (cargoState === "stored" && state.pipTaskStage === "verify") {
    scene.hatchDoor.rotation.y = -(1 - Smooth(state.pipTaskProgress)) * Math.PI * 0.42;
  } else {
    scene.hatchDoor.rotation.y = 0;
  }
}
