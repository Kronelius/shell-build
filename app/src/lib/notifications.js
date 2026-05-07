// Notification catalog — single source of truth for the per-user toggle list,
// the role/permission gates that govern visibility, and the labels used in
// the Account → Notifications panel.
//
// Visibility rules:
//   - roleAllowlist: array of role keys ('owner' | 'admin' | 'crew') that
//     may see the toggle. Omitted = all roles.
//   - requiresPermission: a permission key. If set, the user must have it
//     (per `can()` in lib/roles.js) for the toggle to be visible.
//   - description: shown beneath the toggle to clarify scope.
//
// The default-on event toggles + the off-by-default mobilePushEnabled flag
// live alongside in DEFAULT_NOTIFICATION_PREFS (defined in seed.js and
// mirrored in persist.js for migrations) — the catalog here only describes
// presentation + gating, not defaults.

import { can } from './roles';

export const NOTIFICATION_GROUPS = [
  {
    id: 'messaging',
    label: 'Messaging',
    items: [
      {
        key: 'newCustomerMessage',
        label: 'New customer SMS or email',
        description: 'When a client texts or emails a thread you can see.',
        roleAllowlist: ['owner', 'admin'],
      },
      {
        key: 'newDM',
        label: 'Someone DMs me',
        description: 'Direct messages from teammates.',
      },
      {
        key: 'newInternalMessage',
        label: 'New message in an internal chat thread',
        description: 'Internal staff threads you are part of.',
      },
    ],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    items: [
      {
        key: 'jobCreatedOrRescheduled',
        label: 'A job assigned to me is created or rescheduled',
        description: 'Crew receive these only for their own jobs.',
      },
      {
        key: 'jobCancelled',
        label: 'A job I am on is cancelled',
      },
    ],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    items: [
      {
        key: 'invoicePaid',
        label: 'An invoice gets paid',
        requiresPermission: 'invoices.view',
      },
      {
        key: 'invoiceOverdue',
        label: 'An invoice goes overdue',
        requiresPermission: 'invoices.view',
      },
    ],
  },
];

// Returns the catalog filtered to the toggles a given user should see.
// Each group is included only if it has at least one visible toggle.
export function getVisibleNotificationGroups(user, permissions, overrides) {
  if (!user) return [];
  return NOTIFICATION_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.roleAllowlist && !item.roleAllowlist.includes(user.role)) return false;
        if (item.requiresPermission && !can(user, item.requiresPermission, permissions, overrides)) return false;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);
}

// Lookup helper — returns whether a given event toggle key is visible to the
// user. Used by NotificationListener to gate event firing on toggle visibility
// AND user opt-in (the toggle being on).
export function isNotificationVisibleForUser(eventKey, user, permissions, overrides) {
  if (!user) return false;
  for (const g of NOTIFICATION_GROUPS) {
    const item = g.items.find((i) => i.key === eventKey);
    if (!item) continue;
    if (item.roleAllowlist && !item.roleAllowlist.includes(user.role)) return false;
    if (item.requiresPermission && !can(user, item.requiresPermission, permissions, overrides)) return false;
    return true;
  }
  return false;
}
