import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChevronDown, FaTrophy, FaPlus, FaTimes, FaCheck, FaEdit,
  FaExclamationTriangle, FaUsers, FaLock, FaInfo,
} from 'react-icons/fa';
import './ModeratorPage.css';
import {
  getSportsTeamsConfig,
  getMatchSchedules,
  getMatchRecords,
  upsertMatchRecord,
  getTeamRankings,
  saveTeamRankings,
} from '../services/firestoreService';

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const LEVELS = [
  { key: 'elementary', label: 'Elementary' },
  { key: 'highSchool', label: 'High School' },
  { key: 'college', label: 'College' },
];

const GAME_FORMATS = [
  { id: 'solo-time', label: 'Single Play (Solo Time)' },
  { id: 'solo-points', label: 'Single Play (Solo Points)' },
  { id: 'team-play', label: 'Team Play' },
];

const DEFAULT_POINTS = 1000;
const uid = () => Math.random().toString(36).slice(2, 10);

/* Map a division's saved format id (from Sports & Teams) to one of
   the 3 game-format buckets used on this screen. */
function bucketForFormat(formatId) {
  if (formatId === 'single-time') return 'solo-time';
  if (formatId === 'single-solo' || formatId === 'single-group') return 'solo-points';
  if (formatId === 'team-play') return 'team-play';
  return 'solo-points';
}

/* Same flattening logic Sports & Teams uses: one row per division,
   falling back to the category-group label when a division has no
   name of its own. Keeps Moderator perfectly in sync with Admin. */
function flatDivisions(sport) {
  return (sport?.categoryGroups || []).flatMap((g) => {
    const divs = g.divisions || [];
    if (divs.length === 0) return [{ id: `${g.id}_lbl`, name: g.label, format: '', groupLabel: g.label }];
    return divs.map((d) => ({ ...d, name: d.name || g.label, groupLabel: g.label }));
  });
}

/* Flattens every sport into "Sport + Division" picker options, e.g.
   "Chess Men", matching the Select Sport mock exactly. */
function buildSportOptions(sports) {
  const opts = [];
  (sports || []).forEach((sport) => {
    const divs = flatDivisions(sport);
    if (divs.length === 0) {
      opts.push({
        key: sport.id, sportId: sport.id, sportName: sport.name,
        label: sport.name, category: '', logo: sport.logo, format: '',
      });
    } else {
      divs.forEach((d) => {
        opts.push({
          key: `${sport.id}__${d.id}`, sportId: sport.id, sportName: sport.name,
          label: `${sport.name} ${d.name}`.trim(), category: d.name,
          logo: sport.logo, format: d.format || '',
        });
      });
    }
  });
  return opts;
}

/* One row per sport (no division baked in) — feeds the "Select sport" dropdown. */
function buildSportOnlyOptions(sports) {
  return (sports || []).map((sport) => ({
    key: sport.id, sportId: sport.id, label: sport.name, logo: sport.logo,
  }));
}

/* Divisions belonging to a single sport — feeds the "Select division" dropdown.
   Sports with no configured divisions yield an empty list, which the UI
   treats as "this sport has nothing to pick" rather than an error.
   Prefixes the category-group label (e.g. "MEN") onto the division name
   when they differ, so two divisions that share a name across groups
   (e.g. "MEN 5v5" vs "WOMEN 5v5") stay distinguishable in the dropdown —
   and, since this combined string is also what gets used as `category`,
   distinguishable in the saved schedule/record data too. */
function buildDivisionOptionsForSport(sport) {
  if (!sport) return [];
  return flatDivisions(sport).map((d) => {
    const name = (d.name || '').trim();
    const group = (d.groupLabel || '').trim();
    const label = (group && norm(group) !== norm(name)) ? `${group} ${name}`.trim() : name;
    return { key: d.id, label, category: label, format: d.format || '' };
  });
}

/* Case/whitespace-insensitive compare — schedules & team.sportIds store
   sport/team *names* (free text from Admin), never ids, so every match
   against those needs to go through this rather than ===. */
function norm(str) {
  return (str || '').trim().toLowerCase();
}

/* Today as 'YYYY-MM-DD', matching the <input type="date"> format Admin's
   schedule saves — plain string comparison against that sorts correctly. */
function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Fallback for when Sports & Teams (sportsTeamsConfig/{level}) is empty
   even though matches have already been scheduled for this level — e.g.
   it was reset separately, or never (re)saved after a data wipe. Rebuilds
   a sport/division list straight from the schedule rows Admin already
   created, so Moderator isn't stuck with an empty picker. Only used when
   the real config has nothing. */
function deriveSportsFromSchedules(schedules) {
  const bySport = new Map();
  (schedules || []).forEach((s) => {
    if (!s.sport) return;
    const key = norm(s.sport);
    if (!bySport.has(key)) {
      bySport.set(key, { id: `sched__${key}`, name: s.sport, logo: null, categoryGroups: [] });
    }
    const sport = bySport.get(key);
    if (s.category) {
      const catKey = norm(s.category);
      if (!sport.categoryGroups.some((g) => norm(g.label) === catKey)) {
        sport.categoryGroups.push({
          id: `${sport.id}__${catKey}`, label: s.category,
          divisions: [{ id: `${sport.id}__${catKey}__d`, name: s.category, format: '' }],
        });
      }
    }
  });
  return [...bySport.values()];
}

/* Same idea for the team roster: pulled from teamA/teamB names + logos
   already saved on each schedule row, when Sports & Teams has no teams. */
function deriveTeamsFromSchedules(schedules) {
  const byName = new Map();
  (schedules || []).forEach((s) => {
    [[s.teamA, s.teamALogo], [s.teamB, s.teamBLogo]].forEach(([name, logo]) => {
      if (!name) return;
      const key = norm(name);
      if (!byName.has(key)) {
        byName.set(key, { id: `sched-team__${key}`, name, logo: logo || null, sportIds: s.sport ? [s.sport] : [] });
      } else if (s.sport && !byName.get(key).sportIds.includes(s.sport)) {
        byName.get(key).sportIds.push(s.sport);
      }
    });
  });
  return [...byName.values()];
}

/* "HH:MM:SS" / "MM:SS" free-typed duration -> minutes (float), or null */
function parseDuration(str) {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split(':').map((p) => p.trim());
  if (parts.some((p) => p === '' || isNaN(Number(p)))) return null;
  let h = 0, s = 0, m;
  if (parts.length === 3) { [h, m, s] = parts.map(Number); }
  else if (parts.length === 2) { [m, s] = parts.map(Number); }
  else if (parts.length === 1) { [m] = parts.map(Number); }
  else return null;
  const total = h * 60 + m + s / 60;
  return isNaN(total) ? null : total;
}

function formatMinutes(mins) {
  if (mins == null) return '--';
  return `${Number.isInteger(mins) ? mins : mins.toFixed(2)} mins`;
}

function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

/* ═══════════════════════════════════════════
   LEVELS BUTTON (top-right header)
═══════════════════════════════════════════ */
function LevelsButton({ levelKey, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = LEVELS.find((l) => l.key === levelKey) || LEVELS[1];

  return (
    <div ref={wrapRef} className="mp-lvls-wrap">
      <button className="mp-lvls-btn" onClick={() => setOpen((p) => !p)} aria-haspopup="listbox" aria-expanded={open}>
        {current.label}
        <span className={`mp-lvls-btn__arrow ${open ? 'mp-lvls-btn__arrow--open' : ''}`}><FaChevronDown /></span>
      </button>
      <div className={`mp-lvls-dropdown ${open ? 'mp-lvls-dropdown--open' : ''}`} role="listbox">
        {LEVELS.map((l) => (
          <button key={l.key} className="mp-lvls-dropdown__item" role="option" aria-selected={levelKey === l.key}
            onClick={() => { onChange(l.key); setOpen(false); }}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GENERIC OPTION DROPDOWN
   variant: 'navy' (Sports option / Game format) | 'teams' (Teams)
═══════════════════════════════════════════ */
function OptionDropdown({
  panelLabel, value, placeholder, options, onChange,
  variant = 'navy', disabled = false, renderOption,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = options.find((o) => o.key === value);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {variant === 'navy' || variant === 'pill' ? (
        <button
          type="button"
          className={`mp-sport-trigger ${variant === 'pill' ? 'mp-sport-trigger--pill' : ''}`}
          disabled={disabled}
          onClick={() => setOpen((p) => !p)}
        >
          <span>{!selected && variant === 'pill' && <span className="mp-sport-required">*</span>}{selected ? selected.label : (placeholder || 'Select')}</span>
          <span className={`mp-sport-trigger__arrow ${open ? 'mp-sport-trigger__arrow--open' : ''}`}><FaChevronDown /></span>
        </button>
      ) : (
        <button
          type="button"
          className={`mp-select-trigger ${!selected ? 'mp-select-trigger--placeholder' : ''}`}
          disabled={disabled}
          onClick={() => setOpen((p) => !p)}
        >
          <span>{selected ? selected.label : (placeholder || 'Select')}</span>
          <FaChevronDown style={{ fontSize: '0.7rem', flexShrink: 0, opacity: 0.6 }} />
        </button>
      )}

      <div className={`mp-dd-panel ${variant === 'teams' ? 'mp-dd-panel--teams' : ''} ${open ? 'mp-dd-panel--open' : ''}`}>
        {panelLabel && <div className="mp-dd-panel__label">{panelLabel}</div>}
        {options.length === 0 ? (
          <div className="mp-dd-panel__label" style={{ padding: '10px 6px', textTransform: 'none', fontSize: '0.78rem' }}>
            Nothing available yet
          </div>
        ) : options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`mp-dd-option ${o.key === value ? 'mp-dd-option--active' : ''}`}
            onClick={() => { onChange(o.key); setOpen(false); }}
          >
            {renderOption ? renderOption(o) : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INFO TOOLTIP
═══════════════════════════════════════════ */
function InfoTip({ caption, children }) {
  return (
    <span className="mp-info-btn" tabIndex={0}>
      <FaInfo style={{ fontSize: '0.5rem' }} />
      <span className="mp-tooltip">
        <span className="mp-tooltip__cap">{caption}</span>
        <span className="mp-tooltip__body">{children}</span>
      </span>
    </span>
  );
}

/* ═══════════════════════════════════════════
   VIOLATIONS MODAL
═══════════════════════════════════════════ */
function ViolationsModal({ sideLabel, teamLabel, teamLogo, initialRows, onClose, onSubmit }) {
  const [rows, setRows] = useState(initialRows.length ? initialRows : []);
  const [bump, setBump] = useState(false);

  const total = rows.reduce((sum, r) => sum + (parseInt(r.count, 10) || 0), 0);

  useEffect(() => { setBump(true); const t = setTimeout(() => setBump(false), 300); return () => clearTimeout(t); }, [total]);

  const addSlot = () => setRows((r) => [...r, { id: uid(), type: '', count: '' }]);
  const updateRow = (id, patch) => setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeRow = (id) => setRows((r) => r.filter((row) => row.id !== id));

  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-viol-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="mp-viol-label">Violations</div>
        <div className="mp-modal" style={{ maxWidth: 460, position: 'relative' }}>
          <button className="mp-modal-close-x" onClick={onClose} aria-label="Close"><FaTimes /></button>

          <div className="mp-viol-heading">{sideLabel} violations</div>

          <div className="mp-viol-head">
            <div className="mp-viol-team">
              <div className="mp-viol-team-logo">
                {teamLogo ? <img src={teamLogo} alt="" /> : initials(teamLabel)}
              </div>
              <div className="mp-viol-team-name">{teamLabel || 'Select a team'}</div>
            </div>
            <div className="mp-viol-total">
              <div className="mp-viol-total__label">Total violations</div>
              <div className={`mp-viol-total__num ${bump ? 'mp-violation-box__num--bump' : ''}`}>{total}</div>
            </div>
          </div>

          <button type="button" className="mp-viol-add" onClick={addSlot}><FaPlus /> Add slot</button>

          <table className="mp-viol-table">
            <thead>
              <tr>
                <th>Type of violation</th>
                <th style={{ width: 110 }}>No. of violation</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={3} style={{ color: '#8593ad', fontWeight: 500 }}>No violations logged yet.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="text" placeholder="*Input type of violation" value={row.type}
                      onChange={(e) => updateRow(row.id, { type: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="0" placeholder="*No." value={row.count}
                      onChange={(e) => updateRow(row.id, { count: e.target.value })}
                    />
                  </td>
                  <td>
                    <button className="mp-viol-remove" onClick={() => removeRow(row.id)} aria-label="Remove"><FaTimes /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mp-viol-actions">
            <button className="mp-btn mp-btn--gray" onClick={onClose}>Cancel</button>
            <button
              className="mp-btn mp-btn--submit"
              onClick={() => onSubmit(rows.filter((r) => r.type.trim() || r.count !== ''))}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONFIRMATION MODAL
═══════════════════════════════════════════ */
function ConfirmModal({ pending, levelLabel, onCancel, onConfirm, saving }) {
  const { sportName, category, teamA, teamB, winner } = pending;
  const winnerTeam = winner === 'A' ? teamA : teamB;

  return (
    <div className="mp-modal-overlay" onClick={saving ? undefined : onCancel}>
      <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="mp-confirm__title">Confirmation match result</h2>
        <div className="mp-confirm__meta">
          <span>Level: <b>{levelLabel}</b></span>
          <span>Sport: <b>{sportName}</b></span>
          <span>Division: <b>{category || '—'}</b></span>
        </div>

        <div className="mp-confirm__winner"><FaTrophy /> Winner: {winnerTeam.name}</div>

        <div className="mp-confirm__teams">
          <div className="mp-confirm__team">
            <div className="mp-confirm__team-name">{teamA.name}</div>
            <div className="mp-confirm__logo">{teamA.logo ? <img src={teamA.logo} alt="" /> : initials(teamA.name)}</div>
            <div className="mp-confirm__stat-row">
              <div className="mp-confirm__stat"><div className="mp-confirm__stat-label">Time</div><div className="mp-confirm__stat-num">{formatMinutes(teamA.minutes)}</div></div>
              <div className="mp-confirm__stat"><div className="mp-confirm__stat-label">Prev pts</div><div className="mp-confirm__stat-num">{teamA.prevPoints}</div></div>
              <div className="mp-confirm__stat"><div className="mp-confirm__stat-label">Final pts</div><div className="mp-confirm__stat-num">{teamA.finalPoints}</div></div>
            </div>
            <div className="mp-confirm__facts">
              <div>Time difference: <b>{pending.timeDiff.toFixed(2)}</b></div>
              <div>Violations: <b>{teamA.totalViolations}</b></div>
              <div>Standing: <b>{winner === 'A' ? 'Winner' : 'Loser'}</b></div>
              <div>Comeback: <b>{teamA.comeback ? 'Yes' : 'No'}</b></div>
              <div>Score change: <b className={teamA.change >= 0 ? 'mp-gain' : 'mp-loss'}>{teamA.change >= 0 ? '+' : ''}{teamA.change.toFixed(2)}</b></div>
            </div>
          </div>

          <div className="mp-confirm__vs">VS</div>

          <div className="mp-confirm__team">
            <div className="mp-confirm__team-name">{teamB.name}</div>
            <div className="mp-confirm__logo">{teamB.logo ? <img src={teamB.logo} alt="" /> : initials(teamB.name)}</div>
            <div className="mp-confirm__stat-row">
              <div className="mp-confirm__stat"><div className="mp-confirm__stat-label">Time</div><div className="mp-confirm__stat-num">{formatMinutes(teamB.minutes)}</div></div>
              <div className="mp-confirm__stat"><div className="mp-confirm__stat-label">Prev pts</div><div className="mp-confirm__stat-num">{teamB.prevPoints}</div></div>
              <div className="mp-confirm__stat"><div className="mp-confirm__stat-label">Final pts</div><div className="mp-confirm__stat-num">{teamB.finalPoints}</div></div>
            </div>
            <div className="mp-confirm__facts">
              <div>Time difference: <b>{pending.timeDiff.toFixed(2)}</b></div>
              <div>Violations: <b>{teamB.totalViolations}</b></div>
              <div>Standing: <b>{winner === 'B' ? 'Winner' : 'Loser'}</b></div>
              <div>Comeback: <b>{teamB.comeback ? 'Yes' : 'No'}</b></div>
              <div>Score change: <b className={teamB.change >= 0 ? 'mp-gain' : 'mp-loss'}>{teamB.change >= 0 ? '+' : ''}{teamB.change.toFixed(2)}</b></div>
            </div>
          </div>
        </div>

        <div className="mp-confirm__compute">
          <div className="mp-confirm__compute-title">Summary computation</div>
          <div className="mp-confirm__compute-row">
            <span className="mp-confirm__compute-team">{teamA.name}</span>
            <span>
              Computation: {pending.timeDiff.toFixed(2)} time difference ({formatMinutes(teamA.minutes)}) {winner === 'A' ? '+' : '-'} {teamA.totalViolations} (violation)
              {' '}{winner === 'A' ? '+ 30 (winner)' : '- 30 (loser)'} {teamA.comeback ? '+ 10 (comeback)' : '+ 0 (no comeback)'} / 4 =
              {' '}<span className={teamA.change >= 0 ? 'mp-gain' : 'mp-loss'}>{teamA.change >= 0 ? '+' : ''}{teamA.change.toFixed(2)} ({teamA.change >= 0 ? 'gained' : 'lost'} points)</span>
            </span>
          </div>
          <div className="mp-confirm__compute-row">
            <span className="mp-confirm__compute-team">{teamB.name}</span>
            <span>
              Computation: {pending.timeDiff.toFixed(2)} time difference ({formatMinutes(teamB.minutes)}) {winner === 'B' ? '+' : '-'} {teamB.totalViolations} (violation)
              {' '}{winner === 'B' ? '+ 30 (winner)' : '- 30 (loser)'} {teamB.comeback ? '+ 10 (comeback)' : '+ 0 (no comeback)'} / 4 =
              {' '}<span className={teamB.change >= 0 ? 'mp-gain' : 'mp-loss'}>{teamB.change >= 0 ? '+' : ''}{teamB.change.toFixed(2)} ({teamB.change >= 0 ? 'gained' : 'lost'} points)</span>
            </span>
          </div>
        </div>

        <div className="mp-confirm__warn"><FaExclamationTriangle /> This action cannot be undone. Please review all details before confirming.</div>

        <div className="mp-confirm__actions">
          <button className="mp-btn mp-btn--cancel" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="mp-btn mp-btn--confirm" onClick={onConfirm} disabled={saving}>
            <FaLock /> {saving ? 'Saving…' : 'Confirm update'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUCCESS MODAL
═══════════════════════════════════════════ */
function SuccessModal({ record, onClose, onViewRanking }) {
  const winner = record.winner === 'A' ? record.teamA : record.teamB;
  const loser = record.winner === 'A' ? record.teamB : record.teamA;
  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-modal mp-result-modal mp-result-modal--success" onClick={(e) => e.stopPropagation()}>
        <button className="mp-result-close" onClick={onClose} aria-label="Close"><FaTimes /></button>
        <div className="mp-result-icon mp-result-icon--success"><FaCheck /></div>
        <h2 className="mp-result-title">Match record updated successfully!</h2>
        <p className="mp-result-sub">{winner.name} defeated {loser.name}</p>
        <div className="mp-result-score">Final score: {winner.finalPoints} - {loser.finalPoints}</div>
        <div className="mp-result-actions">
          <button className="mp-btn mp-btn--white" onClick={onClose}>Cancel</button>
          <button className="mp-btn mp-btn--navy-solid" onClick={onViewRanking}>View ranking</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INVALID MODAL
═══════════════════════════════════════════ */
function InvalidModal({ reasons, onClose }) {
  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-modal mp-result-modal mp-result-modal--error" onClick={(e) => e.stopPropagation()}>
        <button className="mp-result-close" onClick={onClose} aria-label="Close"><FaTimes /></button>
        <div className="mp-result-icon mp-result-icon--error"><FaExclamationTriangle /></div>
        <h2 className="mp-result-title">Invalid match result</h2>
        <p className="mp-result-sub">Please complete the following</p>
        {reasons.length > 0 && (
          <ul className="mp-result-list">
            {reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
        <div className="mp-result-actions">
          <button className="mp-btn mp-btn--danger-solid" onClick={onClose} style={{ flex: 1 }}>Ok</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEAM PANEL (Team 1 / Team 2 form column)
═══════════════════════════════════════════ */
function TeamPanel({
  side, teamLabel, teamOptions, teamId, onTeamChange,
  time, onTimeChange, totalViolations, onOpenViolations,
  comeback, onComebackChange, prevPoints, finalPoints,
  winner, onMarkWinner,
}) {
  const isWinner = winner === side;
  // Status label always reflects reality: once a winner is marked, the
  // *other* side's segment flips to "Lose" (this used to stay stuck on
  // "Win" text just unhighlighted, which read as both teams winning).
  const status = winner ? (isWinner ? 'win' : 'lose') : null;
  const statusText = status === 'win' ? 'Win' : status === 'lose' ? 'Lose' : (side === 'A' ? 'Win' : 'Lose');
  const statusClass = status === 'win' ? 'mp-pill__seg--win' : status === 'lose' ? 'mp-pill__seg--lose' : '';
  const statusSeg = <div className={`mp-pill__seg ${statusClass}`}><FaTrophy /> {statusText}</div>;
  const teamSeg = <div className="mp-pill__seg">{teamLabel}</div>;
  const [vBump, setVBump] = useState(false);
  const prevViol = useRef(totalViolations);
  useEffect(() => {
    if (prevViol.current !== totalViolations) {
      setVBump(true);
      const t = setTimeout(() => setVBump(false), 300);
      prevViol.current = totalViolations;
      return () => clearTimeout(t);
    }
  }, [totalViolations]);

  return (
    <div className="mp-team-panel">
      <div className="mp-field">
        <div className="mp-field__label">{teamLabel}<span className="mp-required">*</span></div>
        <OptionDropdown
          variant="teams"
          panelLabel="Teams"
          value={teamId}
          placeholder="Select team"
          options={teamOptions}
          onChange={onTeamChange}
        />
      </div>

      <div className="mp-field">
        <div className="mp-field__label">
          Time duration<span className="mp-required">*</span>
          <InfoTip caption="Time duration info">Please input the time duration to analyze performance.</InfoTip>
        </div>
        <input
          className="mp-text-input" type="text" placeholder="HH:MM:SS"
          value={time} onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>

      <div className="mp-field">
        <div className="mp-field__label">
          Violation
          <InfoTip caption="Violation info">Click the button to input time duration to analyze performance.</InfoTip>
        </div>
        <div className="mp-violation-row">
          <div className="mp-violation-box">
            <div className="mp-violation-box__label">Total violations</div>
            <div className={`mp-violation-box__num ${vBump ? 'mp-violation-box__num--bump' : ''}`}>{totalViolations}</div>
          </div>
          <button type="button" className="mp-btn mp-btn--navy" onClick={onOpenViolations}>Add/View violation</button>
        </div>
      </div>

      <div className="mp-field">
        <div className="mp-field__label">
          Comeback rule
          <InfoTip caption="Comeback rule info">Set whether the teams are allowed to make a comeback.</InfoTip>
        </div>
        <div className="mp-radio-group">
          <label className="mp-radio">
            <input type="radio" name={`comeback-${side}`} checked={comeback === true} onChange={() => onComebackChange(true)} />
            Yes (the team made a comeback and win the game)
          </label>
          <label className="mp-radio">
            <input type="radio" name={`comeback-${side}`} checked={comeback === false} onChange={() => onComebackChange(false)} />
            No (no comeback)
          </label>
        </div>
      </div>

      <div className="mp-field">
        <div className="mp-points-row">
          <div className="mp-points-box">
            <div className="mp-points-box__label">Total points <span>(auto)</span></div>
            <div className="mp-points-box__num">{prevPoints}</div>
          </div>
          <div className="mp-points-box">
            <div className="mp-points-box__label">Final points rating <span>(auto)</span></div>
            <div className="mp-points-box__num">{finalPoints ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="mp-field">
        <button
          type="button"
          className={`mp-btn mp-btn--winner ${isWinner ? 'mp-btn--winner--active' : ''}`}
          onClick={() => onMarkWinner(side)}
        >
          {isWinner ? <><FaTrophy /> Marked as winner</> : 'Mark as winner'}
        </button>
      </div>

      <div className="mp-pill">
        {side === 'A' ? (<>{teamSeg}{statusSeg}</>) : (<>{statusSeg}{teamSeg}</>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function ModeratorPage() {
  const navigate = useNavigate();

  const [level, setLevel] = useState('highSchool');
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [rankings, setRankings] = useState({});
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Sports & Teams (sportsTeamsConfig/{level}) is the normal source, but if
  // it's empty even though matches have already been scheduled for this
  // level, fall back to building the sport/division/team lists straight
  // from the schedule rows rather than leaving the moderator with nothing
  // to pick from.
  const effectiveSports = useMemo(
    () => (sports.length > 0 ? sports : deriveSportsFromSchedules(schedules)),
    [sports, schedules],
  );
  const effectiveTeams = useMemo(
    () => (teams.length > 0 ? teams : deriveTeamsFromSchedules(schedules)),
    [teams, schedules],
  );
  const usingScheduleFallback = sports.length === 0 && effectiveSports.length > 0;

  const sportOptions = useMemo(() => buildSportOnlyOptions(effectiveSports), [effectiveSports]);
  const [sportId, setSportId] = useState('');
  const selectedSport = effectiveSports.find((s) => s.id === sportId) || null;

  const divisionOptions = useMemo(
    () => buildDivisionOptionsForSport(selectedSport),
    [selectedSport],
  );
  const [divisionKey, setDivisionKey] = useState('');
  const selectedDivision = divisionOptions.find((d) => d.key === divisionKey) || null;
  const divisionRequired = divisionOptions.length > 0;

  // Combines the sport + division picks back into the shape the rest of the
  // form (team matching, validation, confirmation summary) already expects.
  const activeSport = useMemo(() => {
    if (!selectedSport) return null;
    if (!divisionRequired) {
      return { sportId: selectedSport.id, sportName: selectedSport.name, category: '', logo: selectedSport.logo, format: '' };
    }
    if (!selectedDivision) return null;
    return {
      sportId: selectedSport.id, sportName: selectedSport.name,
      category: selectedDivision.category, logo: selectedSport.logo, format: selectedDivision.format,
    };
  }, [selectedSport, divisionRequired, selectedDivision]);

  // form state
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [timeA, setTimeA] = useState('');
  const [timeB, setTimeB] = useState('');
  const [violA, setViolA] = useState([]);
  const [violB, setViolB] = useState([]);
  const [comebackA, setComebackA] = useState(null);
  const [comebackB, setComebackB] = useState(null);
  const [winner, setWinner] = useState(null);
  const [violModal, setViolModal] = useState(null); // 'A' | 'B' | null
  const [pending, setPending] = useState(null);
  const [invalidReasons, setInvalidReasons] = useState(null);
  const [successRecord, setSuccessRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  // summary table
  const [formatFilter, setFormatFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [flashId, setFlashId] = useState(null);

  /* ── load config, schedules, records & rankings whenever the level changes ──
     Promise.allSettled (not .all) so that one denied/failed collection
     doesn't wipe out data that loaded fine from the others — e.g. Sports &
     Teams being blocked by a rules issue shouldn't also blank out
     schedules that loaded successfully. Any failures are surfaced instead
     of failing silently. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      const [configR, schedsR, recsR, ranksR] = await Promise.allSettled([
        getSportsTeamsConfig(level),
        getMatchSchedules(level),
        getMatchRecords(level),
        getTeamRankings(level),
      ]);
      if (cancelled) return;

      const failed = [];
      if (configR.status === 'fulfilled') {
        setSports(configR.value.sports || []);
        setTeams(configR.value.teams || []);
      } else {
        console.error('Failed to load Sports & Teams config:', configR.reason);
        setSports([]); setTeams([]);
        failed.push('Sports & Teams');
      }
      if (schedsR.status === 'fulfilled') {
        setSchedules(schedsR.value || []);
      } else {
        console.error('Failed to load match schedules:', schedsR.reason);
        setSchedules([]);
        failed.push('Match Schedules');
      }
      if (recsR.status === 'fulfilled') {
        setRecords(recsR.value || []);
      } else {
        console.error('Failed to load match records:', recsR.reason);
        setRecords([]);
        failed.push('Match Records');
      }
      if (ranksR.status === 'fulfilled') {
        setRankings(ranksR.value || {});
      } else {
        console.error('Failed to load team rankings:', ranksR.reason);
        setRankings({});
        failed.push('Team Rankings');
      }

      if (failed.length) {
        const reason = [configR, schedsR, recsR, ranksR].find((r) => r.status === 'rejected')?.reason;
        const isPermission = reason?.code === 'permission-denied' || /permission/i.test(reason?.message || '');
        setLoadError(
          isPermission
            ? `Couldn't load ${failed.join(', ')} — your account doesn't have permission to read this data (check Firestore rules).`
            : `Couldn't load ${failed.join(', ')} — check your connection and try refreshing.`,
        );
      }

      setSportId('');
      setDivisionKey('');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [level]);

  const resetForm = useCallback(() => {
    setTeamAId(''); setTeamBId('');
    setTimeA(''); setTimeB('');
    setViolA([]); setViolB([]);
    setComebackA(null); setComebackB(null);
    setWinner(null);
  }, []);

  /* Schedule entries Admin created for the currently selected sport +
     division, regardless of date. */
  const scheduleMatchesForSelection = useMemo(() => {
    if (!activeSport) return [];
    return schedules.filter((s) =>
      norm(s.sport) === norm(activeSport.sportName)
      && (divisionRequired ? norm(s.category) === norm(activeSport.category) : true));
  }, [schedules, activeSport, divisionRequired]);

  /* Of those, the ones actually due — dated today or earlier. Schedule rows
     Admin generated but hasn't dated yet (date: '') never count as "ready". */
  const readyTeamNames = useMemo(() => {
    const today = todayStr();
    const names = new Set();
    scheduleMatchesForSelection.forEach((s) => {
      if (!s.date || s.date > today) return;
      if (s.teamA) names.add(norm(s.teamA));
      if (s.teamB) names.add(norm(s.teamB));
    });
    return names;
  }, [scheduleMatchesForSelection]);

  const hasScheduleForSelection = scheduleMatchesForSelection.length > 0;

  const teamOptionsForSport = useMemo(() => {
    if (!activeSport) return effectiveTeams.map((t) => ({ key: t.id, label: t.name, logo: t.logo }));
    const bySport = effectiveTeams.filter((t) => (t.sportIds || []).includes(activeSport.sportName));
    const pool = bySport.length ? bySport : effectiveTeams;
    // No schedule made for this sport/division yet — fall back to every
    // registered team rather than blocking the moderator entirely.
    if (!hasScheduleForSelection) return pool.map((t) => ({ key: t.id, label: t.name, logo: t.logo }));
    // Schedule exists — only teams with a match dated today or earlier show up.
    return pool
      .filter((t) => readyTeamNames.has(norm(t.name)))
      .map((t) => ({ key: t.id, label: t.name, logo: t.logo }));
  }, [effectiveTeams, activeSport, hasScheduleForSelection, readyTeamNames]);

  const teamA = effectiveTeams.find((t) => t.id === teamAId);
  const teamB = effectiveTeams.find((t) => t.id === teamBId);
  const totalViolA = violA.reduce((s, r) => s + (parseInt(r.count, 10) || 0), 0);
  const totalViolB = violB.reduce((s, r) => s + (parseInt(r.count, 10) || 0), 0);
  const minutesA = parseDuration(timeA);
  const minutesB = parseDuration(timeB);
  const timeDiff = (minutesA != null && minutesB != null) ? Math.abs(minutesA - minutesB) : null;

  const prevPointsA = teamA ? (rankings[teamA.name] ?? DEFAULT_POINTS) : DEFAULT_POINTS;
  const prevPointsB = teamB ? (rankings[teamB.name] ?? DEFAULT_POINTS) : DEFAULT_POINTS;

  function computeChange({ diff, violations, isWinner, comeback }) {
    return (diff - violations + (isWinner ? 30 : -30) + (comeback ? 10 : 0)) / 4;
  }

  const canPreview = timeDiff != null && winner;
  const changeA = canPreview ? computeChange({ diff: timeDiff, violations: totalViolA, isWinner: winner === 'A', comeback: !!comebackA }) : null;
  const changeB = canPreview ? computeChange({ diff: timeDiff, violations: totalViolB, isWinner: winner === 'B', comeback: !!comebackB }) : null;
  const finalPointsA = changeA != null ? Math.round(prevPointsA + changeA) : null;
  const finalPointsB = changeB != null ? Math.round(prevPointsB + changeB) : null;

  const levelLabel = LEVELS.find((l) => l.key === level)?.label || level;

  /* ── validation + update flow ── */
  function handleUpdateClick() {
    const reasons = [];
    if (!selectedSport) reasons.push('Select a sport.');
    if (selectedSport && divisionRequired && !selectedDivision) reasons.push('Select a division.');
    if (!teamA) reasons.push('Select team 1.');
    if (!teamB) reasons.push('Select team 2.');
    if (teamA && teamB && teamA.id === teamB.id) reasons.push('Team 1 and team 2 must be different.');
    if (minutesA == null) reasons.push('Enter a valid time duration for team 1 (HH:MM:SS).');
    if (minutesB == null) reasons.push('Enter a valid time duration for team 2 (HH:MM:SS).');
    if (comebackA === null) reasons.push('Set the comeback rule for team 1.');
    if (comebackB === null) reasons.push('Set the comeback rule for team 2.');
    if (!winner) reasons.push('Mark a winner.');

    if (reasons.length) { setInvalidReasons(reasons); return; }

    const diff = Math.abs(minutesA - minutesB);
    const cA = computeChange({ diff, violations: totalViolA, isWinner: winner === 'A', comeback: !!comebackA });
    const cB = computeChange({ diff, violations: totalViolB, isWinner: winner === 'B', comeback: !!comebackB });

    setPending({
      sportId: activeSport.sportId,
      sportName: activeSport.sportName,
      category: activeSport.category,
      format: activeSport.format,
      timeDiff: diff,
      winner,
      teamA: {
        id: teamA.id, name: teamA.name, logo: teamA.logo, minutes: minutesA,
        totalViolations: totalViolA, violations: violA, comeback: !!comebackA,
        prevPoints: prevPointsA, change: cA, finalPoints: Math.round(prevPointsA + cA),
      },
      teamB: {
        id: teamB.id, name: teamB.name, logo: teamB.logo, minutes: minutesB,
        totalViolations: totalViolB, violations: violB, comeback: !!comebackB,
        prevPoints: prevPointsB, change: cB, finalPoints: Math.round(prevPointsB + cB),
      },
    });
  }

  async function handleConfirm() {
    if (!pending) return;
    setSaving(true);
    const record = {
      id: uid(),
      level,
      sportId: pending.sportId,
      sportName: pending.sportName,
      category: pending.category,
      format: pending.format,
      label: `${pending.sportName} ${pending.category}`.trim(),
      timeDiff: pending.timeDiff,
      winner: pending.winner,
      teamA: pending.teamA,
      teamB: pending.teamB,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const merged = await upsertMatchRecord(level, record);
      setRecords(merged);

      const newRankings = {
        ...rankings,
        [pending.teamA.name]: pending.teamA.finalPoints,
        [pending.teamB.name]: pending.teamB.finalPoints,
      };
      await saveTeamRankings(level, newRankings);
      setRankings(newRankings);

      setPending(null);
      setSuccessRecord(record);
      resetForm();
    } catch (err) {
      console.error(err);
      setInvalidReasons(['Something went wrong while saving. Please try again.']);
      setPending(null);
    } finally {
      setSaving(false);
    }
  }

  /* ── summary table filtering ── */
  const filteredRecords = useMemo(() => {
    if (!formatFilter) return records;
    return records.filter((r) => bucketForFormat(r.format) === formatFilter);
  }, [records, formatFilter]);

  function startEdit(record) {
    setEditingId(record.id);
    setEditDraft({
      teamAId: record.teamA.id,
      teamBId: record.teamB.id,
      totalViolationsA: record.teamA.totalViolations,
      totalViolationsB: record.teamB.totalViolations,
      minutes: record.teamA.minutes ?? '',
      finalPointsA: record.teamA.finalPoints,
      finalPointsB: record.teamB.finalPoints,
    });
  }

  async function saveEdit(record) {
    const teamAObj = effectiveTeams.find((t) => t.id === editDraft.teamAId) || { id: record.teamA.id, name: record.teamA.name, logo: record.teamA.logo };
    const teamBObj = effectiveTeams.find((t) => t.id === editDraft.teamBId) || { id: record.teamB.id, name: record.teamB.name, logo: record.teamB.logo };

    const updated = {
      ...record,
      teamA: {
        ...record.teamA,
        id: teamAObj.id, name: teamAObj.name, logo: teamAObj.logo,
        totalViolations: parseInt(editDraft.totalViolationsA, 10) || 0,
        minutes: editDraft.minutes === '' ? record.teamA.minutes : Number(editDraft.minutes),
        finalPoints: parseInt(editDraft.finalPointsA, 10) || 0,
      },
      teamB: {
        ...record.teamB,
        id: teamBObj.id, name: teamBObj.name, logo: teamBObj.logo,
        totalViolations: parseInt(editDraft.totalViolationsB, 10) || 0,
        minutes: editDraft.minutes === '' ? record.teamB.minutes : Number(editDraft.minutes),
        finalPoints: parseInt(editDraft.finalPointsB, 10) || 0,
      },
      updatedAt: Date.now(),
    };

    const merged = await upsertMatchRecord(level, updated);
    setRecords(merged);

    const newRankings = {
      ...rankings,
      [updated.teamA.name]: updated.teamA.finalPoints,
      [updated.teamB.name]: updated.teamB.finalPoints,
    };
    await saveTeamRankings(level, newRankings);
    setRankings(newRankings);

    setEditingId(null);
    setEditDraft(null);
    setFlashId(updated.id);
    setTimeout(() => setFlashId(null), 1100);
  }

  return (
    <div className="mp-page">
      <header className="mp-header">
        <h1 className="mp-header__title">Santa Rita College of Pampanga, Inc</h1>
        <LevelsButton levelKey={level} onChange={setLevel} />
      </header>

      <div className="mp-body">
        <div className="mp-intro">
          <h2 className="mp-intro__title">Update match records</h2>
        </div>
        {loadError && (
          <p className="mp-schedule-hint mp-schedule-hint--empty">
            <FaExclamationTriangle /> {loadError}
          </p>
        )}
        <div className="mp-sport-row">
          <OptionDropdown
            variant="pill"
            panelLabel="Sports option"
            placeholder="Select sport"
            value={sportId}
            options={sportOptions}
            onChange={(k) => { setSportId(k); setDivisionKey(''); resetForm(); }}
          />
          <OptionDropdown
            variant="pill"
            panelLabel="Division"
            placeholder={divisionOptions.length === 0 ? 'No divisions' : 'Select division'}
            value={divisionKey}
            options={divisionOptions}
            disabled={!selectedSport || divisionOptions.length === 0}
            onChange={(k) => { setDivisionKey(k); resetForm(); }}
          />
        </div>
        <div className="mp-header-divider" />

        <div className="mp-levelband">
          <div className="mp-levelband__title">{levelLabel}</div>
          <div className="mp-levelband__bar"><div className="mp-levelband__seg" /></div>
        </div>

        <div className="mp-card">
          <h3 className="mp-card__title">Update match record</h3>
          <p className="mp-card__sub">Fill in the required details for both teams.</p>

          {usingScheduleFallback && (
            <p className="mp-schedule-hint">
              <FaExclamationTriangle /> Sports &amp; Teams hasn't been (re)configured for this level — showing the sports, divisions, and teams found in existing schedules instead. Ask the admin to check the Sports &amp; Teams page.
            </p>
          )}
          {activeSport && hasScheduleForSelection && readyTeamNames.size === 0 && (
            <p className="mp-schedule-hint mp-schedule-hint--empty">
              <FaExclamationTriangle /> No matches for this division are due yet — the admin has scheduled some, but all are dated in the future.
            </p>
          )}
          {activeSport && !hasScheduleForSelection && (
            <p className="mp-schedule-hint">
              <FaInfo /> The admin hasn't scheduled any matches for this division yet — showing all registered teams for now.
            </p>
          )}

          <div className="mp-matchup">
            <TeamPanel
              side="A" teamLabel="Team 1"
              teamOptions={teamOptionsForSport} teamId={teamAId} onTeamChange={setTeamAId}
              time={timeA} onTimeChange={setTimeA}
              totalViolations={totalViolA} onOpenViolations={() => setViolModal('A')}
              comeback={comebackA} onComebackChange={setComebackA}
              prevPoints={prevPointsA} finalPoints={finalPointsA}
              winner={winner} onMarkWinner={setWinner}
            />
            <div className="mp-vs">VS</div>
            <TeamPanel
              side="B" teamLabel="Team 2"
              teamOptions={teamOptionsForSport} teamId={teamBId} onTeamChange={setTeamBId}
              time={timeB} onTimeChange={setTimeB}
              totalViolations={totalViolB} onOpenViolations={() => setViolModal('B')}
              comeback={comebackB} onComebackChange={setComebackB}
              prevPoints={prevPointsB} finalPoints={finalPointsB}
              winner={winner} onMarkWinner={setWinner}
            />
          </div>

          <div className="mp-update-row">
            <button type="button" className="mp-btn mp-btn--update" onClick={handleUpdateClick}>Update</button>
          </div>
        </div>

        {/* ── Updated match summary ── */}
        <div className="mp-summary">
          <div className="mp-summary__head">
            <h3 className="mp-summary__title"><FaUsers className="mp-summary__title-icon" /> Updated match summary</h3>
            <div className="mp-summary__count">
              <div className="mp-summary__count-label">Total match complete</div>
              <div className="mp-summary__count-num">{records.length}</div>
            </div>
          </div>

          <div className="mp-summary__filter">
            <div className="mp-summary__filter-label">Game format</div>
            <OptionDropdown
              variant="navy" panelLabel="Select game format" placeholder="Select game format"
              value={formatFilter}
              options={[{ key: '', label: 'All formats' }, ...GAME_FORMATS.map((f) => ({ key: f.id, label: f.label }))]}
              onChange={setFormatFilter}
            />
          </div>

          <div className="mp-table-wrap">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Sports</th>
                  <th>Team</th>
                  <th>Violation</th>
                  <th>Time duration</th>
                  <th>Final points</th>
                  <th style={{ width: 60 }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredRecords.length === 0 && (
                  <tr><td colSpan={6} className="mp-table__empty">No match records yet — update one above to see it here.</td></tr>
                )}
                {filteredRecords.map((r) => (
                  editingId === r.id ? (
                    <tr className="mp-edit-row" key={r.id}>
                      <td colSpan={6}>
                        <div className="mp-edit-form">
                          <select value={editDraft.teamAId} onChange={(e) => setEditDraft((d) => ({ ...d, teamAId: e.target.value }))}>
                            {effectiveTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <span className="mp-vs-mini">vs</span>
                          <select value={editDraft.teamBId} onChange={(e) => setEditDraft((d) => ({ ...d, teamBId: e.target.value }))}>
                            {effectiveTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <div className="mp-edit-form__score">
                            <input type="number" min="0" value={editDraft.totalViolationsA} onChange={(e) => setEditDraft((d) => ({ ...d, totalViolationsA: e.target.value }))} />
                            <span className="mp-vs-mini">-</span>
                            <input type="number" min="0" value={editDraft.totalViolationsB} onChange={(e) => setEditDraft((d) => ({ ...d, totalViolationsB: e.target.value }))} />
                          </div>
                          <input className="mp-edit-time" type="text" placeholder="mins" value={editDraft.minutes} onChange={(e) => setEditDraft((d) => ({ ...d, minutes: e.target.value }))} />
                          <div className="mp-edit-form__score">
                            <input type="number" value={editDraft.finalPointsA} onChange={(e) => setEditDraft((d) => ({ ...d, finalPointsA: e.target.value }))} />
                            <span className="mp-vs-mini">-</span>
                            <input type="number" value={editDraft.finalPointsB} onChange={(e) => setEditDraft((d) => ({ ...d, finalPointsB: e.target.value }))} />
                          </div>
                          <button className="mp-edit-form__save" onClick={() => saveEdit(r)}>Save</button>
                          <button className="mp-edit-form__cancel" onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className={flashId === r.id ? 'mp-row-flash' : ''}>
                      <td>{(r.label || r.sportName || '').toUpperCase()}</td>
                      <td>{r.teamA.name} vs {r.teamB.name}</td>
                      <td>{(r.teamA.totalViolations || r.teamB.totalViolations) ? `${r.teamA.totalViolations}-${r.teamB.totalViolations}` : '--'}</td>
                      <td>{r.teamA.minutes != null ? formatMinutes(r.teamA.minutes) : '--'}</td>
                      <td className="mp-table__points">{r.teamA.finalPoints} - {r.teamB.finalPoints}</td>
                      <td><button className="mp-table__edit-btn" onClick={() => startEdit(r)} aria-label="Edit"><FaEdit /></button></td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {violModal && (
        <ViolationsModal
          sideLabel={violModal === 'A' ? 'Team 1' : 'Team 2'}
          teamLabel={violModal === 'A' ? (teamA?.name || 'Team 1') : (teamB?.name || 'Team 2')}
          teamLogo={violModal === 'A' ? teamA?.logo : teamB?.logo}
          initialRows={violModal === 'A' ? violA : violB}
          onClose={() => setViolModal(null)}
          onSubmit={(rows) => { violModal === 'A' ? setViolA(rows) : setViolB(rows); setViolModal(null); }}
        />
      )}

      {pending && (
        <ConfirmModal
          pending={pending}
          levelLabel={levelLabel}
          saving={saving}
          onCancel={() => setPending(null)}
          onConfirm={handleConfirm}
        />
      )}

      {successRecord && (
        <SuccessModal
          record={successRecord}
          onClose={() => setSuccessRecord(null)}
          onViewRanking={() => { setSuccessRecord(null); navigate('/ranking'); }}
        />
      )}

      {invalidReasons && (
        <InvalidModal reasons={invalidReasons} onClose={() => setInvalidReasons(null)} />
      )}
    </div>
  );
}