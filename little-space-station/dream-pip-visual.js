import * as THREE from "./vendor/three.module.js";

// Shared miniature robot; story renderers retain control of pose and props.
export function CreateDreamPipVisual(bubble, {cream, teal, orange, dark, bright}) {
  const model = {};
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
    model.pip = new THREE.Group();
    bubble.add(model.pip);
    box(model.pip, teal, 0, 0.26, 0.12, 0.32, 0.37, 0.2);
    box(model.pip, orange, 0, 0.26, 0.23, 0.18, 0.16, 0.03);
    mesh(model.pip, sphereGeometry, bright, 0, 0.28, 0.25, 0.028);
    model.head = new THREE.Group();
    model.head.position.set(0, 0.58, 0.12);
    model.pip.add(model.head);
    box(model.head, cream, 0, 0, 0, 0.34, 0.26, 0.23);
    box(model.head, dark, 0, 0, 0.13, 0.27, 0.1, 0.035);
    model.eye = box(model.head, bright, 0, 0, 0.16, 0.18, 0.035, 0.025);
    box(model.head, orange, 0.09, 0.2, 0, 0.02, 0.17, 0.02);
    mesh(model.head, sphereGeometry, bright, 0.09, 0.29, 0, 0.035);
    model.arms = [];
    for (const side of [-1, 1]) {
      box(model.pip, dark, side * 0.09, 0.01, 0.12, 0.05, 0.17, 0.06);
      box(model.pip, cream, side * 0.1, -0.07, 0.16, 0.12, 0.06, 0.15);
      const arm = new THREE.Group();
      arm.position.set(side * 0.21, 0.39, 0.12);
      model.pip.add(arm);
      mesh(arm, sphereGeometry, orange, 0, 0, 0, 0.055);
      box(arm, teal, 0, -0.13, 0, 0.055, 0.23, 0.055);
      mesh(arm, sphereGeometry, cream, 0, -0.26, 0.025, 0.065);
      model.arms.push(arm);
    }
    model.tool = new THREE.Group();
    model.arms[1].add(model.tool);
    box(model.tool, orange, 0, -0.32, 0.04, 0.035, 0.16, 0.035);
    box(model.tool, bright, 0, -0.41, 0.04, 0.13, 0.045, 0.05);

  model.hands = model.arms.map(arm => arm.children.find(child => child.geometry?.type === "SphereGeometry" && child.position.y < -0.2));
  model.pip.name = "dream-pip";
  return model;
}
