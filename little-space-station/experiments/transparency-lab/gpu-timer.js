// Asynchronous, non-blocking WebGL2 timer queries.
// Query results can arrive frames later and must be discarded on GPU disjoint.
export class GpuTimer {
  constructor(gl, maxPending = 6) {
    this.gl = gl;
    this.ext = gl && typeof gl.createQuery === "function"
      ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null;
    this.maxPending = maxPending;
    this.pending = [];
    this.active = null;
    this.latest = null;
  }

  get supported() { return Boolean(this.ext); }

  begin(meta = {}) {
    if (!this.ext || this.active || this.pending.length >= this.maxPending) return false;
    if (this.gl.getParameter(this.ext.GPU_DISJOINT_EXT)) return false;
    const query = this.gl.createQuery();
    if (!query) return false;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.active = { query, meta };
    return true;
  }

  end() {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  poll() {
    if (!this.ext) return [];
    if (this.gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
      for (const item of this.pending) this.gl.deleteQuery(item.query);
      this.pending.length = 0;
      this.latest = null;
      return [];
    }
    const finished = [];
    while (this.pending.length) {
      const item = this.pending[0];
      if (!this.gl.getQueryParameter(item.query, this.gl.QUERY_RESULT_AVAILABLE)) break;
      const nanos = this.gl.getQueryParameter(item.query, this.gl.QUERY_RESULT);
      this.gl.deleteQuery(item.query);
      this.pending.shift();
      if (!Number.isFinite(nanos) || nanos < 0) continue;
      const result = { ms: nanos / 1_000_000, meta: item.meta };
      finished.push(result);
      this.latest = result;
    }
    return finished;
  }

  dispose() {
    // Stop accepting new samples; delete outstanding queries on teardown.
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.active.query);
      this.active = null;
    }
    for (const item of this.pending) this.gl.deleteQuery(item.query);
    this.pending.length = 0;
  }
}
