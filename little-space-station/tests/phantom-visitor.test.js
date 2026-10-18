import assert from "node:assert/strict";
import test from "node:test";

import {
  AdvancePhantomVisitorIncident,
  ApplyPhantomVisitor,
  CreatePhantomVisitorIncident,
  CreatePhantomVisitorPreview,
  CreatePhantomVisitorResume,
  IsPhantomVisitorWindow,
  IsPhantomVisitorWindowSafe,
  PhantomVisitorDirector,
  PHANTOM_VISITOR_BEATS,
  PHANTOM_VISITOR_MILESTONES,
  PHANTOM_VISITOR_TOTAL_SECONDS,
  ResolvePhantomVisitorTimeline,
} from "../phantom-visitor.js";

test("Phantom Visitor covers a complete 68-second story with stable beat reconstruction", () => {
  assert.equal(PHANTOM_VISITOR_TOTAL_SECONDS, 68);
  let elapsed = 0;
  for (const beat of PHANTOM_VISITOR_BEATS) {
    const resolved = ResolvePhantomVisitorTimeline(elapsed + beat.duration * 0.5);
    assert.equal(resolved.beat.id, beat.id);
    assert.ok(resolved.progress > 0.49 && resolved.progress < 0.51);
    elapsed += beat.duration;
  }
  assert.equal(ResolvePhantomVisitorTimeline(PHANTOM_VISITOR_TOTAL_SECONDS).beat.id, "final-surprise");
});

test("Phantom checkpoints are monotonic and resume at safe chapter boundaries", () => {
  const base = CreatePhantomVisitorIncident({ variant: 2, instanceId: "2026:phantom-visitor:test" });
  const revealed = AdvancePhantomVisitorIncident(base, "reveal", 0.8);
  const attemptedRewind = AdvancePhantomVisitorIncident(revealed, "glimpse", 0.1);
  const freed = AdvancePhantomVisitorIncident(attemptedRewind, "untangle", 0.9);
  const complete = AdvancePhantomVisitorIncident(freed, "final-surprise", 0.8);
  assert.equal(revealed.milestone, PHANTOM_VISITOR_MILESTONES["drone-revealed"]);
  assert.equal(attemptedRewind.milestone, revealed.milestone);
  assert.equal(freed.milestone, PHANTOM_VISITOR_MILESTONES["drone-freed"]);
  assert.equal(CreatePhantomVisitorResume(revealed).beatId, "reveal");
  assert.equal(CreatePhantomVisitorResume(freed).beatId, "trailing-cover");
  assert.equal(complete.checkpoint, "story-complete");
  assert.equal(CreatePhantomVisitorResume(complete), null);
});

test("Phantom presentation owns only Pip and its temporary visual descriptor", () => {
  const state = { phase: "quiet", antennaState: "incident-patched-tracking", equipmentLightState: "normal", shipVisible: false };
  ApplyPhantomVisitor(state, CreatePhantomVisitorPreview({ beatId: "untangle", progress: 0.6, variant: 1 }));
  assert.equal(state.pipTaskId, "phantom-visitor");
  assert.equal(state.phantomVisitor.beatId, "untangle");
  assert.equal(state.antennaState, "incident-patched-tracking");
  assert.equal(state.shipVisible, false);
  assert.equal(state.storyIncident, undefined);
});

test("Phantom eligibility is Halloween-only, quiet, deterministic, and once per story year", () => {
  const start = Date.UTC(2026, 9, 29, 12);
  assert.equal(IsPhantomVisitorWindow(start), true);
  assert.equal(IsPhantomVisitorWindow(Date.UTC(2026, 10, 1)), false);
  const quiet = { phase: "quiet", visitId: "", shipVisible: false, worldTimeMs: start, nextArrivalMs: start + 120_000, pipTaskId: "standby" };
  assert.equal(IsPhantomVisitorWindowSafe(quiet), true);
  assert.equal(IsPhantomVisitorWindowSafe({ ...quiet, pipTaskId: "seasonal-install" }), false);
  assert.equal(IsPhantomVisitorWindowSafe({ ...quiet, phase: "service", visitId: "cargo" }), false);
  const config = { worldSeed: "phantom-director", story: { minimumSessionSeconds: 4, phantomOpportunityChance: 1 } };
  const first = new PhantomVisitorDirector(config);
  assert.equal(first.update({ stepSeconds: 2, presentationSeconds: 2, eventState: quiet, worldTimeMs: start }), null);
  const selected = first.update({ stepSeconds: 2, presentationSeconds: 4, eventState: { ...quiet, worldTimeMs: start + 2_000, nextArrivalMs: quiet.nextArrivalMs + 2_000 }, worldTimeMs: start + 2_000 });
  assert.match(selected.instanceId, /^2026:phantom-visitor:/);
  const completed = [{ type: "phantom-visitor-2026", storyYear: 2026, instanceId: selected.instanceId }];
  const second = new PhantomVisitorDirector(config);
  assert.equal(second.update({ stepSeconds: 4, presentationSeconds: 4, eventState: quiet, worldTimeMs: start, completedStories: completed }), null);
});
