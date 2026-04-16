import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import Avatar from './Avatar';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectClients, selectSitesForClient, selectServices, selectActiveUsers, selectServiceById } from '../store/selectors';
import { useToast } from './Toast';
import { composeIso, splitIso, todayIso } from '../lib/dates';

function buildEmpty(state, preset = {}) {
  return {
    clientId: preset.clientId || '',
    siteId: preset.siteId || '',
    serviceId: preset.serviceId || state.services[0]?.id || '',
    date: preset.date || todayIso(),
    startTime: preset.startTime || '09:00',
    endTime: preset.endTime || '10:30',
    crewIds: preset.crewIds || [],
    notes: preset.notes || '',
  };
}

export default function NewJobModal({ open, onClose, mode = 'create', initialData = null, presetClientId = null, presetSiteId = null }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const clients = selectClients(state);
  const services = selectServices(state);
  const crewPool = selectActiveUsers(state);

  const [form, setForm] = useState(() => buildEmpty(state, { clientId: presetClientId, siteId: presetSiteId }));

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialData) {
      const s = splitIso(initialData.startAt);
      const e = splitIso(initialData.endAt);
      setForm({
        clientId: initialData.clientId,
        siteId: initialData.siteId || '',
        serviceId: initialData.serviceId,
        date: s.date,
        startTime: s.time,
        endTime: e.time,
        crewIds: initialData.crewIds || [],
        notes: initialData.notes || '',
      });
    } else {
      setForm(buildEmpty(state, { clientId: presetClientId, siteId: presetSiteId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData, mode]);

  const clientSites = form.clientId ? selectSitesForClient(state, form.clientId) : [];
  const service = selectServiceById(state, form.serviceId);

  // Auto-extend endTime when service picked and no explicit end provided
  const applyServiceDuration = (serviceId) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc || !form.startTime) return form.endTime;
    const [h, m] = form.startTime.split(':').map(Number);
    const total = h * 60 + m + (svc.defaultDurationMins || 60);
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.clientId || !form.serviceId || !form.date || !form.startTime || !form.endTime) return;
    const startAt = composeIso(form.date, form.startTime);
    const endAt = composeIso(form.date, form.endTime);
    const payload = {
      clientId: form.clientId,
      siteId: form.siteId || null,
      serviceId: form.serviceId,
      crewIds: form.crewIds,
      startAt, endAt,
      notes: form.notes,
    };
    if (mode === 'edit' && initialData) {
      dispatch({ type: ACTIONS.UPDATE_JOB, id: initialData.id, patch: payload });
      toast.success('Job updated');
    } else {
      dispatch({ type: ACTIONS.ADD_JOB, job: payload });
      toast.success('Job created');
    }
    onClose();
  };

  const toggleCrew = (userId) => {
    const on = form.crewIds.includes(userId);
    setForm({ ...form, crewIds: on ? form.crewIds.filter((x) => x !== userId) : [...form.crewIds, userId] });
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit Job' : 'New Job'}>
      <form onSubmit={submit}>
        <FormField
          label="Client" as="select" required value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value, siteId: '' })}
          options={[{ value: '', label: 'Select a client' }, ...clients.filter((c) => c.status === 'active' || (initialData && c.id === initialData.clientId)).map((c) => ({ value: c.id, label: c.name }))]}
        />
        {clientSites.length > 0 && (
          <FormField
            label="Site" as="select" value={form.siteId}
            onChange={(e) => setForm({ ...form, siteId: e.target.value })}
            options={[{ value: '', label: '— No specific site —' }, ...clientSites.map((s) => ({ value: s.id, label: s.name }))]}
            help={clientSites.length > 1 ? 'This client has multiple sites. Pick which one.' : undefined}
          />
        )}
        <FormField
          label="Service" as="select" required value={form.serviceId}
          onChange={(e) => setForm({ ...form, serviceId: e.target.value, endTime: applyServiceDuration(e.target.value) })}
          options={[{ value: '', label: 'Select a service' }, ...services.map((s) => ({ value: s.id, label: s.name }))]}
          help={service ? `Default duration: ${service.defaultDurationMins} min` : undefined}
        />
        <div className="form-row">
          <FormField label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <FormField label="Start" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <FormField label="End" type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </div>
        <FormField label="Crew">
          <div className="chip-picker">
            {crewPool.map((u) => {
              const on = form.crewIds.includes(u.id);
              return (
                <button key={u.id} type="button" className={`chip ${on ? 'on' : ''}`} onClick={() => toggleCrew(u.id)}>
                  <Avatar initials={u.initials} variant={u.avatar} size="sm" />
                  <span>{u.name}</span>
                </button>
              );
            })}
          </div>
        </FormField>
        <FormField label="Notes" as="textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save Changes' : 'Create Job'}</button>
        </div>
      </form>
    </Modal>
  );
}
