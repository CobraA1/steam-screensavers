import * as THREE from "./vendor/three.module.js";

// The white covering is one outward-facing, open-bottom cloth shell. Its
// continuous rounded crown and flared hem avoid the dark alpha-blended seam
// caused by intersecting semi-transparent dome and skirt meshes.
const profile = [
  [0.30, -0.38], // open, gently flared hem
  [0.288, -0.34],
  [0.273, -0.29],
  [0.246, -0.19],
  [0.224, -0.10],
  [0.211, -0.02],
  [0.201, 0.06],
  [0.177, 0.12],
  [0.142, 0.167],
  [0.092, 0.196],
  [0.040, 0.21],
  [0, 0.214], // closed, smoothly rounded crown
];
const geometry = new THREE.LatheGeometry(
  profile.map(([radius, height]) => new THREE.Vector2(radius, height)), 12,
);

export function CreatePhantomCoverMesh(material, { scale = 1, offsetY = 0 } = {}) {
  const shell = new THREE.Mesh(geometry, material);
  shell.name = "phantom-cover-shell";
  shell.scale.setScalar(scale);
  shell.position.y = offsetY;
  // No back-face blending: drawing the inside would double the opacity even
  // with a single shell. The hollow lower opening remains intentionally open.
  shell.material.side = THREE.FrontSide;
  return shell;
}
