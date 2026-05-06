// v19: Crew loses dashboard; gains messaging (internal chat only).
// Bump in lockstep with INITIAL_STATE.version.
const STORAGE_KEY = 'pp.store.v19';

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

function migrateV16toV17(state) {
  const contacts = (state.contacts || []).map(({ visibility, ...rest }) => rest);
  const crewRevokePerms = ['contacts.view', 'contacts.edit.own', 'messaging.use', 'messaging.internalComment'];
  const permissions = (state.permissions || []).map((p) =>
    crewRevokePerms.includes(p.id) ? { ...p, roles: p.roles.filter((r) => r !== 'crew') } : p
  );
  return { ...state, version: 17, contacts, permissions };
}

function migrateV17toV18(state) {
  const crewRestorePerms = ['messaging.use', 'messaging.internalComment'];
  const permissions = (state.permissions || []).map((p) =>
    crewRestorePerms.includes(p.id) && !p.roles.includes('crew')
      ? { ...p, roles: [...p.roles, 'crew'] }
      : p
  );
  return { ...state, version: 18, permissions };
}

function migrateV18toV19(state) {
  const permissions = (state.permissions || []).map((p) => {
    if (p.id === 'dashboard.view') {
      return { ...p, roles: p.roles.filter((r) => r !== 'crew') };
    }
    if ((p.id === 'messaging.use' || p.id === 'messaging.internalComment') && !p.roles.includes('crew')) {
      return { ...p, roles: [...p.roles, 'crew'] };
    }
    return p;
  });
  return { ...state, version: 19, permissions };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 19) return parsed;
    }
    // Attempt v18 → v19 migration
    const v18Raw = window.localStorage.getItem('pp.store.v18');
    if (v18Raw) {
      const v18 = JSON.parse(v18Raw);
      if (v18 && typeof v18 === 'object' && v18.version === 18) return migrateV18toV19(v18);
    }
    // Attempt v17 → v18 → v19 migration chain
    const v17Raw = window.localStorage.getItem('pp.store.v17');
    if (v17Raw) {
      const v17 = JSON.parse(v17Raw);
      if (v17 && typeof v17 === 'object' && v17.version === 17) return migrateV18toV19(migrateV17toV18(v17));
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
