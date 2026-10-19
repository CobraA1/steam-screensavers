import test from "node:test";
import assert from "node:assert/strict";
import { GpuTimer } from "../experiments/transparency-lab/gpu-timer.js";

function fakeContext(available = true) {
  const ext = { GPU_DISJOINT_EXT: 8001, TIME_ELAPSED_EXT: 8002 };
  const context = {
    QUERY_RESULT_AVAILABLE: 8003,
    QUERY_RESULT: 8004,
    deleted: [],
    calls: [],
    queries: [],
    disjoint: false,
    getExtension(name) { return available && name === "EXT_disjoint_timer_query_webgl2" ? ext : null; },
    createQuery() { const q = { nanos: 2_500_000, ready: false }; this.queries.push(q); return q; },
    beginQuery(target, query) { this.calls.push(["begin", target, query]); },
    endQuery(target) { this.calls.push(["end", target]); },
    getParameter(field) { assert.equal(field, ext.GPU_DISJOINT_EXT); return this.disjoint; },
    getQueryParameter(query, field) {
      if (field === this.QUERY_RESULT_AVAILABLE) return query.ready;
      if (field === this.QUERY_RESULT) return query.nanos;
      throw new Error("unexpected query");
    },
    deleteQuery(query) { this.deleted.push(query); },
  };
  return context;
}

test("GPU query results arrive asynchronously, convert ns to ms, and carry mode metadata", () => {
  const gl = fakeContext();
  const timer = new GpuTimer(gl);
  assert.equal(timer.supported, true);
  assert.equal(timer.begin({ mode: "offscreen", measured: true }), true);
  timer.end();
  assert.deepEqual(timer.poll(), []);
  gl.queries[0].ready = true;
  const completed = timer.poll();
  assert.equal(completed.length, 1);
  assert.equal(completed[0].ms, 2.5);
  assert.deepEqual(completed[0].meta, { mode: "offscreen", measured: true });
  assert.equal(gl.deleted.length, 1);
  timer.dispose();
});

test("unsupported browser reports no GPU timing queries", () => {
  const gl = fakeContext(false);
  const timer = new GpuTimer(gl);
  assert.equal(timer.supported, false);
  assert.equal(timer.begin(), false);
  assert.deepEqual(timer.poll(), []);
});

test("disjoint flags invalidate queued queries rather than reporting misleading GPU times", () => {
  const gl = fakeContext();
  const timer = new GpuTimer(gl);
  timer.begin({ mode: "hash" });
  timer.end();
  gl.queries[0].ready = true;
  gl.disjoint = true;
  assert.deepEqual(timer.poll(), []);
  assert.equal(timer.latest, null);
  assert.equal(gl.deleted.length, 1);
  assert.equal(timer.begin(), false);
});

test("pending queue is bounded and teardown deletes unfinished queries", () => {
  const gl = fakeContext();
  const timer = new GpuTimer(gl, 2);
  for (let i = 0; i < 2; i += 1) { assert.equal(timer.begin(), true); timer.end(); }
  assert.equal(timer.begin(), false);
  timer.dispose();
  assert.equal(gl.deleted.length, 2);
  assert.equal(timer.pending.length, 0);
});
