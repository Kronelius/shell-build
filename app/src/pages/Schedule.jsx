import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFromHere } from '../hooks/useFromHere';
import Badge, { statusBadgeVariant } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import NewJobModal from '../components/NewJobModal';
import FormField from '../components/FormField';
import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import {
  selectJobs, selectClientById, selectServiceById, selectSiteById, selectServices,
  selectActiveUsers, selectUserById, selectJobsForUser,
} from '../store/selectors';
import { fmtTimeRange, sameDay, startOfWeek, startOfMonth, addDays } from '../lib/dates';

const STATUS_LABEL = { upcoming: 'Upcoming', in_progress: 'In Progress', done: 'Done', cancelled: 'Cancelled' };

const toIsoDay = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fromIsoDay = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function Schedule() {
  const state = useStore();
  const navigate = useNavigate();
  const nav = useFromHere();
  const { currentUser } = useAuth();
  const canCreate = usePermission('schedule.edit');

  const [searchParams, setSearchParams] = useSearchParams();
  const setParam = (key, value, defaultValue) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value == null || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const view = searchParams.get('view') || 'Day';
  const setView = (v) => setParam('view', v, 'Day');
  const refDate = searchParams.get('d') ? fromIsoDay(searchParams.get('d')) : new Date();
  const todayIso = toIsoDay(new Date());
  const setRefDate = (d) => setParam('d', toIsoDay(d), todayIso);
  const [modalOpen, setModalOpen] = useState(false);
  const filterStatus = searchParams.get('status') || 'all';
  const filterUser = searchParams.get('user') || 'all';
  const filterService = searchParams.get('service') || 'all';

  const jobsAll = selectJobs(state);
  const services = selectServices(state);
  const users = selectActiveUsers(state);
  const scope = currentUser?.role === 'crew' ? selectJobsForUser(state, currentUser.id) : jobsAll;

  const filteredJobs = useMemo(() => scope.filter((j) => {
    if (filterStatus !== 'all' && j.status !== filterStatus) return false;
    if (filterService !== 'all' && j.serviceId !== filterService) return false;
    if (filterUser !== 'all' && !j.crewIds?.includes(filterUser)) return false;
    return true;
  }), [scope, filterStatus, filterUser, filterService]);

  const dayJobs = useMemo(() => filteredJobs.filter((j) => sameDay(j.startAt, refDate)).sort((a, b) => a.startAt.localeCompare(b.startAt)), [filteredJobs, refDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(refDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [refDate]);
  const weekJobs = useMemo(() => {
    return weekDays.map((d) => ({ date: d, jobs: filteredJobs.filter((j) => sameDay(j.startAt, d)).sort((a, b) => a.startAt.localeCompare(b.startAt)) }));
  }, [weekDays, filteredJobs]);

  const monthGrid = useMemo(() => {
    const start = startOfMonth(refDate);
    const gridStart = startOfWeek(start);
    return Array.from({ length: 42 }, (_, i) => {
      const d = addDays(gridStart, i);
      const sameMonth = d.getMonth() === refDate.getMonth();
      return { date: d, sameMonth, jobs: filteredJobs.filter((j) => sameDay(j.startAt, d)) };
    });
  }, [refDate, filteredJobs]);

  const shiftRef = (dir) => {
    const d = new Date(refDate);
    if (view === 'Day') d.setDate(d.getDate() + dir);
    else if (view === 'Week') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setRefDate(d);
  };

  const viewTitle = useMemo(() => {
    if (view === 'Day') return refDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (view === 'Week') {
      const s = startOfWeek(refDate); const e = addDays(s, 6);
      return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return refDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [view, refDate]);

  return (
    <>
      <div className="page-head">
        <h1>Schedule</h1>
        {canCreate && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModalOpen(true)}>
            + New Job
          </button>
        )}
      </div>

      <div className="schedule-toolbar">
        <div className="tab-container tab-container-line">
          {['Day', 'Week', 'Month'].map((v) => (
            <button key={v} className={`tab-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)} type="button">{v}</button>
          ))}
        </div>
        <div className="flex-row" style={{ gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          <button className="btn-icon" aria-label="Previous" onClick={() => shiftRef(-1)}><Icon name="chevronLeft" size={16} /></button>
          <button className="btn btn-outline btn-sm" onClick={() => setRefDate(new Date())}>Today</button>
          <button className="btn-icon" aria-label="Next" onClick={() => shiftRef(1)}><Icon name="chevronRight" size={16} /></button>
          <span className="schedule-title">{viewTitle}</span>
        </div>
      </div>

      <div className="filter-bar">
        <FormField label="Status" as="select" value={filterStatus} onChange={(e) => setParam('status', e.target.value, 'all')}
          options={[{ value: 'all', label: 'All statuses' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'in_progress', label: 'In Progress' }, { value: 'done', label: 'Done' }, { value: 'cancelled', label: 'Cancelled' }]} />
        <FormField label="Service" as="select" value={filterService} onChange={(e) => setParam('service', e.target.value, 'all')}
          options={[{ value: 'all', label: 'All services' }, ...services.map((s) => ({ value: s.id, label: s.name }))]} />
        <FormField label="Team" as="select" value={filterUser} onChange={(e) => setParam('user', e.target.value, 'all')}
          options={[{ value: 'all', label: 'Everyone' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
      </div>

      {view === 'Day' && (
        <div className="card dash-card">
          {dayJobs.length === 0 ? (
            <EmptyState icon={<Icon name="schedule" size={28} />} title="No jobs scheduled" message={canCreate ? 'Add your first job to start planning the day.' : 'Check back soon — nothing to do yet.'} action={canCreate && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ New Job</button>} />
          ) : (
            <div className="tl-track">
              <div className="tl-line" />
              {dayJobs.map((job) => {
                const client = selectClientById(state, job.clientId);
                const service = selectServiceById(state, job.serviceId);
                const site = selectSiteById(state, job.siteId);
                const crew = (job.crewIds || []).map((id) => selectUserById(state, id)).filter(Boolean);
                return (
                  <div key={job.id} className={`tl-item ${job.status} clickable`} onClick={() => navigate(`/schedule/${job.id}`, { state: nav })}>
                    <div className="tl-dot" />
                    <div className="tl-time">{fmtTimeRange(job.startAt, job.endAt)}</div>
                    <div className="tl-card">
                      <strong>{client?.name || '—'}</strong> — {service?.name || '—'}{' '}
                      <Badge variant={statusBadgeVariant(STATUS_LABEL[job.status])}>{STATUS_LABEL[job.status]}</Badge>
                      <br />
                      <span className="text-xs text-muted">
                        {crew.map((u) => u.name.split(' ')[0]).join(', ') || 'Unassigned'}
                        {site ? ` • ${site.name}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === 'Week' && (
        <div className="week-grid">
          {weekJobs.map(({ date, jobs }) => (
            <div key={date.toISOString()} className={`week-col ${sameDay(date, new Date()) ? 'today' : ''}`}>
              <div className="week-col-head">
                <div className="text-xs text-muted">{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div className="text-sm font-semi">{date.getDate()}</div>
              </div>
              <div className="week-col-body">
                {jobs.length === 0 ? (
                  <div className="text-xs text-muted" style={{ padding: 6 }}>—</div>
                ) : jobs.map((j) => {
                  const client = selectClientById(state, j.clientId);
                  return (
                    <div key={j.id} className={`week-card ${j.status} clickable`} onClick={() => navigate(`/schedule/${j.id}`, { state: nav })}>
                      <div className="text-xs font-semi">{fmtTimeRange(j.startAt, j.endAt)}</div>
                      <div className="text-sm">{client?.name || '—'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'Month' && (
        <div className="month-grid">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d} className="month-head">{d}</div>)}
          {monthGrid.map(({ date, sameMonth, jobs }) => (
            <div key={date.toISOString()} className={`month-cell ${!sameMonth ? 'muted' : ''} ${sameDay(date, new Date()) ? 'today' : ''}`}>
              <div className="month-cell-date">{date.getDate()}</div>
              <div className="month-cell-jobs">
                {jobs.slice(0, 3).map((j) => {
                  const client = selectClientById(state, j.clientId);
                  return (
                    <div key={j.id} className={`month-job ${j.status} clickable`} onClick={() => navigate(`/schedule/${j.id}`, { state: nav })}>
                      {client?.name || '—'}
                    </div>
                  );
                })}
                {jobs.length > 3 && <div className="text-xs text-muted">+{jobs.length - 3} more</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewJobModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
