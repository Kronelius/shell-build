import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import {
  parseCsv, guessField, applyMapping,
  CONTACT_FIELDS, CLIENT_FIELDS,
  normalizeContact, normalizeClient,
  validateContactRow, validateClientRow,
} from '../lib/csv';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { useToast } from './Toast';
import Icon from './Icon';

const STEP = { UPLOAD: 'upload', MAP: 'map', PREVIEW: 'preview', RESULT: 'result' };

export default function CsvImportModal({ open, onClose, entity = 'contacts' }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();

  const fields = entity === 'contacts' ? CONTACT_FIELDS : CLIENT_FIELDS;
  const validateRow = entity === 'contacts' ? validateContactRow : validateClientRow;
  const normalize = entity === 'contacts' ? normalizeContact : normalizeClient;

  const [step, setStep] = useState(STEP.UPLOAD);
  const [parsed, setParsed] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [pasted, setPasted] = useState('');
  const [parseError, setParseError] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep(STEP.UPLOAD);
    setParsed({ headers: [], rows: [] });
    setMapping({});
    setPasted('');
    setParseError(null);
    setResults(null);
  }, [open, entity]);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setParseError('File too large (max 5 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => loadText(String(e.target.result || ''));
    reader.onerror = () => setParseError('Could not read file.');
    reader.readAsText(file);
  };

  const loadText = (text) => {
    setParseError(null);
    const result = parseCsv(text);
    if (!result.headers.length || !result.rows.length) {
      setParseError('No data found. Make sure the file has a header row and at least one data row.');
      return;
    }
    setParsed(result);
    // Auto-guess mapping
    const next = {};
    result.headers.forEach((h, idx) => {
      const guess = guessField(h, fields);
      if (guess) next[idx] = guess;
    });
    setMapping(next);
    setStep(STEP.MAP);
  };

  const requiredFields = fields.filter((f) => f.required).map((f) => f.key);
  const mappingValid = requiredFields.every((rf) => Object.values(mapping).includes(rf));

  const previewRows = useMemo(() => {
    if (step !== STEP.PREVIEW && step !== STEP.MAP) return null;
    const existing = entity === 'contacts'
      ? new Set((state.contacts || []).map((c) => (c.email || '').toLowerCase()))
      : new Set((state.clients || []).map((c) => (c.name || '').toLowerCase().trim()));
    const seenInBatch = new Set();
    return parsed.rows.map((row, i) => {
      const mapped = normalize(applyMapping(row, parsed.headers, mapping));
      const validation = validateRow(mapped);
      let status = validation.valid ? 'ok' : 'invalid';
      let reason = validation.reason || null;
      if (validation.valid) {
        const key = entity === 'contacts'
          ? (mapped.email || '').toLowerCase()
          : (mapped.name || '').toLowerCase().trim();
        if (existing.has(key)) { status = 'duplicate'; reason = `Already exists`; }
        else if (seenInBatch.has(key)) { status = 'duplicate'; reason = `Duplicate in file`; }
        else { seenInBatch.add(key); }
      }
      return { rowIndex: i, mapped, status, reason };
    });
  }, [parsed, mapping, step, entity, state, normalize, validateRow]);

  const stats = useMemo(() => {
    if (!previewRows) return { ok: 0, duplicate: 0, invalid: 0 };
    return previewRows.reduce((acc, r) => { acc[r.status]++; return acc; }, { ok: 0, duplicate: 0, invalid: 0 });
  }, [previewRows]);

  const doImport = () => {
    if (!previewRows) return;
    let imported = 0;
    for (const row of previewRows) {
      if (row.status !== 'ok') continue;
      if (entity === 'contacts') {
        // Resolve company name → companyId (best-effort match against existing clients)
        const companyName = row.mapped.company;
        let companyId = null;
        if (companyName) {
          const match = state.clients.find((c) => c.name.toLowerCase() === companyName.toLowerCase());
          if (match) companyId = match.id;
        }
        const payload = { ...row.mapped };
        delete payload.company;
        if (companyId) payload.companyId = companyId;
        dispatch({ type: ACTIONS.ADD_CONTACT, contact: payload });
      } else {
        dispatch({ type: ACTIONS.ADD_CLIENT, client: row.mapped });
      }
      imported++;
    }
    setResults({ imported, skipped: previewRows.length - imported, total: previewRows.length });
    setStep(STEP.RESULT);
    if (imported > 0) toast.success(`Imported ${imported} ${entity === 'contacts' ? 'contact' : 'account'}${imported === 1 ? '' : 's'}`);
  };

  const title = entity === 'contacts' ? 'Import Contacts (CSV)' : 'Import Accounts (CSV)';

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {step === STEP.UPLOAD && (
        <div>
          <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
            Upload a CSV file with a header row. Required: <strong>{fields.filter((f) => f.required).map((f) => f.label.replace(' *', '')).join(', ')}</strong>.
          </p>
          <label className="csv-dropzone">
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
            <Icon name="archive" size={32} />
            <div style={{ marginTop: 8, fontWeight: 600 }}>Click to choose a CSV file</div>
            <div className="text-xs text-muted">or drag and drop · max 5 MB</div>
          </label>
          <div style={{ margin: '14px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>— or paste below —</div>
          <textarea
            className="input"
            rows={6}
            placeholder={entity === 'contacts'
              ? 'first_name,last_name,email,phone\nJane,Doe,jane@example.com,555-0100'
              : 'name,address,phone,email\nAcme Co.,123 Main St,555-0100,info@acme.com'}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          {parseError && <div className="conflict-warning" style={{ marginTop: 10 }}><Icon name="warning" size={14} /><span>{parseError}</span></div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!pasted.trim()}
              onClick={() => loadText(pasted)}
            >
              Parse pasted text
            </button>
          </div>
        </div>
      )}

      {step === STEP.MAP && (
        <div>
          <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
            Match each CSV column to a field. Columns set to <em>— Skip —</em> are ignored.
          </p>
          <div className="csv-map-list">
            {parsed.headers.map((h, idx) => (
              <div key={idx} className="csv-map-row">
                <div className="csv-map-header">
                  <div className="text-sm font-semi">{h || <em className="text-muted">(empty)</em>}</div>
                  <div className="text-xs text-muted">{parsed.rows[0]?.[idx]?.slice(0, 40) || '—'}</div>
                </div>
                <select
                  className="input"
                  value={mapping[idx] || ''}
                  onChange={(e) => setMapping({ ...mapping, [idx]: e.target.value || null })}
                >
                  <option value="">— Skip —</option>
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!mappingValid && (
            <div className="conflict-warning" style={{ marginTop: 10 }}>
              <Icon name="warning" size={14} />
              <span>Required fields not mapped: {requiredFields.filter((rf) => !Object.values(mapping).includes(rf)).join(', ')}</span>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setStep(STEP.UPLOAD)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={!mappingValid} onClick={() => setStep(STEP.PREVIEW)}>
              Preview ({parsed.rows.length} rows)
            </button>
          </div>
        </div>
      )}

      {step === STEP.PREVIEW && previewRows && (
        <div>
          <div className="csv-stats">
            <div className="csv-stat ok">
              <strong>{stats.ok}</strong>
              <span>Ready to import</span>
            </div>
            <div className="csv-stat dup">
              <strong>{stats.duplicate}</strong>
              <span>Duplicates (skipped)</span>
            </div>
            <div className="csv-stat err">
              <strong>{stats.invalid}</strong>
              <span>Invalid (skipped)</span>
            </div>
          </div>
          <div className="csv-preview-wrap">
            <table className="csv-preview-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  {fields.map((f) => (
                    Object.values(mapping).includes(f.key)
                      ? <th key={f.key}>{f.label.replace(' *', '')}</th>
                      : null
                  ))}
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 50).map((r) => (
                  <tr key={r.rowIndex} className={`csv-row csv-row-${r.status}`}>
                    <td>
                      {r.status === 'ok' && <Icon name="check" size={14} />}
                      {r.status === 'duplicate' && <Icon name="warning" size={14} />}
                      {r.status === 'invalid' && <Icon name="x" size={14} />}
                    </td>
                    {fields.map((f) => (
                      Object.values(mapping).includes(f.key)
                        ? <td key={f.key}>{r.mapped[f.key] || <span className="text-muted">—</span>}</td>
                        : null
                    ))}
                    <td className="text-xs text-muted">{r.reason || (r.status === 'ok' ? 'OK' : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewRows.length > 50 && (
              <div className="text-xs text-muted" style={{ padding: '8px 12px', textAlign: 'center' }}>
                Showing first 50 of {previewRows.length} rows. All rows will be processed.
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setStep(STEP.MAP)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={stats.ok === 0} onClick={doImport}>
              Import {stats.ok} {entity === 'contacts' ? (stats.ok === 1 ? 'contact' : 'contacts') : (stats.ok === 1 ? 'account' : 'accounts')}
            </button>
          </div>
        </div>
      )}

      {step === STEP.RESULT && results && (
        <div>
          <div className="csv-stats">
            <div className="csv-stat ok">
              <strong>{results.imported}</strong>
              <span>Imported</span>
            </div>
            <div className="csv-stat dup">
              <strong>{results.skipped}</strong>
              <span>Skipped</span>
            </div>
          </div>
          <p className="text-sm" style={{ marginTop: 14 }}>
            {results.imported > 0
              ? `Successfully added ${results.imported} new ${entity === 'contacts' ? 'contact' : 'account'}${results.imported === 1 ? '' : 's'}.`
              : 'No new records were added.'}
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
