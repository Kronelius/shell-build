// v16: Email invitations — separate `invitations` array tracking pending/accepted/revoked invites
// alongside the user record. Bump in lockstep with INITIAL_STATE.version.
const STORAGE_KEY = 'pp.store.v16';

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

function migrateV15toV16(state) {
  return {
    ...state,
    version: 16,
    invitations: state.invitations || [],
  };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 16) return parsed;
    }
    // Attempt v15 → v16 migration
    const v15Raw = window.localStorage.getItem('pp.store.v15');
    if (v15Raw) {
      const v15 = JSON.parse(v15Raw);
      if (v15 && typeof v15 === 'object' && v15.version === 15) return migrateV15toV16(v15);
    }
    // Attempt v14 → v15 → v16 migration chain
    const v14Raw = window.localStorage.getItem('pp.store.v14');
    if (v14Raw) {
      const v14 = JSON.parse(v14Raw);
      if (v14 && typeof v14 === 'object' && v14.version === 14) {
        return migrateV15toV16(migrateV14toV15(v14));
      }
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
