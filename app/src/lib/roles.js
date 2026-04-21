// Roles + permissions.
// The matrix is the *default*; the live assignment lives in the store (state.permissions)
// and can be edited in Settings → Roles (Super Admin only).
// Per-user overrides live in state.userPermissionOverrides and are applied in can().

export const ROLES = ['owner', 'admin', 'crew'];

export const ROLE_LABELS = {
  owner: 'Super Admin',
  admin: 'Admin',
  crew: 'Crew',
};

export const ROLE_DESCRIPTIONS = {
  owner: 'Full access — can assign roles, edit permissions, and override access per user. The top tier.',
  admin: 'Manages day-to-day ops: clients, jobs, invoices, messages, team. Cannot assign roles.',
  crew:  'Sees their own jobs and assigned contacts. Can update job status.',
};

// key → { label, description, defaultRoles }
export const PERMISSIONS = {
  'dashboard.view':          { label: 'View Dashboard',           defaultRoles: ['owner', 'admin', 'crew'] },
  'schedule.view':           { label: 'View Schedule',            defaultRoles: ['owner', 'admin', 'crew'] },
  'schedule.edit':           { label: 'Create / edit jobs',       defaultRoles: ['owner', 'admin'] },
  'schedule.statusTransition': { label: 'Change job status',      defaultRoles: ['owner', 'admin', 'crew'] },
  'clients.view':            { label: 'View Clients',             defaultRoles: ['owner', 'admin', 'crew'] },
  'clients.edit':            { label: 'Create / edit clients',    defaultRoles: ['owner', 'admin'] },
  'clients.archive':         { label: 'Archive / delete clients', defaultRoles: ['owner', 'admin'] },
  'sites.edit':              { label: 'Manage client sites',      defaultRoles: ['owner', 'admin'] },
  // ---------- Contacts (CRM) ----------
  'contacts.view':           { label: 'View Contacts',                    defaultRoles: ['owner', 'admin', 'crew'] },
  'contacts.view.all':       { label: 'View all contacts (not just own)', defaultRoles: ['owner', 'admin'] },
  'contacts.edit':           { label: 'Create / edit contacts',           defaultRoles: ['owner', 'admin'] },
  'contacts.edit.own':       { label: 'Edit assigned contacts',           defaultRoles: ['owner', 'admin', 'crew'] },
  'contacts.delete':         { label: 'Delete / archive contacts',        defaultRoles: ['owner', 'admin'] },
  'contacts.assignOwner':    { label: 'Assign contact owner',             defaultRoles: ['owner', 'admin'] },
  'tags.manage':             { label: 'Create / edit tags',               defaultRoles: ['owner', 'admin'] },
  'pipeline.view':           { label: 'View sales pipeline',              defaultRoles: ['owner', 'admin', 'crew'] },
  'pipeline.edit':           { label: 'Move deals in pipeline',           defaultRoles: ['owner', 'admin'] },
  // ---------- Invoices / Reminders / Messaging ----------
  'invoices.view':           { label: 'View Invoices',            defaultRoles: ['owner', 'admin'] },
  'invoices.edit':           { label: 'Create / edit invoices',   defaultRoles: ['owner', 'admin'] },
  'invoices.recordPayment':  { label: 'Record payments',          defaultRoles: ['owner', 'admin'] },
  'reminders.view':          { label: 'View Reminders',           defaultRoles: ['owner', 'admin'] },
  'reminders.edit':          { label: 'Edit reminder templates',  defaultRoles: ['owner', 'admin'] },
  'messaging.use':           { label: 'Use Messaging',            defaultRoles: ['owner', 'admin', 'crew'] },
  // ---------- Settings ----------
  'settings.company':        { label: 'Edit company settings',    defaultRoles: ['owner', 'admin'] },
  'settings.services':       { label: 'Edit services / frequencies', defaultRoles: ['owner', 'admin'] },
  'settings.team.view':      { label: 'View team',                defaultRoles: ['owner', 'admin'] },
  'settings.team.edit':      { label: 'Invite / edit team',       defaultRoles: ['owner', 'admin'] },
  'settings.roles.edit':     { label: 'Edit role permissions',    defaultRoles: ['owner'] },
  'settings.account':        { label: 'Edit own account',         defaultRoles: ['owner', 'admin', 'crew'] },
  // ---------- Super Admin gates ----------
  'staff.assignRoles':       { label: 'Assign roles to staff',       defaultRoles: ['owner'] },
  'staff.editOverrides':     { label: 'Grant / revoke per-user perms', defaultRoles: ['owner'] },
};

// Build the initial permissions list for the store.
export function seedPermissions() {
  return Object.entries(PERMISSIONS).map(([key, def]) => ({
    id: key,
    label: def.label,
    roles: [...def.defaultRoles],
  }));
}

// Resolve the override record for a given user, if any.
function findOverride(overrides, userId) {
  if (!overrides || !userId) return null;
  return overrides.find((o) => o.userId === userId) || null;
}

// Check if a user can perform a permission, given the live matrix + optional overrides.
// overrides: [{ userId, grants: [key], revokes: [key] }]
// Precedence: explicit revoke > explicit grant > role default.
export function can(user, permKey, permissions, overrides) {
  if (!user || !user.role) return false;
  const ov = findOverride(overrides, user.id);
  if (ov?.revokes?.includes(permKey)) return false;
  if (ov?.grants?.includes(permKey)) return true;
  const record = permissions?.find((p) => p.id === permKey);
  if (!record) return false;
  return record.roles.includes(user.role);
}

// Resolve the effective set of permission keys for a user.
// Useful for settings UIs that need to show role-default vs. custom.
export function effectivePermissions(user, permissions, overrides) {
  if (!user || !user.role || !permissions) return new Set();
  const ov = findOverride(overrides, user.id);
  const out = new Set();
  permissions.forEach((p) => {
    if (p.roles.includes(user.role)) out.add(p.id);
  });
  (ov?.grants || []).forEach((k) => out.add(k));
  (ov?.revokes || []).forEach((k) => out.delete(k));
  return out;
}
