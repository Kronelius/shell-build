// Normalized seed data. Populates the store on first run.
// Generic cleaning business; entity relationships use explicit foreign keys.
// v2 adds: contacts (people, keyed on email), tags, contactActivities,
// userPermissionOverrides, plus contact FKs on clients/invoices/sites/conversations.

import { seedId } from '../lib/ids';
import { seedPermissions } from '../lib/roles';

// ---------- helpers ----------
const atTime = (daysFromToday, hours, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

// ---------- core ----------
const company = {
  id: seedId('co', 'main'),
  name: 'Acme Cleaning Co.',
  owner: 'Alex Morgan',
  logoInitials: 'AC',
  invoicePrefix: 'INV',
  address: '1200 Industrial Way, Suite 300, Seattle WA 98101',
  phone: '(206) 555-0199',
  email: 'hello@acmecleaning.co',
  businessHours: 'Mon–Fri 7:00 AM – 6:00 PM',
  taxRate: 0,
};

const users = [
  { id: seedId('u', 'owner'),  name: 'Alex Morgan',  email: 'alex@acmecleaning.co',   phone: '(206) 555-0100', role: 'owner', status: 'active', avatar: 1, initials: 'AM', createdAt: daysAgo(365) },
  { id: seedId('u', 'admin'),  name: 'Jordan Tate',  email: 'jordan@acmecleaning.co', phone: '(206) 555-0111', role: 'admin', status: 'active', avatar: 2, initials: 'JT', createdAt: daysAgo(300) },
  { id: seedId('u', 'crew1'),  name: 'Sam Lee',      email: 'sam@acmecleaning.co',    phone: '(206) 555-0122', role: 'crew',  status: 'active', avatar: 3, initials: 'SL', createdAt: daysAgo(220) },
  { id: seedId('u', 'crew2'),  name: 'Riley Diaz',   email: 'riley@acmecleaning.co',  phone: '(206) 555-0133', role: 'crew',  status: 'active', avatar: 4, initials: 'RD', createdAt: daysAgo(180) },
  { id: seedId('u', 'crew3'),  name: 'Casey Shaw',   email: 'casey@acmecleaning.co',  phone: '(206) 555-0144', role: 'crew',  status: 'active', avatar: 5, initials: 'CS', createdAt: daysAgo(120) },
];

const services = [
  { id: seedId('svc', 'jan'),  name: 'Janitorial',         defaultDurationMins:  90 },
  { id: seedId('svc', 'flr'),  name: 'Floor Care',         defaultDurationMins: 120 },
  { id: seedId('svc', 'win'),  name: 'Window Cleaning',    defaultDurationMins:  90 },
  { id: seedId('svc', 'pc'),   name: 'Post-Construction',  defaultDurationMins: 240 },
  { id: seedId('svc', 'pw'),   name: 'Pressure Washing',   defaultDurationMins: 120 },
  { id: seedId('svc', 'rst'),  name: 'Restroom Sanitation',defaultDurationMins:  60 },
];

const frequencies = [
  { id: seedId('frq', 'wk'),   label: 'Weekly' },
  { id: seedId('frq', 'biwk'), label: 'Bi-Weekly' },
  { id: seedId('frq', 'mo'),   label: 'Monthly' },
  { id: seedId('frq', 'qr'),   label: 'Quarterly' },
  { id: seedId('frq', 'as'),   label: 'As-Needed' },
];

// ---------- Tags (CRM taxonomy) ----------
const tags = [
  { id: seedId('tg', 'vip'),         label: 'VIP',            color: 'red',    scope: 'all'     },
  { id: seedId('tg', 'net30'),       label: 'Net-30',         color: 'blue',   scope: 'all'     },
  { id: seedId('tg', 'referral'),    label: 'Referral',       color: 'green',  scope: 'contact' },
  { id: seedId('tg', 'hotlead'),     label: 'Hot Lead',       color: 'red',    scope: 'contact' },
  { id: seedId('tg', 'commercial'),  label: 'Commercial',     color: 'slate',  scope: 'all'     },
  { id: seedId('tg', 'residential'), label: 'Residential',    color: 'blue',   scope: 'all'     },
  { id: seedId('tg', 'needsquote'),  label: 'Needs Quote',    color: 'amber',  scope: 'contact' },
  { id: seedId('tg', 'dnd'),         label: 'Do Not Disturb', color: 'slate',  scope: 'contact' },
];

const tagId = (key) => seedId('tg', key);

// ---------- Clients (accounts) ----------
// primaryContactId is wired below after contacts are defined.
const clients = [
  { id: seedId('cl', 'metro'),  name: 'Metro Medical Center',    primaryContact: 'Pat Ramirez',   primaryContactId: null, email: 'pat@metromed.com',    phone: '(206) 555-0201', serviceId: services[0].id, frequencyId: frequencies[0].id, status: 'active',   revenue: 4800, notes: 'Prefers after-hours access via loading dock.', lastServiceAt: daysAgo(1),  createdAt: daysAgo(420) },
  { id: seedId('cl', 'lake'),   name: 'Lakeside Office Park',    primaryContact: 'Morgan Choi',   primaryContactId: null, email: 'morgan@lakesideop.com', phone: '(206) 555-0202', serviceId: services[1].id, frequencyId: frequencies[2].id, status: 'active',   revenue: 2200, notes: '',                                              lastServiceAt: daysAgo(5),  createdAt: daysAgo(380) },
  { id: seedId('cl', 'summit'), name: 'Summit Warehouse',        primaryContact: 'Dana Park',     primaryContactId: null, email: 'dana@summitwh.com',     phone: '(206) 555-0203', serviceId: services[4].id, frequencyId: frequencies[3].id, status: 'active',   revenue: 1500, notes: 'Loading bay access only; no retail entry.',     lastServiceAt: daysAgo(18), createdAt: daysAgo(340) },
  { id: seedId('cl', 'green'),  name: 'Greenfield HOA',          primaryContact: 'Sasha Lin',     primaryContactId: null, email: 'sasha@greenfield.org',  phone: '(206) 555-0204', serviceId: services[2].id, frequencyId: frequencies[2].id, status: 'active',   revenue: 1100, notes: '',                                              lastServiceAt: daysAgo(10), createdAt: daysAgo(210) },
  { id: seedId('cl', 'pac'),    name: 'Pacific Ridge Corp',      primaryContact: 'Kim Nelson',    primaryContactId: null, email: 'kim@pacridge.com',      phone: '(206) 555-0205', serviceId: services[0].id, frequencyId: frequencies[1].id, status: 'active',   revenue: 3400, notes: 'Security badge required; pick up at front desk.', lastServiceAt: daysAgo(3),  createdAt: daysAgo(500) },
  { id: seedId('cl', 'river'),  name: 'Riverside Senior Living', primaryContact: 'Lee Thompson',  primaryContactId: null, email: 'lee@riversidesl.com',   phone: '(206) 555-0206', serviceId: services[5].id, frequencyId: frequencies[0].id, status: 'active',   revenue: 2800, notes: '',                                              lastServiceAt: daysAgo(0),  createdAt: daysAgo(150) },
  { id: seedId('cl', 'tech'),   name: 'Downtown Tech Hub',       primaryContact: 'Quinn Reyes',   primaryContactId: null, email: 'quinn@dtechub.com',     phone: '(206) 555-0207', serviceId: services[3].id, frequencyId: frequencies[4].id, status: 'inactive', revenue: 950,  notes: 'On hold — renovation through Q2.',              lastServiceAt: daysAgo(28), createdAt: daysAgo(90) },
];

// ---------- Contacts (people — email is source of truth) ----------
// 7 migrated from clients + 6 unattached (leads / prospects / vendor).
const contacts = [
  // Customers (attached to clients)
  {
    id: seedId('ct', 'pat'), email: 'pat@metromed.com',
    firstName: 'Pat', lastName: 'Ramirez', title: 'Director of Facilities', phone: '(206) 555-0201',
    companyId: clients[0].id, ownerUserId: users[0].id,
    tagIds: [tagId('vip'), tagId('commercial')],
    visibility: 'org', lifecycle: 'customer',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(420),
    notes: 'Primary decision maker for facilities. Responsive to texts.', customFields: {},
    createdAt: daysAgo(420), updatedAt: daysAgo(1),
  },
  {
    id: seedId('ct', 'morgan-choi'), email: 'morgan@lakesideop.com',
    firstName: 'Morgan', lastName: 'Choi', title: 'Office Manager', phone: '(206) 555-0202',
    companyId: clients[1].id, ownerUserId: users[1].id,
    tagIds: [tagId('net30'), tagId('commercial')],
    visibility: 'org', lifecycle: 'customer',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(380),
    notes: 'Net-30 terms. Prefers email correspondence.', customFields: {},
    createdAt: daysAgo(380), updatedAt: daysAgo(5),
  },
  {
    id: seedId('ct', 'dana'), email: 'dana@summitwh.com',
    firstName: 'Dana', lastName: 'Park', title: 'Operations Lead', phone: '(206) 555-0203',
    companyId: clients[2].id, ownerUserId: users[0].id,
    tagIds: [tagId('commercial')],
    visibility: 'org', lifecycle: 'customer',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(340),
    notes: '', customFields: {},
    createdAt: daysAgo(340), updatedAt: daysAgo(18),
  },
  {
    id: seedId('ct', 'sasha'), email: 'sasha@greenfield.org',
    firstName: 'Sasha', lastName: 'Lin', title: 'HOA Board President', phone: '(206) 555-0204',
    companyId: clients[3].id, ownerUserId: users[1].id,
    tagIds: [tagId('residential'), tagId('referral')],
    visibility: 'org', lifecycle: 'customer',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(210),
    notes: 'Referred by Pacific Ridge.', customFields: {},
    createdAt: daysAgo(210), updatedAt: daysAgo(10),
  },
  {
    id: seedId('ct', 'kim'), email: 'kim@pacridge.com',
    firstName: 'Kim', lastName: 'Nelson', title: 'Facility Coordinator', phone: '(206) 555-0205',
    companyId: clients[4].id, ownerUserId: users[0].id,
    tagIds: [tagId('commercial'), tagId('vip')],
    visibility: 'org', lifecycle: 'customer',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(500),
    notes: 'Largest account. Quarterly business reviews.', customFields: {},
    createdAt: daysAgo(500), updatedAt: daysAgo(3),
  },
  {
    id: seedId('ct', 'lee'), email: 'lee@riversidesl.com',
    firstName: 'Lee', lastName: 'Thompson', title: 'Resident Services Director', phone: '(206) 555-0206',
    companyId: clients[5].id, ownerUserId: users[1].id,
    tagIds: [tagId('residential')],
    visibility: 'org', lifecycle: 'customer',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(150),
    notes: '', customFields: {},
    createdAt: daysAgo(150), updatedAt: daysAgo(0),
  },
  {
    id: seedId('ct', 'quinn'), email: 'quinn@dtechub.com',
    firstName: 'Quinn', lastName: 'Reyes', title: 'Office Manager', phone: '(206) 555-0207',
    companyId: clients[6].id, ownerUserId: users[0].id,
    tagIds: [tagId('commercial'), tagId('needsquote')],
    visibility: 'org', lifecycle: 'customer',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(90),
    notes: 'On hold — renovation through Q2.', customFields: {},
    createdAt: daysAgo(90), updatedAt: daysAgo(28),
  },

  // Unattached leads / prospects / vendor
  {
    id: seedId('ct', 'jamie'), email: 'jamie@greenwooddental.com',
    firstName: 'Jamie', lastName: 'Park', title: 'Practice Manager', phone: '(206) 555-0301',
    companyId: null, ownerUserId: users[1].id,
    tagIds: [tagId('hotlead'), tagId('needsquote')],
    visibility: 'org', lifecycle: 'lead',
    stage: 'new', dealValue: 2400, expectedCloseDate: daysFromNow(30), stageChangedAt: daysAgo(2),
    notes: 'Inbound via website form. Greenwood Dental Group — 4 operatories.', customFields: { company: 'Greenwood Dental Group' },
    createdAt: daysAgo(2), updatedAt: daysAgo(2),
  },
  {
    id: seedId('ct', 'robin'), email: 'robin@harborview.co',
    firstName: 'Robin', lastName: 'Vega', title: 'Property Manager', phone: '(206) 555-0302',
    companyId: null, ownerUserId: users[0].id,
    tagIds: [tagId('residential')],
    visibility: 'org', lifecycle: 'lead',
    stage: 'contacted', dealValue: 1800, expectedCloseDate: daysFromNow(21), stageChangedAt: daysAgo(5),
    notes: 'Harbor View Apartments — 84 units. Needs common-area cleaning.', customFields: { company: 'Harbor View Apartments' },
    createdAt: daysAgo(8), updatedAt: daysAgo(5),
  },
  {
    id: seedId('ct', 'taylor'), email: 'taylor@cascadearch.com',
    firstName: 'Taylor', lastName: 'Brooks', title: 'Office Manager', phone: '(206) 555-0303',
    companyId: null, ownerUserId: users[0].id,
    tagIds: [tagId('commercial'), tagId('referral')],
    visibility: 'private', lifecycle: 'prospect',
    stage: 'qualified', dealValue: 3200, expectedCloseDate: daysFromNow(14), stageChangedAt: daysAgo(3),
    notes: 'Referred by Kim Nelson. Moving offices next month — needs post-construction + recurring janitorial.', customFields: { company: 'Cascade Architecture' },
    createdAt: daysAgo(12), updatedAt: daysAgo(3),
  },
  {
    id: seedId('ct', 'alex-vendor'), email: 'alex@evergreensupply.com',
    firstName: 'Alex', lastName: 'Rivera', title: 'Account Rep', phone: '(206) 555-0304',
    companyId: null, ownerUserId: users[0].id,
    tagIds: [tagId('dnd')],
    visibility: 'org', lifecycle: 'vendor',
    stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: daysAgo(60),
    notes: 'Cleaning supplies vendor. Net-15 billing.', customFields: { company: 'Evergreen Supply Co' },
    createdAt: daysAgo(200), updatedAt: daysAgo(60),
  },
  {
    id: seedId('ct', 'morgan-ns'), email: 'morgan.hayes@nsauto.com',
    firstName: 'Morgan', lastName: 'Hayes', title: 'Operations Manager', phone: '(206) 555-0305',
    companyId: null, ownerUserId: users[1].id,
    tagIds: [tagId('hotlead'), tagId('commercial')],
    visibility: 'team', lifecycle: 'lead',
    stage: 'proposal', dealValue: 4500, expectedCloseDate: daysFromNow(10), stageChangedAt: daysAgo(1),
    notes: 'Northside Auto Group — 3 locations. Proposal sent. Waiting on decision.', customFields: { company: 'Northside Auto Group' },
    createdAt: daysAgo(14), updatedAt: daysAgo(1),
  },
  {
    id: seedId('ct', 'sam-brew'), email: 'sam@summitbrewing.com',
    firstName: 'Sam', lastName: 'Blake', title: 'General Manager', phone: '(206) 555-0306',
    companyId: null, ownerUserId: users[0].id,
    tagIds: [tagId('commercial')],
    visibility: 'team', lifecycle: 'prospect',
    stage: 'qualified', dealValue: 2100, expectedCloseDate: daysFromNow(20), stageChangedAt: daysAgo(6),
    notes: 'Summit Brewing Co taproom — bi-weekly. Budget confirmed.', customFields: { company: 'Summit Brewing Co' },
    createdAt: daysAgo(10), updatedAt: daysAgo(6),
  },
];

// Wire primaryContactId on clients now that contacts exist.
clients[0].primaryContactId = contacts[0].id; // Pat → Metro
clients[1].primaryContactId = contacts[1].id; // Morgan → Lakeside
clients[2].primaryContactId = contacts[2].id; // Dana → Summit
clients[3].primaryContactId = contacts[3].id; // Sasha → Greenfield
clients[4].primaryContactId = contacts[4].id; // Kim → Pacific
clients[5].primaryContactId = contacts[5].id; // Lee → Riverside
clients[6].primaryContactId = contacts[6].id; // Quinn → Tech Hub

// Sites (multi-site clients). Not every client has multiple sites.
const sites = [
  // Metro Medical Center — 2 sites
  { id: seedId('st', 'metro-main'),   clientId: clients[0].id, siteContactId: contacts[0].id, name: 'Main Hospital',    address: '500 Medical Dr, Seattle WA 98104',  accessNotes: 'Loading dock B after 7 PM',  createdAt: daysAgo(420) },
  { id: seedId('st', 'metro-annex'),  clientId: clients[0].id, siteContactId: contacts[0].id, name: 'Annex Clinic',     address: '512 Medical Dr, Seattle WA 98104',  accessNotes: 'Front desk, ask for Pat',    createdAt: daysAgo(300) },
  // Lakeside Office Park — 1 site
  { id: seedId('st', 'lake-main'),    clientId: clients[1].id, siteContactId: contacts[1].id, name: 'Main Campus',      address: '200 Lakeside Blvd, Bellevue WA 98004', accessNotes: '', createdAt: daysAgo(380) },
  // Summit Warehouse — 1 site
  { id: seedId('st', 'summit-main'),  clientId: clients[2].id, siteContactId: contacts[2].id, name: 'Warehouse 1',      address: '1800 Summit Ave S, Seattle WA 98134', accessNotes: 'Loading bay only', createdAt: daysAgo(340) },
  // Greenfield HOA — 3 sites (common areas)
  { id: seedId('st', 'green-clbhs'),  clientId: clients[3].id, siteContactId: contacts[3].id, name: 'Clubhouse',        address: '120 Greenfield Way, Redmond WA 98052', accessNotes: '', createdAt: daysAgo(210) },
  { id: seedId('st', 'green-pool'),   clientId: clients[3].id, siteContactId: null,            name: 'Pool Building',    address: '124 Greenfield Way, Redmond WA 98052', accessNotes: 'Gate code #4421',  createdAt: daysAgo(200) },
  { id: seedId('st', 'green-gym'),    clientId: clients[3].id, siteContactId: null,            name: 'Gym Annex',        address: '130 Greenfield Way, Redmond WA 98052', accessNotes: '', createdAt: daysAgo(180) },
  // Pacific Ridge — 2 sites
  { id: seedId('st', 'pac-tower'),    clientId: clients[4].id, siteContactId: contacts[4].id, name: 'Tower A',          address: '88 Pacific Way, Seattle WA 98121', accessNotes: 'Front desk badge', createdAt: daysAgo(500) },
  { id: seedId('st', 'pac-annex'),    clientId: clients[4].id, siteContactId: null,            name: 'South Annex',      address: '92 Pacific Way, Seattle WA 98121', accessNotes: '', createdAt: daysAgo(260) },
  // Riverside — 1 site
  { id: seedId('st', 'river-main'),   clientId: clients[5].id, siteContactId: contacts[5].id, name: 'Main Residence',   address: '15 Riverside Ct, Kirkland WA 98033', accessNotes: 'Use service entrance', createdAt: daysAgo(150) },
  // Downtown Tech Hub — 1 site
  { id: seedId('st', 'tech-main'),    clientId: clients[6].id, siteContactId: contacts[6].id, name: 'Main Office',      address: '900 Union St, Seattle WA 98101', accessNotes: 'Closed until Q2', createdAt: daysAgo(90) },
];

// Map client → primary site for quick job seeding
const siteFor = (clientKey) => sites.find((s) => s.id === seedId('st', clientKey));

// Today's schedule (jobs) + some past/future
const jobs = [
  { id: seedId('j', 'today-1'), clientId: clients[0].id, siteId: siteFor('metro-main').id,  serviceId: services[0].id, crewIds: [users[1].id],           startAt: atTime(0, 8, 0),  endAt: atTime(0, 9, 30),  status: 'done',        notes: 'Standard janitorial.', createdAt: daysAgo(7) },
  { id: seedId('j', 'today-2'), clientId: clients[1].id, siteId: siteFor('lake-main').id,   serviceId: services[1].id, crewIds: [users[2].id],           startAt: atTime(0, 10, 0), endAt: atTime(0, 12, 0),  status: 'in_progress', notes: '',                     createdAt: daysAgo(5) },
  { id: seedId('j', 'today-3'), clientId: clients[4].id, siteId: siteFor('pac-tower').id,   serviceId: services[0].id, crewIds: [users[4].id],           startAt: atTime(0, 13, 0), endAt: atTime(0, 15, 0),  status: 'upcoming',    notes: '',                     createdAt: daysAgo(3) },
  { id: seedId('j', 'today-4'), clientId: clients[5].id, siteId: siteFor('river-main').id,  serviceId: services[5].id, crewIds: [users[1].id, users[3].id], startAt: atTime(0, 15, 30), endAt: atTime(0, 17, 0), status: 'upcoming', notes: '',                     createdAt: daysAgo(2) },
  // Tomorrow
  { id: seedId('j', 'tom-1'),   clientId: clients[0].id, siteId: siteFor('metro-annex').id, serviceId: services[0].id, crewIds: [users[1].id],           startAt: atTime(1, 8, 0),  endAt: atTime(1, 9, 30),  status: 'upcoming',    notes: '',                     createdAt: daysAgo(1) },
  { id: seedId('j', 'tom-2'),   clientId: clients[3].id, siteId: siteFor('green-clbhs').id, serviceId: services[2].id, crewIds: [users[2].id, users[4].id], startAt: atTime(1, 10, 30), endAt: atTime(1, 12, 0), status: 'upcoming', notes: 'Window exterior.',     createdAt: daysAgo(1) },
  // Later this week
  { id: seedId('j', 'week-1'),  clientId: clients[4].id, siteId: siteFor('pac-annex').id,   serviceId: services[0].id, crewIds: [users[2].id],           startAt: atTime(3, 9, 0),  endAt: atTime(3, 11, 0),  status: 'upcoming',    notes: '',                     createdAt: daysAgo(1) },
  { id: seedId('j', 'week-2'),  clientId: clients[2].id, siteId: siteFor('summit-main').id, serviceId: services[4].id, crewIds: [users[3].id],           startAt: atTime(4, 13, 0), endAt: atTime(4, 15, 0),  status: 'upcoming',    notes: 'Loading bay pressure wash.', createdAt: daysAgo(1) },
  // Yesterday
  { id: seedId('j', 'yes-1'),   clientId: clients[5].id, siteId: siteFor('river-main').id,  serviceId: services[5].id, crewIds: [users[3].id],           startAt: atTime(-1, 14, 0), endAt: atTime(-1, 15, 0), status: 'done',    notes: '',                     createdAt: daysAgo(3) },
];

// Line items helper
const li = (desc, qty, unit) => ({
  id: seedId('li', `${desc.slice(0, 4)}-${qty}-${unit}`),
  description: desc,
  qty,
  unitPrice: unit,
});

const invoices = [
  { id: 'INV-1001', clientId: clients[0].id, billingContactId: contacts[0].id, siteId: siteFor('metro-main').id,  jobIds: [], issueDate: daysAgo(3),  dueDate: atTime(27, 12, 0), lineItems: [li('Weekly janitorial — Main Hospital', 4, 300)], taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p1'), date: daysAgo(1), amount: 1200, method: 'ACH', note: '' }], createdAt: daysAgo(3) },
  { id: 'INV-1002', clientId: clients[1].id, billingContactId: contacts[1].id, siteId: siteFor('lake-main').id,   jobIds: [], issueDate: daysAgo(4),  dueDate: atTime(26, 12, 0), lineItems: [li('Monthly floor care', 1, 550)],                     taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p2'), date: daysAgo(2), amount: 550,  method: 'Card', note: '' }], createdAt: daysAgo(4) },
  { id: 'INV-1003', clientId: clients[4].id, billingContactId: contacts[4].id, siteId: siteFor('pac-tower').id,   jobIds: [], issueDate: daysAgo(6),  dueDate: atTime(24, 12, 0), lineItems: [li('Bi-weekly janitorial — Tower A', 2, 425)],         taxRate: 0, status: 'pending', payments: [],                                                                                        createdAt: daysAgo(6) },
  { id: 'INV-1004', clientId: clients[5].id, billingContactId: contacts[5].id, siteId: siteFor('river-main').id,  jobIds: [], issueDate: daysAgo(8),  dueDate: atTime(22, 12, 0), lineItems: [li('Weekly restroom sanitation', 4, 175)],             taxRate: 0, status: 'pending', payments: [],                                                                                        createdAt: daysAgo(8) },
  { id: 'INV-1005', clientId: clients[3].id, billingContactId: contacts[3].id, siteId: siteFor('green-clbhs').id, jobIds: [], issueDate: daysAgo(10), dueDate: atTime(20, 12, 0), lineItems: [li('Monthly window cleaning — Clubhouse', 1, 275)],    taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p3'), date: daysAgo(5), amount: 275,  method: 'Check', note: '#1042' }], createdAt: daysAgo(10) },
  { id: 'INV-1006', clientId: clients[2].id, billingContactId: contacts[2].id, siteId: siteFor('summit-main').id, jobIds: [], issueDate: daysAgo(20), dueDate: daysAgo(5),        lineItems: [li('Quarterly pressure washing', 1, 1500)],            taxRate: 0, status: 'overdue', payments: [],                                                                                        createdAt: daysAgo(20) },
  { id: 'INV-1007', clientId: clients[6].id, billingContactId: contacts[6].id, siteId: siteFor('tech-main').id,   jobIds: [], issueDate: daysAgo(30), dueDate: daysAgo(15),       lineItems: [li('Post-construction cleanup', 1, 950)],              taxRate: 0, status: 'overdue', payments: [],                                                                                        createdAt: daysAgo(30) },
  { id: 'INV-1008', clientId: clients[0].id, billingContactId: contacts[0].id, siteId: siteFor('metro-annex').id, jobIds: [], issueDate: daysAgo(14), dueDate: atTime(16, 12, 0), lineItems: [li('Weekly janitorial — Annex Clinic', 4, 300)],       taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p4'), date: daysAgo(7), amount: 1200, method: 'ACH', note: '' }], createdAt: daysAgo(14) },
];

// Conversations — now optionally linked to a contact for CRM context.
const conversations = [
  { id: seedId('cv', 'c1'), clientId: clients[0].id, contactId: contacts[0].id, channel: 'sms',   archived: false, createdAt: daysAgo(7)  },
  { id: seedId('cv', 'c2'), clientId: clients[1].id, contactId: contacts[1].id, channel: 'email', archived: false, createdAt: daysAgo(10) },
  { id: seedId('cv', 'c3'), clientId: clients[3].id, contactId: contacts[3].id, channel: 'sms',   archived: false, createdAt: daysAgo(20) },
  { id: seedId('cv', 'c4'), clientId: clients[4].id, contactId: contacts[4].id, channel: 'sms',   archived: false, createdAt: daysAgo(2)  },
];

const messages = [
  // Metro Medical
  { id: seedId('m', 'c1-m1'), conversationId: conversations[0].id, direction: 'in',  authorUserId: null,        text: 'Hey, confirming the 8am cleaning tomorrow.', sentAt: daysAgo(1), readAt: daysAgo(1) },
  { id: seedId('m', 'c1-m2'), conversationId: conversations[0].id, direction: 'out', authorUserId: users[1].id, text: 'Confirmed! Jordan will arrive by 7:55 AM.',  sentAt: daysAgo(1), readAt: daysAgo(1) },
  { id: seedId('m', 'c1-m3'), conversationId: conversations[0].id, direction: 'in',  authorUserId: null,        text: 'Perfect, thanks.',                           sentAt: daysAgo(1), readAt: null },
  // Lakeside
  { id: seedId('m', 'c2-m1'), conversationId: conversations[1].id, direction: 'in',  authorUserId: null,        text: 'Can we reschedule Thursday to Friday?',      sentAt: daysAgo(2), readAt: daysAgo(2) },
  { id: seedId('m', 'c2-m2'), conversationId: conversations[1].id, direction: 'out', authorUserId: users[0].id, text: 'Yes, we can move it to Friday 10 AM. Works?', sentAt: daysAgo(2), readAt: daysAgo(2) },
  // Greenfield
  { id: seedId('m', 'c3-m1'), conversationId: conversations[2].id, direction: 'in',  authorUserId: null,        text: 'Invoice received, paying this week.',        sentAt: daysAgo(3), readAt: null },
  // Pacific Ridge
  { id: seedId('m', 'c4-m1'), conversationId: conversations[3].id, direction: 'out', authorUserId: users[1].id, text: 'Reminder: cleaning scheduled for tomorrow 1 PM.', sentAt: daysAgo(1), readAt: daysAgo(1) },
  { id: seedId('m', 'c4-m2'), conversationId: conversations[3].id, direction: 'in',  authorUserId: null,        text: 'Got it, thanks!',                            sentAt: daysAgo(1), readAt: daysAgo(1) },
];

// Reminder templates
const reminderTemplates = [
  { id: seedId('rt', 'bc'),  key: 'booking_confirmation', channel: 'email', subject: 'Your cleaning is booked', body: 'Hi {client_contact}, your {service} at {site_name} is booked for {date} at {time}. — {company}', enabled: true  },
  { id: seedId('rt', 'r24'), key: 'reminder_24h',         channel: 'sms',   subject: '',                        body: 'Reminder: {company} will be at {site_name} tomorrow at {time} for {service}.',                 enabled: true  },
  { id: seedId('rt', 'doe'), key: 'day_of_eta',           channel: 'sms',   subject: '',                        body: 'Your crew is on the way to {site_name}, ETA ~15 minutes. — {company}',                         enabled: true  },
  { id: seedId('rt', 'ps'),  key: 'post_service',         channel: 'email', subject: 'How did we do?',          body: 'Hi {client_contact}, thanks for letting {company} clean {site_name} today. Any feedback?',    enabled: false },
];

// Seed a few past reminder events so the stats aren't zero.
const reminderEvents = (() => {
  const evts = [];
  const tplKeys = reminderTemplates.map((t) => t.key);
  for (let i = 0; i < 28; i += 1) {
    evts.push({
      id: seedId('re', `e${i}`),
      templateKey: tplKeys[i % tplKeys.length],
      jobId: jobs[i % jobs.length].id,
      clientId: jobs[i % jobs.length].clientId,
      channel: i % 2 === 0 ? 'sms' : 'email',
      status: i % 13 === 0 ? 'failed' : 'sent',
      sentAt: daysAgo(30 - i),
    });
  }
  return evts;
})();

// Contact activities — empty at seed; the UI appends on note/stage_change events.
const contactActivities = [];

// Per-user permission overrides — sparse. Empty at seed.
const userPermissionOverrides = [];

// Current user is the owner by default. Store will expose a switcher.
const currentUserId = users[0].id;

export const INITIAL_STATE = {
  version: 2,
  company,
  currentUserId,
  users,
  services,
  frequencies,
  clients,
  sites,
  jobs,
  invoices,
  conversations,
  messages,
  reminderTemplates,
  reminderEvents,
  permissions: seedPermissions(),
  // v2 additions
  contacts,
  tags,
  contactActivities,
  userPermissionOverrides,
};
