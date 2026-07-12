import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaRunning, FaUsers, FaPlus, FaTimes, FaChevronDown,
  FaEdit, FaCheck, FaEllipsisV, FaSync,
} from 'react-icons/fa';
import './SportsTeamsManager.css';
import { getSportsTeamsConfig, saveSportsConfig, saveTeamsConfig } from '../services/firestoreService';

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const FORMAT_OPTIONS = [
  { id: 'single-time',  label: 'Single Play',         sub: '(with only time basis to win)' },
  { id: 'single-solo',  label: 'Single Play',         sub: '(with only points basis to win — solo)' },
  { id: 'single-group', label: 'Single Play (Group)', sub: '(depends on how many players will play in one match)' },
  { id: 'team-play',    label: 'Team Play',           sub: '(with only points basis to win)' },
];

const DEFAULT_GROUP_LABELS = ['FEMALE', 'MALE', 'MIXED', 'OPEN', 'YOUTH', 'SENIOR', 'JUNIOR', 'VETERAN'];
const TEAM_COLORS = ['#b45309','#dc2626','#15803d','#6d28d9','#92400e','#9f1239','#374151','#ea580c'];

const uid = () => Math.random().toString(36).slice(2, 10);
const ensureId = (obj) => obj?.id ? obj : { ...obj, id: uid() };

/* ═══════════════════════════════════════════
   LOGO UPLOAD
   Resizes to 80×80 before storing as base64
═══════════════════════════════════════════ */
function LogoUpload({ logo, onUpload }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 80;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#001529';
      ctx.fillRect(0, 0, SIZE, SIZE);
      const scale = Math.min(SIZE / img.width, SIZE / img.height);
      const x = (SIZE - img.width * scale) / 2;
      const y = (SIZE - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      onUpload(canvas.toDataURL('image/jpeg', 0.75));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="stm-logo-upload" onClick={() => inputRef.current?.click()} title="Click to upload">
      {logo
        ? <img src={logo} alt="logo" className="stm-logo-img" />
        : <span className="stm-logo-placeholder">Upload Image</span>
      }
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOM NUMBER DROPDOWN  (image 3 design)
   Dark navy panel with pill options
═══════════════════════════════════════════ */
function NumDropdown({ value, onChange, label, max = 10 }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="stm-num-wrap" ref={wrapRef}>
      <button type="button" className="stm-num-btn" onClick={() => setOpen(o => !o)}>
        {value ? `Number of ${label.toLowerCase().replace('number of ', '')} ✓ ${value}` : label}
        <FaChevronDown className={`stm-num-arrow ${open ? 'stm-num-arrow--open' : ''}`} />
      </button>

      {open && (
        <div className="stm-num-panel">
          <div className="stm-num-panel__title">NUMBER OF {label.toUpperCase().replace('NUMBER OF ', '')} OPTION</div>
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              className={`stm-num-option ${value === n ? 'stm-num-option--active' : ''}`}
              onClick={() => { onChange(n); setOpen(false); }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHOOSE SPORT FORMAT MODAL
═══════════════════════════════════════════ */
function FormatModal({ initial, onDone, onClose }) {
  const [picked, setPicked] = useState(initial || '');

  return (
    <div className="stm-overlay stm-overlay--top" onClick={onClose}>
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
            <label
              key={opt.id}
              className={`stm-format-row ${picked === opt.id ? 'stm-format-row--active' : ''}`}
              onClick={() => setPicked(opt.id)}
            >
              <div>
                <span className="stm-format-label">{opt.label}</span>
                <span className="stm-format-sub">{opt.sub}</span>
              </div>
              <span className={`stm-format-check ${picked === opt.id ? 'stm-format-check--on' : ''}`}>
                {picked === opt.id && <FaCheck />}
              </span>
            </label>
          ))}
        </div>
        <button className="stm-btn-primary stm-btn-block" disabled={!picked} onClick={() => onDone(picked)}>
          Done
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CATEGORY / DIVISION MODAL  (image 4 design)
   Groups (Female/Male/etc) each with divisions
═══════════════════════════════════════════ */
function CategoryModal({ sport, onClose, onSave }) {
  const initGroups = () => {
    if (sport.categoryGroups?.length) return sport.categoryGroups.map(g => ({
      ...ensureId(g),
      divisions: (g.divisions || []).map(ensureId),
    }));
    return [{ id: uid(), label: 'FEMALE', divisions: [{ id: uid(), name: '', format: '' }] }];
  };

  const [groups, setGroups] = useState(initGroups);
  const [fmtTarget, setFmtTarget] = useState(null); // { gid, did }

  /* Stepper: controls number of groups */
  const setGroupCount = (n) => {
    setGroups(prev => {
      const next = [...prev];
      while (next.length < n) {
        const lbl = DEFAULT_GROUP_LABELS[next.length] || `GROUP ${next.length + 1}`;
        next.push({ id: uid(), label: lbl, divisions: [{ id: uid(), name: '', format: '' }] });
      }
      while (next.length > n) next.pop();
      return next;
    });
  };

  const updateLabel = (gid, label) =>
    setGroups(prev => prev.map(g => g.id === gid ? { ...g, label } : g));

  const addDivision = (gid) =>
    setGroups(prev => prev.map(g => g.id === gid
      ? { ...g, divisions: [...g.divisions, { id: uid(), name: '', format: '' }] }
      : g));

  const removeDivision = (gid, did) =>
    setGroups(prev => prev.map(g => g.id === gid
      ? { ...g, divisions: g.divisions.filter(d => d.id !== did) }
      : g));

  const updateDiv = (gid, did, patch) =>
    setGroups(prev => prev.map(g => g.id === gid
      ? { ...g, divisions: g.divisions.map(d => d.id === did ? { ...d, ...patch } : d) }
      : g));

  const handleReset = () => setGroups(initGroups());

  const handleSubmit = () => {
    const cleaned = groups
      .filter(g => g.label.trim())
      .map(g => {
        // Keep a division if it has a name OR a format selected
        const filledDivs = g.divisions.filter(d => d.name.trim() || d.format);
        // If no filled divisions at all, represent the category itself as one entry
        // so "FEMALE" still appears in the preview even without sub-events
        const divisions = filledDivs.length > 0
          ? filledDivs.map(d => ({ ...d, name: d.name.trim() || g.label }))
          : [{ id: g.id + '_auto', name: g.label, format: g.divisions[0]?.format || '' }];
        return { ...g, divisions };
      });
    onSave(cleaned);
  };

  const fmtObj = (id) => FORMAT_OPTIONS.find(f => f.id === id);

  return (
    <>
      <div className="stm-overlay" onClick={onClose}>
        <div className="stm-modal stm-modal--category" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="stm-catmod-head">
          <button className="stm-icon-btn stm-catmod-close" onClick={onClose}><FaTimes /></button>
          <h3>CATEGORY / DIVISION</h3>
          <p>Set the categories, divisions, and formats for your sports</p>
          {/* Stepper: [+  N  -] matching image 4 */}
          <div className="stm-catmod-stepper">
            <button type="button" onClick={() => setGroupCount(groups.length + 1)}>+</button>
            <span>{groups.length}</span>
            <button type="button" onClick={() => setGroupCount(Math.max(1, groups.length - 1))}>−</button>
          </div>
        </div>

        {/* Groups */}
        <div className="stm-cat-groups">
          {groups.map((group, gi) => (
            <div key={group.id} className="stm-cat-group">
              <div className="stm-cat-group__hdr">
                <input
                  className="stm-cat-group__label"
                  value={group.label}
                  onChange={e => updateLabel(group.id, e.target.value.toUpperCase())}
                />
                <span className="stm-cat-group__num">{gi + 1}</span>
              </div>

              {group.divisions.map(div => {
                const fmt = fmtObj(div.format);
                return (
                  <div key={div.id} className="stm-div-row">
                    <input
                      className="stm-div-input"
                      placeholder="e.g. Mixed Relay 4×4 (400m)"
                      value={div.name}
                      onChange={e => updateDiv(group.id, div.id, { name: e.target.value })}
                    />
                    {fmt ? (
                      <button
                        type="button"
                        className="stm-div-fmt-chip"
                        onClick={() => setFmtTarget({ gid: group.id, did: div.id })}
                        title="Click to change format"
                      >
                        <span className="stm-div-fmt-chip__label">{fmt.label}</span>
                        <span className="stm-div-fmt-chip__sub">{fmt.sub}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="stm-div-choose-btn"
                        onClick={() => setFmtTarget({ gid: group.id, did: div.id })}
                      >
                        Choose sport format
                      </button>
                    )}
                    <button
                      type="button"
                      className="stm-icon-btn"
                      onClick={() => removeDivision(group.id, div.id)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                className="stm-add-div-btn"
                onClick={() => addDivision(group.id)}
              >
                <FaPlus /> Add Division
              </button>
            </div>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="stm-catmod-actions">
          <button type="button" className="stm-btn-ghost" onClick={handleReset}>
            <FaSync style={{ marginRight: 6, fontSize: '0.7rem' }} /> Reset
          </button>
          <button type="button" className="stm-btn-primary" onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>

    {/* FormatModal is a sibling overlay — not a child — so z-index stacks correctly */}
    {fmtTarget && (
      <FormatModal
        initial={groups.find(g => g.id === fmtTarget.gid)?.divisions.find(d => d.id === fmtTarget.did)?.format}
        onClose={() => setFmtTarget(null)}
        onDone={(fmtId) => {
          updateDiv(fmtTarget.gid, fmtTarget.did, { format: fmtId });
          setFmtTarget(null);
        }}
      />
    )}
    </>
  );
}

/* ═══════════════════════════════════════════
   SPORTS CONFIRMATION MODAL  (image 5 design)
   Sports | Division/Categories | Sports Format | Logo
═══════════════════════════════════════════ */
function SportsConfirmModal({ sports, saving, onClose, onSave }) {
  /* Flatten: one row per division across all groups */
  const rows = sports.flatMap(sport => {
    const flat = sport.categoryGroups?.flatMap(g =>
      g.divisions.map(d => ({ div: d, groupLabel: g.label }))
    ) || [];
    if (flat.length === 0) return [{ sport, div: null, groupLabel: '' }];
    return flat.map((item, i) => ({ sport: i === 0 ? sport : null, ...item }));
  });

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--confirm" onClick={e => e.stopPropagation()}>
        <h3 className="stm-confirm-title">CONFIRMATION</h3>
        <div className="stm-confirm-grid stm-confirm-grid--sports">
          {/* SPORTS col */}
          <div className="stm-confirm-col">
            <h4>SPORTS</h4>
            {rows.map((r, i) => (
              <div key={i} className="stm-confirm-cell">
                {r.sport ? (
                  <span className="stm-confirm-sport-name">
                    {r.sport.name}
                    <span className="stm-confirm-edit-icon"><FaEdit /></span>
                  </span>
                ) : <span />}
              </div>
            ))}
          </div>

          {/* DIVISION/CATEGORIES col */}
          <div className="stm-confirm-col">
            <h4>DIVISION/ CATEGORIES</h4>
            {rows.map((r, i) => (
              <div key={i} className="stm-confirm-cell">
                {r.div ? r.div.name || r.groupLabel : '—'}
              </div>
            ))}
          </div>

          {/* SPORTS FORMAT col */}
          <div className="stm-confirm-col">
            <h4>SPORTS FORMAT</h4>
            {rows.map((r, i) => {
              const fmt = FORMAT_OPTIONS.find(f => f.id === r.div?.format);
              return (
                <div key={i} className="stm-confirm-cell">
                  {fmt ? fmt.label : '—'}
                </div>
              );
            })}
          </div>

          {/* SPORTS LOGO col */}
          <div className="stm-confirm-col">
            <h4>SPORTS LOGO</h4>
            {sports.map(s => (
              <div key={s.id} className="stm-confirm-cell stm-confirm-cell--logo">
                {s.logo
                  ? <img src={s.logo} alt="logo" className="stm-confirm-logo-img" />
                  : <span className="stm-confirm-logo-placeholder"><FaRunning /></span>
                }
              </div>
            ))}
          </div>
        </div>

        <button className="stm-btn-primary stm-btn-block" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEAM SPORTS PICKER MODAL
═══════════════════════════════════════════ */
function TeamSportsPickerModal({ team, sportsList, onClose, onSave }) {
  const [selected, setSelected] = useState(new Set(team.sportIds || []));

  const toggle = (name) => setSelected(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--picker" onClick={e => e.stopPropagation()}>
        <div className="stm-modal__head">
          <div>
            <h3>Sports</h3>
            <p>Select sports for <strong>{team.name || 'this team'}</strong></p>
          </div>
          <button className="stm-icon-btn" onClick={onClose}><FaTimes /></button>
        </div>

        {sportsList.length === 0 ? (
          <p className="stm-empty-note" style={{ padding: '20px 0' }}>No sports added yet.</p>
        ) : (
          <div className="stm-picker-list">
            {sportsList.map(s => (
              <button
                key={s.id}
                type="button"
                className={`stm-picker-item ${selected.has(s.name) ? 'stm-picker-item--on' : ''}`}
                onClick={() => toggle(s.name)}
              >
                {s.logo
                  ? <img src={s.logo} alt="" className="stm-picker-logo" />
                  : <span className="stm-picker-logo stm-picker-logo--icon"><FaRunning /></span>
                }
                <span>{s.name}</span>
                <span className="stm-picker-check">{selected.has(s.name) && <FaCheck />}</span>
              </button>
            ))}
          </div>
        )}

        <p className="stm-selected-label">Selected ({selected.size})</p>
        <div className="stm-chip-list">
          {[...selected].map(name => (
            <div key={name} className="stm-chip">
              <span>{name}</span>
              <button type="button" onClick={() => toggle(name)}><FaTimes /></button>
            </div>
          ))}
          {selected.size === 0 && <p className="stm-empty-note">None selected.</p>}
        </div>

        <button className="stm-btn-primary stm-btn-block" onClick={() => onSave([...selected])}>
          Submit
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEAMS CONFIRMATION MODAL
═══════════════════════════════════════════ */
function TeamsConfirmModal({ teams, saving, onClose, onSave }) {
  const [activeId, setActiveId] = useState(teams[0]?.id);
  const activeTeam = teams.find(t => t.id === activeId) || teams[0];

  return (
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal stm-modal--confirm stm-modal--teams-confirm" onClick={e => e.stopPropagation()}>
        <h3 className="stm-confirm-title">CONFIRMATION</h3>
        <div className="stm-confirm-grid stm-confirm-grid--teams">
          <div className="stm-confirm-col">
            <h4>TEAMS</h4>
            {teams.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`stm-team-conf-row ${activeTeam?.id === t.id ? 'stm-team-conf-row--active' : ''}`}
                onClick={() => setActiveId(t.id)}
              >
                <span className="stm-team-conf-row__num">{i + 1}</span>
                {t.logo
                  ? <img src={t.logo} alt="" className="stm-team-conf-row__logo-img" />
                  : <span className="stm-team-conf-row__dot" style={{ background: t.color }} />
                }
                <span className="stm-team-conf-row__name">{t.name}</span>
                <span className="stm-team-conf-row__badge">{t.sportIds.length}</span>
              </button>
            ))}
          </div>
          <div className="stm-confirm-col">
            <h4>{activeTeam?.name?.toUpperCase() || 'TEAM'}</h4>
            {(activeTeam?.sportIds || []).length === 0
              ? <p className="stm-empty-note">No sports selected.</p>
              : (activeTeam?.sportIds || []).map(s => (
                <div key={s} className="stm-confirm-cell">{s}</div>
              ))
            }
          </div>
        </div>
        <button className="stm-btn-primary stm-btn-block" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function SportsTeamsManager({ level }) {
  const [sportsRows,  setSportsRows]  = useState([]);
  const [teamsRows,   setTeamsRows]   = useState([]);
  const [sportsList,  setSportsList]  = useState([]);
  const [teamsList,   setTeamsList]   = useState([]);

  const [catTarget,         setCatTarget]         = useState(null); // sport row id
  const [pickerTarget,      setPickerTarget]      = useState(null); // team row id
  const [showSportsConfirm, setShowSportsConfirm] = useState(false);
  const [showTeamsConfirm,  setShowTeamsConfirm]  = useState(false);

  const [previewSport, setPreviewSport] = useState('');
  const [previewTeam,  setPreviewTeam]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState('');

  /* ── Load from Firestore ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getSportsTeamsConfig(level);
      const sports = (cfg.sports || []).map(s => ({
        ...ensureId(s),
        logo: s.logo || null,
        categoryGroups: (s.categoryGroups || (s.categories
          ? [{ id: uid(), label: 'DIVISION', divisions: s.categories.map(ensureId) }]
          : [])).map(g => ({ ...ensureId(g), divisions: (g.divisions || []).map(ensureId) })),
      }));
      const teams = (cfg.teams || []).map(t => ({
        ...ensureId(t),
        logo: t.logo || null,
        sportIds: t.sportIds || [],
        color: t.color || TEAM_COLORS[0],
      }));
      setSportsList(sports);
      setTeamsList(teams);
      setPreviewSport(sports[0]?.name || '');
      setPreviewTeam('');   // always start blank so "Team Name" placeholder shows
      setSportsRows([]);
      setTeamsRows([]);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  /* ── Sport row helpers ── */
  const setSportsCount = (n) => setSportsRows(prev => {
    const next = [...prev];
    while (next.length < n) next.push({ id: uid(), name: '', logo: null, categoryGroups: [] });
    while (next.length > n) next.pop();
    return next;
  });
  const updateSportRow = (id, patch) =>
    setSportsRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const resetSportsForm = () => setSportsRows([]);

  const submitSports = () => {
    if (!sportsRows.some(r => r.name.trim())) { flash('Enter at least one sport name.'); return; }
    setShowSportsConfirm(true);
  };

  const saveSports = async () => {
    const cleaned = sportsRows.filter(r => r.name.trim());
    const merged  = [
      ...sportsList.filter(s => !cleaned.some(c => c.name === s.name)),
      ...cleaned,
    ];
    // Update local state immediately so preview reflects changes right away
    setSportsList(merged);
    setPreviewSport(merged[0]?.name || '');
    setSportsRows([]);
    setShowSportsConfirm(false);
    // Then persist to Firestore in background
    setSaving(true);
    try {
      await saveSportsConfig(level, merged);
      flash('✓ Sports saved!');
    } catch (e) {
      console.error(e);
      flash('Saved locally — Firestore sync failed.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Team row helpers ── */
  const setTeamsCount = (n) => setTeamsRows(prev => {
    const next = [...prev];
    while (next.length < n) next.push({ id: uid(), name: '', logo: null, sportIds: [], color: TEAM_COLORS[next.length % TEAM_COLORS.length] });
    while (next.length > n) next.pop();
    return next;
  });
  const updateTeamRow = (id, patch) =>
    setTeamsRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const submitTeams = () => {
    if (!teamsRows.some(r => r.name.trim())) { flash('Enter at least one team name.'); return; }
    setShowTeamsConfirm(true);
  };

  const saveTeams = async () => {
    const cleaned = teamsRows.filter(r => r.name.trim());
    const merged  = [
      ...teamsList.filter(t => !cleaned.some(c => c.name === t.name)),
      ...cleaned,
    ];
    // Update local state immediately so preview reflects changes right away
    setTeamsList(merged);
    setPreviewTeam('');   // reset to placeholder so user picks manually
    setTeamsRows([]);
    setShowTeamsConfirm(false);
    // Then persist to Firestore in background
    setSaving(true);
    try {
      await saveTeamsConfig(level, merged);
      flash('✓ Teams saved!');
    } catch (e) {
      console.error(e);
      flash('Saved locally — Firestore sync failed.');
    } finally {
      setSaving(false);
    }
  };

  const resetTeamsForm = () => {
    setTeamsRows([]);
  };

  /* ── Derived ── */
  const catSportRow  = sportsRows.find(r => r.id === catTarget)     || null;
  const pickerTeam   = teamsRows.find(r => r.id === pickerTarget)   || null;
  const activeSport  = sportsList.find(s => s.name === previewSport) || null;
  const activeTeam   = teamsList.find(t => t.name === previewTeam)  || null;

  const flatDivisions = (sport) =>
    (sport?.categoryGroups || []).flatMap(g => {
      const divs = g.divisions || [];
      if (divs.length === 0) {
        // No sub-divisions: represent the category group itself
        return [{ id: g.id + '_lbl', name: g.label, format: '', groupLabel: g.label }];
      }
      return divs.map(d => ({
        ...d,
        name: d.name || g.label, // fall back to group label if division name is blank
        groupLabel: g.label,
      }));
    });

  const totalDivisions = (sport) => flatDivisions(sport).length;

  return (
    <div className="stm-wrap">
      {toast   && <div className="stm-toast">{toast}</div>}
      {loading && <div className="stm-loading">Loading…</div>}

      {/* ════════ SPORTS FORM ════════ */}
      <div className="stm-card">
        <div className="stm-card__head">
          <FaRunning className="stm-card__icon" />
          <div>
            <h3>SPORTS</h3>
            <p>Add sport that will be part of the event.</p>
          </div>
        </div>

        <div className="stm-form-toprow">
          <NumDropdown value={sportsRows.length || null} onChange={setSportsCount} label="Number of sport" />
          <button type="button" className="stm-link-btn" onClick={() => setSportsCount(sportsRows.length + 1)}>
            <FaPlus /> To add category
          </button>
        </div>

        {sportsRows.length > 0 && (
          <div className="stm-table-wrap">
            <table className="stm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sports Name</th>
                  <th>Logo</th>
                  <th>Categories</th>
                  <th>Division</th>
                  <th />
                </tr>
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
                    <td>
                      <LogoUpload
                        logo={row.logo}
                        onUpload={(b64) => updateSportRow(row.id, { logo: b64 })}
                      />
                    </td>
                    <td className="stm-td-center">
                      {row.categoryGroups.length > 0 ? row.categoryGroups.length : '—'}
                    </td>
                    <td>
                      <div className="stm-cat-count-cell">
                        <span className="stm-cat-badge">{totalDivisions(row) || '—'}</span>
                        <button
                          type="button"
                          className="stm-plus-btn"
                          title="Set categories & divisions"
                          onClick={() => setCatTarget(row.id)}
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="stm-dots-btn"
                        onClick={() => updateSportRow(row.id, { _del: !row._del })}
                        title="Remove"
                      >
                        <FaEllipsisV />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="stm-form-actions">
          <button type="button" className="stm-btn-ghost" onClick={resetSportsForm}>
            <FaSync style={{ marginRight: 5, fontSize: '0.7rem' }} /> Reset
          </button>
          <button type="button" className="stm-btn-primary" onClick={submitSports} disabled={saving}>Submit</button>
        </div>
      </div>

      {/* ════════ SPORTS PREVIEW ════════ */}
      <div className="stm-card stm-card--preview">
        <h4 className="stm-preview-title">PREVIEW</h4>
        <p className="stm-preview-sub">Select a sport to view its categories/divisions.</p>

        <div className="stm-preview-row">
          <div className="stm-preview-block">
            <span className="stm-preview-label">SPORTS</span>
            <div className="stm-preview-dd-wrap">
              <select
                className="stm-preview-dd"
                value={previewSport}
                onChange={e => setPreviewSport(e.target.value)}
              >
                {(!previewSport || sportsList.length === 0) && (
                  <option value="" disabled>Sport Name</option>
                )}
                {sportsList.map(s => (
                  <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>
                ))}
              </select>
              <FaChevronDown className="stm-preview-dd__arrow" />
            </div>
          </div>

          <div className="stm-preview-block">
            <span className="stm-preview-label">CATEGORIES/ DIVISION</span>
            <ul className="stm-preview-list">
              {sportsList.length === 0 ? (
                <li className="stm-empty-note">No sports saved yet.</li>
              ) : flatDivisions(activeSport).length === 0 ? (
                <li className="stm-empty-note">No categories set.</li>
              ) : (
                flatDivisions(activeSport).map((d, i) => (
                  <li key={d.id || i}>{d.name}</li>
                ))
              )}
            </ul>
          </div>

          <div className="stm-preview-block">
            <span className="stm-preview-label">SPORTS FORMAT</span>
            <ul className="stm-preview-list">
              {flatDivisions(activeSport).length === 0 ? (
                <li className="stm-empty-note">—</li>
              ) : (
                flatDivisions(activeSport).map((d, i) => {
                  const f = FORMAT_OPTIONS.find(o => o.id === d.format);
                  return <li key={d.id || i}>{f ? f.label : '—'}</li>;
                })
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* ════════ TEAMS FORM ════════ */}
      <div className="stm-card">
        <div className="stm-card__head">
          <FaUsers className="stm-card__icon" />
          <div>
            <h3>TEAMS</h3>
            <p>Add teams that will participate in the selected sports.</p>
          </div>
        </div>

        <div className="stm-form-toprow">
          <NumDropdown value={teamsRows.length || null} onChange={setTeamsCount} label="Number of team" />
          <button type="button" className="stm-link-btn" onClick={() => setTeamsCount(teamsRows.length + 1)}>
            <FaPlus /> To select sports that team participating
          </button>
        </div>

        {teamsRows.length > 0 && (
          <div className="stm-table-wrap">
            <table className="stm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team Name</th>
                  <th>Logo</th>
                  <th>Sports</th>
                </tr>
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
                    <td>
                      <LogoUpload
                        logo={row.logo}
                        onUpload={(b64) => updateTeamRow(row.id, { logo: b64 })}
                      />
                    </td>
                    <td>
                      <div className="stm-cat-count-cell">
                        <span className="stm-cat-badge">{row.sportIds.length || '—'}</span>
                        <button
                          type="button"
                          className="stm-plus-btn"
                          title="Select sports"
                          onClick={() => setPickerTarget(row.id)}
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="stm-form-actions">
          <button type="button" className="stm-btn-ghost" onClick={resetTeamsForm}>
            <FaSync style={{ marginRight: 5, fontSize: '0.7rem' }} /> Reset
          </button>
          <button type="button" className="stm-btn-primary" onClick={submitTeams} disabled={saving}>Submit</button>
        </div>
      </div>

      {/* ════════ TEAMS PREVIEW ════════ */}
      <div className="stm-card stm-card--preview">
        <h4 className="stm-preview-title">PREVIEW</h4>
        <p className="stm-preview-sub">Select a team to view what sports they participate in.</p>

        <div className="stm-preview-row stm-preview-row--teams">
          <div className="stm-preview-block">
            <span className="stm-preview-label">Teams</span>
            <div className="stm-preview-dd-wrap">
              <select
                className="stm-preview-dd"
                value={previewTeam}
                onChange={e => setPreviewTeam(e.target.value)}
              >
                {/* Placeholder shown when no team selected or no teams saved */}
                {(!previewTeam || teamsList.length === 0) && (
                  <option value="" disabled>Team Name</option>
                )}
                {teamsList.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <FaChevronDown className="stm-preview-dd__arrow" />
            </div>
          </div>

          <div className="stm-preview-block stm-preview-block--wide">
            <span className="stm-preview-label">Sports</span>
            {teamsList.length === 0 ? (
              <p className="stm-empty-note">No teams saved yet. Add and submit teams above.</p>
            ) : !activeTeam ? (
              <p className="stm-empty-note">Select a team to see their sports.</p>
            ) : activeTeam.sportIds.length === 0 ? (
              <p className="stm-empty-note">No sports assigned to this team.</p>
            ) : (
              <ul className="stm-preview-list stm-preview-list--cols">
                {activeTeam.sportIds.map(s => <li key={s}>{s}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ════════ MODALS ════════ */}
      {catSportRow && (
        <CategoryModal
          sport={catSportRow}
          onClose={() => setCatTarget(null)}
          onSave={(groups) => {
            updateSportRow(catSportRow.id, { categoryGroups: groups });
            setCatTarget(null);
          }}
        />
      )}

      {showSportsConfirm && (
        <SportsConfirmModal
          sports={sportsRows.filter(r => r.name.trim())}
          saving={saving}
          onClose={() => setShowSportsConfirm(false)}
          onSave={saveSports}
        />
      )}

      {pickerTeam && (
        <TeamSportsPickerModal
          team={pickerTeam}
          sportsList={sportsList.length ? sportsList : sportsRows.filter(r => r.name.trim())}
          onClose={() => setPickerTarget(null)}
          onSave={(ids) => {
            updateTeamRow(pickerTeam.id, { sportIds: ids });
            setPickerTarget(null);
          }}
        />
      )}

      {showTeamsConfirm && (
        <TeamsConfirmModal
          teams={teamsRows.filter(r => r.name.trim())}
          saving={saving}
          onClose={() => setShowTeamsConfirm(false)}
          onSave={saveTeams}
        />
      )}
    </div>
  );
}