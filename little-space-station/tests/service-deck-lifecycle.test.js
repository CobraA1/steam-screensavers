import assert from "node:assert/strict";
import test from "node:test";
import { DeckDurationMs, DeckPartPose, DECK_INSTALL_START, DECK_REMOVE_END, ResolveServiceDeck } from "../service-deck-lifecycle.js";
import { ResolveAutumn2026 } from "../autumn-2026.js";
import { SeasonalServiceDeckVisual } from "../seasonal-service-deck.js";
import * as THREE from "../vendor/three.module.js";

test("six-hour calendar transitions resume at their absolute progress in either direction", () => {
  const duration = DeckDurationMs();
  assert.equal(duration, 6 * 3600000);
  assert.equal(ResolveServiceDeck(DECK_INSTALL_START - 1).active, false);
  for (const progress of [0, 0.1, 0.4, 0.8, 0.999]) {
    const install = ResolveServiceDeck(DECK_INSTALL_START + duration * progress);
    const remove = ResolveServiceDeck(DECK_REMOVE_END - duration + duration * progress);
    assert.equal(install.action, "install");
    assert.equal(remove.action, "remove");
    assert.ok(Math.abs(install.assembly - progress) < 1e-9);
    assert.ok(Math.abs(remove.assembly - (1 - progress)) < 1e-9);
    assert.deepEqual(install, ResolveServiceDeck(DECK_INSTALL_START + duration * progress));
  }
  assert.equal(ResolveServiceDeck(DECK_INSTALL_START + duration).ready, true);
  assert.equal(ResolveServiceDeck(DECK_REMOVE_END).active, false);
  assert.equal(ResolveServiceDeck(DECK_REMOVE_END).status, "renewed-away");
});

test("preview endpoints, duration limits, and decoration safety", () => {
  assert.equal(DeckDurationMs({ transitionHours: -5 }), 3600000);
  assert.equal(DeckDurationMs({ transitionHours: Infinity }), 6 * 3600000);
  assert.equal(DeckDurationMs({ transitionHours: 100 }), 48 * 3600000);
  const time = Date.UTC(2026, 9, 25);
  for (const action of ["install", "remove"]) {
    const partial = ResolveAutumn2026("deck-test", time, { deckPreview: { action, progress: 0.6 } });
    assert.deepEqual(partial.installedDecorations, []);
    assert.equal(partial.installation, null);
    assert.equal(partial.serviceDeck.ready, false);
  }
  assert.equal(ResolveServiceDeck(time, {}, { action: "remove", progress: 1 }).active, false);
  assert.equal(ResolveServiceDeck(time, {}, { action: "install", progress: 1 }).ready, true);
  assert.equal(ResolveAutumn2026("deck-test", time).serviceDeck.ready, true);
});

test("rigid assemblies clear the cabin before moving sideways and meet exact final transforms", () => {
  for (let index = 0; index < 6; index += 1) {
    assert.equal(DeckPartPose(index / 6, index).visible, false);
    for (const stageProgress of [0.01, 0.12, 0.3, 0.55, 0.7, 0.85, 1]) {
      const pose = DeckPartPose((index + stageProgress) / 6, index);
      if (Math.abs(pose.x) > 1e-8 || Math.abs(pose.z) > 1e-8) assert.equal(pose.y, 2);
      assert.ok(pose.x <= 0 && pose.y >= 0 && pose.z >= 0);
    }
    const end = DeckPartPose(1, index);
    assert.equal(end.x, 0);
    assert.equal(end.y, 0);
    assert.equal(end.z, 0);
  }
});

test("real Three.js part groups reset after backward seeks and removal", () => {
  const material = new THREE.MeshStandardMaterial();
  const scene = { station: new THREE.Group(), materials: new Proxy({}, { get: () => material }) };
  const visual = new SeasonalServiceDeckVisual(scene);
  const update = (progress, action = "install") => {
    const lifecycle = ResolveServiceDeck(DECK_INSTALL_START, {}, { action, progress });
    visual.update({ worldTimeMs: DECK_INSTALL_START, seasonal: { serviceDeckActive: lifecycle.active, serviceDeck: lifecycle } });
  };
  update(1);
  assert.ok(visual.parts.every(part => part.visible && part.position.length() === 0));
  update(0.4);
  assert.ok(visual.parts.slice(0, 3).every(part => part.visible));
  assert.ok(visual.parts.slice(3).every(part => !part.visible));
  assert.ok(visual.parts[2].position.y >= 0);
  update(1, "remove");
  assert.equal(visual.root.visible, false);
  update(1);
  assert.equal(visual.root.visible, true);
  assert.ok(visual.parts.every(part => part.visible && part.position.length() === 0));
});
