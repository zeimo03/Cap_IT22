import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaRunning, FaUsers, FaPlus, FaTimes, FaChevronDown, FaCheck, FaEdit } from 'react-icons/fa';
import './SportsTeamsManager.css';
import { getSportsTeamsConfig, saveSportsConfig, saveTeamsConfig } from '../services/firestoreService';

/* ───────────────────────────────────────────
   Constants
─────────────────────────────────────────── */
const LEVEL_LABELS = { elementary: 'ELEMENTARY', highSchool: 'HIGH SCHOOL', college: 'COLLEGE' };

const FORMAT_OPTIONS = [
  { id: 'single-time-a',  label: 'Single Play',          sub: '(with only time basis to win)' },
  { id: 'single-time-b',  label: 'Single Play',          sub: '(with only time basis to win)' },
  { id: 'single-group',   label: 'Single Play (Group)',  sub: '(depends on how many players will play in one match)' },
  { id: 'team-points',    label: 'Team Play',            sub: '(with only points basis to win)' },
];

const TEAM_COLORS = ['#b45309', '#dc2626', '#15803d', '#6d28d9', '#92400e', '#9f1239', '#1a1a1a', '#ea580c'];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ───────────────────────────────────────────
   Generic small dropdown for picking a count (1-10)
─────────────────────────────────────────── */
function CountDropdown({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="stm-count-wrap" ref={ref}>
      <button type="button" className="stm-count-btn" onClick={() => setOpen(o => !o)}>
        {value ? `${value}` : label}
        <FaChevronDown className={`stm-count-arrow ${open ? 'stm-count-arrow--open' : ''}`} />
      </button>
      <div className={`stm-count-dropdown ${open ? 'stm-count-dropdown--open' : ''}`}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            className="stm-count-item"
            onClick={() => { onChange(n); setOpen(false); }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Choose Sport Format modal
─────────────────────────────────────────── */
function FormatModal({ initial, onDone, onClose }) {
  const [picked, setPicked] = useState(initial || FORMAT_OPTIONS[0].id);

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--format" onClick={e => e.stopPropagation()}>
        <div className="stm-modal__head">
          <div>
            <h3>Choose Sport Format</h3>
            <p>Set the scoring format basis for your sports</p>
          </div>
          <button className="stm-icon-btn" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="stm-format-list">
          {FORMAT_OPTIONS.map(opt => (
            <label key={opt.id} className={`stm-format-row ${picked === opt.id ? 'stm-format-row--active' : ''}`}>
              <div>
                <span className="stm-format-label">{opt.label}</span>
                <span className="stm-format-sub">{opt.sub}</span>
              </div>
              <input
                type="checkbox"
                checked={picked === opt.id}
                onChange={() => setPicked(opt.id)}
              />
            </label>
          ))}
        </div>
        <button className="stm-btn-primary stm-btn-block" onClick={() => onDone(picked)}>Done</button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Category / Division modal
─────────────────────────────────────────── */
function CategoryModal({ sport, onClose, onSave }) {
  const [rows, setRows] = useState(sport.categories?.length ? sport.categories : [{ id: uid(), name: '', format: '' }]);
  const [formatTarget, setFormatTarget] = useState(null);

  const setCount = (n) => {
    setRows(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ id: uid(), name: '', format: '' });
      while (next.length > n) next.pop();
      return next;
    });
  };

  const updateRow = (id, patch) => setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
  const formatLabel = (fmtId) => FORMAT_OPTIONS.find(f => f.id === fmtId);

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--category" onClick={e => e.stopPropagation()}>
        <div className="stm-modal__head stm-modal__head--row">
          <div>
            <h3>Category/ Division</h3>
            <p>Set the categories or divisions for your sports</p>
          </div>
          <div className="stm-stepper">
            <button type="button" onClick={() => setCount(Math.max(1, rows.length - 1))}>−</button>
            <span>{rows.length}</span>
            <button type="button" onClick={() => setCount(rows.length + 1)}>+</button>
          </div>
          <button className="stm-icon-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="stm-cat-list">
          {rows.map(row => {
            const fmt = formatLabel(row.format);
            return (
              <div key={row.id} className="stm-cat-row">
                <input
                  className="stm-cat-input"
                  placeholder="e.g. Female (100 meters run)"
                  value={row.name}
                  onChange={e => updateRow(row.id, { name: e.target.value })}
                />
                {fmt ? (
                  <div className="stm-cat-format-chip">
                    <span className="stm-cat-format-chip__label">{fmt.label}</span>
                    <span className="stm-cat-format-chip__sub">{fmt.sub}</span>
                  </div>
                ) : (
                  <button type="button" className="stm-btn-secondary" onClick={() => setFormatTarget(row.id)}>
                    Choose sport format
                  </button>
                )}
                <button type="button" className="stm-icon-btn" onClick={() => removeRow(row.id)}><FaTimes /></button>
              </div>
            );
          })}
        </div>

        <button
          className="stm-btn-primary stm-btn-block"
          onClick={() => onSave(rows.filter(r => r.name.trim()))}
        >
          Submit
        </button>
      </div>

      {formatTarget && (
        <FormatModal
          initial={rows.find(r => r.id === formatTarget)?.format}
          onClose={() => setFormatTarget(null)}
          onDone={(fmtId) => { updateRow(formatTarget, { format: fmtId }); setFormatTarget(null); }}
        />
      )}
    </div>
  );
}

/* ───────────────────────────────────────────
   Sports confirmation modal
─────────────────────────────────────────── */
function SportsConfirmModal({ sports, onClose, onSave }) {
  const flat = sports.flatMap(s => (s.categories.length ? s.categories : [{ name: '—', format: '' }]).map((c, i) => ({
    sportName: i === 0 ? s.name : '',
    sportIcon: i === 0,
    catName: c.name,
    fmt: FORMAT_OPTIONS.find(f => f.id === c.format),
  })));

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--confirm" onClick={e => e.stopPropagation()}>
        <h3 className="stm-confirm-title">Confirmation</h3>
        <div className="stm-confirm-grid stm-confirm-grid--sports">
          <div className="stm-confirm-col">
            <h4>Sports</h4>
            {sports.map(s => (
              <div key={s.id} className="stm-confirm-cell stm-confirm-cell--edit">
                <span>{s.name}</span>
                <FaEdit className="stm-confirm-edit-icon" />
              </div>
            ))}
          </div>
          <div className="stm-confirm-col">
            <h4>Division/ Categories</h4>
            {flat.map((r, i) => <div key={i} className="stm-confirm-cell">{r.catName || '—'}</div>)}
          </div>
          <div className="stm-confirm-col">
            <h4>Sports Format</h4>
            {flat.map((r, i) => <div key={i} className="stm-confirm-cell">{r.fmt ? r.fmt.label : '—'}</div>)}
          </div>
          <div className="stm-confirm-col">
            <h4>Sports Logo</h4>
            {sports.map(s => (
              <div key={s.id} className="stm-confirm-cell stm-confirm-cell--logo">
                <FaRunning />
              </div>
            ))}
          </div>
        </div>
        <button className="stm-btn-primary stm-btn-block" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   "Select sports that team participating" modal
─────────────────────────────────────────── */
function TeamSportsPickerModal({ team, sportsList, onClose, onSave }) {
  const [selected, setSelected] = useState(team.sportIds || []);
  const [open, setOpen] = useState(false);

  const toggle = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const available = sportsList.length ? sportsList.map(s => s.name) : [];

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--picker" onClick={e => e.stopPropagation()}>
        <div className="stm-modal__head">
          <div>
            <h3>Sports</h3>
            <p>Set the sports with the participating teams</p>
          </div>
          <button className="stm-icon-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="stm-count-wrap stm-picker-dd" style={{ width: '100%' }}>
          <button type="button" className="stm-count-btn stm-count-btn--wide" onClick={() => setOpen(o => !o)}>
            Sports
            <FaChevronDown className={`stm-count-arrow ${open ? 'stm-count-arrow--open' : ''}`} />
          </button>
          <div className={`stm-count-dropdown stm-count-dropdown--wide ${open ? 'stm-count-dropdown--open' : ''}`}>
            {available.length === 0 && <div className="stm-empty-note">Add sports first</div>}
            {available.map(name => (
              <button key={name} type="button" className="stm-count-item stm-count-item--wide" onClick={() => { toggle(name); setOpen(false); }}>
                {name}
              </button>
            ))}
          </div>
        </div>

        <p className="stm-selected-label">Selected Sports</p>
        <div className="stm-chip-list">
          {selected.map(name => (
            <div key={name} className="stm-chip">
              <span>{name}</span>
              <button type="button" onClick={() => toggle(name)}><FaTimes /></button>
            </div>
          ))}
          {selected.length === 0 && <p className="stm-empty-note">No sports selected yet.</p>}
        </div>

        <button className="stm-btn-primary stm-btn-block" onClick={() => onSave(selected)}>Submit</button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Teams confirmation modal
─────────────────────────────────────────── */
function TeamsConfirmModal({ teams, onClose, onSave }) {
  const [active, setActive] = useState(teams[0]?.id);
  const activeTeam = teams.find(t => t.id === active) || teams[0];

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--confirm stm-modal--teams-confirm" onClick={e => e.stopPropagation()}>
        <h3 className="stm-confirm-title">Confirmation</h3>
        <div className="stm-confirm-grid stm-confirm-grid--teams">
          <div className="stm-confirm-col">
            <h4>Teams</h4>
            {teams.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`stm-team-row ${activeTeam?.id === t.id ? 'stm-team-row--active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                <span className="stm-team-row__num">{i + 1}</span>
                <span className="stm-team-row__logo" style={{ background: t.color }} />
                <span className="stm-team-row__name">{t.name}</span>
                <span className="stm-team-row__count">{t.sportIds.length}</span>
              </button>
            ))}
          </div>
          <div className="stm-confirm-col">
            <h4>{activeTeam?.name || 'TEAM'}</h4>
            {(activeTeam?.sportIds || []).map(s => (
              <div key={s} className="stm-confirm-cell">{s}</div>
            ))}
            {(!activeTeam || activeTeam.sportIds.length === 0) && <p className="stm-empty-note">No sports selected.</p>}
          </div>
        </div>
        <button className="stm-btn-primary stm-btn-block" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Preview dropdown (shared for sports + teams)
─────────────────────────────────────────── */
function PreviewSelect({ items, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="stm-preview-select" ref={ref}>
      <button type="button" className="stm-preview-select__btn" onClick={() => setOpen(o => !o)}>
        {value || placeholder}
        <FaChevronDown className={`stm-count-arrow ${open ? 'stm-count-arrow--open' : ''}`} />
      </button>
      <div className={`stm-preview-select__dd ${open ? 'stm-preview-select__dd--open' : ''}`}>
        {items.map(name => (
          <button key={name} type="button" className="stm-preview-select__item" onClick={() => { onChange(name); setOpen(false); }}>
            {name}
          </button>
        ))}
        {items.length === 0 && <div className="stm-empty-note">Nothing saved yet.</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function SportsTeamsManager({ level }) {
  const [sportsRows, setSportsRows] = useState([]);
  const [teamsRows, setTeamsRows]   = useState([]);
  const [sportsList, setSportsList] = useState([]); // saved/confirmed
  const [teamsList, setTeamsList]   = useState([]);

  const [categoryTarget, setCategoryTarget] = useState(null); // sport row id
  const [sportsPickerTarget, setSportsPickerTarget] = useState(null); // team row id
  const [showSportsConfirm, setShowSportsConfirm] = useState(false);
  const [showTeamsConfirm, setShowTeamsConfirm]   = useState(false);

  const [previewSport, setPreviewSport] = useState('');
  const [previewTeam, setPreviewTeam]   = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  /* Load config when level changes */
  const load = useCallback(async () => {
    const cfg = await getSportsTeamsConfig(level);
    setSportsList(cfg.sports);
    setTeamsList(cfg.teams);
    setPreviewSport(cfg.sports[0]?.name || '');
    setPreviewTeam(cfg.teams[0]?.name || '');
    setSportsRows([]);
    setTeamsRows([]);
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  /* ── Sports form helpers ── */
  const setSportsCount = (n) => {
    setSportsRows(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ id: uid(), name: '', categories: [] });
      while (next.length > n) next.pop();
      return next;
    });
  };
  const updateSportRow = (id, patch) => setSportsRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const resetSportsForm = () => setSportsRows([]);

  const submitSportsForm = () => {
    const cleaned = sportsRows.filter(r => r.name.trim());
    if (cleaned.length === 0) { flash('Add at least one sport first.'); return; }
    setShowSportsConfirm(true);
  };

  const saveSportsConfirm = async () => {
    const cleaned = sportsRows.filter(r => r.name.trim());
    const merged = [...sportsList.filter(s => !cleaned.some(c => c.name === s.name)), ...cleaned];
    setSaving(true);
    try {
      await saveSportsConfig(level, merged);
      setSportsList(merged);
      setPreviewSport(merged[0]?.name || '');
      setSportsRows([]);
      setShowSportsConfirm(false);
      flash('Sports saved to Firestore!');
    } catch (e) {
      console.error(e);
      flash('Failed to save sports.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Teams form helpers ── */
  const setTeamsCount = (n) => {
    setTeamsRows(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ id: uid(), name: '', sportIds: [], color: TEAM_COLORS[next.length % TEAM_COLORS.length] });
      while (next.length > n) next.pop();
      return next;
    });
  };
  const updateTeamRow = (id, patch) => setTeamsRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const resetTeamsForm = () => setTeamsRows([]);

  const submitTeamsForm = () => {
    const cleaned = teamsRows.filter(r => r.name.trim());
    if (cleaned.length === 0) { flash('Add at least one team first.'); return; }
    setShowTeamsConfirm(true);
  };

  const saveTeamsConfirm = async () => {
    const cleaned = teamsRows.filter(r => r.name.trim());
    const merged = [...teamsList.filter(t => !cleaned.some(c => c.name === t.name)), ...cleaned];
    setSaving(true);
    try {
      await saveTeamsConfig(level, merged);
      setTeamsList(merged);
      setPreviewTeam(merged[0]?.name || '');
      setTeamsRows([]);
      setShowTeamsConfirm(false);
      flash('Teams saved to Firestore!');
    } catch (e) {
      console.error(e);
      flash('Failed to save teams.');
    } finally {
      setSaving(false);
    }
  };

  const activePreviewSport = sportsList.find(s => s.name === previewSport);
  const activePreviewTeam  = teamsList.find(t => t.name === previewTeam);
  const categorySportRow   = sportsRows.find(r => r.id === categoryTarget);
  const pickerTeamRow      = teamsRows.find(r => r.id === sportsPickerTarget);

  return (
    <div className="stm-wrap">
      {toast && <div className="stm-toast">{toast}</div>}

      {/* ════════ SPORTS ════════ */}
      <div className="stm-card">
        <div className="stm-card__head">
          <FaRunning className="stm-card__icon" />
          <div>
            <h3>SPORTS</h3>
            <p>Add sport that will be part of the event.</p>
          </div>
        </div>

        <div className="stm-form-toprow">
          <CountDropdown value={sportsRows.length || ''} onChange={setSportsCount} label="Number of sport" />
          <button type="button" className="stm-link-btn" onClick={() => setSportsCount(sportsRows.length + 1)}>
            <FaPlus /> To add category
          </button>
        </div>

        {sportsRows.length > 0 && (
          <div className="stm-table-wrap">
            <table className="stm-table">
              <thead>
                <tr><th>#</th><th>Sports Name</th><th>Logo</th><th>Categories/Division</th></tr>
              </thead>
              <tbody>
                {sportsRows.map((row, i) => (
                  <tr key={row.id}>
                    <td><span className="stm-num-badge">{i + 1}</span></td>
                    <td>
                      <input
                        className="stm-row-input"
                        placeholder="Sport name"
                        value={row.name}
                        onChange={e => updateSportRow(row.id, { name: e.target.value })}
                      />
                    </td>
                    <td><span className="stm-logo-chip"><FaRunning /></span></td>
                    <td>
                      <div className="stm-cat-count-cell">
                        <span>{row.categories.length}</span>
                        <button type="button" className="stm-plus-btn" onClick={() => setCategoryTarget(row.id)}><FaPlus /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="stm-form-actions">
          <button type="button" className="stm-btn-ghost" onClick={resetSportsForm}>Reset</button>
          <button type="button" className="stm-btn-primary" onClick={submitSportsForm} disabled={saving}>Submit</button>
        </div>
      </div>

      {/* ════════ PREVIEW: SPORTS ════════ */}
      <div className="stm-card">
        <h4 className="stm-preview-title">PREVIEW</h4>
        <p className="stm-preview-sub">Select a sport to view its categories/divisions.</p>
        <div className="stm-preview-row">
          <div className="stm-preview-block">
            <span className="stm-preview-label">SPORTS</span>
            <PreviewSelect items={sportsList.map(s => s.name)} value={previewSport} onChange={setPreviewSport} placeholder="Select sport" />
          </div>
          <div className="stm-preview-block">
            <span className="stm-preview-label">CATEGORIES/ DIVISION</span>
            <ul className="stm-preview-list">
              {(activePreviewSport?.categories || []).map(c => (
                <li key={c.id}>{c.name}</li>
              ))}
              {(!activePreviewSport || activePreviewSport.categories.length === 0) && <li className="stm-empty-note">—</li>}
            </ul>
          </div>
          <div className="stm-preview-block">
            <span className="stm-preview-label">SPORTS FORMAT</span>
            <ul className="stm-preview-list">
              {(activePreviewSport?.categories || []).map(c => {
                const f = FORMAT_OPTIONS.find(o => o.id === c.format);
                return <li key={c.id}>{f ? f.label : '—'}</li>;
              })}
              {(!activePreviewSport || activePreviewSport.categories.length === 0) && <li className="stm-empty-note">—</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* ════════ TEAMS ════════ */}
      <div className="stm-card">
        <div className="stm-card__head">
          <FaUsers className="stm-card__icon" />
          <div>
            <h3>TEAMS</h3>
            <p>Add teams that will participate in the selected sports</p>
          </div>
        </div>

        <div className="stm-form-toprow">
          <CountDropdown value={teamsRows.length || ''} onChange={setTeamsCount} label="Number of team" />
          <button type="button" className="stm-link-btn" onClick={() => setTeamsCount(teamsRows.length + 1)}>
            <FaPlus /> To select sports that team participating
          </button>
        </div>

        {teamsRows.length > 0 && (
          <div className="stm-table-wrap">
            <table className="stm-table">
              <thead>
                <tr><th>#</th><th>Team Name</th><th>Logo</th><th>Sports</th></tr>
              </thead>
              <tbody>
                {teamsRows.map((row, i) => (
                  <tr key={row.id}>
                    <td><span className="stm-num-badge">{i + 1}</span></td>
                    <td>
                      <input
                        className="stm-row-input"
                        placeholder="Team name"
                        value={row.name}
                        onChange={e => updateTeamRow(row.id, { name: e.target.value })}
                      />
                    </td>
                    <td><span className="stm-logo-chip" style={{ background: row.color }} /></td>
                    <td>
                      <div className="stm-cat-count-cell">
                        <span>{row.sportIds.length}</span>
                        <button type="button" className="stm-plus-btn" onClick={() => setSportsPickerTarget(row.id)}><FaPlus /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="stm-form-actions">
          <button type="button" className="stm-btn-ghost" onClick={resetTeamsForm}>Reset</button>
          <button type="button" className="stm-btn-primary" onClick={submitTeamsForm} disabled={saving}>Submit</button>
        </div>
      </div>

      {/* ════════ PREVIEW: TEAMS ════════ */}
      <div className="stm-card">
        <h4 className="stm-preview-title">PREVIEW</h4>
        <p className="stm-preview-sub">Select a team to view what sports they participate.</p>
        <div className="stm-preview-row stm-preview-row--teams">
          <div className="stm-preview-block">
            <span className="stm-preview-label">TEAMS</span>
            <PreviewSelect items={teamsList.map(t => t.name)} value={previewTeam} onChange={setPreviewTeam} placeholder="Select team" />
          </div>
          <div className="stm-preview-block stm-preview-block--wide">
            <span className="stm-preview-label">SPORTS</span>
            <ul className="stm-preview-list stm-preview-list--cols">
              {(activePreviewTeam?.sportIds || []).map(s => <li key={s}>{s}</li>)}
              {(!activePreviewTeam || activePreviewTeam.sportIds.length === 0) && <li className="stm-empty-note">—</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {categorySportRow && (
        <CategoryModal
          sport={categorySportRow}
          onClose={() => setCategoryTarget(null)}
          onSave={(cats) => { updateSportRow(categorySportRow.id, { categories: cats }); setCategoryTarget(null); }}
        />
      )}

      {showSportsConfirm && (
        <SportsConfirmModal
          sports={sportsRows.filter(r => r.name.trim())}
          onClose={() => setShowSportsConfirm(false)}
          onSave={saveSportsConfirm}
        />
      )}

      {pickerTeamRow && (
        <TeamSportsPickerModal
          team={pickerTeamRow}
          sportsList={sportsList.length ? sportsList : sportsRows.filter(r => r.name.trim())}
          onClose={() => setSportsPickerTarget(null)}
          onSave={(ids) => { updateTeamRow(pickerTeamRow.id, { sportIds: ids }); setSportsPickerTarget(null); }}
        />
      )}

      {showTeamsConfirm && (
        <TeamsConfirmModal
          teams={teamsRows.filter(r => r.name.trim())}
          onClose={() => setShowTeamsConfirm(false)}
          onSave={saveTeamsConfirm}
        />
      )}
    </div>
  );
}