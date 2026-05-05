// Settings → Integrations
//
// Currently surfaces Twilio (Core SMS). Future add-ons (QuickBooks, Gusto, Stripe Connect)
// will register additional cards here.
//
// Twilio cards:
//   1. Connection — status, phone number, account SID last 4, Connect/Disconnect.
//   2. A2P 10DLC — registration status, submit/edit form, super-admin status override.
//   3. Webhook — inbound SMS webhook URL (read-only; copy-to-clipboard).
//   4. Test SMS — send a test outbound (gated by full readiness).
//   5. Simulate inbound — exercises the inbound routing path locally (dev only — hidden when backend is wired).
//
// Permissions: integrations.view (admin+) sees the page. integrations.manage (super admin)
// is required to connect, disconnect, submit A2P, or override A2P status.

import { useMemo, useState } from 'react';
import { useDispatch, useStore } from '../../store';
import { ACTIONS } from '../../store/reducer';
import {
  selectTwilioIntegration,
  selectIsTwilioSendReady,
  selectTwilioBlockers,
} from '../../store/selectors';
import { useToast } from '../../components/Toast';
import { usePermission } from '../../hooks/usePermission';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import FormField from '../../components/FormField';
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectTwilioModal from '../../components/ConnectTwilioModal';
import A2PRegistrationModal from '../../components/A2PRegistrationModal';
import {
  disconnectTwilio,
  sendSMS,
  subscribeToDelivery,
  simulateInbound,
  TWILIO_BACKEND_URL,
} from '../../lib/twilio';

const A2P_BADGE = {
  not_started: { variant: 'slate',  label: 'Not started' },
  pending:     { variant: 'amber',  label: 'Pending review' },
  approved:    { variant: 'green',  label: 'Approved' },
  rejected:    { variant: 'red',    label: 'Rejected' },
  suspended:   { variant: 'red',    label: 'Suspended' },
};

const USE_CASE_LABEL = {
  customer_care: 'Customer Care',
  marketing: 'Marketing',
  mixed: 'Mixed (Care + Marketing)',
  account_notification: 'Account Notifications',
  delivery_notification: 'Delivery Notifications',
};

export default function SettingsIntegrations() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();

  const canManage = usePermission('integrations.manage');
  const twilio = selectTwilioIntegration(state);
  const sendReady = selectIsTwilioSendReady(state);
  const blockers = selectTwilioBlockers(state);

  const [connectOpen, setConnectOpen] = useState(false);
  const [a2pOpen, setA2pOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Test SMS local UI state.
  const [testTo, setTestTo] = useState('');
  const [testBody, setTestBody] = useState('Hi from the SMS test — replying confirms delivery.');
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState(null); // { sid, status, failureReason? }

  // Simulate inbound local UI state.
  const [simFrom, setSimFrom] = useState('');
  const [simBody, setSimBody] = useState('Hey — thanks for the reminder, see you tomorrow.');

  const a2pBadge = A2P_BADGE[twilio?.a2p?.status || 'not_started'];

  const handleDisconnect = async () => {
    setConfirmDisconnect(false);
    try {
      await disconnectTwilio();
      dispatch({ type: ACTIONS.DISCONNECT_TWILIO });
    } catch (err) {
      toast.error(err.message || 'Disconnect failed.');
    }
  };

  const handleA2POverride = (nextStatus) => {
    if (nextStatus === 'rejected') {
      const reason = window.prompt('Rejection reason (carrier message)?', '');
      if (reason === null) return;
      dispatch({ type: ACTIONS.UPDATE_A2P_STATUS, status: 'rejected', rejectionReason: reason });
      return;
    }
    dispatch({ type: ACTIONS.UPDATE_A2P_STATUS, status: nextStatus });
  };

  const handleA2PReset = () => {
    if (!window.confirm('Reset A2P registration? The captured form data will be cleared.')) return;
    dispatch({ type: ACTIONS.RESET_A2P });
  };

  const copyWebhook = async () => {
    if (!twilio?.inboundWebhookUrl) return;
    try {
      await navigator.clipboard.writeText(twilio.inboundWebhookUrl);
    } catch {
      toast.error('Could not copy. Select the URL and copy manually.');
    }
  };

  const sendTest = async (e) => {
    e.preventDefault();
    if (!sendReady) return;
    setTestBusy(true);
    setTestResult({ status: 'sending' });

    // Push the message into the conversation thread for the test recipient (if linked),
    // OR just track the send + delivery status without persisting. The test card creates
    // a synthesized "test" record that doesn't pollute the inbox unless a thread already
    // exists for that number. To keep it observable and simple, we just track in-modal
    // status here without dispatching ADD_MESSAGE — production sends from Messaging itself.
    try {
      const result = await sendSMS({
        from: twilio.phoneNumber,
        to: testTo,
        body: testBody,
      });
      setTestResult({ sid: result.sid, status: result.status });
      const unsubscribe = subscribeToDelivery(result.sid, (update) => {
        setTestResult((prev) => ({ ...(prev || {}), ...update }));
        if (update.status === 'delivered' || update.status === 'failed') {
          unsubscribe();
        }
      });
    } catch (err) {
      setTestResult({ status: 'failed', failureReason: err.message || 'Unknown error' });
      dispatch({ type: ACTIONS.UPDATE_TWILIO_ERROR, error: err.message || null });
    } finally {
      setTestBusy(false);
    }
  };

  const handleSimulateInbound = (e) => {
    e.preventDefault();
    if (!simFrom.trim()) return;
    const payload = simulateInbound({
      fromPhone: simFrom.trim(),
      toPhone: twilio?.phoneNumber || '',
      body: simBody.trim(),
    });
    dispatch({
      type: ACTIONS.RECEIVE_SMS,
      fromPhone: payload.fromPhone,
      toPhone: payload.toPhone,
      body: payload.body,
      messageSid: payload.messageSid,
    });
    setSimBody('');
  };

  const testStatusBadge = useMemo(() => {
    if (!testResult) return null;
    const map = {
      sending:   { variant: 'slate', label: 'Sending…' },
      queued:    { variant: 'slate', label: 'Queued' },
      sent:      { variant: 'blue',  label: 'Sent' },
      delivered: { variant: 'green', label: 'Delivered' },
      failed:    { variant: 'red',   label: 'Failed' },
    };
    return map[testResult.status] || { variant: 'slate', label: testResult.status };
  }, [testResult]);

  return (
    <div>
      <div className="page-head-text">
        <h1 className="page-head-title">Integrations</h1>
        <p className="page-head-subtitle">
          Connect external services. Twilio powers SMS in Messaging and Reminders.
          {!TWILIO_BACKEND_URL && (
            <> <strong>Dev mode:</strong> network calls are simulated locally.</>
          )}
        </p>
      </div>

      {/* ───────── Twilio Connection ───────── */}
      <div className="card detail-card" style={{ marginBottom: 16 }}>
        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="dash-card-title">
              <Icon name="phone" size={16} /> Twilio
              {twilio?.connected
                ? <Badge variant="green" style={{ marginLeft: 8 }}>Connected</Badge>
                : <Badge variant="slate" style={{ marginLeft: 8 }}>Not connected</Badge>}
            </h3>
            {twilio?.connected ? (
              <div className="text-sm text-muted">
                Account ending in <code>•••• {twilio.accountSidLast4}</code>
                {twilio.phoneNumber && <> · Number <strong>{twilio.phoneNumberFriendlyName || twilio.phoneNumber}</strong></>}
                {twilio.connectedAt && <> · Connected {new Date(twilio.connectedAt).toLocaleDateString()}</>}
              </div>
            ) : (
              <div className="text-sm text-muted">
                Connect a Twilio account to enable SMS for this deployment.
              </div>
            )}
            {twilio?.lastError && (
              <div className="form-error" style={{ marginTop: 6 }}>
                Last error: {twilio.lastError}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!twilio?.connected && canManage && (
              <button className="btn btn-primary" onClick={() => setConnectOpen(true)}>Connect</button>
            )}
            {twilio?.connected && canManage && (
              <button className="btn btn-outline" onClick={() => setConfirmDisconnect(true)}>Disconnect</button>
            )}
          </div>
        </div>
      </div>

      {/* ───────── A2P 10DLC ───────── */}
      {twilio?.connected && (
        <div className="card detail-card" style={{ marginBottom: 16 }}>
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h3 className="dash-card-title">
                <Icon name="lock" size={16} /> A2P 10DLC Registration
                <Badge variant={a2pBadge.variant} style={{ marginLeft: 8 }}>{a2pBadge.label}</Badge>
              </h3>
              <div className="text-sm text-muted">
                Required by US carriers for application-to-person SMS. We file on your behalf;
                review takes 2–7 business days.
              </div>

              {twilio.a2p?.status !== 'not_started' && (
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '160px 1fr', gap: '4px 12px', fontSize: 13 }}>
                  {twilio.a2p?.brandName && (<><span className="text-muted">Brand</span><span>{twilio.a2p.brandName}</span></>)}
                  {twilio.a2p?.useCase && (<><span className="text-muted">Use case</span><span>{USE_CASE_LABEL[twilio.a2p.useCase] || twilio.a2p.useCase}</span></>)}
                  {twilio.a2p?.submittedAt && (<><span className="text-muted">Submitted</span><span>{new Date(twilio.a2p.submittedAt).toLocaleString()}</span></>)}
                  {twilio.a2p?.approvedAt && (<><span className="text-muted">Approved</span><span>{new Date(twilio.a2p.approvedAt).toLocaleString()}</span></>)}
                  {twilio.a2p?.rejectionReason && (<><span className="text-muted">Rejection</span><span style={{ color: 'var(--color-text-error, #b91c1c)' }}>{twilio.a2p.rejectionReason}</span></>)}
                  {twilio.a2p?.sampleMessages?.length > 0 && (
                    <>
                      <span className="text-muted">Samples</span>
                      <ol style={{ margin: 0, paddingLeft: 18 }}>
                        {twilio.a2p.sampleMessages.map((m, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{m}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
              {canManage && twilio.a2p?.status === 'not_started' && (
                <button className="btn btn-primary" onClick={() => setA2pOpen(true)}>Start Registration</button>
              )}
              {canManage && twilio.a2p?.status === 'rejected' && (
                <button className="btn btn-primary" onClick={() => setA2pOpen(true)}>Edit & Resubmit</button>
              )}
              {canManage && twilio.a2p?.status === 'pending' && (
                <>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Super-admin override:</div>
                  <button className="btn btn-outline btn-sm" onClick={() => handleA2POverride('approved')}>Mark approved</button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleA2POverride('rejected')}>Mark rejected</button>
                </>
              )}
              {canManage && (twilio.a2p?.status === 'approved' || twilio.a2p?.status === 'suspended') && (
                <button className="btn btn-outline btn-sm" onClick={handleA2PReset}>Reset</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────── Webhook URL ───────── */}
      {twilio?.connected && twilio?.inboundWebhookUrl && (
        <div className="card detail-card" style={{ marginBottom: 16 }}>
          <h3 className="dash-card-title"><Icon name="bell" size={16} /> Inbound Webhook</h3>
          <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
            Configure this URL on your Twilio phone number's "Messaging" settings so inbound texts route to this app.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-muted, #f4f4f5)', borderRadius: 6, fontSize: 13, wordBreak: 'break-all' }}>
              {twilio.inboundWebhookUrl}
            </code>
            <button type="button" className="btn btn-outline btn-sm" onClick={copyWebhook}>Copy</button>
          </div>
        </div>
      )}

      {/* ───────── Send-readiness blockers ───────── */}
      {twilio?.connected && !sendReady && blockers.length > 0 && (
        <div className="card detail-card" style={{ marginBottom: 16, borderLeft: '3px solid var(--color-amber-500, #f59e0b)' }}>
          <h3 className="dash-card-title">SMS sending is blocked</h3>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 14 }}>
            {blockers.map((b) => (<li key={b.key}>{b.label}</li>))}
          </ul>
        </div>
      )}

      {/* ───────── Test SMS ───────── */}
      {twilio?.connected && (
        <div className="card detail-card" style={{ marginBottom: 16 }}>
          <h3 className="dash-card-title"><Icon name="mail" size={16} /> Send a Test SMS</h3>
          <div className="text-sm text-muted" style={{ marginBottom: 10 }}>
            {sendReady
              ? 'Verify outbound delivery without leaving Settings.'
              : 'Resolve the blockers above before sending.'}
          </div>
          <form onSubmit={sendTest}>
            <div className="form-row">
              <FormField
                label="To"
                placeholder="+12065550100"
                required
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                disabled={!sendReady || testBusy}
              />
              <FormField
                label="From"
                value={twilio.phoneNumberFriendlyName || twilio.phoneNumber || ''}
                disabled
                help="Set in the Twilio connection card above."
              />
            </div>
            <FormField
              label="Body"
              as="textarea"
              rows={2}
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              disabled={!sendReady || testBusy}
            />
            <div className="modal-actions" style={{ marginTop: 4 }}>
              <div style={{ flex: 1 }}>
                {testStatusBadge && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={testStatusBadge.variant}>{testStatusBadge.label}</Badge>
                    {testResult?.sid && <code className="text-xs text-muted">{testResult.sid}</code>}
                    {testResult?.failureReason && (
                      <span className="text-xs" style={{ color: 'var(--color-text-error, #b91c1c)' }}>
                        {testResult.failureReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={!sendReady || testBusy}>
                {testBusy ? 'Sending…' : 'Send Test'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────── Simulate inbound (dev only) ───────── */}
      {twilio?.connected && !TWILIO_BACKEND_URL && (
        <div className="card detail-card" style={{ marginBottom: 16, borderLeft: '3px solid var(--color-blue-500, #3b82f6)' }}>
          <h3 className="dash-card-title"><Icon name="messaging" size={16} /> Simulate Inbound SMS <span className="text-xs text-muted">(dev only)</span></h3>
          <div className="text-sm text-muted" style={{ marginBottom: 10 }}>
            Routes a fake inbound text into Messaging. Matches contacts by phone number; unmatched numbers create a new unlinked thread.
          </div>
          <form onSubmit={handleSimulateInbound}>
            <div className="form-row">
              <FormField
                label="From"
                placeholder="+12065550199"
                required
                value={simFrom}
                onChange={(e) => setSimFrom(e.target.value)}
              />
              <FormField
                label="To (your number)"
                value={twilio.phoneNumber || ''}
                disabled
              />
            </div>
            <FormField
              label="Body"
              as="textarea"
              rows={2}
              value={simBody}
              onChange={(e) => setSimBody(e.target.value)}
            />
            <div className="modal-actions" style={{ marginTop: 4 }}>
              <button type="submit" className="btn btn-outline">Route Inbound</button>
            </div>
          </form>
        </div>
      )}

      <ConnectTwilioModal open={connectOpen} onClose={() => setConnectOpen(false)} />
      <A2PRegistrationModal open={a2pOpen} onClose={() => setA2pOpen(false)} />
      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect Twilio?"
        message="This deployment will stop sending and receiving SMS until reconnected. Existing message history is preserved."
        confirmLabel="Disconnect"
        variant="danger"
        onConfirm={handleDisconnect}
        onClose={() => setConfirmDisconnect(false)}
      />
    </div>
  );
}
