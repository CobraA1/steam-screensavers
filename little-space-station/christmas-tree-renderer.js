import * as THREE from './vendor/three.module.js';
import { CHRISTMAS_TREE_POSITION, CHRISTMAS_PRESENTS } from './christmas-tree.js';

const surface = (color, metalness = .15) => new THREE.MeshStandardMaterial({ color, metalness, roughness: .65, flatShading: true });
function box(root, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); root.add(mesh); return mesh;
}
function cylinder(root, top, bottom, height, y, material, segments = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.y = y; root.add(mesh); return mesh;
}
const LAYERS = Object.freeze([
  { radius: .49, height: .6, y: .54 },
  { radius: .37, height: .55, y: .86 },
  { radius: .25, height: .5, y: 1.12 },
]);
function radiusAt(y) {
  let radius = 0;
  for (const layer of LAYERS) {
    const bottom = layer.y - layer.height / 2, top = layer.y + layer.height / 2;
    if (y >= bottom && y <= top) radius = Math.max(radius, layer.radius * (top - y) / layer.height);
  }
  return radius;
}
function foliage(layer, index) {
  const g = new THREE.ConeGeometry(layer.radius, layer.height, 10, 1).toNonIndexed();
  const a = g.attributes.position, colors = [];
  const shades = [0x244938, 0x315c40, 0x3d6c49, 0x2c543c];
  for (let i = 0; i < a.count; i += 3) {
    const color = new THREE.Color(shades[(Math.floor(i / 3) + index) % shades.length]);
    for (let j = i; j < i + 3; j++) {
      // Slight radial irregularity makes the tiers read as artificial boughs.
      const angle = Math.atan2(a.getZ(j), a.getX(j));
      const scale = 1 + .025 * Math.sin(angle * 3 + index);
      a.setXYZ(j, a.getX(j) * scale, a.getY(j), a.getZ(j) * scale);
      colors.push(color.r, color.g, color.b);
    }
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals();
  return g;
}
function starGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .052 : .125;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false, curveSegments: 1 });
  geometry.translate(0, 0, -.0125); return geometry;
}

// Bounded scenery meshes are built once. Date jumps only change visibility,
// instance counts and light intensity; every gift retains its own stable ID.
export class ChristmasTreeVisual {
  constructor(parent) {
    this.root = new THREE.Group(); this.root.name = 'advent-christmas-tree'; this.root.visible = false;
    parent.add(this.root);
    this.tree = new THREE.Group(); this.tree.name = 'modular-evergreen';
    this.tree.position.fromArray(CHRISTMAS_TREE_POSITION); this.root.add(this.tree);
    const dark = surface(0x294545), copper = surface(0xa77742, .4), ivory = surface(0xd9d2b7);
    const gold = surface(0xd2b46b, .45);
    cylinder(this.tree, .16, .23, .1, .05, dark, 10);
    cylinder(this.tree, .105, .14, .08, .14, copper);
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const foot = box(this.tree, [.14, .045, .1], [Math.cos(angle) * .19, .023, Math.sin(angle) * .19], ivory);
      foot.rotation.y = -angle;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .014, 6), copper);
      bolt.position.set(Math.cos(angle) * .21, .051, Math.sin(angle) * .21); this.tree.add(bolt);
    }
    cylinder(this.tree, .03, .045, 1.2, .72, dark);
    this.sections = LAYERS.map((layer, i) => {
      const section = new THREE.Group(); section.name = 'evergreen-section-' + (i + 1);
      const bough = new THREE.Mesh(foliage(layer, i), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, flatShading: true }));
      bough.position.y = layer.y; bough.rotation.y = i * .34; section.add(bough);
      cylinder(section, .048, .048, .04, layer.y - layer.height / 2, copper);
      this.tree.add(section); return section;
    });
    this.bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xffe6af, emissive: 0xffc779,
      emissiveIntensity: .35, roughness: .35 });
    const bulbGeometry = new THREE.IcosahedronGeometry(.027, 0), matrix = new THREE.Matrix4();
    this.garlands = [];
    for (let band = 0; band < 3; band++) {
      const group = new THREE.Group(); group.name = 'garland-light-string-' + band;
      const points = [];
      for (let i = 0; i <= 24; i++) {
        const f = (band + i / 24) / 3, y = .33 + .93 * f, angle = f * Math.PI * 6 + .3;
        const r = radiusAt(y) + .025;
        points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
      }
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .009, 4, false), copper));
      const bulbs = new THREE.InstancedMesh(bulbGeometry, this.bulbMaterial, 7);
      for (let i = 0; i < 7; i++) { matrix.makeTranslation(...points[i * 4].toArray()); bulbs.setMatrixAt(i, matrix); }
      group.add(bulbs); this.tree.add(group); this.garlands.push(group);
    }
    const ornaments = this.ornaments = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.046, 1), surface(0xffffff, .4), 26);
    const caps = this.ornamentCaps = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .012, .025, 5), gold, 26);
    const palette = [0x3c6990, 0xd7b866, 0xe4dcc4, 0x36617f, 0xc6a159];
    for (let i = 0; i < 26; i++) {
      const tier = i % 3, y = [.37, .7, 1.0][tier] + Math.sin(i * 2.1) * .025;
      const angle = i * 2.39996, r = radiusAt(y) + .033;
      matrix.makeTranslation(Math.cos(angle) * r, y, Math.sin(angle) * r);
      ornaments.setMatrixAt(i, matrix); ornaments.setColorAt(i, new THREE.Color(palette[i % palette.length]));
      matrix.elements[13] += .05; caps.setMatrixAt(i, matrix);
    }
    // Cache bounds for the complete set before the calendar can reduce count
    // to zero; later stages must not inherit an empty frustum-culling sphere.
    ornaments.computeBoundingSphere(); ornaments.computeBoundingBox();
    caps.computeBoundingSphere(); caps.computeBoundingBox();
    this.tree.add(ornaments, caps);
    this.star = new THREE.Group(); this.star.name = 'gold-star-topper'; this.star.position.y = 1.43;
    this.star.rotation.y = .7;
    this.star.add(new THREE.Mesh(starGeometry(), gold));
    cylinder(this.star, .015, .02, .15, -.1, copper); this.tree.add(this.star);
    this.gifts = CHRISTMAS_PRESENTS.map(gift => {
      const root = new THREE.Group(); root.name = gift.id; root.userData.giftId = gift.id; root.userData.wrapped = true;
      root.position.fromArray(gift.position);
      const [w, h, d] = gift.size, wrap = surface(gift.color), ribbon = surface(gift.ribbon, .25);
      box(root, [w, h, d], [0, h / 2, 0], wrap);
      const lid = box(root, [w + .015, .035, d + .015], [0, h - .01, 0], wrap);
      lid.name = 'lid';
      box(root, [w + .018, h + .008, .04], [0, (h + .008) / 2, 0], ribbon);
      box(root, [.04, h + .01, d + .019], [0, (h + .01) / 2, 0], ribbon);
      for (const side of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.TorusGeometry(.039, .011, 4, 8), ribbon);
        loop.scale.set(1, .55, .7); loop.rotation.z = side * .55;
        loop.position.set(side * .03, h + .027, 0); root.add(loop);
      }
      box(root, [.032, .025, .035], [0, h + .015, 0], ribbon);
      this.root.add(root); return root;
    });
    this.glow = new THREE.PointLight(0xffd298, 0, 2.1, 2);
    this.glow.position.set(0, .85, .25); this.tree.add(this.glow);
  }

  update(calendar, ready, storyActive, fullLight = false) {
    const active = Boolean(calendar?.active && ready && !storyActive);
    this.root.visible = active;
    this.sections.forEach((section, i) => { section.visible = active && i < calendar.sections; });
    this.garlands.forEach((string, i) => { string.visible = active && i < calendar.garlandBands; });
    this.ornaments.count = this.ornamentCaps.count = active ? calendar.ornamentCount : 0;
    this.star.visible = active && calendar.star;
    this.gifts.forEach((gift, i) => { gift.visible = active && i < calendar.presentCount; });
    this.bulbMaterial.emissiveIntensity = fullLight ? 2.4 : .4;
    this.glow.intensity = active && calendar.garlandBands ? (fullLight ? .7 : .1) : 0;
  }
}
