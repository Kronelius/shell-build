// ─────────────────────────────────────────────────────────────────────────────
// Reply classifier — categorizes inbound outreach replies.
//
// In production this calls Claude (or any LLM); in the dev stub it's a
// rule-based classifier keyed on common phrasing patterns. The output shape
// is identical so the dispatcher + UI don't care which is running:
//
//   classify(body, opts?) → {
//     classification: 'interested' | 'not_interested' | 'question'
//                   | 'out_of_office' | 'unsubscribe' | 'other',
//     confidence: 0–1,
//     reasoning: 'one-sentence explanation',
//   }
//
// Production swap path:
//   if (import.meta.env.VITE_CLAUDE_PROXY_URL) {
//     const r = await fetch(`${url}/classify`, { body: { reply: body }, ... });
//     return r.json();
//   }
//
// The dispatcher (components/OutreachDispatcher.jsx) is the only consumer.
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS = [
  // ----- UNSUBSCRIBE (highest priority — never override with anything else) -----
  {
    classification: 'unsubscribe',
    confidence: 0.97,
    keywords: [
      /unsubscribe/i,
      /\bremove me\b/i,
      /\btake me off\b/i,
      /\bopt[- ]?out\b/i,
      /stop (emailing|contacting)/i,
      /do not (email|contact|message)/i,
    ],
    reasoning: 'Explicit unsubscribe / removal request.',
  },
  // ----- OUT OF OFFICE -----
  {
    classification: 'out_of_office',
    confidence: 0.92,
    keywords: [
      /out of (the )?office/i,
      /\bOOO\b/,
      /on (vacation|holiday|leave|pto)/i,
      /will (be back|return)/i,
      /currently (away|out)/i,
      /auto[- ]?reply/i,
      /limited (access to )?email/i,
    ],
    reasoning: 'Auto-reply pattern detected.',
  },
  // ----- NOT INTERESTED -----
  {
    classification: 'not_interested',
    confidence: 0.91,
    keywords: [
      /not interested/i,
      /no(t)? (a )?(good )?fit/i,
      /already have (a |an )?(vendor|provider|solution)/i,
      /pass( on this)?/i,
      /\bno thanks?\b/i,
      /please don'?t/i,
    ],
    reasoning: 'Explicit decline or "already have a vendor".',
  },
  // ----- INTERESTED -----
  {
    classification: 'interested',
    confidence: 0.93,
    keywords: [
      /(yes|yeah|sure|absolutely|definitely)[\s,!.]/i,
      /interested/i,
      /tell me more/i,
      /(when|how) can we (talk|chat|meet|connect)/i,
      /book (a |some )?time/i,
      /let'?s (talk|chat|meet|connect)/i,
      /send (me )?(more|the|a) (info|deck|details|proposal)/i,
      /(would|i'?d|would be) (love|interested)/i,
    ],
    reasoning: 'Explicit affirmative or scheduling intent.',
  },
  // ----- QUESTION (high intent — don't auto-reply, route to human) -----
  {
    classification: 'question',
    confidence: 0.85,
    keywords: [
      /\?/,
      /(how much|what'?s the cost|pricing|price|quote|cost|rate)/i,
      /can you (send|share|tell|explain)/i,
      /(how|what|when|where|why|do you) /i,
    ],
    reasoning: 'Question or pricing inquiry — qualifying, not commitment.',
  },
];

export function classifyReply(body, _opts = {}) {
  if (!body || typeof body !== 'string') {
    return { classification: 'other', confidence: 0, reasoning: 'Empty body.' };
  }

  // Walk in priority order; first match wins.
  for (const p of PATTERNS) {
    let matchedPattern = null;
    for (const re of p.keywords) {
      if (re.test(body)) {
        matchedPattern = re;
        break;
      }
    }
    if (matchedPattern) {
      return {
        classification: p.classification,
        confidence: p.confidence,
        reasoning: p.reasoning,
        matchedPattern: matchedPattern.toString(),
      };
    }
  }

  return {
    classification: 'other',
    confidence: 0.4,
    reasoning: 'No clear signal — surfacing for human triage.',
  };
}

// Display metadata — kept here so the badge component and the dispatcher share
// the same source of truth (label + color + emoji + auto-action description).
export const CLASSIFICATION_META = {
  interested:     { label: 'Interested',     color: 'green',  description: 'High-intent positive reply' },
  not_interested: { label: 'Not interested', color: 'slate',  description: 'Explicit decline' },
  question:       { label: 'Question',       color: 'amber',  description: 'Qualifying ask — needs human' },
  out_of_office:  { label: 'Out of office',  color: 'blue',   description: 'Auto-reply — defer next step' },
  unsubscribe:    { label: 'Unsubscribe',    color: 'red',    description: 'Suppress + archive' },
  other:          { label: 'Other',          color: 'slate',  description: 'Unclear — needs human triage' },
};
