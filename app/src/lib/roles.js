// Roles + permissions.
// The matrix is the *default*; the live assignment lives in the store (state.permissions)
// and can be edited in Settings → Roles (Owner only).

export const ROLES = ['owner', 'admin', 'crew'];

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  crew: 'Crew',
};

export const ROLE_DESCRIPTIONS = {
  owner: 'Full access to everything, including role assignment and billing.',
  admin: 'Manages day-to-day ops: clients, jobs, invoices, messages, team. No role changes.',
  crew:  'Sees only their own jobs and client threads. Can update job status.',
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
  'invoices.view':           { label: 'View Invoices',            defaultRoles: ['owner', 'admin'] },
  'invoices.edit':           { label: 'Create / edit invoices',   defaultRoles: ['owner', 'admin'] },
  'invoices.recordPayment':  { label: 'Record payments',          defaultRoles: ['owner', 'admin'] },
  'reminders.view':          { label: 'View Reminders',           defaultRoles: ['owner', 'admin'] },
  'reminders.edit':          { label: 'Edit reminder templates',  defaultRoles: ['owner', 'admin'] },
  'messaging.use':           { label: 'Use Messaging',            defaultRoles: ['owner', 'admin', 'crew'] },
  'settings.company':        { label: 'Edit company settings',    defaultRoles: ['owner', 'admin'] },
  'settings.services':       { label: 'Edit services / frequencies', defaultRoles: ['owner', 'admin'] },
  'settings.team.view':      { label: 'View team',                defaultRoles: ['owner', 'admin'] },
  'settings.team.edit':      { label: 'Invite / edit team',       defaultRoles: ['owner', 'admin'] },
  'settings.roles.edit':     { label: 'Edit role permissions',    defaultRoles: ['owner'] },
  'settings.account':        { label: 'Edit own account',         defaultRoles: ['owner', 'admin', 'crew'] },
};

// Build the initial permissions list for the store.
export function seedPermissions() {
  return Object.entries(PERMISSIONS).map(([key, def]) => ({
    id: key,
    label: def.label,
    roles: [...def.defaultRoles],
  }));
}

// Check if a user can perform a permission, given the live matrix from state.
export function can(user, permKey, permissions) {
  if (!user || !user.role) return false;
  const record = permissions?.find((p) => p.id === permKey);
  if (!record) return false;
  return record.roles.includes(user.role);
}
