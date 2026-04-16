// Normalized seed data. Populates the store on first run.
// Generic cleaning business; entity relationships use explicit foreign keys.

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

const clients = [
  { id: seedId('cl', 'metro'),  name: 'Metro Medical Center',    primaryContact: 'Pat Ramirez',   email: 'pat@metromed.com',    phone: '(206) 555-0201', serviceId: services[0].id, frequencyId: frequencies[0].id, status: 'active', revenue: 4800, notes: 'Prefers after-hours access via loading dock.', lastServiceAt: daysAgo(1),  createdAt: daysAgo(420) },
  { id: seedId('cl', 'lake'),   name: 'Lakeside Office Park',    primaryContact: 'Morgan Choi',   email: 'morgan@lakesideop.com', phone: '(206) 555-0202', serviceId: services[1].id, frequencyId: frequencies[2].id, status: 'active', revenue: 2200, notes: '', lastServiceAt: daysAgo(5),  createdAt: daysAgo(380) },
  { id: seedId('cl', 'summit'), name: 'Summit Warehouse',        primaryContact: 'Dana Park',     email: 'dana@summitwh.com',     phone: '(206) 555-0203', serviceId: services[4].id, frequencyId: frequencies[3].id, status: 'active', revenue: 1500, notes: 'Loading bay access only; no retail entry.', lastServiceAt: daysAgo(18), createdAt: daysAgo(340) },
  { id: seedId('cl', 'green'),  name: 'Greenfield HOA',          primaryContact: 'Sasha Lin',     email: 'sasha@greenfield.org',  phone: '(206) 555-0204', serviceId: services[2].id, frequencyId: frequencies[2].id, status: 'active', revenue: 1100, notes: '', lastServiceAt: daysAgo(10), createdAt: daysAgo(210) },
  { id: seedId('cl', 'pac'),    name: 'Pacific Ridge Corp',      primaryContact: 'Kim Nelson',    email: 'kim@pacridge.com',      phone: '(206) 555-0205', serviceId: services[0].id, frequencyId: frequencies[1].id, status: 'active', revenue: 3400, notes: 'Security badge required; pick up at front desk.', lastServiceAt: daysAgo(3), createdAt: daysAgo(500) },
  { id: seedId('cl', 'river'),  name: 'Riverside Senior Living', primaryContact: 'Lee Thompson',  email: 'lee@riversidesl.com',   phone: '(206) 555-0206', serviceId: services[5].id, frequencyId: frequencies[0].id, status: 'active', revenue: 2800, notes: '', lastServiceAt: daysAgo(0),  createdAt: daysAgo(150) },
  { id: seedId('cl', 'tech'),   name: 'Downtown Tech Hub',       primaryContact: 'Quinn Reyes',   email: 'quinn@dtechub.com',     phone: '(206) 555-0207', serviceId: services[3].id, frequencyId: frequencies[4].id, status: 'inactive', revenue: 950, notes: 'On hold — renovation through Q2.', lastServiceAt: daysAgo(28), createdAt: daysAgo(90) },
];

// Sites (multi-site clients). Not every client has multiple sites.
const sites = [
  // Metro Medical Center — 2 sites
  { id: seedId('st', 'metro-main'),   clientId: clients[0].id, name: 'Main Hospital',    address: '500 Medical Dr, Seattle WA 98104',  accessNotes: 'Loading dock B after 7 PM',  createdAt: daysAgo(420) },
  { id: seedId('st', 'metro-annex'),  clientId: clients[0].id, name: 'Annex Clinic',     address: '512 Medical Dr, Seattle WA 98104',  accessNotes: 'Front desk, ask for Pat',    createdAt: daysAgo(300) },
  // Lakeside Office Park — 1 site
  { id: seedId('st', 'lake-main'),    clientId: clients[1].id, name: 'Main Campus',      address: '200 Lakeside Blvd, Bellevue WA 98004', accessNotes: '', createdAt: daysAgo(380) },
  // Summit Warehouse — 1 site
  { id: seedId('st', 'summit-main'),  clientId: clients[2].id, name: 'Warehouse 1',      address: '1800 Summit Ave S, Seattle WA 98134', accessNotes: 'Loading bay only', createdAt: daysAgo(340) },
  // Greenfield HOA — 3 sites (common areas)
  { id: seedId('st', 'green-clbhs'),  clientId: clients[3].id, name: 'Clubhouse',        address: '120 Greenfield Way, Redmond WA 98052', accessNotes: '', createdAt: daysAgo(210) },
  { id: seedId('st', 'green-pool'),   clientId: clients[3].id, name: 'Pool Building',    address: '124 Greenfield Way, Redmond WA 98052', accessNotes: 'Gate code #4421',  createdAt: daysAgo(200) },
  { id: seedId('st', 'green-gym'),    clientId: clients[3].id, name: 'Gym Annex',        address: '130 Greenfield Way, Redmond WA 98052', accessNotes: '', createdAt: daysAgo(180) },
  // Pacific Ridge — 2 sites
  { id: seedId('st', 'pac-tower'),    clientId: clients[4].id, name: 'Tower A',          address: '88 Pacific Way, Seattle WA 98121', accessNotes: 'Front desk badge', createdAt: daysAgo(500) },
  { id: seedId('st', 'pac-annex'),    clientId: clients[4].id, name: 'South Annex',      address: '92 Pacific Way, Seattle WA 98121', accessNotes: '', createdAt: daysAgo(260) },
  // Riverside — 1 site
  { id: seedId('st', 'river-main'),   clientId: clients[5].id, name: 'Main Residence',   address: '15 Riverside Ct, Kirkland WA 98033', accessNotes: 'Use service entrance', createdAt: daysAgo(150) },
  // Downtown Tech Hub — 1 site
  { id: seedId('st', 'tech-main'),    clientId: clients[6].id, name: 'Main Office',      address: '900 Union St, Seattle WA 98101', accessNotes: 'Closed until Q2', createdAt: daysAgo(90) },
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
  { id: 'INV-1001', clientId: clients[0].id, siteId: siteFor('metro-main').id,  jobIds: [], issueDate: daysAgo(3),  dueDate: atTime(27, 12, 0), lineItems: [li('Weekly janitorial — Main Hospital', 4, 300)], taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p1'), date: daysAgo(1), amount: 1200, method: 'ACH', note: '' }], createdAt: daysAgo(3) },
  { id: 'INV-1002', clientId: clients[1].id, siteId: siteFor('lake-main').id,   jobIds: [], issueDate: daysAgo(4),  dueDate: atTime(26, 12, 0), lineItems: [li('Monthly floor care', 1, 550)],                     taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p2'), date: daysAgo(2), amount: 550,  method: 'Card', note: '' }], createdAt: daysAgo(4) },
  { id: 'INV-1003', clientId: clients[4].id, siteId: siteFor('pac-tower').id,   jobIds: [], issueDate: daysAgo(6),  dueDate: atTime(24, 12, 0), lineItems: [li('Bi-weekly janitorial — Tower A', 2, 425)],         taxRate: 0, status: 'pending', payments: [],                                                                                        createdAt: daysAgo(6) },
  { id: 'INV-1004', clientId: clients[5].id, siteId: siteFor('river-main').id,  jobIds: [], issueDate: daysAgo(8),  dueDate: atTime(22, 12, 0), lineItems: [li('Weekly restroom sanitation', 4, 175)],             taxRate: 0, status: 'pending', payments: [],                                                                                        createdAt: daysAgo(8) },
  { id: 'INV-1005', clientId: clients[3].id, siteId: siteFor('green-clbhs').id, jobIds: [], issueDate: daysAgo(10), dueDate: atTime(20, 12, 0), lineItems: [li('Monthly window cleaning — Clubhouse', 1, 275)],    taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p3'), date: daysAgo(5), amount: 275,  method: 'Check', note: '#1042' }], createdAt: daysAgo(10) },
  { id: 'INV-1006', clientId: clients[2].id, siteId: siteFor('summit-main').id, jobIds: [], issueDate: daysAgo(20), dueDate: daysAgo(5),        lineItems: [li('Quarterly pressure washing', 1, 1500)],            taxRate: 0, status: 'overdue', payments: [],                                                                                        createdAt: daysAgo(20) },
  { id: 'INV-1007', clientId: clients[6].id, siteId: siteFor('tech-main').id,   jobIds: [], issueDate: daysAgo(30), dueDate: daysAgo(15),       lineItems: [li('Post-construction cleanup', 1, 950)],              taxRate: 0, status: 'overdue', payments: [],                                                                                        createdAt: daysAgo(30) },
  { id: 'INV-1008', clientId: clients[0].id, siteId: siteFor('metro-annex').id, jobIds: [], issueDate: daysAgo(14), dueDate: atTime(16, 12, 0), lineItems: [li('Weekly janitorial — Annex Clinic', 4, 300)],       taxRate: 0, status: 'paid',    payments: [{ id: seedId('pay', 'p4'), date: daysAgo(7), amount: 1200, method: 'ACH', note: '' }], createdAt: daysAgo(14) },
];

// Conversations
const conversations = [
  { id: seedId('cv', 'c1'), clientId: clients[0].id, channel: 'sms',   archived: false, createdAt: daysAgo(7)  },
  { id: seedId('cv', 'c2'), clientId: clients[1].id, channel: 'email', archived: false, createdAt: daysAgo(10) },
  { id: seedId('cv', 'c3'), clientId: clients[3].id, channel: 'sms',   archived: false, createdAt: daysAgo(20) },
  { id: seedId('cv', 'c4'), clientId: clients[4].id, channel: 'sms',   archived: false, createdAt: daysAgo(2)  },
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

// Current user is the owner by default. Store will expose a switcher.
const currentUserId = users[0].id;

export const INITIAL_STATE = {
  version: 1,
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
};
