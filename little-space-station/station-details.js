import * as THREE from "./vendor/three.module.js";
import { TransferPosition, CargoRackPosition, CargoBayFold } from './cargo-choreography.js';

function Clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function Smooth(value) { const t = Clamp01(value); return t * t * (3 - 2 * t); }

function BuildDispatchCanister(materials) {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: 0x3d9d96,
    roughness: 0.42,
    metalness: 0.32,
    flatShading: true,
  });
  const signal = new THREE.MeshStandardMaterial({
    color: 0xffd479,
    emissive: 0xd66d27,
    emissiveIntensity: 1.7,
    roughness: 0.35,
  });
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 10), shell));
  for (const y of [-0.14, 0.14]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.035, 10), materials.dark);
    cap.position.y = y;
    group.add(cap);
  }
  for (const y of [-0.1, 0.1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.012, 5, 10), materials.orange);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }
  const dispatchStripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.025), signal);
  dispatchStripe.position.z = 0.09;
  dispatchStripe.rotation.z = -0.55;
  group.add(dispatchStripe);
  group.visible = false;
  return group;
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
  parts.leaf.visible = Boolean(descriptor && descriptor.symbol === "leaf");
  parts.gourd.visible = Boolean(descriptor && descriptor.symbol === "gourd");
  parts.sun.visible = Boolean(descriptor && descriptor.symbol === "sun");
  parts.moon.visible = Boolean(descriptor && descriptor.symbol === "moon");
  parts.ghost.visible = Boolean(descriptor && descriptor.symbol === "ghost");
}

function CargoStartPosition(scene, index, count, target) {
  return CargoRackPosition(scene, index, count, target);
}

export function BuildStationDetails(station, materials) {
  const lightHousing = new THREE.Group();
  lightHousing.position.set(0.32, 0.64, 0.94);
  station.add(lightHousing);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.38), materials.dark);
  housing.position.z = -0.1;
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
  cargoHatch.position.set(1.05, 0.48, 1.06);
  station.add(cargoHatch);
  for (const x of [-0.32, 0.32]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.5), materials.metal);
    jamb.position.set(x, 0, -0.16); cargoHatch.add(jamb);
  }
  for (const y of [-0.27, 0.27]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.5), materials.metal);
    jamb.position.set(0, y, -0.16); cargoHatch.add(jamb);
  }
  const hatchRecess = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.035), materials.black);
  hatchRecess.position.z = -0.02;
  cargoHatch.add(hatchRecess);
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
  const dispatchCanister = BuildDispatchCanister(materials);
  station.add(dispatchCanister);

  const cargoEnd = new THREE.Vector3(1.05, 0.48, 0.7);
  return {
    equipmentLight, equipmentGlow, lightHousing, cargoHatch, hatchDoor,
    cargoContainer, cargoContainers, cargoPackageStart: new THREE.Vector3(),
    dispatchCanister,
    lightMaterial, cargoEnd,
  };
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

  const dispatch = state.visitorType === 'courier' || state.pipTaskId === 'dispatch-exchange';
  const incoming = state.shipVisible && ['courier', 'freighter'].includes(state.visitorType) && ['approach', 'dock'].includes(state.phase);
  const cargoState = incoming ? 'ship' : state.cargoState || 'none';
  const stage = state.pipTaskStage, p = Clamp01(state.pipTaskProgress);
  for (const bay of scene.shipCargoBays || []) {
    const fold = CargoBayFold(state, bay.side);
    for (const panel of bay.panels) panel.pivot.rotation.x = bay.side * panel.edge * Math.PI * 0.5 * fold;
  }
  const manifest = state.cargoManifest || [null];
  const count = dispatch ? 0 : Math.min(4, incoming ? state.cargoPackageCount || 1 : state.cargoPackageCount || (cargoState === 'none' ? 0 : 1));
  const current = Math.min(count, state.cargoPackageIndex || 0);
  for (let i = 0; i < scene.cargoContainers.length; i++) {
    const box = scene.cargoContainers[i];
    SetPackageStyle(box, manifest[i]);
    box.visible = i < count && i >= current && cargoState !== 'none' && (i > current || cargoState !== 'stored');
    box.scale.setScalar(manifest[i]?.scale || 1);
    box.rotation.set(0, 0, 0);
    CargoStartPosition(scene, i, count, box.position);
    if (incoming) box.quaternion.copy(scene.ship.quaternion);
  }
  CargoStartPosition(scene, current, count, scene.cargoPackageStart);
  scene.dispatchCanister.visible = dispatch && cargoState !== 'none' && cargoState !== 'stored';
  scene.dispatchCanister.scale.setScalar(1);
  scene.dispatchCanister.rotation.set(0, 0, 0);
  const payload = dispatch ? scene.dispatchCanister : scene.cargoContainers[Math.min(current, 3)];
  if (dispatch) {
    payload.position.set(0, 0, 0.01);
    scene.courierDispatchBay.localToWorld(payload.position);
    scene.station.worldToLocal(payload.position);
    payload.quaternion.copy(scene.ship.quaternion);
  }
  if (cargoState === 'carried' || cargoState === 'stowing') {
    TransferPosition(scene, state, payload.position);
    payload.rotation.set(0, 0, 0);
  }
  // Open before insertion, keep a fixed-size payload, and let the actual hull
  // occlude it. The closing beat starts at the same door angle as insertion.
  scene.hatchDoor.rotation.y = cargoState === 'stowing'
    ? -Smooth(p / 0.25) * Math.PI * 0.48
    : cargoState === 'stored' && ['verify', 'package-confirm'].includes(stage)
      ? -(1 - Smooth(p)) * Math.PI * 0.48 : 0;
  const bayOpen = !dispatch || incoming ? 0
    : stage === 'inspect-cargo' ? Smooth(p)
      : stage === 'retrieve-cargo' ? 1
        : stage === 'deliver-cargo' ? 1 - Smooth(p) : 0;
  scene.courierDispatchBayDoor.position.x = bayOpen * 0.48;
}
