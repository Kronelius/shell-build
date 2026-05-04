// ─────────────────────────────────────────────────────────────────────────────
// Decision-maker enricher — finds a buyer for a prospect business.
//
// Anchored on the user's businessProfile.targetRoles (priority-ordered): we
// look for the role THAT BUYS FROM THE USER, not whatever role happens to
// exist at the prospect. A signage company looking for Facilities Managers
// gets Facilities Managers, even when scraping retail or healthcare orgs.
//
// Mirrors LeadStart's two-layer pattern:
//   Layer 1 ("website")   = Claude reads the business website + about/team
//                           pages, scoring people against targetRoles in order.
//   Layer 2 ("web_search")= Perplexity Sonar (or Claude with web_search tool)
//                           when Layer 1 returns nothing useful.
//
// In stub mode (no VITE_*_BACKEND_URL set), we simulate both layers locally
// with realistic timings. The output shape is identical to production so
// callers don't care which is running.
//
// Output shape:
//   { firstName, lastName, title, email, source: 'website'|'web_search',
//     confidence: 0–1, candidateCount, matchedRole }
// or null if nothing found.
// ─────────────────────────────────────────────────────────────────────────────

import { pickFirstName, pickLastName } from './scrapio';

// Fallback when no profile is configured — used so the simulation still works,
// but the UI should always pass a profile so this never fires in practice.
const DEFAULT_TARGET_ROLES = ['Owner', 'Operations Director', 'General Manager'];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION PROMPT — what Claude actually sees when an Anthropic key is
// configured + the enricher hits api.anthropic.com directly.
//
// This function is the single source of truth for the prompt. The Step 3 UI
// in the Outreach tab calls it to render a live preview so the user can see
// exactly what runs against their businesses with their key.
//
// The prompt assumes Claude has the web_search tool enabled (or is given the
// website HTML in a follow-up turn). Output is strict JSON so the dispatcher
// can parse it without LLM-mistake handling. Model: claude-haiku-4-5 by
// default — single-shot website reads don't need Sonnet/Opus capability.
// ─────────────────────────────────────────────────────────────────────────────
export function buildEnrichmentPrompt({
  businessName, category, website, targetRoles, excludedTitles,
}) {
  const roles = Array.isArray(targetRoles) && targetRoles.length > 0
    ? targetRoles
    : DEFAULT_TARGET_ROLES;
  const excluded = Array.isArray(excludedTitles) ? excludedTitles : [];
  const rolesBlock = roles.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
  const excludedLine = excluded.length > 0 ? excluded.join(', ') : 'none';

  return `You are a B2B sales research assistant. Identify the best decision-maker contact at this business so a salesperson can reach out.

BUSINESS:
- Name: ${businessName || '(not provided)'}
- Category: ${category || '(not provided)'}
- Website: ${website || '(not provided)'}

TARGET ROLES (priority order — try to find #1 first, then #2, etc.):
${rolesBlock}

EXCLUDED TITLES (never return someone whose title contains any of these words):
  ${excludedLine}

INSTRUCTIONS:
1. Use the web_search tool to read the business's About, Team, Leadership, Contact, and Staff pages.
2. Find the person whose title most closely matches role #1 in the priority list. If nobody matches, try role #2, and so on.
3. Skip anyone whose title contains an excluded word.
4. Synthesize their work email if not stated outright (firstname@domain when in doubt — the most common B2B convention).
5. Score your confidence 0.0–1.0 based on how clearly the person and role were identified.

Return ONLY this JSON object — no prose, no markdown fences, no other text:

{
  "decisionMaker": {
    "firstName": "...",
    "lastName": "...",
    "title": "...",
    "email": "...",
    "confidence": 0.0
  },
  "matchedRole": "the role from the target list that they fit",
  "candidateCount": 0,
  "reasoning": "one sentence explaining why this person was chosen"
}

If no suitable contact can be found on the website, return:

{ "decisionMaker": null, "candidateCount": 0, "reasoning": "..." }
`;
}

const ANTHROPIC_BACKEND  = import.meta.env?.VITE_ANTHROPIC_BACKEND_URL || null;
const PERPLEXITY_BACKEND = import.meta.env?.VITE_PERPLEXITY_BACKEND_URL || null;

// Stub: ~15% of layer-1 attempts return nothing (so layer 2 demos), and ~5%
// of total attempts fail outright (so the failure path is exercised).
const STUB_LAYER1_MISS_RATE = 0.15;
const STUB_TOTAL_FAILURE_RATE = 0.05;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emailFromName(firstName, _lastName, websiteDomain) {
  // Most B2B contact emails are firstname@domain. Keep it simple.
  if (!websiteDomain) return null;
  // Strip any leading https:// or www.
  const domain = websiteDomain.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return `${firstName.toLowerCase()}@${domain}`;
}

// ----- Public API -----
//
// enrichDecisionMaker({ businessName, category, website, anthropicKey,
//                       perplexityKey, targetRoles, excludedTitles })
//   targetRoles  — priority-ordered array of roles the user wants to find.
//                  Layer 1 walks this list and returns the first match.
//                  Falls back to a sensible default if not provided.
//   excludedTitles — never return a contact whose title matches any of these
//                    (admin assistants, receptionists, etc.).
//   → resolves to { decisionMaker, layer, candidateCount, matchedRole } on success
//                  or { decisionMaker: null, layer, candidateCount: 0, failureReason } on miss
//   → throws on hard failure (network, key missing, etc.)
//
export async function enrichDecisionMaker({
  businessName, category, website, anthropicKey, perplexityKey,
  targetRoles, excludedTitles,
}) {
  // Hard-required: Anthropic key (Layer 1 is always Claude).
  if (!anthropicKey) {
    throw new Error('Anthropic API key required for decision-maker enrichment.');
  }

  const roles = (Array.isArray(targetRoles) && targetRoles.length > 0)
    ? targetRoles
    : DEFAULT_TARGET_ROLES;
  const excluded = Array.isArray(excludedTitles) ? excludedTitles.map((t) => t.toLowerCase()) : [];

  // ----- Layer 1: website scrape (Claude) -----
  if (ANTHROPIC_BACKEND) {
    const res = await fetch(`${ANTHROPIC_BACKEND}/enrich/website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, category, website, anthropicKey, targetRoles: roles, excludedTitles: excluded }),
    });
    if (!res.ok) throw new Error(`Layer 1 failed (${res.status})`);
    const layer1 = await res.json();
    if (layer1.decisionMaker) {
      return {
        decisionMaker: layer1.decisionMaker,
        layer: 'website',
        candidateCount: layer1.candidateCount || 1,
        matchedRole: layer1.matchedRole || layer1.decisionMaker.title,
      };
    }
    // Fall through to Layer 2 if Perplexity is configured.
    if (perplexityKey && PERPLEXITY_BACKEND) {
      const res2 = await fetch(`${PERPLEXITY_BACKEND}/enrich/web_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, category, perplexityKey, targetRoles: roles, excludedTitles: excluded }),
      });
      if (!res2.ok) throw new Error(`Layer 2 failed (${res2.status})`);
      const layer2 = await res2.json();
      return {
        decisionMaker: layer2.decisionMaker,
        layer: 'web_search',
        candidateCount: layer2.candidateCount || 0,
        matchedRole: layer2.matchedRole || layer2.decisionMaker?.title,
      };
    }
    return { decisionMaker: null, layer: 'website', candidateCount: 0, failureReason: `No ${roles[0] || 'decision maker'} found on website` };
  }

  // ----- Stub mode -----
  // Simulate "Reading website…" 1.2–2s, then "Checking web search…" if Layer 1 missed.
  await delay(1200 + Math.random() * 800);

  if (Math.random() < STUB_TOTAL_FAILURE_RATE) {
    throw new Error('Website unreachable (timeout)');
  }

  const layer1Hit = Math.random() > STUB_LAYER1_MISS_RATE;

  // Pick a role — bias toward role[0] (top priority), occasionally fall to
  // role[1]/[2] to feel realistic. This is what production looks like in
  // aggregate: highest-priority match wins ~60% of the time.
  const pickRole = () => {
    const r = Math.random();
    if (r < 0.6 && roles[0]) return { role: roles[0], priority: 1 };
    if (r < 0.85 && roles[1]) return { role: roles[1], priority: 2 };
    if (roles[2]) return { role: roles[2], priority: 3 };
    return { role: roles[0] || 'Owner', priority: 1 };
  };

  if (layer1Hit) {
    const { role, priority } = pickRole();
    // Stub guard: if the picked role hits an excluded keyword, swap in role[0].
    const finalRole = excluded.some((kw) => role.toLowerCase().includes(kw)) ? roles[0] : role;
    const firstName = pickFirstName();
    const lastName  = pickLastName();
    return {
      decisionMaker: {
        firstName, lastName,
        title: finalRole,
        email: emailFromName(firstName, lastName, website),
        source: 'website',
        confidence: priority === 1 ? 0.88 + Math.random() * 0.10
                  : priority === 2 ? 0.78 + Math.random() * 0.10
                  : 0.68 + Math.random() * 0.10,
      },
      layer: 'website',
      candidateCount: 2 + Math.floor(Math.random() * 4),
      matchedRole: finalRole,
    };
  }

  // Layer 1 missed — try Layer 2 if Perplexity is configured.
  if (!perplexityKey) {
    return { decisionMaker: null, layer: 'website', candidateCount: 0, failureReason: `No ${roles[0]} found on website. Configure Perplexity to fall back to web search.` };
  }

  await delay(1500 + Math.random() * 1000); // Perplexity is slower
  const { role } = pickRole();
  const firstName = pickFirstName();
  const lastName  = pickLastName();
  return {
    decisionMaker: {
      firstName, lastName,
      title: role,
      email: emailFromName(firstName, lastName, website),
      source: 'web_search',
      confidence: 0.62 + Math.random() * 0.2,
    },
    layer: 'web_search',
    candidateCount: 1 + Math.floor(Math.random() * 3),
    matchedRole: role,
  };
}

export function enricherIsStub() {
  return !ANTHROPIC_BACKEND;
}
