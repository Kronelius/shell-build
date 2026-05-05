// v15: Multi-pipeline support — pipelines array with nested stages, contacts gain pipelineId.
// Bump in lockstep with INITIAL_STATE.version so v14 caches trigger migration.
const STORAGE_KEY = 'pp.store.v15';

function migrateV14toV15(state) {
  const defaultPipelineId = 'pl_seed_default';
  const pipelines = [{
    id: defaultPipelineId,
    label: 'Sales Pipeline',
    createdAt: new Date().toISOString(),
    stages: state.pipelineStages || [],
  }];
  const contacts = (state.contacts || []).map((c) => ({
    ...c,
    pipelineId: c.stage ? defaultPipelineId : null,
  }));
  const { pipelineStages, ...rest } = state;
  return {
    ...rest,
    version: 15,
    pipelines,
    activePipelineId: defaultPipelineId,
    contacts,
  };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 15) return parsed;
    }
    // Attempt v14 migration
    const oldRaw = window.localStorage.getItem('pp.store.v14');
    if (oldRaw) {
      const v14 = JSON.parse(oldRaw);
      if (v14 && typeof v14 === 'object' && v14.version === 14) return migrateV14toV15(v14);
    }
    return null;
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
