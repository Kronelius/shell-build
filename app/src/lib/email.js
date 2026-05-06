// ─────────────────────────────────────────────────────────────────────────────
// Email adapter — frontend interface for transactional email send.
//
// Mirrors the Twilio adapter (see ./twilio.js). When VITE_EMAIL_BACKEND_URL is
// set, calls hit the deployment backend (typically a Vercel API route wrapping
// Resend, SendGrid, or similar). When unset, calls are simulated locally with
// realistic timings + a small failure rate so the failure UI gets exercised.
//
// Used by the reminder scheduler to deliver email-channel reminders. Could
// later be reused for any transactional email (lifecycle, notifications, etc.).
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAIL_BACKEND_URL) || null;

const STUB_DELAY_MS = 600;
const STUB_FAILURE_RATE = 0.05;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a transactional email.
 * Backend: POST { to, from, subject, body } → { id, status }
 * Stub: validates shape, simulates timing, returns {id, status: 'sent'}
 *       (or throws ~5% of the time to exercise failure UI).
 */
export async function sendEmail({ to, from, subject, body, replyTo }) {
  if (!to) throw new Error('Recipient email is required.');
  if (!from) throw new Error('From email is required.');
  if (!subject) throw new Error('Subject is required.');
  if (!body || !body.trim()) throw new Error('Body is empty.');
  if (!/^.+@.+\..+$/.test(to)) throw new Error(`Invalid recipient: ${to}`);

  if (BACKEND) {
    const res = await fetch(`${BACKEND}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from, subject, body, replyTo }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Email send failed (${res.status})`);
    }
    return res.json();
  }

  // Stub path — simulate latency + occasional failure.
  await delay(STUB_DELAY_MS);
  if (Math.random() < STUB_FAILURE_RATE) {
    throw new Error('Recipient mailbox bounced (simulated)');
  }
  return {
    id: `em_${Math.random().toString(36).slice(2, 14)}`,
    status: 'sent',
  };
}

export { BACKEND as EMAIL_BACKEND_URL };

// Build an invitation email body. Caller composes the full sendEmail() args.
// The signup link uses window.location.origin so the email points back to
// whatever host the app is served from. The token round-trips back via
// /accept-invite?token=... once auth lands; until then, the link is informational.
export function buildInviteEmail({ inviteeName, inviterName, companyName, roleLabel, token, expiresAt }) {
  const origin = (typeof window !== 'undefined' && window.location?.origin) || '';
  const link = `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
  const expires = expiresAt ? new Date(expiresAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const greeting = inviteeName ? `Hi ${inviteeName.split(' ')[0]}` : 'Hi there';
  const subject = `You're invited to join ${companyName}`;
  const body =
`${greeting},

${inviterName} invited you to join ${companyName} as a ${roleLabel}.

Accept your invitation here:
${link}

${expires ? `This invitation expires on ${expires}.` : ''}

If you weren't expecting this email, you can safely ignore it.

— The ${companyName} team`;
  return { subject, body };
}
