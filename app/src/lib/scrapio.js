// ─────────────────────────────────────────────────────────────────────────────
// Scrap.io adapter — Google Maps business search.
//
// Mirrors lib/twilio.js + lib/outreach.js pattern: full integration surface in
// one file, branches on VITE_SCRAPIO_BACKEND_URL. When unset (dev/demo) the
// adapter generates plausible mock results based on the query + location so the
// demo handles arbitrary searches without looking canned.
//
// Production wiring (when sold):
//   - runSearch() → POST to backend, backend calls Scrap.io, polls Scrap.io's
//     job API, streams progress back via SSE.
//   - Backend writes results to its own DB and exposes a fetch endpoint; this
//     adapter's stub fakes the same shape locally.
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env?.VITE_SCRAPIO_BACKEND_URL || null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----- Mock data primitives — keyed by category bucket -----
// Categories detected via keyword match on the user's query string. Falls back
// to "General business" if nothing matches.
const CATEGORY_BUCKETS = [
  {
    keywords: ['cleaning', 'janitorial', 'sanit', 'maid', 'housekeep', 'facility', 'facilities'],
    label: 'Commercial cleaning',
    namePrefixes: ['Emerald', 'Pacific', 'Skyline', 'Cascadia', 'Rainier', 'Puget Sound', 'Evergreen', 'Aurora', 'Northwest', 'Olympic', 'Summit', 'Harbor'],
    nameSuffixes: ['Janitorial', 'Cleaners', 'Cleaning Co', 'Facility Services', 'Building Maintenance', 'Commercial Cleaning', 'Sanitation', 'Property Care'],
    domains: ['janitorial.com', 'cleaning.io', 'facility.co', 'cleanco.com', 'janco.io'],
  },
  {
    keywords: ['dental', 'dentist', 'orthodont', 'oral'],
    label: 'Dental practice',
    namePrefixes: ['Bellevue', 'Lakeside', 'Smile', 'Bright', 'Family', 'Pacific', 'Modern', 'Premier', 'Eastside', 'Greenwood'],
    nameSuffixes: ['Dental', 'Dental Care', 'Family Dentistry', 'Dental Group', 'Orthodontics', 'Smile Studio', 'Oral Health'],
    domains: ['dentalcare.com', 'familydentistry.com', 'smilegroup.io', 'orthocare.com'],
  },
  {
    keywords: ['property', 'realty', 'real estate', 'apartment', 'leasing', 'hoa'],
    label: 'Property management',
    namePrefixes: ['Cascade', 'Harbor', 'Northwest', 'Pacific', 'Summit', 'Sound', 'Bay', 'Pinnacle', 'Westshore', 'Rainier'],
    nameSuffixes: ['Property Management', 'Realty', 'Properties', 'Residential', 'Real Estate Group', 'Property Group'],
    domains: ['propmgmt.com', 'realty.io', 'properties.co', 'realestate.com'],
  },
  {
    keywords: ['restaurant', 'cafe', 'coffee', 'brewery', 'eatery', 'food'],
    label: 'Restaurant',
    namePrefixes: ['The', 'Blue', 'Red', 'Olive', 'Stone', 'River', 'Brick', 'Iron', 'Copper', 'Brass'],
    nameSuffixes: ['Bistro', 'Kitchen', 'Eatery', 'Coffee Co', 'Brewing Co', 'Café', 'Pub', 'Tavern'],
    domains: ['eatery.com', 'kitchen.io', 'coffeeco.com', 'brewing.co'],
  },
  {
    keywords: ['gym', 'fitness', 'yoga', 'pilates', 'crossfit'],
    label: 'Fitness',
    namePrefixes: ['Iron', 'Peak', 'Pinnacle', 'Forge', 'Strength', 'Elevation', 'Apex', 'Core'],
    nameSuffixes: ['Fitness', 'Gym', 'Athletic Club', 'CrossFit', 'Yoga Studio', 'Performance'],
    domains: ['fitness.com', 'gym.co', 'athletic.io'],
  },
  {
    keywords: ['law', 'legal', 'attorney'],
    label: 'Law firm',
    namePrefixes: ['Anderson', 'Martinez', 'Patel', 'Chen', 'Walker', 'Reyes', 'Brooks', 'Khan'],
    nameSuffixes: ['Law Group', '& Associates', 'Legal', 'Law Office', 'Attorneys at Law'],
    domains: ['lawfirm.com', 'legal.co', 'attorneys.io'],
  },
];

const FALLBACK_BUCKET = {
  label: 'General business',
  namePrefixes: ['Pacific', 'Northwest', 'Summit', 'Cascade', 'Rainier', 'Olympic', 'Evergreen', 'Harbor'],
  nameSuffixes: ['Group', 'Services', 'Co', 'Solutions', 'Partners', 'Holdings'],
  domains: ['business.com', 'co.io', 'group.com'],
};

const DECISION_TITLES_BY_BUCKET = {
  'Commercial cleaning': ['Director of Operations', 'Owner', 'Operations Manager', 'General Manager'],
  'Dental practice':     ['Practice Manager', 'Owner / Dentist', 'Office Manager', 'Director of Operations'],
  'Property management': ['Property Manager', 'Director of Asset Management', 'Operations Director', 'Principal Broker'],
  'Restaurant':          ['Owner', 'General Manager', 'Operations Manager'],
  'Fitness':             ['Owner', 'General Manager', 'Director of Operations'],
  'Law firm':            ['Managing Partner', 'Office Administrator', 'Director of Operations'],
  'General business':    ['Owner', 'Director of Operations', 'General Manager', 'VP of Operations'],
};

const FIRST_NAMES = ['Morgan', 'Avery', 'Jordan', 'Taylor', 'Kim', 'Sasha', 'Quinn', 'Riley', 'Cameron', 'Reese', 'Drew', 'Devin', 'Hayden', 'Skyler', 'Rowan', 'Sage', 'Parker', 'Logan', 'Emerson', 'Casey'];
const LAST_NAMES  = ['Whittaker', 'Chen', 'Patel', 'Anderson', 'Martinez', 'Brooks', 'Reyes', 'Walker', 'Nguyen', 'Khan', 'Sullivan', 'Hayes', 'Bennett', 'Lawson', 'Garcia', 'Park', 'Thompson', 'Rivera', 'Carter', 'Foster'];

const STREET_NAMES = ['4th Ave', 'Stewart St', 'Westlake Ave', 'Stone Way N', 'Olive Way', 'Madison St', '1st Ave', 'Aurora Ave N', 'Pike St', 'Pine St', 'Roosevelt Way', 'Eastlake Ave'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function bucketForQuery(query) {
  const q = (query || '').toLowerCase();
  for (const b of CATEGORY_BUCKETS) {
    if (b.keywords.some((k) => q.includes(k))) return b;
  }
  return FALLBACK_BUCKET;
}

function inferAreaCode(location) {
  // Quick regional code lookup so the phone numbers feel locale-correct.
  const loc = (location || '').toLowerCase();
  if (loc.includes('seattle') || loc.includes('bellevue') || loc.includes('redmond')) return '206';
  if (loc.includes('tacoma') || loc.includes('olympia')) return '253';
  if (loc.includes('portland'))                         return '503';
  if (loc.includes('san francisco') || loc.includes('oakland')) return '415';
  if (loc.includes('los angeles') || loc.includes('la,'))       return '213';
  if (loc.includes('new york') || loc.includes('brooklyn'))     return '212';
  if (loc.includes('chicago'))                          return '312';
  if (loc.includes('austin'))                           return '512';
  if (loc.includes('miami'))                            return '305';
  return '555';
}

function fakePhone(areaCode) {
  return `(${areaCode}) 555-0${(400 + Math.floor(Math.random() * 599)).toString().padStart(3, '0')}`;
}

function fakeAddressLine(location) {
  const num = Math.floor(Math.random() * 9000) + 100;
  const street = pick(STREET_NAMES);
  return `${num} ${street}, ${location}`;
}

function fakeBusinessName(bucket) {
  return `${pick(bucket.namePrefixes)} ${pick(bucket.nameSuffixes)}`;
}

function nameToDomain(name, bucket) {
  const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
  // Clip overly-long slugs and append a category-appropriate TLD-ish suffix.
  const base = slug.slice(0, 18);
  const tld = pick(['.com', '.io', '.co']);
  return `${base}${tld}`;
}

// ----- Public API -----
//
// runSearch({ query, location, resultCap, onProgress })
//   → returns { results: [...] }
// onProgress is invoked with (percent: 0–100) so the UI can render a bar.
//
export async function runSearch({ query, location, resultCap, onProgress }) {
  if (BACKEND_URL) {
    const res = await fetch(`${BACKEND_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location, resultCap }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Search failed (${res.status})`);
    }
    return res.json();
  }

  // Stub mode — simulate Scrap.io's typical 2-3s job with progress polls.
  const bucket = bucketForQuery(query);
  const cap = Math.min(Math.max(Number(resultCap) || 25, 1), 50);
  const targetCount = cap >= 25 ? 8 + Math.floor(Math.random() * 7) : Math.min(cap, 6 + Math.floor(Math.random() * 4));

  const totalMs = 2000 + Math.random() * 1500;
  const ticks = 6;
  for (let i = 1; i <= ticks; i++) {
    await delay(totalMs / ticks);
    if (onProgress) onProgress(Math.round((i / ticks) * 100));
  }

  // Generate unique business names for this run.
  const used = new Set();
  const results = [];
  let attempts = 0;
  const areaCode = inferAreaCode(location);
  while (results.length < targetCount && attempts < targetCount * 4) {
    attempts++;
    const name = fakeBusinessName(bucket);
    if (used.has(name)) continue;
    used.add(name);
    results.push({
      businessName: name,
      category: bucket.label,
      address: fakeAddressLine(location || 'Seattle, WA'),
      phone: fakePhone(areaCode),
      website: nameToDomain(name, bucket),
      email: null,
      decisionMaker: null,
    });
  }
  return { results };
}

// Used by the enricher to pick a plausible decision-maker title given the
// bucket. Re-export so the enricher module doesn't have to duplicate the map.
export function decisionMakerTitlesForCategory(categoryLabel) {
  return DECISION_TITLES_BY_BUCKET[categoryLabel] || DECISION_TITLES_BY_BUCKET['General business'];
}

export function pickFirstName() { return pick(FIRST_NAMES); }
export function pickLastName()  { return pick(LAST_NAMES); }

export function scrapioIsStub() {
  return !BACKEND_URL;
}
