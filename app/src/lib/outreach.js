// ─────────────────────────────────────────────────────────────────────────────
// Outreach adapter — Instantly.ai v2 API client (with stub fallback for dev).
//
// Production mode: when outreachSettings.instantlyApiKey is set, calls hit
// https://api.instantly.ai/api/v2/* with `Authorization: Bearer ${key}`.
// Stub mode (no key): every function falls back to a local simulation so the
// shell still works for demos, smoke tests, and local development.
//
// Architectural contract: this module is a PURE client. Nothing here touches
// the React store. Callers (NewCampaignModal, OutreachDispatcher, etc.) get
// the API response back and dispatch their own local mirror actions.
//
// Endpoint reference: https://developer.instantly.ai/api-reference/openapi.json
// Rate limit: 6,000 req/min. Webhooks gated to Hypergrowth ($97/mo) plan.
// ─────────────────────────────────────────────────────────────────────────────

const INSTANTLY_BASE = 'https://api.instantly.ai';

// ~5% stub failure rate so the failure-state UI gets exercised in dev.
const STUB_FAILURE_RATE = 0.05;

// Map Instantly campaign status integers → our string statuses.
// -99/0 = draft, 1 = active, 2 = paused, 3 = completed, 4 = running-subset
export const INSTANTLY_STATUS = {
  '-99': 'draft',
  '0':   'draft',
  '1':   'active',
  '2':   'paused',
  '3':   'completed',
  '4':   'active',  // running-subset = still active for our UI
  '-1':  'paused',  // error state — surface as paused
  '-2':  'paused',
};

// Map Instantly's webhook + ai_interest_value classifications → ours.
// Their lead_* event names are also surfaced as classifications on emails.
export const INSTANTLY_CLASSIFICATION = {
  lead_interested:        'interested',
  lead_not_interested:    'not_interested',
  lead_neutral:           'other',
  lead_out_of_office:     'out_of_office',
  lead_wrong_person:      'other',
  lead_meeting_booked:    'interested',
  lead_meeting_completed: 'interested',
  lead_closed:            'interested',
  lead_unsubscribed:      'unsubscribe',
  lead_no_show:           'other',
};

// Map their i_status integer → our classification.
// 0=neutral, 1=interested, 2=meeting-booked, 3=closed, 4=meeting-completed,
// -1=not interested, -2=wrong person, -3=lost.
export function classifyByIStatus(i) {
  switch (Number(i)) {
    case 1: case 2: case 3: case 4: return 'interested';
    case -1:                        return 'not_interested';
    case -2: case -3:               return 'other';
    default:                        return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function instantlyFetch(apiKey, path, init = {}) {
  if (!apiKey) throw new Error('Instantly API key is not configured');
  const res = await fetch(`${INSTANTLY_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = (body && body.message) || `Instantly returned ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomMessageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth — validate key
// ─────────────────────────────────────────────────────────────────────────────

// Cheapest probe: GET /accounts?limit=1. 200 = valid, 401 = bad token.
// Returns { valid: bool, errorMessage?: string }.
export async function validateInstantlyKey(apiKey) {
  if (!apiKey) return { valid: false, errorMessage: 'No key provided' };
  try {
    await instantlyFetch(apiKey, '/api/v2/accounts?limit=1', { method: 'GET' });
    return { valid: true };
  } catch (err) {
    if (err.status === 401) return { valid: false, errorMessage: 'Invalid API key' };
    return { valid: false, errorMessage: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mailboxes (Instantly term: "accounts")
// ─────────────────────────────────────────────────────────────────────────────

// provider_code: 1=IMAP/SMTP, 2=Google, 3=Microsoft, 4=AWS-SES, 8=DFY
const PROVIDER_LABEL = { 1: 'imap', 2: 'google', 3: 'microsoft', 4: 'ses', 8: 'dfy' };
// status: 1=active, 2=paused, negatives = error states
const ACCOUNT_STATUS = { '1': 'active', '2': 'paused', '-1': 'error', '-2': 'error', '-3': 'error' };

export async function listMailboxes(apiKey, { limit = 100 } = {}) {
  const data = await instantlyFetch(apiKey, `/api/v2/accounts?limit=${limit}`, { method: 'GET' });
  const items = data?.items || [];
  return items.map((a) => ({
    id:           a.email,                                  // we key on email
    email:        a.email,
    firstName:    a.first_name || '',
    lastName:     a.last_name || '',
    provider:     PROVIDER_LABEL[a.provider_code] || 'imap',
    status:       ACCOUNT_STATUS[String(a.status)] || 'active',
    warmupStatus: a.warmup_status,
    warmupScore:  a.stat_warmup_score,
    dailyLimit:   a.daily_limit,
    setupPending: !!a.setup_pending,
    createdAt:    a.timestamp_created,
  }));
}

export async function getMailboxByEmail(apiKey, email) {
  return instantlyFetch(apiKey, `/api/v2/accounts/${encodeURIComponent(email)}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth — connect a Google / Microsoft mailbox
// ─────────────────────────────────────────────────────────────────────────────

// Returns { sessionId, authUrl, expiresAt }.
export async function initOAuth(apiKey, provider) {
  if (provider !== 'google' && provider !== 'microsoft') {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const data = await instantlyFetch(apiKey, `/api/v2/oauth/${provider}/init`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return {
    sessionId: data.session_id,
    authUrl:   data.auth_url,
    expiresAt: data.expires_at,
  };
}

// Returns { status: 'pending'|'success'|'error'|'expired', email?, name?, error? }.
// On 'success', look up the full account via getMailboxByEmail(apiKey, email).
export async function pollOAuthSession(apiKey, sessionId) {
  return instantlyFetch(apiKey, `/api/v2/oauth/session/status/${sessionId}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────────────────────

// Build the Instantly campaign body from our local shape.
// localCampaign:  { name, fromEmail (mailbox), description? }
// localSteps:     [{ order, delayDays, channel, subject, body }]
// schedule:       { dailyLimit, hoursStart, hoursEnd, days: [0..6 booleans], timezone }
//                 days indices: 0=Sun, 1=Mon, ..., 6=Sat
export function buildCampaignBody({ localCampaign, localSteps, schedule, mailboxEmails }) {
  // Translate our token style {first_name} → Instantly's {{firstName}}.
  const sortedSteps = [...(localSteps || [])].sort((a, b) => a.order - b.order);

  const sequences = [{
    steps: sortedSteps.map((s) => ({
      type: 'email',
      delay: Number(s.delayDays || 0),
      delay_unit: 'days',
      variants: [{
        subject: toInstantlyTokens(s.subject || ''),
        body:    toInstantlyTokens(s.body    || ''),
      }],
    })),
  }];

  const days = schedule?.days || [false, true, true, true, true, true, false];
  const daysObj = {};
  for (let i = 0; i < 7; i++) daysObj[String(i)] = !!days[i];

  return {
    name: localCampaign.name,
    campaign_schedule: {
      schedules: [{
        name:     'Default',
        timing:   { from: pad2h(schedule?.hoursStart ?? 9), to: pad2h(schedule?.hoursEnd ?? 17) },
        days:     daysObj,
        timezone: schedule?.timezone || 'America/Los_Angeles',
      }],
    },
    sequences,
    email_list: mailboxEmails || (localCampaign.fromEmail ? [localCampaign.fromEmail] : []),
    daily_limit: schedule?.dailyLimit ?? 50,
    stop_on_reply: true,
    stop_on_auto_reply: false,
    open_tracking: true,
    link_tracking: true,
    insert_unsubscribe_header: true,
  };
}

function pad2h(h) { return `${String(h).padStart(2, '0')}:00`; }

// Translate our token style → Instantly's.
// {first_name}        → {{firstName}}
// {last_name}         → {{lastName}}
// {company}           → {{companyName}}
// {sender_first_name} → {{senderFirstName}}   (custom_variable)
// {sender_company}    → {{senderCompany}}     (custom_variable)
const TOKEN_MAP = {
  first_name:        'firstName',
  last_name:         'lastName',
  company:           'companyName',
  sender_first_name: 'senderFirstName',
  sender_company:    'senderCompany',
};
export function toInstantlyTokens(template) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (m, k) => (TOKEN_MAP[k] ? `{{${TOKEN_MAP[k]}}}` : m));
}

export async function createCampaign(apiKey, body) {
  return instantlyFetch(apiKey, '/api/v2/campaigns', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function activateCampaign(apiKey, id) {
  return instantlyFetch(apiKey, `/api/v2/campaigns/${id}/activate`, { method: 'POST', body: JSON.stringify({}) });
}

export async function pauseCampaign(apiKey, id) {
  return instantlyFetch(apiKey, `/api/v2/campaigns/${id}/pause`, { method: 'POST', body: JSON.stringify({}) });
}

export async function deleteCampaign(apiKey, id) {
  return instantlyFetch(apiKey, `/api/v2/campaigns/${id}`, { method: 'DELETE' });
}

export async function getCampaignAnalytics(apiKey, id) {
  return instantlyFetch(apiKey, `/api/v2/campaigns/analytics/overview?id=${id}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Leads (audience)
// ─────────────────────────────────────────────────────────────────────────────

// Translate a CRM contact → Instantly lead payload.
// senderCtx is { firstName, companyName } so {{senderFirstName}}/{{senderCompany}}
// can resolve via custom_variables.
export function contactToLead(contact, companyName, senderCtx = {}) {
  return {
    email:        contact.email,
    first_name:   contact.firstName || '',
    last_name:    contact.lastName || '',
    company_name: companyName || contact.customFields?.company || '',
    phone:        contact.phone || '',
    website:      contact.customFields?.website || '',
    custom_variables: {
      senderFirstName: senderCtx.firstName || '',
      senderCompany:   senderCtx.companyName || '',
    },
  };
}

// Bulk-add. Returns { total_sent, leads_uploaded, skipped_count, created_leads:[...] }.
export async function addLeads(apiKey, { campaignId, leads, skipIfInCampaign = true }) {
  return instantlyFetch(apiKey, '/api/v2/leads/add', {
    method: 'POST',
    body: JSON.stringify({
      campaign_id: campaignId,
      skip_if_in_campaign: skipIfInCampaign,
      skip_if_in_workspace: false,
      leads,
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Replies inbox
// ─────────────────────────────────────────────────────────────────────────────

// filter: { isUnread?, campaignId?, limit? }
// Returns { items: [...], next_starting_after }
export async function listEmails(apiKey, filter = {}) {
  const qs = new URLSearchParams();
  if (filter.isUnread !== undefined) qs.set('is_unread', String(filter.isUnread));
  if (filter.campaignId) qs.set('campaign_id', filter.campaignId);
  if (filter.emailType)  qs.set('email_type', filter.emailType);  // 'received' for inbound
  qs.set('limit', String(filter.limit || 50));
  qs.set('sort_order', 'desc');
  const data = await instantlyFetch(apiKey, `/api/v2/emails?${qs.toString()}`, { method: 'GET' });
  return {
    items: (data?.items || []).map(emailToReply),
    next: data?.next_starting_after || null,
  };
}

// Translate Instantly email → our outreachReplies row shape.
export function emailToReply(email) {
  // Prefer i_status (manual/CRM) when set; fall back to ai_interest_value.
  const fromIStatus = classifyByIStatus(email.i_status);
  const aiNum = email.ai_interest_value;
  let classification = fromIStatus;
  let confidence = email.i_status ? 0.99 : 0;
  let reasoning  = null;
  if (!classification && typeof aiNum === 'number') {
    // Map ai_interest_value range to our enum:
    //   ≥ 0.7 = interested, ≤ 0.3 = not_interested, else other.
    if (aiNum >= 0.7) classification = 'interested';
    else if (aiNum <= 0.3) classification = 'not_interested';
    else classification = 'other';
    confidence = aiNum;
    reasoning = `Instantly AI interest score: ${aiNum.toFixed(2)}`;
  }
  if (!classification) classification = email.is_auto_reply ? 'out_of_office' : 'other';
  return {
    id:         email.id,
    campaignId: email.campaign_id,
    contactId:  null,                       // resolved by caller via lead_id → email lookup
    leadId:     email.lead_id,
    leadEmail:  email.from_address_email || (email.from_address_json?.address) || null,
    stepIndex:  Math.max(0, (email.step || 1) - 1),
    body:       email.body?.text || email.content_preview || '',
    subject:    email.subject || '',
    receivedAt: email.timestamp_email || email.timestamp_created,
    classification,
    classificationConfidence: confidence,
    classificationReasoning:  reasoning,
    aiInterestValue: aiNum ?? null,
    iStatus:    email.i_status ?? null,
    autoActions: [],                        // populated by dispatcher when routing rules fire
    handledByUserId: null,
    handledAt: null,
  };
}

export async function markEmailRead(apiKey, emailId, isUnread = false) {
  return instantlyFetch(apiKey, `/api/v2/emails/${emailId}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_unread: isUnread }),
  });
}

export async function getUnreadCount(apiKey) {
  return instantlyFetch(apiKey, '/api/v2/emails/unread/count', { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks (Hypergrowth+ plan)
// ─────────────────────────────────────────────────────────────────────────────

export async function listWebhookEventTypes(apiKey) {
  return instantlyFetch(apiKey, '/api/v2/webhooks/event-types', { method: 'GET' });
}

export async function createWebhook(apiKey, { url, eventType = 'all_events', campaignId = null, name, headers }) {
  return instantlyFetch(apiKey, '/api/v2/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      target_hook_url: url,
      event_type: eventType,
      campaign: campaignId,
      name: name || 'PolishPoint reply routing',
      headers: headers || {},
    }),
  });
}

export async function listWebhooks(apiKey) {
  return instantlyFetch(apiKey, '/api/v2/webhooks', { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stub mode helpers (kept for dev demos when no API key configured)
// ─────────────────────────────────────────────────────────────────────────────

// Returns true if no Instantly API key has been configured yet — callers use
// this to decide whether to dispatch local actions only (stub mode) or call
// the real API + dispatch local mirror actions.
export function outreachIsStub(apiKey) {
  return !apiKey;
}

// Stub: simulated outbound send (used by the legacy OutreachDispatcher when
// running without an API key). Production flow doesn't call this — Instantly
// is the sender once a campaign is activated server-side.
export async function sendOutreachEmail(payload) {
  await delay(200 + Math.random() * 600);
  if (Math.random() < STUB_FAILURE_RATE) {
    const reasons = ['SMTP timeout', 'Rate limited by provider', 'Invalid recipient address', 'DNS failure'];
    throw new Error(reasons[Math.floor(Math.random() * reasons.length)]);
  }
  return { id: randomMessageId() };
}

// Stub: pretend a mailbox connect succeeded (used when no API key). Production
// flow uses initOAuth + pollOAuthSession instead.
export async function connectMailbox(provider) {
  await delay(800);
  return {
    provider,
    address: provider === 'google' ? 'demo.user@gmail.com' : 'demo.user@outlook.com',
  };
}

// Stub: echo a synthetic inbound reply payload back to the caller.
export function simulateInboundReply(payload) {
  return { ...payload, receivedAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token interpolation (used in stub mode + for previewing rendered copy in UI)
// ─────────────────────────────────────────────────────────────────────────────

export function interpolateTokens(template, ctx) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (ctx[key] === undefined || ctx[key] === null || ctx[key] === '') return match;
    return ctx[key];
  });
}
