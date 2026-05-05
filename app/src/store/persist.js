// v14: KPI write-paths shipped — JobDetail "Mark Missed" button + ContactDetail
// "Log complaint" composer + "Mark resolved / Reopen" toggle. Reducer gained
// UPDATE_CONTACT_ACTIVITY. Activity field naming aligned to schema canon
// (occurredAt + body, was at + text on the seeded complaints).
// Bump in lockstep with INITIAL_STATE.version so v13 caches force a fresh reseed.
const STORAGE_KEY = 'pp.store.v14';

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private mode — silently drop.
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
