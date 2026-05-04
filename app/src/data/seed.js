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

const hoursAgo = (n) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
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
  // v8: integrations live on the company record so they ride along the deployment.
  // The shell ships disconnected; per-deployment ops fill in real credentials.
  integrations: {
    twilio: {
      connected: false,
      accountSidLast4: null, // never store full SID/token in localStorage; backend env vars hold the real secrets
      phoneNumber: null,
      phoneNumberFriendlyName: null,
      connectedAt: null,
      lastError: null,
      // Webhook URL the deployment must register with Twilio for inbound SMS routing.
      // Filled in by backend deployment; displayed read-only in Integrations settings.
      inboundWebhookUrl: null,
      a2p: {
        status: 'not_started', // not_started | pending | approved | rejected | suspended
        brandName: null,
        ein: null,
        businessAddress: null,
        useCase: null, // e.g. 'customer_care' | 'marketing' | 'mixed'
        sampleMessages: [],
        submittedAt: null,
        approvedAt: null,
        rejectionReason: null,
        notes: '',
      },
    },
  },
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
// v9: jobs gain optional seriesId (links recurring instances) and recurrence (rule, first instance only).
const SERIES_METRO = seedId('ser', 'metro-weekly');
const SERIES_RIVER = seedId('ser', 'river-weekly');

const jobs = [
  // --- One-off jobs ---
  { id: seedId('j', 'today-2'), clientId: clients[1].id, siteId: siteFor('lake-main').id,   serviceId: services[1].id, crewIds: [users[2].id],           startAt: atTime(0, 10, 0), endAt: atTime(0, 12, 0),  status: 'in_progress', notes: '',                     seriesId: null, recurrence: null, createdAt: daysAgo(5) },
  { id: seedId('j', 'today-3'), clientId: clients[4].id, siteId: siteFor('pac-tower').id,   serviceId: services[0].id, crewIds: [users[4].id],           startAt: atTime(0, 13, 0), endAt: atTime(0, 15, 0),  status: 'upcoming',    notes: '',                     seriesId: null, recurrence: null, createdAt: daysAgo(3) },
  // Tomorrow
  { id: seedId('j', 'tom-2'),   clientId: clients[3].id, siteId: siteFor('green-clbhs').id, serviceId: services[2].id, crewIds: [users[2].id, users[4].id], startAt: atTime(1, 10, 30), endAt: atTime(1, 12, 0), status: 'upcoming', notes: 'Window exterior.',     seriesId: null, recurrence: null, createdAt: daysAgo(1) },
  // Later this week
  { id: seedId('j', 'week-1'),  clientId: clients[4].id, siteId: siteFor('pac-annex').id,   serviceId: services[0].id, crewIds: [users[2].id],           startAt: atTime(3, 9, 0),  endAt: atTime(3, 11, 0),  status: 'upcoming',    notes: '',                     seriesId: null, recurrence: null, createdAt: daysAgo(1) },
  { id: seedId('j', 'week-2'),  clientId: clients[2].id, siteId: siteFor('summit-main').id, serviceId: services[4].id, crewIds: [users[3].id],           startAt: atTime(4, 13, 0), endAt: atTime(4, 15, 0),  status: 'upcoming',    notes: 'Loading bay pressure wash.', seriesId: null, recurrence: null, createdAt: daysAgo(1) },
  // Yesterday
  { id: seedId('j', 'yes-1'),   clientId: clients[5].id, siteId: siteFor('river-main').id,  serviceId: services[5].id, crewIds: [users[3].id],           startAt: atTime(-1, 14, 0), endAt: atTime(-1, 15, 0), status: 'done',    notes: '',                     seriesId: null, recurrence: null, createdAt: daysAgo(3) },

  // --- Metro Medical weekly janitorial (recurring series) ---
  // Instance 0: last week (done)
  { id: seedId('j', 'metro-w0'), clientId: clients[0].id, siteId: siteFor('metro-main').id, serviceId: services[0].id, crewIds: [users[1].id], startAt: atTime(-7, 8, 0), endAt: atTime(-7, 9, 30), status: 'done', notes: 'Standard janitorial.', seriesId: SERIES_METRO, recurrence: { frequency: 'weekly', daysOfWeek: null, endType: 'count', endCount: 12, endDate: null }, createdAt: daysAgo(14) },
  // Instance 1: today
  { id: seedId('j', 'metro-w1'), clientId: clients[0].id, siteId: siteFor('metro-main').id, serviceId: services[0].id, crewIds: [users[1].id], startAt: atTime(0, 8, 0),  endAt: atTime(0, 9, 30),  status: 'done', notes: 'Standard janitorial.', seriesId: SERIES_METRO, recurrence: null, createdAt: daysAgo(14) },
  // Instance 2: next week
  { id: seedId('j', 'metro-w2'), clientId: clients[0].id, siteId: siteFor('metro-main').id, serviceId: services[0].id, crewIds: [users[1].id], startAt: atTime(7, 8, 0),  endAt: atTime(7, 9, 30),  status: 'upcoming', notes: '', seriesId: SERIES_METRO, recurrence: null, createdAt: daysAgo(14) },
  // Instance 3: two weeks out
  { id: seedId('j', 'metro-w3'), clientId: clients[0].id, siteId: siteFor('metro-main').id, serviceId: services[0].id, crewIds: [users[1].id], startAt: atTime(14, 8, 0), endAt: atTime(14, 9, 30), status: 'upcoming', notes: '', seriesId: SERIES_METRO, recurrence: null, createdAt: daysAgo(14) },
  // Instance 4: three weeks out
  { id: seedId('j', 'metro-w4'), clientId: clients[0].id, siteId: siteFor('metro-main').id, serviceId: services[0].id, crewIds: [users[1].id], startAt: atTime(21, 8, 0), endAt: atTime(21, 9, 30), status: 'upcoming', notes: '', seriesId: SERIES_METRO, recurrence: null, createdAt: daysAgo(14) },

  // --- Riverside Senior Living weekly restroom sanitation (recurring series) ---
  { id: seedId('j', 'river-w0'), clientId: clients[5].id, siteId: siteFor('river-main').id, serviceId: services[5].id, crewIds: [users[3].id], startAt: atTime(0, 15, 30), endAt: atTime(0, 17, 0), status: 'upcoming', notes: '', seriesId: SERIES_RIVER, recurrence: { frequency: 'weekly', daysOfWeek: null, endType: 'count', endCount: 12, endDate: null }, createdAt: daysAgo(7) },
  { id: seedId('j', 'river-w1'), clientId: clients[5].id, siteId: siteFor('river-main').id, serviceId: services[5].id, crewIds: [users[3].id], startAt: atTime(7, 15, 30), endAt: atTime(7, 17, 0), status: 'upcoming', notes: '', seriesId: SERIES_RIVER, recurrence: null, createdAt: daysAgo(7) },
  { id: seedId('j', 'river-w2'), clientId: clients[5].id, siteId: siteFor('river-main').id, serviceId: services[5].id, crewIds: [users[3].id], startAt: atTime(14, 15, 30), endAt: atTime(14, 17, 0), status: 'upcoming', notes: '', seriesId: SERIES_RIVER, recurrence: null, createdAt: daysAgo(7) },
  { id: seedId('j', 'river-w3'), clientId: clients[5].id, siteId: siteFor('river-main').id, serviceId: services[5].id, crewIds: [users[3].id], startAt: atTime(21, 15, 30), endAt: atTime(21, 17, 0), status: 'upcoming', notes: '', seriesId: SERIES_RIVER, recurrence: null, createdAt: daysAgo(7) },

  // --- Extra one-off: tomorrow Metro annex ---
  { id: seedId('j', 'tom-1'),   clientId: clients[0].id, siteId: siteFor('metro-annex').id, serviceId: services[0].id, crewIds: [users[1].id],           startAt: atTime(1, 8, 0),  endAt: atTime(1, 9, 30),  status: 'upcoming',    notes: '',                     seriesId: null, recurrence: null, createdAt: daysAgo(1) },
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

// ---------- Snippet folders & snippets (Messaging Phase 2a) ----------
const snippetFolders = [
  { id: seedId('snf', 'greetings'),  label: 'Greetings' },
  { id: seedId('snf', 'scheduling'), label: 'Scheduling' },
  { id: seedId('snf', 'billing'),    label: 'Billing' },
];

const snippets = [
  // Greetings
  { id: seedId('sn', 'welcome'),       folderId: snippetFolders[0].id, label: 'Welcome reply',         channel: 'all',   body: 'Hi there — thanks for reaching out! Someone from Acme will follow up shortly.' },
  { id: seedId('sn', 'intro-crew'),    folderId: snippetFolders[0].id, label: 'Intro from crew',       channel: 'sms',   body: 'Hi, this is Acme Cleaning — your crew is prepping for the visit. Let us know if anything changes.' },
  // Scheduling
  { id: seedId('sn', 'arrival-eta'),   folderId: snippetFolders[1].id, label: 'Arrival ETA',           channel: 'sms',   body: 'Your crew is on the way — ETA ~15 minutes.' },
  { id: seedId('sn', 'reschedule'),    folderId: snippetFolders[1].id, label: 'Reschedule offer',      channel: 'all',   body: 'Happy to reschedule — could you share a couple of windows that work this week?' },
  { id: seedId('sn', 'booking-conf'),  folderId: snippetFolders[1].id, label: 'Booking confirmed',     channel: 'all',   body: "All set — we've confirmed the visit. You'll get a reminder the day before." },
  // Billing
  { id: seedId('sn', 'invoice-sent'),  folderId: snippetFolders[2].id, label: 'Invoice sent',          channel: 'email', body: "Hi — the invoice is on its way to your inbox. Let us know if anything needs adjusting." },
  { id: seedId('sn', 'net30-reminder'),folderId: snippetFolders[2].id, label: 'Net-30 reminder',       channel: 'all',   body: 'Quick reminder: your invoice is due in 7 days per our Net-30 terms. Happy to resend a copy.' },
  { id: seedId('sn', 'pay-received'),  folderId: snippetFolders[2].id, label: 'Payment received',      channel: 'all',   body: 'Thanks — payment received. Receipt incoming shortly.' },
  { id: seedId('sn', 'past-due'),      folderId: snippetFolders[2].id, label: 'Past due notice',       channel: 'email', body: "Hi — your invoice is now past due. Could we set up a quick call to sort out payment options?" },
  { id: seedId('sn', 'thanks-prompt'), folderId: snippetFolders[2].id, label: 'Thanks for prompt pay', channel: 'all',   body: 'Thanks for taking care of that so quickly — we really appreciate it!' },
];

// Helper for snooze timers so the seed stays relative to "now" at hydrate time.
const inHours = (n) => {
  const d = new Date();
  d.setHours(d.getHours() + n);
  return d.toISOString();
};

// Conversations — external threads are linked to a contact; internal-channel
// threads are team-to-team (no contactId, use `title` for labeling).
// Phase 2b fields: assignedUserId, status, snoozedUntil, starred, followedUserIds.
const conversations = [
  // ----- External -----
  { id: seedId('cv', 'c1'), clientId: clients[0].id, contactId: contacts[0].id, channel: 'sms',   archived: false, title: null, createdAt: daysAgo(7),  lastMessageAt: hoursAgo(3),
    assignedUserId: users[2].id, status: 'open',    snoozedUntil: null,       starred: false, followedUserIds: [] },
  { id: seedId('cv', 'c2'), clientId: clients[1].id, contactId: contacts[1].id, channel: 'email', archived: false, title: null, createdAt: daysAgo(10), lastMessageAt: hoursAgo(18),
    assignedUserId: users[1].id, status: 'snoozed', snoozedUntil: inHours(20), starred: false, followedUserIds: [] },
  { id: seedId('cv', 'c3'), clientId: clients[3].id, contactId: contacts[3].id, channel: 'sms',   archived: false, title: null, createdAt: daysAgo(20), lastMessageAt: daysAgo(2),
    assignedUserId: null,        status: 'open',    snoozedUntil: null,       starred: false, followedUserIds: [] },
  { id: seedId('cv', 'c4'), clientId: clients[4].id, contactId: contacts[4].id, channel: 'sms',   archived: false, title: null, createdAt: daysAgo(2),  lastMessageAt: daysAgo(1),
    assignedUserId: users[0].id, status: 'open',    snoozedUntil: null,       starred: true,  followedUserIds: [] },
  { id: seedId('cv', 'c5'), clientId: clients[2].id, contactId: contacts[2].id, channel: 'sms',   archived: false, title: null, createdAt: daysAgo(5),  lastMessageAt: daysAgo(4),
    assignedUserId: users[3].id, status: 'open',    snoozedUntil: null,       starred: false, followedUserIds: [] },
  { id: seedId('cv', 'c6'), clientId: clients[5].id, contactId: contacts[5].id, channel: 'email', archived: false, title: null, createdAt: daysAgo(6),  lastMessageAt: daysAgo(5),
    assignedUserId: users[0].id, status: 'open',    snoozedUntil: null,       starred: false, followedUserIds: [users[3].id] },
  { id: seedId('cv', 'c7'), clientId: null,          contactId: contacts[7].id, channel: 'sms',   archived: false, title: null, createdAt: daysAgo(2),  lastMessageAt: daysAgo(2),
    assignedUserId: users[1].id, status: 'closed',  snoozedUntil: null,       starred: false, followedUserIds: [] }, // Jamie (lead, closed-won hypothetical)
  { id: seedId('cv', 'c8'), clientId: null,          contactId: contacts[8].id, channel: 'email', archived: false, title: null, createdAt: daysAgo(5),  lastMessageAt: daysAgo(3),
    assignedUserId: null,        status: 'open',    snoozedUntil: null,       starred: false, followedUserIds: [] }, // Robin (lead)
  { id: seedId('cv', 'c9'), clientId: null,          contactId: contacts[11].id, channel: 'sms',  archived: false, title: null, createdAt: daysAgo(1),  lastMessageAt: hoursAgo(20),
    assignedUserId: users[0].id, status: 'open',    snoozedUntil: null,       starred: true,  followedUserIds: [] }, // Morgan Hayes (lead)
  // ----- Internal -----
  { id: seedId('cv', 'c10'), clientId: null, contactId: null, channel: 'internal', archived: false, title: 'Metro access coordination', createdAt: daysAgo(3), lastMessageAt: hoursAgo(22),
    assignedUserId: null, status: 'open', snoozedUntil: null, starred: false, followedUserIds: [users[2].id] },
  { id: seedId('cv', 'c11'), clientId: null, contactId: null, channel: 'internal', archived: false, title: 'Pacific badge handoff',     createdAt: daysAgo(4), lastMessageAt: daysAgo(3),
    assignedUserId: null, status: 'open', snoozedUntil: null, starred: false, followedUserIds: [users[4].id] },
];

const messages = [
  // ----- c1 Metro Medical (SMS) — external thread with internal comments interleaved -----
  { id: seedId('m', 'c1-m1'), conversationId: conversations[0].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Hey, confirming the 8am cleaning tomorrow.',                                     sentAt: daysAgo(1),   readAt: daysAgo(1) },
  { id: seedId('m', 'c1-m2'), conversationId: conversations[0].id, direction: 'out',      authorUserId: users[1].id, snippetId: null,                            text: 'Confirmed! Jordan will arrive by 7:55 AM.',                                      sentAt: daysAgo(1),   readAt: daysAgo(1) },
  { id: seedId('m', 'c1-m3'), conversationId: conversations[0].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Perfect, thanks.',                                                               sentAt: daysAgo(1),   readAt: null },
  { id: seedId('m', 'c1-m4'), conversationId: conversations[0].id, direction: 'internal', authorUserId: users[2].id, snippetId: null,                            text: 'Heads up — Pat prefers after-hours access. Avoid pre-7am arrivals.',             sentAt: hoursAgo(4),  readAt: hoursAgo(4) },
  { id: seedId('m', 'c1-m5'), conversationId: conversations[0].id, direction: 'internal', authorUserId: users[1].id, snippetId: null,                            text: 'Good flag — updated the crew sheet.',                                            sentAt: hoursAgo(3),  readAt: hoursAgo(3) },

  // ----- c2 Lakeside Office Park (Email) -----
  { id: seedId('m', 'c2-m1'), conversationId: conversations[1].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Can we reschedule Thursday to Friday?',                                          sentAt: daysAgo(2),   readAt: daysAgo(2) },
  { id: seedId('m', 'c2-m2'), conversationId: conversations[1].id, direction: 'out',      authorUserId: users[0].id, snippetId: seedId('sn', 'reschedule'),       text: 'Happy to reschedule — could you share a couple of windows that work this week?', sentAt: daysAgo(2),   readAt: daysAgo(2) },
  { id: seedId('m', 'c2-m3'), conversationId: conversations[1].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Friday 10 AM works great, thanks!',                                              sentAt: hoursAgo(18), readAt: null },

  // ----- c3 Greenfield HOA (SMS) -----
  { id: seedId('m', 'c3-m1'), conversationId: conversations[2].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Invoice received, paying this week.',                                            sentAt: daysAgo(3),   readAt: null },
  { id: seedId('m', 'c3-m2'), conversationId: conversations[2].id, direction: 'out',      authorUserId: users[0].id, snippetId: null,                            text: 'Great, appreciate it! Let us know if you need another copy.',                    sentAt: daysAgo(2),   readAt: daysAgo(2) },

  // ----- c4 Pacific Ridge (SMS) -----
  { id: seedId('m', 'c4-m1'), conversationId: conversations[3].id, direction: 'out',      authorUserId: users[1].id, snippetId: null,                            text: 'Reminder: cleaning scheduled for tomorrow 1 PM.',                                sentAt: daysAgo(1),   readAt: daysAgo(1) },
  { id: seedId('m', 'c4-m2'), conversationId: conversations[3].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Got it, thanks!',                                                                sentAt: daysAgo(1),   readAt: daysAgo(1) },

  // ----- c5 Summit Warehouse (SMS) -----
  { id: seedId('m', 'c5-m1'), conversationId: conversations[4].id, direction: 'out',      authorUserId: users[1].id, snippetId: null,                            text: 'Scheduling the quarterly pressure wash for next Friday at 1 PM. Loading bay OK?', sentAt: daysAgo(4),   readAt: daysAgo(4) },
  { id: seedId('m', 'c5-m2'), conversationId: conversations[4].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Yes — use bay 3. Gate code is still #4421.',                                     sentAt: daysAgo(4),   readAt: daysAgo(4) },
  { id: seedId('m', 'c5-m3'), conversationId: conversations[4].id, direction: 'out',      authorUserId: users[1].id, snippetId: seedId('sn', 'booking-conf'),     text: "All set — we've confirmed the visit. You'll get a reminder the day before.",     sentAt: daysAgo(4),   readAt: daysAgo(4) },

  // ----- c6 Riverside Senior Living (Email) -----
  { id: seedId('m', 'c6-m1'), conversationId: conversations[5].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Net-30 on INV-1004 — can we push the due date to May 15?',                       sentAt: daysAgo(6),   readAt: daysAgo(6) },
  { id: seedId('m', 'c6-m2'), conversationId: conversations[5].id, direction: 'out',      authorUserId: users[0].id, snippetId: null,                            text: 'Let me check with accounting and confirm.',                                      sentAt: daysAgo(5),   readAt: daysAgo(5) },
  { id: seedId('m', 'c6-m3'), conversationId: conversations[5].id, direction: 'out',      authorUserId: users[0].id, snippetId: null,                            text: "Approved — I've updated INV-1004 with a May 15 due date.",                       sentAt: daysAgo(5),   readAt: daysAgo(5) },
  { id: seedId('m', 'c6-m4'), conversationId: conversations[5].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Thank you!',                                                                     sentAt: daysAgo(5),   readAt: null },

  // ----- c7 Jamie Park (lead, SMS) — with internal coaching comment -----
  { id: seedId('m', 'c7-m1'), conversationId: conversations[6].id, direction: 'out',      authorUserId: users[1].id, snippetId: seedId('sn', 'welcome'),          text: 'Hi Jamie — thanks for reaching out! Someone from Acme will follow up shortly.',   sentAt: daysAgo(2),   readAt: daysAgo(2) },
  { id: seedId('m', 'c7-m2'), conversationId: conversations[6].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Thursday afternoon works for a walkthrough.',                                    sentAt: daysAgo(2),   readAt: daysAgo(2) },
  { id: seedId('m', 'c7-m3'), conversationId: conversations[6].id, direction: 'out',      authorUserId: users[1].id, snippetId: null,                            text: "Thursday 2 PM — I'll send a confirmation by end of day.",                        sentAt: daysAgo(2),   readAt: daysAgo(2) },
  { id: seedId('m', 'c7-m4'), conversationId: conversations[6].id, direction: 'internal', authorUserId: users[0].id, snippetId: null,                            text: 'Good lead — use the 4-operatory rate card when you draft the quote.',            sentAt: daysAgo(2),   readAt: daysAgo(2) },

  // ----- c8 Robin Vega (lead, Email) -----
  { id: seedId('m', 'c8-m1'), conversationId: conversations[7].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Need common-area cleaning for an 84-unit complex. Can you send a proposal?',      sentAt: daysAgo(5),   readAt: daysAgo(5) },
  { id: seedId('m', 'c8-m2'), conversationId: conversations[7].id, direction: 'out',      authorUserId: users[0].id, snippetId: null,                            text: "Absolutely — sending a walkthrough form now. Reply with photos and we'll follow up with a scoped proposal.", sentAt: daysAgo(5),   readAt: daysAgo(5) },
  { id: seedId('m', 'c8-m3'), conversationId: conversations[7].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Walkthrough notes attached. Looking for weekly lobby + quarterly deep clean.',    sentAt: daysAgo(3),   readAt: null },

  // ----- c9 Morgan Hayes (lead, SMS) -----
  { id: seedId('m', 'c9-m1'), conversationId: conversations[8].id, direction: 'out',      authorUserId: users[1].id, snippetId: null,                            text: 'Proposal went out this morning — let me know if anything needs tweaking.',        sentAt: daysAgo(1),   readAt: daysAgo(1) },
  { id: seedId('m', 'c9-m2'), conversationId: conversations[8].id, direction: 'in',       authorUserId: null,        snippetId: null,                            text: 'Reviewing with ownership tomorrow. Will circle back.',                           sentAt: hoursAgo(20), readAt: null },

  // ----- c10 Internal: Metro access coordination -----
  { id: seedId('m', 'c10-m1'), conversationId: conversations[9].id, direction: 'internal', authorUserId: users[0].id, snippetId: null,                           text: "Heads up — Metro's loading dock B is closed for repair next week. Route through the main entrance.", sentAt: daysAgo(2),   readAt: daysAgo(2) },
  { id: seedId('m', 'c10-m2'), conversationId: conversations[9].id, direction: 'internal', authorUserId: users[1].id, snippetId: null,                           text: "Thanks. I'll brief the Friday crew at the morning huddle.",                      sentAt: daysAgo(2),   readAt: daysAgo(2) },
  { id: seedId('m', 'c10-m3'), conversationId: conversations[9].id, direction: 'internal', authorUserId: users[2].id, snippetId: null,                           text: 'Updated job notes on all three Metro jobs this week.',                           sentAt: hoursAgo(22), readAt: hoursAgo(22) },

  // ----- c11 Internal: Pacific badge handoff -----
  { id: seedId('m', 'c11-m1'), conversationId: conversations[10].id, direction: 'internal', authorUserId: users[1].id, snippetId: null,                          text: 'Kim needs a badge for the new crew member. Who can pick it up from the front desk?', sentAt: daysAgo(3),   readAt: daysAgo(3) },
  { id: seedId('m', 'c11-m2'), conversationId: conversations[10].id, direction: 'internal', authorUserId: users[4].id, snippetId: null,                          text: "I'm at Tower A tomorrow — can grab it.",                                         sentAt: daysAgo(3),   readAt: daysAgo(3) },
  { id: seedId('m', 'c11-m3'), conversationId: conversations[10].id, direction: 'internal', authorUserId: users[1].id, snippetId: null,                          text: 'Perfect, thanks Casey.',                                                         sentAt: daysAgo(3),   readAt: daysAgo(3) },
];

// Reminder templates
const reminderTemplates = [
  { id: seedId('rt', 'bc'),  key: 'booking_confirmation', channel: 'email', subject: 'Your cleaning is booked', body: 'Hi {client_contact}, your {service} at {site_name} is booked for {date} at {time}. — {company}', enabled: true  },
  { id: seedId('rt', 'r24'), key: 'reminder_24h',         channel: 'sms',   subject: '',                        body: 'Reminder: {company} will be at {site_name} tomorrow at {time} for {service}.',                 enabled: true  },
  { id: seedId('rt', 'doe'), key: 'day_of_eta',           channel: 'sms',   subject: '',                        body: 'Your crew is on the way to {site_name}, ETA ~15 minutes. — {company}',                         enabled: true  },
  { id: seedId('rt', 'ps'),  key: 'post_service',         channel: 'email', subject: 'How did we do?',          body: 'Hi {client_contact}, thanks for letting {company} clean {site_name} today. Any feedback?',    enabled: false },
];

// Seed a few past reminder events so the stats aren't zero.
// Older events (>7d) are marked as read; recent ones start unread so the
// Delivery Inbox has a realistic triage queue on first load.
const reminderEvents = (() => {
  const evts = [];
  const tplKeys = reminderTemplates.map((t) => t.key);
  for (let i = 0; i < 28; i += 1) {
    const ageDays = 30 - i; // i grows → ageDays shrinks → newer
    evts.push({
      id: seedId('re', `e${i}`),
      templateKey: tplKeys[i % tplKeys.length],
      jobId: jobs[i % jobs.length].id,
      clientId: jobs[i % jobs.length].clientId,
      channel: i % 2 === 0 ? 'sms' : 'email',
      status: i % 13 === 0 ? 'failed' : 'sent',
      sentAt: daysAgo(ageDays),
      readAt: ageDays > 7 ? daysAgo(ageDays - 1) : null,
    });
  }
  return evts;
})();

// Contact activities — empty at seed; the UI appends on note/stage_change events.
const contactActivities = [];

// Per-user permission overrides — sparse. Empty at seed.
const userPermissionOverrides = [];

// ---------- Pipeline stages (v6) ----------
// Stored in state so users can rename/reorder/add/delete from the Pipeline UI.
// `key` is the stable identifier stored on contacts (`contact.stage`) and is
// immutable once created. `label` is what users see and can rename freely.
// The reducer keys special behavior on the string literals 'won' and 'lost'
// (e.g. lifecycle → 'customer' on 'won'), so those keys keep their semantics
// even if labels are renamed. If a user deletes one of those stages, the
// behavior simply becomes unreachable — no crash.
const pipelineStages = [
  { id: seedId('ps', 'new'),       key: 'new',       label: 'New' },
  { id: seedId('ps', 'contacted'), key: 'contacted', label: 'Contacted' },
  { id: seedId('ps', 'qualified'), key: 'qualified', label: 'Qualified' },
  { id: seedId('ps', 'proposal'),  key: 'proposal',  label: 'Proposal' },
  { id: seedId('ps', 'won'),       key: 'won',       label: 'Won' },
  { id: seedId('ps', 'lost'),      key: 'lost',      label: 'Lost' },
];

// ---------- Outreach (cold email module — v11) ----------
// Stub-data for the new Outreach module. Pre-populated so KPIs aren't all zeros
// during demo. Real production wiring (mailbox connect, scheduled dispatch,
// inbound webhook) is documented in components/OutreachDispatcher.jsx and
// lib/outreach.js — both ship as adapters with stub implementations.
//
// Entity model (kept intentionally flat — same convention as the rest of the store):
//   campaigns          — top-level campaign record (name, status, sequence ids, audience)
//   campaignSteps      — per-step copy: subject, body, delayDays, channel, order
//   campaignEnrollments— join row: contactId × campaignId × currentStepIndex × status
//   campaignEvents     — sent/opened/clicked/replied/bounced/unsubscribed events
//   outreachReplies    — inbound replies with AI classification + auto-actions taken
//   outreachSettings   — mailbox config, sending caps, auto-routing rules
const outreachSettings = {
  // ---------- Instantly.ai integration (v13) ----------
  // The user pastes their Instantly v2 API key here. When set, lib/outreach.js
  // hits api.instantly.ai for real campaign / lead / mailbox / replies CRUD.
  // When null, every code path falls back to a local simulation so the demo
  // continues to work for client previews.
  instantlyApiKey: null,           // raw key — null = stub mode
  instantlyKeyValidatedAt: null,   // ISO timestamp of last successful validate
  instantlyPlanTier: null,         // 'growth' | 'hypergrowth' | null — gates webhook UX
  // Cached mailbox list pulled from GET /accounts. Refreshed on demand from
  // the Settings tab + the New Campaign sender dropdown. Each entry:
  //   { id, email, firstName, lastName, provider, status, warmupScore, dailyLimit, setupPending, createdAt }
  instantlyMailboxes: [],
  instantlyMailboxesFetchedAt: null,
  // Default timezone for new campaigns (Instantly campaign_schedule wants IANA).
  defaultTimezone: 'America/Los_Angeles',
  // Pending OAuth session (set when user kicks off Connect Google / Microsoft).
  // Cleared after pollOAuthSession returns success/error/expired.
  pendingOAuth: null,              // { sessionId, provider, authUrl, expiresAt, startedAt } | null
  // Legacy stub mailbox (kept so the existing mailbox UI keeps working when no
  // Instantly key is configured — the new MailboxCard in Outreach.jsx branches
  // on instantlyApiKey to decide which UI to render).
  mailboxConnected: false,
  mailboxProvider: null,           // 'google' | 'microsoft' | 'imap'
  mailboxAddress: null,
  mailboxConnectedAt: null,
  // Anthropic API key — required for AI auto-routing fallback when Instantly's
  // own classifications aren't available (Growth tier without webhooks). Also
  // powers the Find Prospects → decision-maker enrichment Layer 1.
  anthropicApiKey: null,           // raw key (sk-ant-...) — null = not configured
  anthropicKeyValidatedAt: null,   // ISO timestamp of last successful validate
  // Prospecting (v12) — separate vendor keys for the Find Prospects tab.
  scrapioApiKey: null,             // Scrap.io key for Google Maps scraping
  scrapioKeyValidatedAt: null,
  perplexityApiKey: null,          // Perplexity Sonar — used as enrichment fallback
  perplexityKeyValidatedAt: null,
  // Business profile — anchors decision-maker enrichment to "who BUYS from you"
  // instead of "who works at the prospect". Without this the enricher would
  // pick whatever role exists at the prospect (Practice Manager at a dental
  // office) — which is wrong if the user sells to Facilities Managers.
  // targetRoles is priority-ordered: enricher tries role 1, falls back to 2, etc.
  businessProfile: {
    whatYouSell: 'Janitorial and commercial cleaning services',
    targetRoles: ['Facilities Manager', 'Office Manager', 'Operations Director', 'Practice Manager', 'Owner'],
    targetIndustries: ['Medical / Dental', 'Property Management', 'Office', 'Restaurants'],
    excludedTitles: ['Receptionist', 'Administrative Assistant'],
  },
  // Sending caps & schedule (per Instantly-style safety limits).
  dailyCap: 50,
  sendingHoursStart: 9,            // 9am local
  sendingHoursEnd: 17,             // 5pm local
  sendingDays: [1, 2, 3, 4, 5],    // Mon–Fri
  trackOpens: true,
  trackClicks: true,
  // ---------- AI auto-routing ----------
  // Master toggle: when off, every reply lands in the inbox for manual triage
  // and no rules below fire. When on, the per-classification rules apply.
  autoRoutingEnabled: true,
  autoRouting: {
    // INTERESTED — move into the pipeline + tag.
    interestedToPipeline: true,
    interestedPipelineStageKey: 'qualified', // user-selectable; matches a pipelineStages.key
    interestedTagId: tagId('hotlead'),
    // NOT INTERESTED — tag for suppression.
    notInterestedTagId: tagId('dnd'),
    // UNSUBSCRIBE — archive the contact globally.
    unsubscribeArchive: true,
    // QUESTION — defer + route to owner for human reply.
    questionAssignToOwner: true,
  },
};

// Step templates — every campaign references these by id.
// Token interpolation: {first_name} {last_name} {company} {sender_first_name} {sender_company}
const campaignSteps = [
  // Campaign A: SaaS-style 4-touch outbound to operations leaders
  { id: seedId('cs', 'a-1'), campaignId: seedId('cmp', 'a'), order: 1, delayDays: 0,  channel: 'email',
    subject: 'Quick question about cleaning ops at {company}',
    body: "Hi {first_name},\n\nNoticed {company} runs multi-site facilities — curious how you're handling janitorial scheduling across locations today.\n\nWe help ops leads consolidate vendor coordination + service verification into one dashboard. Worth a 15-min look?\n\n— {sender_first_name}" },
  { id: seedId('cs', 'a-2'), campaignId: seedId('cmp', 'a'), order: 2, delayDays: 3,  channel: 'email',
    subject: 'Re: Quick question about cleaning ops at {company}',
    body: "{first_name} — bumping this up. Most ops leaders we work with were juggling 3+ vendors over text/email before consolidating. Open to a quick chat?\n\n— {sender_first_name}" },
  { id: seedId('cs', 'a-3'), campaignId: seedId('cmp', 'a'), order: 3, delayDays: 4,  channel: 'email',
    subject: 'Thought you might find this useful, {first_name}',
    body: "Quick case study from a similar 4-site operation — they cut vendor coordination time by ~6 hrs/week using {sender_company}.\n\nHappy to share if useful.\n\n— {sender_first_name}" },
  { id: seedId('cs', 'a-4'), campaignId: seedId('cmp', 'a'), order: 4, delayDays: 5,  channel: 'email',
    subject: 'Closing the loop',
    body: "{first_name} — last note from me. If timing isn't right, totally understand. Happy to circle back next quarter.\n\n— {sender_first_name}" },

  // Campaign B: Property managers (residential focus, 3-touch)
  { id: seedId('cs', 'b-1'), campaignId: seedId('cmp', 'b'), order: 1, delayDays: 0, channel: 'email',
    subject: 'Cleaning vendor coverage for {company}?',
    body: "Hi {first_name},\n\nWe work with property managers running multi-unit residential — turnovers, common areas, after-incident deep cleans, the works.\n\nIf you're scoping coverage for next quarter, would love to put a quote in front of you.\n\n— {sender_first_name}" },
  { id: seedId('cs', 'b-2'), campaignId: seedId('cmp', 'b'), order: 2, delayDays: 4, channel: 'email',
    subject: 'Quick follow-up',
    body: "{first_name} — wanted to make sure my note didn't get buried. Even a quick \"not now\" is helpful so I know when to circle back.\n\n— {sender_first_name}" },
  { id: seedId('cs', 'b-3'), campaignId: seedId('cmp', 'b'), order: 3, delayDays: 6, channel: 'email',
    subject: 'One last note',
    body: "{first_name} — closing the loop here. If timing changes on cleaning vendor needs, you know where to find me.\n\n— {sender_first_name}" },

  // Campaign C: Dental / medical office (single-touch warm intro — draft state)
  { id: seedId('cs', 'c-1'), campaignId: seedId('cmp', 'c'), order: 1, delayDays: 0, channel: 'email',
    subject: 'Janitorial for medical practices, {first_name}?',
    body: "Hi {first_name},\n\nWe specialize in medical / dental office cleaning — bloodborne-pathogen training, proper PPE protocols, after-hours scheduling.\n\nWorth a 10-min call to see if we're a fit?\n\n— {sender_first_name}" },
];

const campaigns = [
  {
    id: seedId('cmp', 'a'),
    name: 'Q2 Multi-Site Operations Leaders',
    status: 'active',                 // draft | active | paused | completed
    description: 'Outbound to facility/operations directors at multi-site commercial businesses (4+ locations).',
    audienceFilter: 'commercial multi-site',
    senderUserId: users[0].id,        // Alex Morgan
    fromEmail: 'alex@acmecleaning.co',
    createdAt: daysAgo(14),
    activatedAt: daysAgo(13),
    completedAt: null,
    pausedAt: null,
    pausedReason: null,
  },
  {
    id: seedId('cmp', 'b'),
    name: 'Property Manager Outreach (Spring)',
    status: 'active',
    description: 'Residential property managers — turnover + common-area cleaning.',
    audienceFilter: 'residential property',
    senderUserId: users[1].id,        // Jordan Tate
    fromEmail: 'jordan@acmecleaning.co',
    createdAt: daysAgo(8),
    activatedAt: daysAgo(7),
    completedAt: null,
    pausedAt: null,
    pausedReason: null,
  },
  {
    id: seedId('cmp', 'c'),
    name: 'Medical & Dental Practices',
    status: 'draft',
    description: 'Specialty pitch for medical/dental — pathogen training & after-hours work.',
    audienceFilter: 'medical dental',
    senderUserId: users[0].id,
    fromEmail: 'alex@acmecleaning.co',
    createdAt: daysAgo(2),
    activatedAt: null,
    completedAt: null,
    pausedAt: null,
    pausedReason: null,
  },
];

// Enrollments — one row per (contact × campaign).
// status: pending (waiting on next step) | active (in flight) | replied | unsubscribed | bounced | completed
const campaignEnrollments = [
  // Campaign A — 4 prospects in various stages
  { id: seedId('cen', 'a-jamie'),  campaignId: campaigns[0].id, contactId: contacts[7].id,  currentStepIndex: 2, status: 'replied',     enrolledAt: daysAgo(13), lastSentAt: daysAgo(7),  nextSendAt: null },
  { id: seedId('cen', 'a-robin'),  campaignId: campaigns[0].id, contactId: contacts[8].id,  currentStepIndex: 1, status: 'active',      enrolledAt: daysAgo(10), lastSentAt: daysAgo(7),  nextSendAt: daysFromNow(0) },
  { id: seedId('cen', 'a-taylor'), campaignId: campaigns[0].id, contactId: contacts[9].id,  currentStepIndex: 3, status: 'active',      enrolledAt: daysAgo(13), lastSentAt: daysAgo(2),  nextSendAt: daysFromNow(3) },
  { id: seedId('cen', 'a-morgan'), campaignId: campaigns[0].id, contactId: contacts[11].id, currentStepIndex: 2, status: 'replied',     enrolledAt: daysAgo(13), lastSentAt: daysAgo(8),  nextSendAt: null },

  // Campaign B — 3 prospects
  { id: seedId('cen', 'b-robin'),  campaignId: campaigns[1].id, contactId: contacts[8].id,  currentStepIndex: 0, status: 'active',      enrolledAt: daysAgo(7),  lastSentAt: daysAgo(7),  nextSendAt: daysFromNow(0) },
  { id: seedId('cen', 'b-sam'),    campaignId: campaigns[1].id, contactId: contacts[12].id, currentStepIndex: 1, status: 'active',      enrolledAt: daysAgo(7),  lastSentAt: daysAgo(3),  nextSendAt: daysFromNow(2) },
];

// Events — sent/opened/clicked/replied per (enrollment, step). Drives KPI rollups.
// Generated procedurally so the numbers feel realistic.
const campaignEvents = (() => {
  const evts = [];
  let n = 0;
  const push = (campaignId, contactId, stepIndex, type, daysAgoVal) => {
    evts.push({
      id: seedId('cev', `e${n++}`),
      campaignId, contactId, stepIndex, type,
      occurredAt: daysAgo(daysAgoVal),
    });
  };
  // Campaign A: full funnel for 4 enrolled contacts
  // Jamie — sent x3, opened x3, replied on step 2
  push(campaigns[0].id, contacts[7].id, 0, 'sent',   13);
  push(campaigns[0].id, contacts[7].id, 0, 'opened', 13);
  push(campaigns[0].id, contacts[7].id, 1, 'sent',   10);
  push(campaigns[0].id, contacts[7].id, 1, 'opened', 10);
  push(campaigns[0].id, contacts[7].id, 2, 'sent',    7);
  push(campaigns[0].id, contacts[7].id, 2, 'opened',  7);
  push(campaigns[0].id, contacts[7].id, 2, 'clicked', 7);
  push(campaigns[0].id, contacts[7].id, 2, 'replied', 6);
  // Robin — sent x2, opened both
  push(campaigns[0].id, contacts[8].id, 0, 'sent',   10);
  push(campaigns[0].id, contacts[8].id, 0, 'opened', 10);
  push(campaigns[0].id, contacts[8].id, 1, 'sent',    7);
  push(campaigns[0].id, contacts[8].id, 1, 'opened',  7);
  // Taylor — full sequence, no reply
  push(campaigns[0].id, contacts[9].id, 0, 'sent',   13);
  push(campaigns[0].id, contacts[9].id, 0, 'opened', 12);
  push(campaigns[0].id, contacts[9].id, 1, 'sent',   10);
  push(campaigns[0].id, contacts[9].id, 1, 'opened', 10);
  push(campaigns[0].id, contacts[9].id, 2, 'sent',    6);
  push(campaigns[0].id, contacts[9].id, 2, 'opened',  6);
  push(campaigns[0].id, contacts[9].id, 3, 'sent',    2);
  // Morgan — replied (negative) on step 2
  push(campaigns[0].id, contacts[11].id, 0, 'sent',   13);
  push(campaigns[0].id, contacts[11].id, 0, 'opened', 13);
  push(campaigns[0].id, contacts[11].id, 1, 'sent',   10);
  push(campaigns[0].id, contacts[11].id, 1, 'opened', 10);
  push(campaigns[0].id, contacts[11].id, 2, 'sent',    8);
  push(campaigns[0].id, contacts[11].id, 2, 'replied', 7);

  // Campaign B
  push(campaigns[1].id, contacts[8].id,  0, 'sent',    7);
  push(campaigns[1].id, contacts[8].id,  0, 'opened',  6);
  push(campaigns[1].id, contacts[12].id, 0, 'sent',    7);
  push(campaigns[1].id, contacts[12].id, 0, 'opened',  7);
  push(campaigns[1].id, contacts[12].id, 1, 'sent',    3);
  push(campaigns[1].id, contacts[12].id, 1, 'opened',  3);
  return evts;
})();

// Inbound replies with AI classification.
// classification: interested | not_interested | question | out_of_office | unsubscribe | other
// autoActions: array of strings recording what the dispatcher already did (idempotent log).
const outreachReplies = [
  {
    id: seedId('orp', 'jamie'),
    campaignId: campaigns[0].id,
    contactId: contacts[7].id,
    stepIndex: 2,
    body: "Yes — definitely interested. We have 4 dental practices and our current cleaning vendor is a mess. When can we talk this week?",
    receivedAt: daysAgo(6),
    classification: 'interested',
    classificationConfidence: 0.94,
    classificationReasoning: 'Explicit affirmative ("Yes — definitely interested"), pain point named ("current vendor is a mess"), asked to schedule ("when can we talk").',
    autoActions: [
      'Tagged contact "Hot Lead"',
      'Moved to Pipeline → Qualified',
      'Paused remaining sequence steps',
    ],
    handledByUserId: null,
    handledAt: null,
  },
  {
    id: seedId('orp', 'morgan'),
    campaignId: campaigns[0].id,
    contactId: contacts[11].id,
    stepIndex: 2,
    body: "Please remove me from this list. Not interested.",
    receivedAt: daysAgo(7),
    classification: 'not_interested',
    classificationConfidence: 0.97,
    classificationReasoning: 'Explicit removal request and "not interested" statement.',
    autoActions: [
      'Tagged contact "Do Not Disturb"',
      'Suppressed from all future campaigns',
      'Paused remaining sequence steps',
    ],
    handledByUserId: null,
    handledAt: null,
  },
  {
    id: seedId('orp', 'kim'),
    campaignId: campaigns[0].id,
    contactId: contacts[4].id,
    stepIndex: 0,
    body: "I'm out of office until next Tuesday. Will reply when I'm back.",
    receivedAt: hoursAgo(6),
    classification: 'out_of_office',
    classificationConfidence: 0.92,
    classificationReasoning: 'Auto-reply pattern; dated return note.',
    autoActions: [
      'Paused next step until Wed',
      'No tag changes',
    ],
    handledByUserId: null,
    handledAt: null,
  },
  {
    id: seedId('orp', 'lee'),
    campaignId: campaigns[1].id,
    contactId: contacts[5].id,
    stepIndex: 0,
    body: "What's the typical pricing for an 80-unit complex? Hard to evaluate without a ballpark.",
    receivedAt: hoursAgo(20),
    classification: 'question',
    classificationConfidence: 0.88,
    classificationReasoning: 'Direct ask for pricing — qualifying question, not commitment but high intent.',
    autoActions: [
      'Routed to Alex (campaign owner) for human reply',
      'Paused next step until handled',
    ],
    handledByUserId: null,
    handledAt: null,
  },
];

// ---------- Prospecting (Scrap.io scraper — v12) ----------
// Mirrors LeadStart's prospect_searches + prospect_results model. A search row
// captures the query + lifecycle (queued / running / completed / failed). Each
// search produces N result rows (one per business found). Decision-maker
// enrichment is its own join table — a result can have 0 or 1 active run, and
// successful runs populate decisionMaker fields back on the result for fast
// rendering. Saving a result to CRM creates a contact in the existing entity
// store (no parallel "prospects" silo).
const prospectSearches = [
  {
    id: seedId('ps_s', 'q1'),
    query: 'commercial cleaning',
    location: 'Seattle, WA',
    resultCap: 10,
    status: 'completed',           // queued | running | completed | failed
    progress: 100,
    runByUserId: users[0].id,
    createdAt: daysAgo(2),
    completedAt: daysAgo(2),
    failureReason: null,
  },
];

const prospectResults = [
  // Results for the seeded search above.
  { id: seedId('ps_r', 'q1-a'), searchId: prospectSearches[0].id, businessName: 'Emerald Janitorial Services',  category: 'Commercial cleaning', address: '1402 4th Ave, Seattle WA 98101',  phone: '(206) 555-0410', website: 'emeraldjanitorial.com',   email: null, decisionMaker: null, savedContactId: null, foundAt: daysAgo(2) },
  { id: seedId('ps_r', 'q1-b'), searchId: prospectSearches[0].id, businessName: 'Pacific Northwest Cleaners',   category: 'Janitorial',          address: '500 Stewart St, Seattle WA 98101', phone: '(206) 555-0411', website: 'pncleaners.com',          email: null, decisionMaker: null, savedContactId: null, foundAt: daysAgo(2) },
  { id: seedId('ps_r', 'q1-c'), searchId: prospectSearches[0].id, businessName: 'Skyline Office Cleaning',      category: 'Commercial cleaning', address: '2100 Westlake Ave, Seattle WA 98121', phone: '(206) 555-0412', website: 'skylinecleaning.io', email: null,
    // Pre-enriched example so the demo shows what a "found" decision maker looks like.
    decisionMaker: { firstName: 'Morgan', lastName: 'Whittaker', title: 'Director of Operations', email: 'morgan@skylinecleaning.io', source: 'website', confidence: 0.91 },
    savedContactId: null, foundAt: daysAgo(2) },
  { id: seedId('ps_r', 'q1-d'), searchId: prospectSearches[0].id, businessName: 'Cascadia Facility Services',   category: 'Facility services',   address: '3500 Stone Way N, Seattle WA 98103', phone: '(206) 555-0413', website: 'cascadiafacility.com',  email: null, decisionMaker: null, savedContactId: null, foundAt: daysAgo(2) },
  { id: seedId('ps_r', 'q1-e'), searchId: prospectSearches[0].id, businessName: 'Rainier Building Maintenance', category: 'Building maintenance', address: '1100 Olive Way, Seattle WA 98101',  phone: '(206) 555-0414', website: 'rainierbm.com',           email: null, decisionMaker: null, savedContactId: null, foundAt: daysAgo(2) },
  { id: seedId('ps_r', 'q1-f'), searchId: prospectSearches[0].id, businessName: 'Puget Sound Janitorial Co',    category: 'Janitorial',          address: '900 Madison St, Seattle WA 98104',  phone: '(206) 555-0415', website: 'pugetsoundjan.com',       email: null, decisionMaker: null, savedContactId: null, foundAt: daysAgo(2) },
  { id: seedId('ps_r', 'q1-g'), searchId: prospectSearches[0].id, businessName: 'Evergreen Commercial Cleaning',category: 'Commercial cleaning', address: '2000 1st Ave, Seattle WA 98121',    phone: '(206) 555-0416', website: 'evergreencc.com',         email: null, decisionMaker: null, savedContactId: null, foundAt: daysAgo(2) },
  { id: seedId('ps_r', 'q1-h'), searchId: prospectSearches[0].id, businessName: 'Aurora Facility Group',         category: 'Facility services',   address: '6500 Aurora Ave N, Seattle WA 98103', phone: '(206) 555-0417', website: 'aurorafacility.co',     email: null, decisionMaker: null, savedContactId: null, foundAt: daysAgo(2) },
];

// Decision-maker enrichment runs — one per "Find decision maker" click on a
// result row. Layer 1 = website scrape (Claude); Layer 2 = Perplexity Sonar.
// status: queued | running | completed | failed
const decisionMakerRuns = [
  {
    id: seedId('dm_r', 'q1-c'),
    resultId: prospectResults[2].id,            // Skyline (the pre-enriched example)
    layer: 'website',                            // 'website' (Claude) | 'web_search' (Perplexity)
    status: 'completed',
    startedAt: daysAgo(2),
    completedAt: daysAgo(2),
    failureReason: null,
    foundCandidateCount: 3,
  },
];

// Current user is the owner by default. Store will expose a switcher.
const currentUserId = users[0].id;

export const INITIAL_STATE = {
  version: 13,
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
  // v3 additions — messaging snippets (Phase 2a)
  snippets,
  snippetFolders,
  // v5: message-folders removed (Phase 2b feature rolled back — Phase 2b per-conversation
  // fields like assignedUserId/status/snoozedUntil/starred/followedUserIds remain on each conversation).
  // v6: pipelineStages moved from hardcoded const to state for user-editable CRUD.
  pipelineStages,
  // v11: Outreach module (cold email)
  outreachSettings,
  campaigns,
  campaignSteps,
  campaignEnrollments,
  campaignEvents,
  outreachReplies,
  // v12: Prospecting (Scrap.io scraper)
  prospectSearches,
  prospectResults,
  decisionMakerRuns,
};
