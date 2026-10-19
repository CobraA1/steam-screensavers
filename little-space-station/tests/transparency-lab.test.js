import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import {
  MODES, SHAPE_OPTIONS, PASS_OPTIONS, Clamp, FormatBytes, EstimateTargetBytes,
  EstimateGeometryBytes, WindowFps, MakeLayout, Percentile, BenchmarkSummary,
} from "../experiments/transparency-lab/metrics.js";

test("the comparison supports all three modes and bounded counts", () => {
  assert.deepEqual(MODES, ["blend", "hash", "offscreen"]);
  assert.deepEqual(SHAPE_OPTIONS, [6, 12, 24, 48, 96, 256, 512, 1024]);
  assert.deepEqual(PASS_OPTIONS, [1, 2, 4, 8]);
  assert.equal(Clamp(-3, 0, 1), 0);
  assert.equal(Clamp(1.2, 0, 1), 1);
  assert.equal(Clamp(Number.NaN, 0, 1), 0);
});

test("VRAM estimate counts only allocated render target attachments", () => {
  assert.equal(EstimateTargetBytes(640, 480), 640 * 480 * 8);
  assert.equal(EstimateTargetBytes(640, 480, { samples: 4 }), 640 * 480 * 32);
  assert.equal(EstimateTargetBytes(0, 100), 0);
  assert.equal(FormatBytes(-1), "N/A");
});

test("geometry estimate deduplicates shared GPU attributes", () => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const expected = Object.values(g.attributes).reduce((a, v) => a + v.array.byteLength, 0) + g.index.array.byteLength;
  assert.equal(EstimateGeometryBytes([g, g]), expected);
  assert.equal(EstimateGeometryBytes([]), 0);
});

test("pane layout is normalized for single and comparison modes", () => {
  const horizontal = MakeLayout(1200, 600, 3, 1.5);
  assert.equal(horizontal.panes.length, 3);
  assert.equal(horizontal.panes[0].physicalWidth, 600);
  assert.equal(horizontal.panes[2].x, 800);
  const vertical = MakeLayout(600, 1050, 3, 1);
  assert.equal(vertical.horizontal, false);
  assert.equal(vertical.panes[1].y, 350);
  assert.equal(vertical.panes[0].physicalWidth, 600);
  assert.equal(MakeLayout(600, 300, 1, 1).panes.length, 1);
});

test("FPS rolling window reports measured wall-time frames", () => {
  assert.equal(WindowFps([]), null);
  assert.equal(WindowFps([0, 100, 200]), 10);
  assert.equal(WindowFps([1, 1]), null);
});

test("benchmark summaries use robust median/p95 and ignore invalid samples", () => {
  assert.equal(Percentile([1, 2, 3, 4, 5], 0.5), 3);
  assert.ok(Math.abs(Percentile([1, 3, 5], 0.95) - 4.8) < 1e-12);
  assert.equal(Percentile([NaN, Infinity, 5, 9], 0.5), 7);
  const summary = BenchmarkSummary({ frames: [0, 10, 20], cpu: [1, 2, 8], gpu: [0.3, 0.5, 0.7] });
  assert.equal(summary.fps, 100);
  assert.equal(summary.cpuMedian, 2);
  assert.equal(summary.gpuMedian, 0.5);
  assert.equal(summary.gpuSamples, 3);
  const empty = BenchmarkSummary();
  assert.equal(empty.gpuMedian, null);
  assert.equal(empty.cpuMedian, null);
});
