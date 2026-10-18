import * as THREE from "./vendor/three.module.js";

export const EXPANSION_LAYOUTS = Object.freeze([
  Object.freeze({ id: "current", label: "Current station", additions: 0 }),
  Object.freeze({ id: "moderate", label: "Moderate expansion", additions: 3 }),
  Object.freeze({ id: "developed", label: "Developed station", additions: 6 }),
]);

function Mesh(geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  return mesh;
}

function AddModule(group, geometry, material, position, rotation, connectorPosition, connectorScale) {
  group.add(Mesh(geometry, material, position, rotation));
  if (connectorPosition) group.add(Mesh(geometry.userData.connector, material, connectorPosition, [0, 0, 0], connectorScale));
}

export function CreateExpansionPreview(station) {
  const root = new THREE.Group();
  root.name = "preview-expansion-mockups";
  station.add(root);

  const cyan = new THREE.MeshBasicMaterial({
    color: 0x72ded4,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const amber = new THREE.MeshBasicMaterial({
    color: 0xeeb36f,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const connector = new THREE.BoxGeometry(1, 1, 1);
  const barrel = new THREE.CylinderGeometry(0.72, 0.72, 1.7, 10, 1, false);
  const compactBarrel = new THREE.CylinderGeometry(0.54, 0.54, 1.25, 10, 1, false);
  const dome = new THREE.SphereGeometry(0.72, 12, 7);
  const cargo = new THREE.BoxGeometry(1.45, 0.92, 1.12, 2, 1, 1);
  const ring = new THREE.TorusGeometry(0.48, 0.1, 6, 12);
  for (const geometry of [barrel, compactBarrel, dome, cargo, ring]) geometry.userData.connector = connector;

  const moderate = new THREE.Group();
  moderate.name = "moderate-expansion";
  AddModule(moderate, barrel, cyan, [-3.65, 0.05, 0], [0, 0, Math.PI / 2], [-2.95, 0.05, 0], [0.55, 0.52, 0.52]);
  AddModule(moderate, dome, amber, [-1.05, 1.95, 0.2], [0, 0, 0], [-1.05, 1.28, 0.2], [0.45, 0.75, 0.45]);
  AddModule(moderate, cargo, cyan, [-0.35, -1.65, 0.15], [0, 0.12, 0], [-0.35, -1.08, 0.15], [0.42, 0.72, 0.42]);

  const developed = new THREE.Group();
  developed.name = "developed-expansion";
  AddModule(developed, barrel, cyan, [-3.65, 0.05, 0], [0, 0, Math.PI / 2], [-2.95, 0.05, 0], [0.55, 0.52, 0.52]);
  AddModule(developed, dome, amber, [-1.05, 1.95, 0.2], [0, 0, 0], [-1.05, 1.28, 0.2], [0.45, 0.75, 0.45]);
  AddModule(developed, cargo, cyan, [-0.35, -1.65, 0.15], [0, 0.12, 0], [-0.35, -1.08, 0.15], [0.42, 0.72, 0.42]);
  AddModule(developed, compactBarrel, amber, [-1.2, 0.1, -2.0], [Math.PI / 2, 0, 0], [-1.2, 0.1, -1.22], [0.42, 0.42, 0.72]);
  AddModule(developed, ring, cyan, [-2.45, 0.12, 1.48], [Math.PI / 2, 0, 0], [-2.45, 0.12, 0.92], [0.42, 0.42, 0.72]);
  AddModule(developed, compactBarrel, amber, [-2.35, -1.35, -0.65], [0, 0, Math.PI / 2], [-2.35, -0.82, -0.42], [0.42, 0.62, 0.42]);

  root.add(moderate, developed);
  let layout = "current";
  let visible = true;

  function ApplyVisibility() {
    root.visible = visible && layout !== "current";
    moderate.visible = layout === "moderate";
    developed.visible = layout === "developed";
  }

  ApplyVisibility();
  return {
    setLayout(id) {
      layout = EXPANSION_LAYOUTS.some((candidate) => candidate.id === id) ? id : "current";
      ApplyVisibility();
    },
    setVisible(nextVisible) {
      visible = Boolean(nextVisible);
      ApplyVisibility();
    },
    getDiagnostics() { return { layout, visible, additions: EXPANSION_LAYOUTS.find((item) => item.id === layout).additions }; },
  };
}
