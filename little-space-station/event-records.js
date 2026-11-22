// Companion to narrative v5, NOT a replacement for its memories/checkpoints.
export const EVENT_RECORD_KEY = 'little-space-station:event-schedule:v1';
const statuses = new Set(['pending', 'presenting', 'interrupted', 'completed', 'expired', 'superseded']);
export function CreateEventRecords({ storage, readOnly = false, worldSeed } = {}) {
  try { storage ??= globalThis.localStorage; } catch { /* Access itself can be denied. */ }
  let status = 'memory only', records = [];
  try {
    const value = JSON.parse(storage?.getItem(EVENT_RECORD_KEY) || 'null');
    if ([1, 2].includes(value?.version) && value.worldSeed === worldSeed && Array.isArray(value.events))
      records = value.events.filter(r => typeof r.id === 'string' && r.id.length < 180 && statuses.has(r.status) && Number.isFinite(r.due)).slice(-128);
    records = records.map(r => ({ ...r, effect: ['pip', 'fallback'].includes(r.effect?.source) && Number.isFinite(r.effect.appliedAt) ? r.effect : undefined,
      legacyCalendar: value.version === 1 && r.status === 'completed' }));
    status = readOnly ? 'read-only preview' : 'loaded';
  } catch { status = 'storage unavailable or invalid'; }
  return { records, status: () => status, clear({ explicit = false } = {}) {
    if (!explicit) return { ok: false, status: 'explicit action required' };
    try {
      const value = JSON.parse(storage.getItem(EVENT_RECORD_KEY) || 'null');
      if (value?.worldSeed && value.worldSeed !== worldSeed) return { ok: false, status: 'different seed' };
      storage.removeItem(EVENT_RECORD_KEY); records = []; status = 'cleared explicitly'; return { ok: true };
    } catch { return { ok: false, status: 'clear failed' }; }
  }, save(events) {
    records = events.slice(-128);
    if (readOnly) return;
    try {
      const text = JSON.stringify({ version: 2, worldSeed, events: records });
      storage.setItem(EVENT_RECORD_KEY, text);
      if (storage.getItem(EVENT_RECORD_KEY) !== text) throw new Error('read-back failed');
      status = 'saved';
    } catch { status = 'memory only: storage failed'; }
  } };
}
