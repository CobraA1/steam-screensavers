import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { DreamCompositor, DreamOpacity } from "../dream-compositor.js";
import { AntennaDreamVisual } from "../dream-renderer.js";
import { PhantomDreamVisual } from "../phantom-dream-renderer.js";

function Fixture() {
  const scene = new THREE.Scene(), compositor = new DreamCompositor(scene);
  const visuals = [new AntennaDreamVisual(compositor.scene), new PhantomDreamVisual(compositor.scene)];
  const camera = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100);
  camera.position.z = 12;
  camera.updateMatrixWorld();
  const head = new THREE.Object3D();
  scene.add(head);
  const renderer = {
    size: new THREE.Vector2(1280, 800), target: null, autoClear: false, alpha: 1,
    color: new THREE.Color(0x345678), viewport: new THREE.Vector4(1, 2, 1280, 800),
    scissor: new THREE.Vector4(4, 5, 100, 200), scissorTest: true, calls: 0,
    getDrawingBufferSize(v) { return v.copy(this.size); },
    getRenderTarget() { return this.target; }, setRenderTarget(t) { this.target = t; },
    getClearAlpha() { return this.alpha; }, getClearColor(c) { return c.copy(this.color); },
    setClearColor(c, a) { this.color.set(c); this.alpha = a; },
    getViewport(v) { return v.copy(this.viewport); }, setViewport(v) { this.viewport.copy(v); },
    getScissor(v) { return v.copy(this.scissor); }, setScissor(v) { this.scissor.copy(v); },
    getScissorTest() { return this.scissorTest; }, setScissorTest(v) { this.scissorTest = v; },
    render(s, c) {
      this.calls++;
      this.active = s.children.filter(o => o.visible).map(o => o.name);
      assert.ok(c.projectionMatrix.elements.every(Number.isFinite));
      assert.equal(this.alpha, 0);
      assert.ok(this.target);
    },
  };
  const show = (type, progress = 0.5, beatId = "reveal", beatProgress = 0.5) => {
    visuals.forEach(v => v.update(type ? { type, progress, beatId, beatProgress } : null, camera, head));
    compositor.prepare(renderer, camera, visuals);
  };
  return { scene, compositor, visuals, camera, renderer, show };
}

test("dream envelope preserves original smooth entry and exit timings", () => {
  for (const [p, expected] of [[0, 0], [0.03, 0.5], [0.06, 1], [0.5, 1], [0.92, 1], [0.96, 0.5], [1, 0]]) {
    assert.ok(Math.abs(DreamOpacity(p) - expected) < 1e-12);
  }
});

test("both memories render through one isolated compositor and fade only the final image", () => {
  const { scene, compositor, visuals, renderer, show } = Fixture();
  for (const [index, type] of [[0, "stubborn-antenna"], [1, "phantom-visitor-2026"]]) {
    show(type, 0.03, "untangle", 0.5);
    assert.equal(compositor.material.uniforms.opacity.value, 0.5);
    assert.equal(scene.getObjectByName(visuals[index].root.name), undefined);
    assert.deepEqual(renderer.active, [visuals[index].root.name]);
    for (const entry of visuals[index].materials) assert.equal(entry.material.opacity, entry.opacity);
  }
  assert.equal(renderer.autoClear, false);
  assert.equal(renderer.alpha, 1);
  assert.equal(renderer.color.getHex(), 0x345678);
  assert.equal(renderer.scissorTest, true);
  assert.equal(renderer.target, null);
  assert.deepEqual(renderer.viewport.toArray(), [1, 2, 1280, 800]);
  compositor.dispose();
});

test("independent drone fades and backwards seeks do not inherit whole-memory opacity", () => {
  const { visuals, compositor, show } = Fixture();
  show("phantom-visitor-2026", 0.03, "drone-departure", 0.75);
  assert.ok(Math.abs(visuals[1].droneMaterials[0].opacity - 0.5) < 1e-12);
  assert.equal(visuals[1].ghostMaterial.opacity, 0.82);
  const snapshot = () => JSON.stringify(visuals[1].root.toJSON());
  show("phantom-visitor-2026", 0.6, "untangle", 0.4);
  const before = snapshot();
  show("phantom-visitor-2026", 0.98, "final-surprise", 1);
  show("phantom-visitor-2026", 0.6, "untangle", 0.4);
  assert.equal(snapshot(), before);
  assert.equal(visuals[1].droneMaterials[0].opacity, 1);
  compositor.dispose();
});

test("targets reuse across frames and dream switches, resize boundedly, and release when idle", () => {
  const { compositor, renderer, show, scene } = Fixture();
  show(null);
  assert.equal(renderer.calls, 0);
  show("stubborn-antenna", 0);
  show("phantom-visitor-2026", 1);
  assert.equal(renderer.calls, 0);
  assert.equal(compositor.quad.visible, false);
  show("stubborn-antenna");
  const target = compositor.target;
  let disposals = 0;
  target.addEventListener("dispose", () => disposals++);
  for (let i = 0; i < 100; i++) show(i % 2 ? "stubborn-antenna" : "phantom-visitor-2026");
  assert.equal(compositor.target, target);
  assert.equal(disposals, 0);
  renderer.size.set(7680, 4320);
  show("stubborn-antenna");
  assert.equal(compositor.target, target);
  assert.equal(disposals, 1);
  assert.ok(target.width <= 1024 && target.height <= 1024);
  renderer.size.set(1280, 800);
  show("stubborn-antenna");
  assert.equal(disposals, 2);
  show(null);
  assert.equal(disposals, 3);
  assert.equal(compositor.target, null);
  assert.equal(compositor.quad.visible, false);
  const count = renderer.calls;
  show(null);
  assert.equal(renderer.calls, count);
  assert.equal(disposals, 3);
  show("phantom-visitor-2026");
  assert.notEqual(compositor.target, target);
  compositor.dispose();
  assert.equal(scene.getObjectByName("dream-composite"), undefined);
});

test("offscreen render failures restore the caller's renderer state", () => {
  const { renderer, show, compositor } = Fixture();
  renderer.render = () => { throw new Error("render failure"); };
  assert.throws(() => show("stubborn-antenna"), /render failure/);
  assert.equal(renderer.target, null);
  assert.equal(renderer.autoClear, false);
  assert.equal(renderer.alpha, 1);
  assert.equal(renderer.scissorTest, true);
  compositor.dispose();
});

test("orthographic preview remains finite during dreams", () => {
  const { visuals, compositor, renderer } = Fixture();
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
  camera.position.z = 12;
  camera.updateMatrixWorld();
  visuals[0].update({ type: "stubborn-antenna", progress: 0.5 }, camera, new THREE.Object3D());
  compositor.prepare(renderer, camera, visuals);
  assert.ok(Number.isFinite(visuals[0].root.scale.x));
  assert.equal(compositor.quad.visible, true);
  compositor.dispose();
});

test("antenna backwards seeks reconstruct the same actors and repair outcome", () => {
  const { visuals, compositor, show } = Fixture();
  const visual = visuals[0];
  show("stubborn-antenna", 0.3, "first-repair", 0.5);
  const before = JSON.stringify(visual.root.toJSON());
  show("stubborn-antenna", 0.75, "real-repair", 0.8);
  assert.equal(visual.plate.visible, true);
  show("stubborn-antenna", 0.98, "exit", 0.9);
  show("stubborn-antenna", 0.3, "first-repair", 0.5);
  assert.equal(JSON.stringify(visual.root.toJSON()), before);
  assert.equal(visual.plate.visible, false);
  compositor.dispose();
});
