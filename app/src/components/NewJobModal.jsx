import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import Avatar from './Avatar';
import Icon from './Icon';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectClients, selectSitesForClient, selectServices, selectActiveUsers, selectServiceById, selectCrewConflicts, selectClientById } from '../store/selectors';
import { useToast } from './Toast';
import { composeIso, splitIso, todayIso, fmtTimeRange } from '../lib/dates';
import { RECURRENCE_DEFAULTS, previewEndDate } from '../lib/recurrence';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildEmpty(state, preset = {}) {
  return {
    clientId: preset.clientId || '',
    siteId: preset.siteId || '',
    serviceId: preset.serviceId || state.services[0]?.id || '',
    date: preset.date || todayIso().slice(0, 10),
    startTime: preset.startTime || '09:00',
    endTime: preset.endTime || '10:30',
    crewIds: preset.crewIds || [],
    notes: preset.notes || '',
    repeat: 'none',
    daysOfWeek: [],
    endType: 'count',
    endCount: 12,
    endDate: '',
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
        repeat: 'none',
        daysOfWeek: [],
        endType: 'count',
        endCount: 12,
        endDate: '',
      });
    } else {
      setForm(buildEmpty(state, { clientId: presetClientId, siteId: presetSiteId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData, mode]);

  const clientSites = form.clientId ? selectSitesForClient(state, form.clientId) : [];
  const service = selectServiceById(state, form.serviceId);

  const applyServiceDuration = (serviceId) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc || !form.startTime) return form.endTime;
    const [h, m] = form.startTime.split(':').map(Number);
    const total = h * 60 + m + (svc.defaultDurationMins || 60);
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Auto-set daysOfWeek when date changes and repeat is weekly
  useEffect(() => {
    if (form.repeat === 'weekly' && form.date && form.daysOfWeek.length === 0) {
      const dow = new Date(form.date + 'T12:00').getDay();
      setForm((f) => ({ ...f, daysOfWeek: [dow] }));
    }
  }, [form.date, form.repeat, form.daysOfWeek.length]);

  // Auto-set default endCount when frequency changes
  useEffect(() => {
    if (form.repeat !== 'none' && form.endType === 'count') {
      const defaults = RECURRENCE_DEFAULTS[form.repeat];
      if (defaults) setForm((f) => ({ ...f, endCount: defaults.endCount }));
    }
  }, [form.repeat, form.endType]);

  const startAt = form.date && form.startTime ? composeIso(form.date, form.startTime) : null;
  const endAt = form.date && form.endTime ? composeIso(form.date, form.endTime) : null;

  const conflicts = useMemo(() => {
    if (!startAt || !endAt || !form.crewIds.length) return [];
    return selectCrewConflicts(state, form.crewIds, startAt, endAt, initialData?.id || null);
  }, [state, form.crewIds, startAt, endAt, initialData?.id]);

  const recurrence = useMemo(() => {
    if (form.repeat === 'none') return null;
    return {
      frequency: form.repeat,
      daysOfWeek: form.repeat === 'weekly' && form.daysOfWeek.length ? form.daysOfWeek : null,
      endType: form.endType,
      endCount: form.endType === 'count' ? (Number(form.endCount) || 12) : null,
      endDate: form.endType === 'date' ? composeIso(form.endDate, '23:59') : null,
    };
  }, [form.repeat, form.daysOfWeek, form.endType, form.endCount, form.endDate]);

  const preview = useMemo(() => {
    if (!recurrence || !startAt) return null;
    return previewEndDate({ startAt, recurrence });
  }, [recurrence, startAt]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.clientId || !form.serviceId || !form.date || !form.startTime || !form.endTime) return;
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
    } else if (recurrence) {
      dispatch({ type: ACTIONS.ADD_JOB_SERIES, baseJob: payload, recurrence });
      toast.success(`Created ${preview ? preview.count : ''} recurring jobs`);
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

  const toggleDow = (dow) => {
    const on = form.daysOfWeek.includes(dow);
    setForm({ ...form, daysOfWeek: on ? form.daysOfWeek.filter((d) => d !== dow) : [...form.daysOfWeek, dow].sort() });
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit Job' : 'New Job'}>
      <form onSubmit={submit}>
        <FormField
          label="Account" as="select" required value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value, siteId: '' })}
          options={[{ value: '', label: 'Select an account' }, ...clients.filter((c) => c.status === 'active' || (initialData && c.id === initialData.clientId)).map((c) => ({ value: c.id, label: c.name }))]}
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

        {mode !== 'edit' && (
          <div className="recurrence-section">
            <FormField label="Repeat" as="select" value={form.repeat}
              onChange={(e) => setForm({ ...form, repeat: e.target.value, daysOfWeek: [] })}
              options={[
                { value: 'none', label: 'Does not repeat' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Every 2 weeks' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
            {form.repeat === 'weekly' && (
              <div className="day-picker">
                {DAY_LABELS.map((label, i) => (
                  <button key={i} type="button" className={`chip ${form.daysOfWeek.includes(i) ? 'on' : ''}`}
                    onClick={() => toggleDow(i)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {form.repeat !== 'none' && (
              <>
                <div className="form-row" style={{ alignItems: 'flex-end' }}>
                  <FormField label="Ends" as="select" value={form.endType}
                    onChange={(e) => setForm({ ...form, endType: e.target.value })}
                    options={[
                      { value: 'count', label: 'After N occurrences' },
                      { value: 'date', label: 'On a specific date' },
                      { value: 'never', label: 'Never (auto-capped)' },
                    ]}
                  />
                  {form.endType === 'count' && (
                    <FormField label="Times" type="number" min={1} max={52} value={form.endCount}
                      onChange={(e) => setForm({ ...form, endCount: e.target.value })} />
                  )}
                  {form.endType === 'date' && (
                    <FormField label="Until" type="date" value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  )}
                </div>
                {preview && (
                  <div className="text-xs text-muted" style={{ marginTop: 4, marginBottom: 8 }}>
                    <Icon name="repeat" size={12} /> Will create {preview.count} jobs through{' '}
                    {new Date(preview.lastDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <FormField label="Crew" help="Click a crew member to assign or unassign them from this job. Highlighted chips are assigned.">
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

        {conflicts.length > 0 && (
          <div className="conflict-warning">
            <Icon name="warning" size={14} />
            <div>
              <strong>Scheduling conflict{conflicts.length > 1 ? 's' : ''}</strong>
              {conflicts.map((c, i) => {
                const cl = selectClientById(state, c.job.clientId);
                return (
                  <div key={i} className="text-xs">
                    {c.userName} is assigned to {cl?.name || 'another job'} {fmtTimeRange(c.job.startAt, c.job.endAt)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <FormField label="Notes" as="textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save Changes' : recurrence ? `Create ${preview?.count || ''} Jobs` : 'Create Job'}</button>
        </div>
      </form>
    </Modal>
  );
}
