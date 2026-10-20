import assert from "node:assert/strict";
import test from "node:test";

import {
  ApplyAutumn2026State,
  AUTUMN_2026_DATES,
  CreateSeasonalManifest,
  GetUpcomingSeasonalShipments,
  ResolveAutumn2026,
} from "../autumn-2026.js";
import { TrafficScheduler } from "../simulation-world.js";

const SEED = "autumn-regression-station";

test('ordinary freight uses two racks and unloads both without seasonal decoration', () => {
  const time=Date.UTC(2026,7,20), seasonal=ResolveAutumn2026(SEED,time);
  const sample=progress=>ApplyAutumn2026State({eventId:'cargo-run',visitId:'ordinary-pair',visitStartMs:time,worldTimeMs:time,phase:'service',progress,pipTaskOverallProgress:progress,cargoState:'ship'},seasonal,SEED);
  const first=sample(.2), second=sample(.65), done=sample(.95);
  for(const state of [first,second,done]){
    assert.equal(state.cargoPackageCount,2);
    assert.equal(state.seasonalCargo,null);
    assert.equal(state.pipTaskId,'cargo-transfer');
    assert.deepEqual(state.cargoManifest,[null,null]);
  }
  assert.equal(first.cargoPackageIndex,0);
  assert.equal(second.cargoPackageIndex,1);
  assert.equal(done.cargoState,'stored');
});

test("Autumn 2026 calendar boundaries are UTC-derived and deterministic", () => {
  const samples = [
    [Date.UTC(2026, 8, 21, 23, 59), "ordinary"],
    [Date.UTC(2026, 8, 22), "autumn-arrival"],
    [Date.UTC(2026, 9, 1), "autumn"],
    [Date.UTC(2026, 9, 23), "halloween-preparation"],
    [Date.UTC(2026, 9, 28), "halloween-final-preparation"],
    [Date.UTC(2026, 9, 31), "halloween"],
    [Date.UTC(2026, 10, 1), "all-saints"],
    [Date.UTC(2026, 10, 2), "halloween-cleanup"],
    [Date.UTC(2026, 10, 4), "autumn-return"],
    [Date.UTC(2026, 11, 21), "ordinary"],
  ];
  for (const [time, phase] of samples) {
    assert.equal(ResolveAutumn2026(SEED, time).phase, phase);
    assert.deepEqual(ResolveAutumn2026(SEED, time), ResolveAutumn2026(SEED, time));
  }
});

test("date jumps reconstruct fall decorations without replaying deliveries", () => {
  const before = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.autumnBegins - 1);
  const opening = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.autumnBegins);
  const caughtUp = ResolveAutumn2026(SEED, Date.UTC(2026, 9, 12, 12));
  const ended = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.autumnEnds);
  assert.equal(before.installedDecorations.length, 0);
  assert.ok(opening.fallDecorLevel > 0 && opening.fallDecorLevel < 1);
  assert.equal(caughtUp.fallDecorLevel, 1);
  assert.deepEqual(caughtUp.installedDecorations, ["gourd-cluster", "harvest-lantern", "warm-garland", "leaf-sprig"]);
  assert.equal(ended.installedDecorations.length, 0);
});

test("seasonal service deck reconstructs directly and is removed at the January 7 renewal", () => {
  const beforeInstallation = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.autumnBegins - 1);
  const installed = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.autumnBegins);
  const yearEnd = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.annualRenewal - 1);
  const renewed = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.annualRenewal);
  assert.equal(beforeInstallation.serviceDeckActive, false);
  assert.equal(beforeInstallation.serviceDeckStatus, "not-installed");
  assert.equal(installed.serviceDeckActive, true);
  assert.equal(installed.serviceDeckStatus, "installing");
  assert.equal(yearEnd.serviceDeckActive, true);
  assert.equal(renewed.serviceDeckActive, false);
  assert.equal(renewed.serviceDeckStatus, "renewed-away");
});

test("forced seasonal previews show the service deck without changing calendar-derived natural state", () => {
  const afterRenewal = AUTUMN_2026_DATES.annualRenewal + 86_400_000;
  const natural = ResolveAutumn2026(SEED, afterRenewal);
  const preview = ResolveAutumn2026(SEED, afterRenewal, { previewMode: "halloween-full" });
  assert.equal(natural.serviceDeckActive, false);
  assert.equal(preview.serviceDeckActive, true);
  assert.equal(preview.serviceDeckStatus, "preview-forced");
  assert.equal(ResolveAutumn2026(SEED, afterRenewal).serviceDeckActive, false);
});

test("seasonal manifests are stable, themed, and contain two to four visible packages", () => {
  const visit = {
    eventId: "cargo-run",
    visitId: "visit-autumn-cargo-1",
    approachStartMs: Date.UTC(2026, 8, 24, 16),
  };
  const first = CreateSeasonalManifest(SEED, visit, { forceTheme: "fall" });
  const second = CreateSeasonalManifest(SEED, visit, { forceTheme: "fall" });
  assert.deepEqual(first, second);
  assert.equal(first.theme, "fall");
  assert.ok(first.packageCount >= 2 && first.packageCount <= 4);
  assert.equal(first.packages.length, first.packageCount);
  assert.equal(new Set(first.packages.map((item) => item.id)).size, first.packageCount);
  assert.equal(CreateSeasonalManifest(SEED, { ...visit, eventId: "survey-call" }, { forceTheme: "fall" }), null);
});

test("multi-package unloading advances one coherent package at a time", () => {
  const seasonal = ResolveAutumn2026(SEED, Date.UTC(2026, 9, 10), { previewMode: "fall-cargo" });
  const makeState = (progress) => ({
    eventId: "cargo-run",
    visitId: "forced-cargo-run",
    visitStartMs: Date.UTC(2026, 9, 10),
    worldTimeMs: Date.UTC(2026, 9, 10),
    phase: "service",
    progress,
    pipTaskOverallProgress: progress,
    cargoState: "ship",
  });
  const checkpoints = [0.08, 0.26, 0.5, 0.72, 0.92].map((progress) =>
    ApplyAutumn2026State(makeState(progress), seasonal, SEED));
  const count = checkpoints[0].cargoPackageCount;
  assert.ok(count >= 2 && count <= 4);
  assert.ok(checkpoints.every((state) => state.cargoPackageCount === count));
  assert.ok(checkpoints.every((state) => state.pipTaskId === "seasonal-cargo"));
  for (let index = 1; index < checkpoints.length; index += 1) {
    assert.ok(checkpoints[index].cargoPackageIndex >= checkpoints[index - 1].cargoPackageIndex);
  }
  assert.equal(checkpoints.at(-1).cargoPackageIndex, count);
  assert.equal(checkpoints.at(-1).cargoState, "stored");
});

test("fall installation only replaces a quiet routine task", () => {
  const seasonal = ResolveAutumn2026(SEED, Date.UTC(2026, 9, 10), { previewMode: "fall-install" });
  const quiet = ApplyAutumn2026State({ phase: "quiet", eventId: "", cargoState: "none" }, seasonal, SEED);
  assert.equal(quiet.pipTaskId, "seasonal-install");
  assert.equal(quiet.seasonal.installation.forced, true);

  const busy = ApplyAutumn2026State({ phase: "service", eventId: "survey-call", cargoState: "none", pipTaskId: "survey-sync" }, seasonal, SEED);
  assert.equal(busy.pipTaskId, "survey-sync");
});

test("adding seasonal metadata does not change or overlap the traffic schedule", () => {
  const scheduler = new TrafficScheduler(SEED);
  const day = Math.floor(Date.UTC(2026, 9, 10) / 86_400_000);
  const before = scheduler.GenerateDay(day).map((visit) => [visit.visitId, visit.approachStartMs, visit.resolvedMs]);
  for (const visit of scheduler.GenerateDay(day)) CreateSeasonalManifest(SEED, visit);
  const after = scheduler.GenerateDay(day).map((visit) => [visit.visitId, visit.approachStartMs, visit.resolvedMs]);
  assert.deepEqual(after, before);
  for (let index = 1; index < after.length; index += 1) assert.ok(after[index][1] >= after[index - 1][2]);
});

test("upcoming seasonal shipment inspection is deterministic and read-only", () => {
  const scheduler = new TrafficScheduler(SEED);
  const time = Date.UTC(2026, 9, 23);
  const before = scheduler.At(time).next.visitId;
  const first = GetUpcomingSeasonalShipments(SEED, scheduler, time);
  const second = GetUpcomingSeasonalShipments(SEED, scheduler, time);
  assert.deepEqual(first, second);
  assert.ok(first.length <= 3);
  assert.ok(first.every((shipment) => shipment.atMs > time && shipment.packageCount >= 2 && shipment.packageCount <= 4));
  assert.equal(scheduler.At(time).next.visitId, before);
});

test("Halloween decorations build in stages and are gone by November 4", () => {
  const before = ResolveAutumn2026(SEED, Date.UTC(2026, 9, 22, 23, 59));
  const early = ResolveAutumn2026(SEED, Date.UTC(2026, 9, 24, 12));
  const halloween = ResolveAutumn2026(SEED, Date.UTC(2026, 9, 31, 12));
  const allSaints = ResolveAutumn2026(SEED, Date.UTC(2026, 10, 1, 12));
  const cleanup = ResolveAutumn2026(SEED, Date.UTC(2026, 10, 3));
  const complete = ResolveAutumn2026(SEED, Date.UTC(2026, 10, 4));
  assert.equal(before.halloweenDecorations.length, 0);
  assert.ok(early.halloweenDecorations.length >= 1 && early.halloweenDecorations.length < 5);
  assert.deepEqual(halloween.halloweenDecorations, ["marked-seasonal-crate", "jack-o-lantern", "halloween-lights", "ghost-pennant", "pip-halloween-cap"]);
  assert.equal(halloween.activeHoliday, "Halloween");
  assert.equal(allSaints.activeHoliday, "All Saints' Day");
  assert.ok(allSaints.halloweenDecorLevel < halloween.halloweenDecorLevel);
  assert.ok(cleanup.cleanupProgress > 0 && cleanup.cleanupProgress < 1);
  assert.equal(cleanup.activeHoliday, null);
  assert.equal(complete.halloweenDecorations.length, 0);
  assert.equal(complete.cleanupProgress, 1);
  assert.equal(complete.fallDecorLevel, 1);
});

test("Halloween package manifests use their own stable palette and markings", () => {
  const visit = { eventId: "cargo-run", visitId: "halloween-cargo", approachStartMs: Date.UTC(2026, 9, 26) };
  const manifest = CreateSeasonalManifest(SEED, visit, { forceTheme: "halloween" });
  assert.equal(manifest.theme, "halloween");
  assert.ok(manifest.packages.every((item) => ["gourd", "moon", "ghost"].includes(item.symbol)));
  assert.ok(manifest.packages.every((item) => /lantern|light|ghost|moon/i.test(item.label)));
  assert.deepEqual(manifest, CreateSeasonalManifest(SEED, visit, { forceTheme: "halloween" }));
});

test("remembrance supplies arrive shortly before November 1 in a distinct blue-and-gold shipment", () => {
  const before = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.remembranceSupplies - 1);
  const ready = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.remembranceSupplies);
  const afterCleanup = ResolveAutumn2026(SEED, AUTUMN_2026_DATES.cleanupComplete);
  assert.equal(before.remembranceFixtureAvailable, false);
  assert.equal(ready.remembranceFixtureAvailable, true);
  assert.equal(afterCleanup.remembranceFixtureAvailable, false);
  const visit = { eventId: "cargo-run", visitId: "remembrance-cargo", approachStartMs: Date.UTC(2026, 9, 31, 8) };
  const manifest = CreateSeasonalManifest(SEED, visit, { forceTheme: "remembrance" });
  assert.equal(manifest.theme, "remembrance");
  assert.ok(manifest.packageCount >= 2 && manifest.packageCount <= 4);
  assert.ok(manifest.packages.every((item) => ["sun", "moon"].includes(item.symbol)));
  assert.ok(manifest.packages.every((item) => /memorial|blue|beacon|remembrance/i.test(item.label)));
  assert.deepEqual(manifest, CreateSeasonalManifest(SEED, visit, { forceTheme: "remembrance" }));
});

test("Halloween installation, oddities, and cleanup preview states never require persistence", () => {
  const baseTime = Date.UTC(2026, 9, 25, 12);
  const install = ResolveAutumn2026(SEED, baseTime, { previewMode: "halloween-install" });
  assert.equal(install.installation.action, "install");
  const installedState = ApplyAutumn2026State({ phase: "quiet", eventId: "", cargoState: "none" }, install, SEED);
  assert.equal(installedState.pipTaskId, "seasonal-install");

  for (const [mode, oddityId] of [
    ["halloween-oddity-light", "distant-light"],
    ["halloween-oddity-shadow", "crossing-shadow"],
    ["halloween-oddity-decor", "decor-shift"],
    ["halloween-oddity-flicker", "pip-flicker"],
  ]) {
    const seasonal = ResolveAutumn2026(SEED, baseTime, { previewMode: mode });
    assert.equal(seasonal.ambientOddity.id, oddityId);
    assert.equal(seasonal.ambientOddity.forced, true);
  }
  const flicker = ResolveAutumn2026(SEED, baseTime, { previewMode: "halloween-oddity-flicker" });
  const flickerState = ApplyAutumn2026State({ phase: "quiet", eventId: "", cargoState: "none" }, flicker, SEED);
  assert.equal(flickerState.pipTaskId, "seasonal-oddity");
  assert.equal(flickerState.equipmentLightState, "flickering");

  const cleanup = ResolveAutumn2026(SEED, Date.UTC(2026, 10, 3), { previewMode: "halloween-cleanup" });
  const cleanupState = ApplyAutumn2026State({ phase: "quiet", eventId: "", cargoState: "none" }, cleanup, SEED);
  assert.equal(cleanup.installation.action, "remove");
  assert.equal(cleanupState.pipTaskId, "seasonal-cleanup");
});
