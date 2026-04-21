import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import {
  selectJobById, selectClientById, selectSiteById, selectServiceById, selectUsers, selectContactById,
} from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import DetailHeader from '../components/DetailHeader';
import Badge, { statusBadgeVariant } from '../components/Badge';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import { fmtDateLong, fmtTimeRange, splitIso, composeIso } from '../lib/dates';

const STATUS_LABEL = { upcoming: 'Upcoming', in_progress: 'In Progress', done: 'Done', cancelled: 'Cancelled' };

export default function JobDetail() {
  const { jobId } = useParams();
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const canEdit = usePermission('schedule.edit');
  const canTransition = usePermission('schedule.statusTransition');

  const job = selectJobById(state, jobId);
  const client = job ? selectClientById(state, job.clientId) : null;
  const site = job ? selectSiteById(state, job.siteId) : null;
  const service = job ? selectServiceById(state, job.serviceId) : null;
  const siteContact = site?.siteContactId ? selectContactById(state, site.siteContactId) : null;
  const users = selectUsers(state);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initial = useMemo(() => {
    if (!job) return null;
    const s = splitIso(job.startAt);
    const e = splitIso(job.endAt);
    return {
      date: s.date, startTime: s.time, endTime: e.time,
      clientId: job.clientId, siteId: job.siteId, serviceId: job.serviceId,
      crewIds: job.crewIds || [], notes: job.notes || '',
    };
  }, [job]);
  const [form, setForm] = useState(initial);

  if (!job) {
    return (
      <div style={{ padding: 32 }}>
        <DetailHeader backTo="/schedule" title="Job not found" />
      </div>
    );
  }
  const currentForm = form || initial;
  const crew = (currentForm.crewIds || []).map((id) => users.find((u) => u.id === id)).filter(Boolean);
  const clientSites = state.sites.filter((s) => s.clientId === currentForm.clientId);

  const save = () => {
    const startAt = composeIso(currentForm.date, currentForm.startTime);
    const endAt = composeIso(currentForm.date, currentForm.endTime);
    dispatch({
      type: ACTIONS.UPDATE_JOB,
      id: job.id,
      patch: {
        startAt, endAt,
        clientId: currentForm.clientId,
        siteId: currentForm.siteId || null,
        serviceId: currentForm.serviceId,
        crewIds: currentForm.crewIds,
        notes: currentForm.notes,
      },
    });
    setEditing(false);
    toast.success('Job updated');
  };

  const transition = (status) => {
    dispatch({ type: ACTIONS.SET_JOB_STATUS, id: job.id, status });
    toast.success(`Marked ${STATUS_LABEL[status]}`);
  };

  const del = () => {
    dispatch({ type: ACTIONS.DELETE_JOB, id: job.id });
    toast.success('Job deleted');
    navigate('/schedule');
  };

  return (
    <div className="page-pad">
      <DetailHeader
        backTo="/schedule"
        backLabel="Schedule"
        title={`${service?.name || 'Job'}${client ? ` — ${client.name}` : ''}`}
        subtitle={`${fmtDateLong(job.startAt)} · ${fmtTimeRange(job.startAt, job.endAt)}`}
        badge={<Badge variant={statusBadgeVariant(STATUS_LABEL[job.status])}>{STATUS_LABEL[job.status]}</Badge>}
        actions={
          <div className="flex-row" style={{ gap: 8 }}>
            {canTransition && job.status !== 'in_progress' && job.status !== 'done' && (
              <button className="btn btn-outline btn-sm" onClick={() => transition('in_progress')}>Start</button>
            )}
            {canTransition && job.status !== 'done' && (
              <button className="btn btn-primary btn-sm" onClick={() => transition('done')}>Mark Done</button>
            )}
            {canTransition && job.status !== 'cancelled' && (
              <button className="btn btn-outline btn-sm" onClick={() => transition('cancelled')}>Cancel Job</button>
            )}
            {canEdit && !editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>}
            {canEdit && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete</button>}
          </div>
        }
      />

      <div className="detail-grid">
        <div className="card detail-card">
          <h3 className="dash-card-title">Details</h3>
          {!editing ? (
            <dl className="detail-dl">
              <div><dt>Client</dt><dd>{client ? <a className="link" href={`/clients/${client.id}`}>{client.name}</a> : '—'}</dd></div>
              <div><dt>Site</dt><dd>{site?.name || '—'}{site?.address ? <div className="text-muted text-sm">{site.address}</div> : null}</dd></div>
              <div>
                <dt>Site contact</dt>
                <dd>
                  {siteContact ? (
                    <>
                      <Link className="link" to={`/contacts/${siteContact.id}`}>
                        {siteContact.firstName} {siteContact.lastName}
                      </Link>
                      {siteContact.phone ? <div className="text-muted text-sm">{siteContact.phone}</div> : null}
                      {siteContact.email ? <div className="text-muted text-sm">{siteContact.email}</div> : null}
                    </>
                  ) : site ? (
                    <span className="text-muted">— <span className="text-xs">(set on the site record)</span></span>
                  ) : '—'}
                </dd>
              </div>
              <div><dt>Service</dt><dd>{service?.name || '—'}</dd></div>
              <div><dt>Starts</dt><dd>{fmtDateLong(job.startAt)} · {fmtTimeRange(job.startAt, job.endAt)}</dd></div>
              <div><dt>Crew</dt><dd>
                {crew.length === 0 ? '—' : (
                  <div className="flex-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {crew.map((u) => (
                      <span key={u.id} className="flex-row" style={{ gap: 6, alignItems: 'center' }}>
                        <Avatar initials={u.initials} variant={u.avatar} size="sm" />
                        <span className="text-sm">{u.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </dd></div>
              <div><dt>Notes</dt><dd>{job.notes || <span className="text-muted">No notes</span>}</dd></div>
            </dl>
          ) : (
            <div>
              <FormField
                label="Client" as="select" name="clientId" required
                value={currentForm.clientId}
                onChange={(e) => setForm({ ...currentForm, clientId: e.target.value, siteId: '' })}
                options={state.clients.map((c) => ({ value: c.id, label: c.name }))}
              />
              <FormField
                label="Site" as="select" name="siteId"
                value={currentForm.siteId || ''}
                onChange={(e) => setForm({ ...currentForm, siteId: e.target.value })}
              >
                <select className="input" name="siteId" value={currentForm.siteId || ''} onChange={(e) => setForm({ ...currentForm, siteId: e.target.value })}>
                  <option value="">— No specific site —</option>
                  {clientSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FormField>
              <FormField
                label="Service" as="select" name="serviceId" required
                value={currentForm.serviceId}
                onChange={(e) => setForm({ ...currentForm, serviceId: e.target.value })}
                options={state.services.map((s) => ({ value: s.id, label: s.name }))}
              />
              <div className="form-row">
                <FormField label="Date" type="date" name="date" required value={currentForm.date} onChange={(e) => setForm({ ...currentForm, date: e.target.value })} />
                <FormField label="Start" type="time" name="startTime" required value={currentForm.startTime} onChange={(e) => setForm({ ...currentForm, startTime: e.target.value })} />
                <FormField label="End" type="time" name="endTime" required value={currentForm.endTime} onChange={(e) => setForm({ ...currentForm, endTime: e.target.value })} />
              </div>
              <FormField label="Crew">
                <div className="chip-picker">
                  {users.filter((u) => u.status === 'active').map((u) => {
                    const on = currentForm.crewIds.includes(u.id);
                    return (
                      <button key={u.id} type="button" className={`chip ${on ? 'on' : ''}`}
                        onClick={() => setForm({
                          ...currentForm,
                          crewIds: on ? currentForm.crewIds.filter((x) => x !== u.id) : [...currentForm.crewIds, u.id],
                        })}
                      >
                        <Avatar initials={u.initials} variant={u.avatar} size="sm" />
                        <span>{u.name}</span>
                      </button>
                    );
                  })}
                </div>
              </FormField>
              <FormField label="Notes" as="textarea" name="notes" value={currentForm.notes} onChange={(e) => setForm({ ...currentForm, notes: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setForm(initial); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save}>Save Changes</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this job?"
        message="This can't be undone. Related data (client, invoices) is untouched."
        confirmLabel="Delete Job"
        variant="danger"
        onConfirm={del}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
