// Pure helpers shared by the browser lab and Node tests.
export const MODES = Object.freeze(["blend", "hash", "offscreen"]);
export const SHAPE_OPTIONS = Object.freeze([6, 12, 24, 48, 96]);

export function Clamp(value, low, high) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(high, Math.max(low, number)) : low;
}

export function FormatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "N/A";
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 ** 2)).toFixed(1)} MiB`;
}

export function EstimateTargetBytes(width, height, { colorBytes = 4, depthBytes = 4, samples = 1 } = {}) {
  const w = Math.max(0, Math.floor(Number(width) || 0));
  const h = Math.max(0, Math.floor(Number(height) || 0));
  return w * h * (colorBytes + depthBytes) * Math.max(1, samples);
}

// Geometry attributes/index CPU typed-array sizes are useful as a lower bound
// for GPU attribute allocation; this is not total graphics memory.
export function EstimateGeometryBytes(geometries) {
  const visited = new Set();
  let bytes = 0;
  for (const geometry of geometries) {
    if (!geometry || visited.has(geometry.uuid)) continue;
    visited.add(geometry.uuid);
    for (const attribute of Object.values(geometry.attributes || {})) {
      if (attribute?.array) bytes += attribute.array.byteLength;
    }
    if (geometry.index?.array) bytes += geometry.index.array.byteLength;
  }
  return bytes;
}

export function WindowFps(samples) {
  if (samples.length < 2) return null;
  const elapsed = samples.at(-1) - samples[0];
  return elapsed > 0 ? ((samples.length - 1) * 1000) / elapsed : null;
}

export function MakeLayout(width, height, panelCount, pixelRatio) {
  const horizontal = panelCount === 1 || width >= 900;
  const count = Math.max(1, panelCount);
  const panes = [];
  for (let i = 0; i < count; i += 1) {
    const x = horizontal ? width * i / count : 0;
    const y = horizontal ? 0 : height * i / count;
    const w = horizontal ? width / count : width;
    const h = horizontal ? height : height / count;
    panes.push({ x, y, w, h, physicalWidth: Math.max(1, Math.round(w * pixelRatio)), physicalHeight: Math.max(1, Math.round(h * pixelRatio)) });
  }
  return { horizontal, panes };
}
