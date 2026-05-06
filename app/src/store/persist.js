// v22: Invoices rescoped to manual tracking. Drops the 'draft' status (any
// existing drafts migrate to 'pending') and adds two additive fields per
// invoice: `attachment` (metadata for the PDF stored in IndexedDB) and `notes`
// (free-form text shown alongside the summary).
//
// v21: Drop archive concept entirely (only deletion). Purges currently-archived
// conversations/contacts/clients and strips archive flags from the schema.
// Bump in lockstep with INITIAL_STATE.version.
import { PERMISSIONS } from '../lib/roles';

const STORAGE_KEY = 'pp.store.v22';

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

// v20: additive — DMs introduce a new channel value ('dm') and a new
// participantUserIds field. Existing conversations are untouched.
function migrateV19toV20(state) {
  return { ...state, version: 20 };
}

// v21: Archive concept is gone. Anything currently archived is hard-deleted
// (matches the "no archiving, only deletion" directive). The `archived` field
// on conversations and the 'archived' lifecycle bucket on contacts are stripped.
// `archivedAt` timestamps on contacts/clients are dropped too. Inactive clients
// (status: 'inactive' with archivedAt) are purged; active clients are untouched.
// Also reconciles the permissions list with the current PERMISSIONS schema:
// adds new permission keys (e.g. messaging.startInternalThread), migrates the
// renamed clients.archive → clients.delete (preserving role assignments), and
// drops permission rows that no longer exist in the schema.
function migrateV20toV21(state) {
  const archivedConvIds = new Set(
    (state.conversations || []).filter((c) => c.archived === true).map((c) => c.id)
  );
  const archivedContactIds = new Set(
    (state.contacts || []).filter((c) => c.lifecycle === 'archived').map((c) => c.id)
  );
  const archivedClientIds = new Set(
    (state.clients || []).filter((c) => c.archivedAt || c.status === 'inactive').map((c) => c.id)
  );

  const conversations = (state.conversations || [])
    .filter((c) => !archivedConvIds.has(c.id))
    .map(({ archived, ...rest }) => rest); // strip archived flag from survivors

  const messages = (state.messages || []).filter((m) => !archivedConvIds.has(m.conversationId));

  const contacts = (state.contacts || [])
    .filter((c) => !archivedContactIds.has(c.id) && !archivedClientIds.has(c.companyId))
    .map(({ archivedAt, ...rest }) => rest);

  const clients = (state.clients || [])
    .filter((c) => !archivedClientIds.has(c.id))
    .map(({ archivedAt, ...rest }) => rest);

  // Reconcile permissions against the live PERMISSIONS schema.
  const existingByKey = new Map((state.permissions || []).map((p) => [p.id, p]));
  // clients.archive was renamed to clients.delete — carry over its role list.
  const renamed = existingByKey.get('clients.archive');
  if (renamed && !existingByKey.has('clients.delete')) {
    existingByKey.set('clients.delete', { ...renamed, id: 'clients.delete', label: 'Delete accounts' });
  }
  existingByKey.delete('clients.archive');
  const permissions = Object.entries(PERMISSIONS).map(([key, def]) => {
    const prev = existingByKey.get(key);
    return prev
      ? { id: key, label: def.label, roles: prev.roles }
      : { id: key, label: def.label, roles: [...def.defaultRoles] };
  });

  return {
    ...state,
    version: 21,
    conversations,
    messages,
    contacts,
    clients,
    sites: (state.sites || []).filter((s) => !archivedClientIds.has(s.clientId)),
    jobs: (state.jobs || []).filter((j) => !archivedClientIds.has(j.clientId)),
    invoices: (state.invoices || []).filter((i) => !archivedClientIds.has(i.clientId)),
    clientActivities: (state.clientActivities || []).filter((a) => !archivedClientIds.has(a.clientId)),
    contactActivities: (state.contactActivities || []).filter((a) => !archivedContactIds.has(a.contactId)),
    permissions,
  };
}

// v22: Invoices rescope. Drop the 'draft' status (→ 'pending') and add the two
// additive fields the new UI reads: `attachment` (null when no PDF on file) and
// `notes` (empty string by default). Purely additive — existing payments,
// line items, statuses and FKs are untouched.
function migrateV21toV22(state) {
  const invoices = (state.invoices || []).map((inv) => ({
    ...inv,
    status: inv.status === 'draft' ? 'pending' : inv.status,
    attachment: inv.attachment ?? null,
    notes: typeof inv.notes === 'string' ? inv.notes : '',
  }));
  return { ...state, version: 22, invoices };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 22) return parsed;
    }
    // Attempt v21 → v22 migration
    const v21Raw = window.localStorage.getItem('pp.store.v21');
    if (v21Raw) {
      const v21 = JSON.parse(v21Raw);
      if (v21 && typeof v21 === 'object' && v21.version === 21) return migrateV21toV22(v21);
    }
    // Attempt v20 → v21 → v22 migration chain
    const v20Raw = window.localStorage.getItem('pp.store.v20');
    if (v20Raw) {
      const v20 = JSON.parse(v20Raw);
      if (v20 && typeof v20 === 'object' && v20.version === 20) return migrateV21toV22(migrateV20toV21(v20));
    }
    // Attempt v19 → v20 → v21 → v22 migration chain
    const v19Raw = window.localStorage.getItem('pp.store.v19');
    if (v19Raw) {
      const v19 = JSON.parse(v19Raw);
      if (v19 && typeof v19 === 'object' && v19.version === 19) return migrateV21toV22(migrateV20toV21(migrateV19toV20(v19)));
    }
    // Attempt v18 → v19 → v20 → v21 → v22 migration chain
    const v18Raw = window.localStorage.getItem('pp.store.v18');
    if (v18Raw) {
      const v18 = JSON.parse(v18Raw);
      if (v18 && typeof v18 === 'object' && v18.version === 18) {
        return migrateV21toV22(migrateV20toV21(migrateV19toV20(migrateV18toV19(v18))));
      }
    }
    // Attempt v17 → v18 → v19 → v20 → v21 → v22 migration chain
    const v17Raw = window.localStorage.getItem('pp.store.v17');
    if (v17Raw) {
      const v17 = JSON.parse(v17Raw);
      if (v17 && typeof v17 === 'object' && v17.version === 17) {
        return migrateV21toV22(migrateV20toV21(migrateV19toV20(migrateV18toV19(migrateV17toV18(v17)))));
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
