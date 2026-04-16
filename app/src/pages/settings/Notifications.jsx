import { useState } from 'react';
import { useDispatch, useStore } from '../../store';
import { ACTIONS } from '../../store/reducer';
import { selectReminderTemplates, selectClients } from '../../store/selectors';
import { useToast } from '../../components/Toast';
import FormField from '../../components/FormField';
import Toggle from '../../components/Toggle';

const TOKENS = ['{client_contact}', '{company}', '{service}', '{site_name}', '{date}', '{time}'];

const TEMPLATE_LABELS = {
  booking_confirmation: 'Booking Confirmation',
  reminder_24h: '24-Hour Reminder',
  day_of_eta: 'Day-Of ETA Notice',
  post_service: 'Post-Service Follow-Up',
};

function renderPreview(body, sample) {
  let out = body;
  Object.entries(sample).forEach(([k, v]) => {
    out = out.replaceAll(`{${k}}`, v);
  });
  return out;
}

export default function SettingsNotifications() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const templates = selectReminderTemplates(state);
  const clients = selectClients(state);
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const [draft, setDraft] = useState(null);

  const selected = templates.find((t) => t.id === selectedId);
  const current = draft && draft.id === selectedId ? draft : selected;

  if (!current) return null;

  const sample = {
    client_contact: clients[0]?.primaryContact || 'Client',
    company: state.company.name,
    service: state.services[0]?.name || 'Cleaning',
    site_name: state.sites[0]?.name || 'Main Site',
    date: 'Tomorrow',
    time: '9:00 AM',
  };

  const save = () => {
    dispatch({
      type: ACTIONS.UPDATE_REMINDER_TEMPLATE,
      id: current.id,
      patch: {
        channel: current.channel,
        subject: current.subject,
        body: current.body,
        enabled: current.enabled,
      },
    });
    setDraft(null);
    toast.success('Template saved');
  };

  const testSend = () => {
    dispatch({
      type: ACTIONS.ADD_REMINDER_EVENT,
      event: {
        templateKey: current.key,
        jobId: null,
        clientId: clients[0]?.id || null,
        channel: current.channel,
        status: 'sent',
      },
    });
    toast.success('Test sent (simulated)');
  };

  const insertToken = (token) => {
    setDraft({ ...current, body: (current.body || '') + ' ' + token });
  };

  return (
    <div>
      <div className="page-head-text">
        <h1 className="page-head-title">Reminder Templates</h1>
        <p className="page-head-subtitle">Edit the messages sent at each stage of the customer journey.</p>
      </div>

      <div className="template-editor">
        <aside className="template-list">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`template-list-item ${t.id === selectedId ? 'active' : ''}`}
              onClick={() => { setSelectedId(t.id); setDraft(null); }}
            >
              <div className="template-list-label">{TEMPLATE_LABELS[t.key] || t.key}</div>
              <div className="template-list-meta text-xs text-muted">{t.channel.toUpperCase()} · {t.enabled ? 'On' : 'Off'}</div>
            </button>
          ))}
        </aside>

        <div className="template-body">
          <div className="card detail-card">
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="dash-card-title">{TEMPLATE_LABELS[current.key] || current.key}</h3>
              <Toggle on={!!current.enabled} onChange={(v) => setDraft({ ...current, enabled: v })} />
            </div>
            <div className="form-row">
              <FormField label="Channel" as="select" value={current.channel} onChange={(e) => setDraft({ ...current, channel: e.target.value })}
                options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} />
              {current.channel === 'email' && (
                <FormField label="Subject" value={current.subject || ''} onChange={(e) => setDraft({ ...current, subject: e.target.value })} />
              )}
            </div>
            <FormField label="Message body" as="textarea" rows={5} value={current.body} onChange={(e) => setDraft({ ...current, body: e.target.value })} />
            <div className="form-group">
              <div className="text-xs text-muted" style={{ marginBottom: 6 }}>Insert variable:</div>
              <div className="token-row">
                {TOKENS.map((t) => (
                  <button key={t} type="button" className="chip" onClick={() => insertToken(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="template-preview">
              <div className="text-xs text-muted font-semi" style={{ marginBottom: 6 }}>Preview</div>
              {current.channel === 'email' && current.subject && (
                <div className="text-sm font-semi" style={{ marginBottom: 6 }}>{renderPreview(current.subject, sample)}</div>
              )}
              <div className="text-sm">{renderPreview(current.body || '', sample)}</div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={testSend}>Send Test</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!draft}>Save Template</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
