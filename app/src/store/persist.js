// v10: tightened default permissions (5 flips: pipeline.view, messaging.startConversation,
// messaging.internalComment, settings.services, integrations.view) + grouped Roles editor.
// Bump in lockstep with INITIAL_STATE.version so v9 caches force a fresh reseed.
const STORAGE_KEY = 'pp.store.v10';

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
