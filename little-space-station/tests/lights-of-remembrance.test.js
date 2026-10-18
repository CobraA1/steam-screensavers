import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "../vendor/three.module.js";
import { RemembranceVisual } from "../remembrance-renderer.js";
import {
  AdvanceRemembranceIncident,
  ApplyRemembrance,
  CreateRemembranceIncident,
  CreateRemembrancePreview,
  CreateRemembranceResume,
  IsRemembranceWindow,
  IsRemembranceWindowSafe,
  RemembranceDirector,
  REMEMBRANCE_BEATS,
  REMEMBRANCE_MILESTONES,
  REMEMBRANCE_TOTAL_SECONDS,
  ResolveRemembranceTimeline,
} from "../lights-of-remembrance.js";

test("Lights of Remembrance is a complete, calm 42-second sequence", () => {
  assert.equal(REMEMBRANCE_TOTAL_SECONDS, 42);
  let elapsed = 0;
  for (const beat of REMEMBRANCE_BEATS) {
    const resolved = ResolveRemembranceTimeline(elapsed + beat.duration * 0.5);
    assert.equal(resolved.beat.id, beat.id);
    assert.ok(resolved.progress > 0.49 && resolved.progress < 0.51);
    elapsed += beat.duration;
  }
  assert.deepEqual(REMEMBRANCE_BEATS.map((beat) => beat.id), ["approach", "prepare", "activation", "stillness", "return"]);
});

test("remembrance checkpoints are monotonic and resume at respectful chapter boundaries", () => {
  const base = CreateRemembranceIncident({ variant: 2, instanceId: "2026:lights-of-remembrance:test" });
  const lit = AdvanceRemembranceIncident(base, "activation", 0.8);
  const rewind = AdvanceRemembranceIncident(lit, "approach", 0.1);
  const complete = AdvanceRemembranceIncident(rewind, "return", 0.9);
  assert.equal(lit.milestone, REMEMBRANCE_MILESTONES["lights-lit"]);
  assert.equal(rewind.milestone, lit.milestone);
  assert.equal(CreateRemembranceResume(lit).beatId, "stillness");
  assert.equal(complete.checkpoint, "observance-complete");
  assert.equal(CreateRemembranceResume(complete), null);
});

test("All Saints presentation is independent from Halloween and preserves live world facts", () => {
  const state = { phase: "quiet", antennaState: "tracking", halloweenMarker: "unchanged", shipVisible: false };
  ApplyRemembrance(state, CreateRemembrancePreview({ beatId: "stillness", progress: 0.5, variant: 1 }));
  assert.equal(state.pipTaskId, "lights-of-remembrance");
  assert.equal(state.remembrance.lightLevel, 1);
  assert.equal(state.antennaState, "tracking");
  assert.equal(state.halloweenMarker, "unchanged");
  assert.equal(state.phantomVisitor, undefined);
});

test("remembrance has a November 1–3 grace period, waits for quiet, and runs once", () => {
  const start = Date.UTC(2026, 10, 1, 12);
  assert.equal(IsRemembranceWindow(start), true);
  assert.equal(IsRemembranceWindow(Date.UTC(2026, 10, 3, 23, 59)), true);
  assert.equal(IsRemembranceWindow(Date.UTC(2026, 10, 4)), false);
  const quiet = { phase: "quiet", visitId: "", shipVisible: false, worldTimeMs: start, nextArrivalMs: start + 90_000, pipTaskId: "standby" };
  assert.equal(IsRemembranceWindowSafe(quiet), true);
  assert.equal(IsRemembranceWindowSafe({ ...quiet, pipTaskId: "seasonal-cleanup" }), false);
  assert.equal(IsRemembranceWindowSafe({ ...quiet, phase: "service", visitId: "cargo" }), false);
  const director = new RemembranceDirector({ worldSeed: "saints-director", story: { minimumSessionSeconds: 4 } });
  assert.equal(director.update({ stepSeconds: 2, presentationSeconds: 2, eventState: quiet, worldTimeMs: start }), null);
  const selected = director.update({ stepSeconds: 2, presentationSeconds: 4, eventState: { ...quiet, worldTimeMs: start + 2_000, nextArrivalMs: quiet.nextArrivalMs + 2_000 }, worldTimeMs: start + 2_000 });
  assert.match(selected.instanceId, /^2026:lights-of-remembrance:/);
  const completed = [{ type: "lights-of-remembrance-2026", storyYear: 2026, instanceId: selected.instanceId }];
  const second = new RemembranceDirector({ worldSeed: "saints-director", story: { minimumSessionSeconds: 4 } });
  assert.equal(second.update({ stepSeconds: 4, presentationSeconds: 4, eventState: quiet, worldTimeMs: start, completedStories: completed }), null);
});

test("memorial fixture is understated when dark and glows after activation", () => {
  const station = new THREE.Group();
  const visual = new RemembranceVisual({ station, elapsed: 0, environmentArtificialBoost: 0 });
  const seasonal = { remembranceFixtureAvailable: true, remembranceLightsRemain: true };
  visual.update({ seasonal, remembranceCompleted: false, remembrance: null });
  assert.equal(visual.root.visible, true);
  assert.ok(visual.lightMaterials.every((material) => material.emissiveIntensity === 0));
  visual.update({ seasonal, remembranceCompleted: false, remembrance: { lightLevel: 1 } });
  assert.ok(visual.lightMaterials.every((material) => material.emissiveIntensity > 1.5));
  assert.ok(visual.pooledLight.intensity > 0.35);
  visual.update({ seasonal: { remembranceFixtureAvailable: false }, remembranceCompleted: false, remembrance: null });
  assert.equal(visual.root.visible, false);
});
