// v13: Real Instantly.ai integration — outreachSettings gains instantlyApiKey,
// instantlyKeyValidatedAt, instantlyPlanTier, instantlyMailboxes (cached account
// list from GET /accounts), instantlyMailboxesFetchedAt, defaultTimezone, and
// pendingOAuth (transient OAuth-flow state). The legacy stub mailbox fields are
// kept for backwards compatibility — UI branches on instantlyApiKey.
// Bump in lockstep with INITIAL_STATE.version so v12 caches force a fresh reseed.
const STORAGE_KEY = 'pp.store.v13';

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
