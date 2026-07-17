import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminSchedulePage.css';
import { FaTimes, FaSync, FaSearch, FaUsers, FaUserGraduate, FaChevronDown, FaCheck, FaEdit, FaPlus, FaMapMarkerAlt, FaTrophy } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getSportsTeamsConfig, getMatchSchedules, saveGeneratedSchedule, upsertMatchSchedule } from '../services/firestoreService';
import SportsTeamsManager from './SportsTeamsManager';

const LEVELS = [
  { key: 'elementary', label: 'Elementary' },
  { key: 'highSchool',  label: 'High School' },
  { key: 'college',     label: 'College' },
];

/* Levels dropdown — same interaction pattern as the Home Dashboard's LevelsButton */
function LevelsButton({ levelKey, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LEVELS.find(l => l.key === levelKey) || LEVELS[1];

  return (
    <div ref={wrapRef} className="lvls-wrap">
      <button className="lvls-btn" onClick={() => setOpen(p => !p)} aria-haspopup="listbox" aria-expanded={open}>
        {current.label}
        <span className={`lvls-btn__arrow ${open ? 'lvls-btn__arrow--open' : ''}`}><FaChevronDown /></span>
      </button>
      <div className={`lvls-dropdown ${open ? 'lvls-dropdown--open' : ''}`} role="listbox">
        {LEVELS.map((l) => (
          <button key={l.key} className="lvls-dropdown__item" onClick={() => { onChange(l.key); setOpen(false); }} role="option" aria-selected={levelKey === l.key}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Grade-level bucketing ───────────────────────── */
const ELEMENTARY_GRADES = new Set(['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6']);
const HIGH_SCHOOL_GRADES = new Set(['Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']);
const COLLEGE_GRADES = new Set(['1st Year','2nd Year','3rd Year','4th Year']);

const ALL_GRADES = [
  'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6',
  'Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12',
  '1st Year','2nd Year','3rd Year','4th Year',
];

function getSchoolLevel(gradeLevel) {
  if (!gradeLevel) return null;
  if (ELEMENTARY_GRADES.has(gradeLevel)) return 'elementary';
  if (HIGH_SCHOOL_GRADES.has(gradeLevel)) return 'highSchool';
  if (COLLEGE_GRADES.has(gradeLevel)) return 'college';
  return null;
}

function buildSummary(registrations) {
  const map = {};
  registrations.forEach(({ sport, gender, gradeLevel }) => {
    if (!sport) return;
    const level = getSchoolLevel(gradeLevel);
    const g     = (gender || '').toLowerCase();
    const label = g === 'female' ? 'Women' : g === 'male' ? 'Men' : 'Mixed';
    const key   = `${sport.trim()}||${label}`;
    if (!map[key]) map[key] = { sport: sport.trim(), gender: label, elementary: 0, highSchool: 0, college: 0 };
    if (level) map[key][level]++;
  });
  return Object.values(map).sort((a, b) => {
    const sc = a.sport.localeCompare(b.sport);
    return sc !== 0 ? sc : a.gender.localeCompare(b.gender);
  });
}

const TEAM_COLORS = {
  'Black Beetles':   '#1a1a1a',
  'Purple Jaguars':  '#6d28d9',
  'Brown Cubs':      '#92400e',
  'Orange Bulldogs': '#ea580c',
  'Yellow Vipers':   '#b45309',
  'Maroon Owls':     '#9f1239',
  'Green Gators':    '#15803d',
  'Red Rhinos':      '#dc2626',
};

const TABS = ['Registration', 'Sports & Teams', 'Match Schedules Format'];

/* ═══════════════════════════════════════════════════════════════════════
   MATCH SCHEDULES FORMAT — everything below (through MatchScheduleFormatSection)
   used to live in its own file. It's merged in here since Registration,
   Sports & Teams, and Match Schedules Format are all admin-only screens
   that belong to this one page.
═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   FORMAT OPTIONS — same ids used by SportsTeamsManager's
   per-division format picker, so a division's saved format
   is already the pre-selected default here.
═══════════════════════════════════════════ */
const FORMATS = [
  { id: 'single-rr', label: 'Single Round-Robin' },
  { id: 'double-rr', label: 'Double Round-Robin' },
  { id: 'bracket',   label: 'Single Bracket' },
  { id: 'double-bracket', label: 'Double Bracket' },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const LEVEL_LABELS = { elementary: 'Elementary', highSchool: 'High School', college: 'College' };

/* ── Circular team network — visual overview of who's in the pool ── */
function TeamNetwork({ teams }) {
  const width = 620, height = 220, cx = width / 2, cy = height / 2, r = 82;
  const pts = teams.map((t, i) => {
    const a = (Math.PI * 2 * i) / teams.length - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), t };
  });
  const lines = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      lines.push(<line key={`${i}-${j}`} x1={pts[i].x} y1={pts[i].y} x2={pts[j].x} y2={pts[j].y} stroke="#c7cfe6" strokeWidth="0.7" />);
    }
  }
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="msf-network">
      {lines}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="18" fill={p.t.color || '#5b678a'} stroke="#fff" strokeWidth="2" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
            {(p.t.name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Generic navy dropdown, shared shape for Sports / Category / Format ── */
function FilterDropdown({ label, value, placeholder, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="msf-field" ref={wrapRef}>
      <label>{label}</label>
      <div className={`msf-select ${open ? 'msf-select--open' : ''}`}>
        <button
          type="button"
          className="msf-select__btn"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
        >
          {value || placeholder}
          <FaChevronDown className="msf-select__arrow" />
        </button>
        {open && (
          <div className="msf-select__panel">
            <div className="msf-select__title">{label} OPTION</div>
            {options.length === 0 && <div className="msf-select__empty">Nothing configured yet</div>}
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`msf-select__opt ${value === opt.label ? 'msf-select__opt--active' : ''}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Team badge: uploaded logo if present, else a colored initial circle ── */
function TeamBadge({ team, size = 52 }) {
  const initials = (team?.name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return team?.logo ? (
    <img src={team.logo} alt={team.name} className="msf-team-logo" style={{ width: size, height: size }} />
  ) : (
    <div className="msf-team-logo msf-team-logo--fallback" style={{ width: size, height: size, background: team?.color || '#5b678a' }}>
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROUND-ROBIN GENERATOR
   Circle method: fixes team[0], rotates the rest each round
   so every team plays every other team exactly once (twice for
   double round-robin). An odd team count gets a bye each round.
═══════════════════════════════════════════ */
function generateRounds(teamNames, doubleLegged) {
  let arr = [...teamNames];
  const hasBye = arr.length % 2 !== 0;
  if (hasBye) arr.push('BYE');
  const n = arr.length;
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }

  if (doubleLegged) {
    const reverseLegs = rounds.map(pairs => pairs.map(([a, b]) => [b, a]));
    return [...rounds, ...reverseLegs];
  }
  return rounds;
}

/* ═══════════════════════════════════════════
   SINGLE BRACKET (elimination) GENERATOR
   Pads the field to the next power of two with byes, pairs teams
   sequentially, then each later round references the previous
   round's winner as a placeholder ("Winner QF1") — except a bye
   match, which auto-advances a known team instead of a placeholder.
   Every bracket needs exactly teams.length - 1 matches to crown
   one champion, regardless of how many byes are involved.
═══════════════════════════════════════════ */
function stageNamesFor(totalRounds) {
  const tail = ['Finals'];
  if (totalRounds >= 2) tail.unshift('Semifinals');
  if (totalRounds >= 3) tail.unshift('Quarterfinals');
  for (let extra = totalRounds - 3; extra >= 1; extra--) {
    tail.unshift(`Round of ${Math.pow(2, extra + 3)}`);
  }
  return tail;
}
function stageCodeFor(name) {
  if (name === 'Finals') return 'F';
  if (name === 'Semifinals') return 'SF';
  if (name === 'Quarterfinals') return 'QF';
  const m = name.match(/Round of (\d+)/);
  return m ? `R${m[1]}` : 'M';
}

function generateBracket(teamNames) {
  const n = teamNames.length;
  if (n < 2) return { stages: [], totalMatches: 0, leaves: [] };
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const padded = [...teamNames];
  while (padded.length < bracketSize) padded.push(null); // null = bye slot

  const totalRounds = Math.log2(bracketSize);
  const names = stageNamesFor(totalRounds);

  let currentEntries = [];
  for (let i = 0; i < padded.length; i += 2) {
    currentEntries.push({ a: padded[i], b: padded[i + 1] });
  }

  const stages = [];
  for (let r = 0; r < totalRounds; r++) {
    const stageName = names[r];
    const code = stageCodeFor(stageName);
    const matches = currentEntries.map((m, i) => ({
      label: stageName === 'Finals' && totalRounds === r + 1 ? 'Finals' : `${code}${i + 1}`,
      a: m.a,
      b: m.b,
      isBye: m.a === null || m.b === null,
    }));
    stages.push({ name: stageName, matches });

    const next = [];
    for (let i = 0; i < matches.length; i += 2) {
      const m1 = matches[i];
      const m2 = matches[i + 1];
      if (!m2) break;
      const advance = (m) => (m.isBye ? (m.a ?? m.b) : `Winner ${m.label}`);
      next.push({ a: advance(m1), b: advance(m2) });
    }
    currentEntries = next;
  }

  return { stages, totalMatches: n - 1, leaves: padded };
}

/* ── Horizontal bracket tree: team boxes → round dots → champion ──
   Coordinates are computed once per render: each match's y is the
   average of its two children's y, which is what naturally produces
   the classic elbow-merge bracket look with plain straight lines. ── */
function BracketTree({ stages, leaves, teamByName }) {
  const ROW_H = 60;
  const TEAM_W = 168;
  const TEAM_H = 40;
  const COL_GAP = 130;

  if (!stages.length) return null;
  const totalRounds = stages.length;
  const leafY = leaves.map((_, i) => i * ROW_H + ROW_H / 2);

  const matchY = [];
  stages.forEach((stage, r) => {
    matchY.push(stage.matches.map((_, m) => (
      r === 0
        ? (leafY[2 * m] + leafY[2 * m + 1]) / 2
        : (matchY[r - 1][2 * m] + matchY[r - 1][2 * m + 1]) / 2
    )));
  });

  const colX = (r) => TEAM_W + (r + 1) * COL_GAP;
  const championX = colX(totalRounds - 1) + COL_GAP;
  const championY = matchY[totalRounds - 1][0];
  const height = leaves.length * ROW_H;
  const width = championX + 130;

  const elbow = (childX, y1, y2, parentX, parentY) => {
    const midX = (childX + parentX) / 2;
    return `M ${childX} ${y1} H ${midX} M ${childX} ${y2} H ${midX} M ${midX} ${y1} V ${y2} M ${midX} ${parentY} H ${parentX}`;
  };

  const connectors = [];
  stages.forEach((stage, r) => {
    const childX = r === 0 ? TEAM_W : colX(r - 1);
    stage.matches.forEach((_, m) => {
      const y1 = r === 0 ? leafY[2 * m] : matchY[r - 1][2 * m];
      const y2 = r === 0 ? leafY[2 * m + 1] : matchY[r - 1][2 * m + 1];
      connectors.push(elbow(childX, y1, y2, colX(r), matchY[r][m]));
    });
  });
  connectors.push(`M ${colX(totalRounds - 1)} ${championY} H ${championX}`);

  return (
    <div className="msf-bracket" style={{ height }}>
      <div className="msf-bracket-headers">
        <div style={{ width: colX(0) }}>{stages[0].name}</div>
        {stages.slice(1).map((s, i) => <div key={i} style={{ width: COL_GAP }}>{s.name}</div>)}
        <div style={{ width: width - colX(totalRounds - 1) }}>Champion</div>
      </div>

      <div className="msf-bracket-canvas" style={{ height, width }}>
        <svg width={width} height={height} className="msf-bracket-lines">
          {connectors.map((d, i) => <path key={i} d={d} />)}
        </svg>

        {leaves.map((name, i) => (
          name ? (
            <div key={i} className="msf-bracket-team" style={{ top: leafY[i] - TEAM_H / 2, height: TEAM_H, width: TEAM_W }}>
              <TeamBadge team={teamByName(name)} size={26} />
              <span>{name}</span>
            </div>
          ) : (
            <div key={i} className="msf-bracket-team msf-bracket-team--bye" style={{ top: leafY[i] - TEAM_H / 2, height: TEAM_H, width: TEAM_W }}>
              <span>Bye</span>
            </div>
          )
        ))}

        {stages.map((stage, r) => stage.matches.map((match, m) => (
          <div key={`${r}-${m}`} className="msf-bracket-node" style={{ left: colX(r), top: matchY[r][m] }}>
            <span className="msf-bracket-node__dot" />
            <span className="msf-bracket-node__label">{r === totalRounds - 1 ? 'GC' : match.label}</span>
          </div>
        )))}

        <div className="msf-bracket-champion" style={{ left: championX, top: championY }}>
          <FaTrophy />
          <span>Champion</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DOUBLE BRACKET (double elimination) GENERATOR
   Reuses the single-elim generator for the Upper (Winner's) Bracket.
   Lower (Loser's) Bracket: Round 1 pairs the Upper Bracket's first-round
   losers against each other; every later Upper Bracket round drops its
   losers into the Lower Bracket against that round's Lower Bracket
   survivors (cross-paired one slot over, so nobody instantly replays
   the team that just eliminated them), followed by a consolidation
   match that halves the Lower Bracket field again. The Lower Bracket's
   last team meets the Upper Bracket's last team in the Grand Final.
   Standard tournament rule: if the Lower Bracket team wins the Grand
   Final, the Upper Bracket team only has ONE loss so far (double
   elimination requires two) — a single reset match is then needed to
   decide the real champion. That's why the total is "N (up to N+1)".
═══════════════════════════════════════════ */
function generateDoubleBracket(teamNames) {
  const wb = generateBracket(teamNames);
  if (!wb.stages.length) {
    return { wbStages: [], leaves: [], lbRounds: [], grandFinal: null, ubMatchCount: 0, lbMatchCount: 0, totalMatches: 0 };
  }

  const wbStages = wb.stages;
  const R = wbStages.length;

  const wbLoserLabel = (stageIdx, matchIdx) => {
    const code = stageIdx === R - 1 ? 'F' : stageCodeFor(wbStages[stageIdx].name);
    return `Loser UB-${code}${matchIdx + 1}`;
  };

  const lbRounds = [];
  let lbCounter = 1;

  // LB Round 1 — pairs of Upper Bracket round-1 losers
  const r0 = wbStages[0].matches;
  const round1 = [];
  for (let i = 0; i < r0.length; i += 2) {
    round1.push({ label: `LB${lbCounter++}`, a: wbLoserLabel(0, i), b: r0[i + 1] ? wbLoserLabel(0, i + 1) : null });
  }
  lbRounds.push({ name: 'Round 1', matches: round1 });
  let currentWinners = round1.map(m => `Winner ${m.label}`);

  for (let wr = 1; wr < R; wr++) {
    const isLastWBRound = wr === R - 1;
    const wbLosers = wbStages[wr].matches.map((_, i) => wbLoserLabel(wr, i));

    if (isLastWBRound) {
      lbRounds.push({ name: "Losers Final", matches: [{ label: 'LB-F', a: currentWinners[0], b: wbLosers[0] }] });
      currentWinners = ['Winner LB-F'];
    } else {
      const dropIn = currentWinners.map((w, i) => ({
        label: `LB${lbCounter++}`,
        a: w,
        b: wbLosers[(i + 1) % wbLosers.length],
      }));
      lbRounds.push({ name: `Round ${lbRounds.length + 1}`, matches: dropIn });
      let winners = dropIn.map(m => `Winner ${m.label}`);

      if (winners.length > 1) {
        const consolidation = [];
        for (let i = 0; i < winners.length; i += 2) {
          consolidation.push({ label: `LB${lbCounter++}`, a: winners[i], b: winners[i + 1] });
        }
        lbRounds.push({ name: `Round ${lbRounds.length + 1}`, matches: consolidation });
        currentWinners = consolidation.map(m => `Winner ${m.label}`);
      } else {
        currentWinners = winners;
      }
    }
  }

  const grandFinal = { label: 'GF', a: 'Winner UB-F', b: currentWinners[0] };
  const ubMatchCount = wbStages.reduce((s, st) => s + st.matches.filter(m => !m.isBye).length, 0);
  const lbMatchCount = lbRounds.reduce((s, r) => s + r.matches.length, 0);

  return {
    wbStages,
    leaves: wb.leaves,
    lbRounds,
    grandFinal,
    ubMatchCount,
    lbMatchCount,
    totalMatches: ubMatchCount + lbMatchCount + 1, // Grand Final; a reset match is the "+1 if necessary"
  };
}

/* ── Compact label-only bracket tree — used for both the Upper Bracket
   (minus its champion box, since the winner heads to the Grand Final
   instead) and the Lower Bracket (which has no real team names at all,
   only "Loser UB-QF1" / "Winner LB1" style placeholders). ── */
function LabelBracketTree({ roundNames, roundsMatches, leafLabels }) {
  const ROW_H = 44;
  const LEAF_W = 168;
  const LEAF_H = 32;
  const COL_GAP = 118;

  const totalRounds = roundsMatches.length;
  if (!totalRounds) return null;

  const leafCount = leafLabels ? leafLabels.length : roundsMatches[0].length * 2;
  const leafY = Array.from({ length: leafCount }, (_, i) => i * ROW_H + ROW_H / 2);

  const matchY = [];
  roundsMatches.forEach((matches, r) => {
    matchY.push(matches.map((_, m) => (
      r === 0
        ? ((leafY[2 * m] ?? leafY[2 * m + 1]) + (leafY[2 * m + 1] ?? leafY[2 * m])) / 2
        : ((matchY[r - 1][2 * m] ?? matchY[r - 1][2 * m + 1]) + (matchY[r - 1][2 * m + 1] ?? matchY[r - 1][2 * m])) / 2
    )));
  });

  const colX = (r) => LEAF_W + (r + 1) * COL_GAP;
  const height = Math.max(leafCount * ROW_H, matchY[totalRounds - 1][0] + ROW_H);
  const width = colX(totalRounds - 1) + 30;

  const elbow = (childX, y1, y2, parentX, parentY) => {
    const midX = (childX + parentX) / 2;
    return `M ${childX} ${y1} H ${midX} M ${childX} ${y2} H ${midX} M ${midX} ${y1} V ${y2} M ${midX} ${parentY} H ${parentX}`;
  };

  const connectors = [];
  roundsMatches.forEach((matches, r) => {
    const childX = r === 0 ? LEAF_W : colX(r - 1);
    matches.forEach((m, i) => {
      const hasTwoChildren = r > 0 || (m.a && m.b);
      if (!hasTwoChildren) return;
      const y1 = r === 0 ? leafY[2 * i] : matchY[r - 1][2 * i];
      const y2 = r === 0 ? (leafY[2 * i + 1] ?? leafY[2 * i]) : (matchY[r - 1][2 * i + 1] ?? matchY[r - 1][2 * i]);
      connectors.push(elbow(childX, y1, y2, colX(r), matchY[r][i]));
    });
  });

  return (
    <div className="msf-lbracket" style={{ height: height + 34 }}>
      <div className="msf-lbracket-headers">
        {leafLabels && <div style={{ width: colX(0) }}>{roundNames[0]}</div>}
        {roundNames.slice(leafLabels ? 1 : 0).map((n, i) => <div key={i} style={{ width: COL_GAP }}>{n}</div>)}
      </div>
      <div className="msf-lbracket-canvas" style={{ height, width }}>
        <svg width={width} height={height} className="msf-bracket-lines">
          {connectors.map((d, i) => <path key={i} d={d} />)}
        </svg>

        {leafLabels && leafLabels.map((label, i) => (
          <div key={i} className="msf-lbracket-leaf" style={{ top: leafY[i] - LEAF_H / 2, height: LEAF_H, width: LEAF_W }}>
            <span className="msf-lbracket-leaf__dot" />
            <span>{label}</span>
          </div>
        ))}

        {roundsMatches.map((matches, r) => matches.map((m, i) => (
          <div key={`${r}-${i}`} className="msf-bracket-node" style={{ left: colX(r), top: matchY[r][i] }}>
            <span className="msf-bracket-node__dot" />
            <span className="msf-bracket-node__label">{m.label}</span>
          </div>
        )))}
      </div>
    </div>
  );
}

function MatchScheduleFormatSection({ level }) {
  const [sportsList, setSportsList] = useState([]);
  const [teamsList,  setTeamsList]  = useState([]);
  const [loading,    setLoading]    = useState(false);

  const [selSport,    setSelSport]    = useState(null); // sport object
  const [selCategory, setSelCategory] = useState(null); // { label, value, format }
  const [selFormat,   setSelFormat]   = useState(null); // { id, label }
  const [activeRound, setActiveRound] = useState(0);

  const [savedSchedules, setSavedSchedules] = useState([]); // persisted matches, this level
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [toast, setToast] = useState(null); // { text } | null
  const [successModal, setSuccessModal] = useState(null); // { sport, category, format, teams, rounds, matches } | null
  const listRef = useRef(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ sport: '', date: '', time: '', location: '', pairs: [{ teamA: '', teamB: '' }] });

  /* ── Load Sports & Teams config (admin-entered, per level) ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getSportsTeamsConfig(level);
      setSportsList(cfg.sports || []);
      setTeamsList(cfg.teams || []);
      const schedules = await getMatchSchedules(level);
      setSavedSchedules(schedules);
    } catch (e) {
      console.error('Failed to load sports/teams/schedules:', e);
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Category options come from the selected sport's own divisions.
     If the admin never set up divisions for this sport, fall back to a
     single "General" category so the flow isn't blocked. ── */
  const rawCategoryOptions = (selSport?.categoryGroups || []).flatMap(g =>
    (g.divisions || []).map(d => ({
      value: d.id,
      label: d.name || g.label,
      format: d.format,
    }))
  );
  const categoryOptions = rawCategoryOptions.length > 0
    ? rawCategoryOptions
    : selSport
      ? [{ value: 'general', label: 'General', format: null }]
      : [];

  /* ── Teams eligible for this sport ──
     NOTE: despite the field name, SportsTeamsManager's TeamSportsPickerModal
     stores sport *names* in team.sportIds, not sport ids. Match on name.
     Deduped by id (fallback to name) — otherwise a team that was ever saved
     twice in Firestore produces a round-robin where the same two teams show
     up in every match. ── */
  const eligibleTeams = Array.from(
    new Map(
      teamsList
        .filter(t => (t.sportIds || []).includes(selSport?.name))
        .map(t => [t.id || t.name, t])
    ).values()
  );

  const handlePickSport = (opt) => {
    setSelSport(opt.raw);
    setSelCategory(null);
    setSelFormat(null);
    setActiveRound(0);
  };
  const handlePickCategory = (opt) => {
    setSelCategory(opt.raw);
    // Pre-fill format with whatever was configured for this division in Sports & Teams
    const preset = FORMATS.find(f => f.id === opt.raw.format);
    setSelFormat(preset || null);
    setActiveRound(0);
  };
  const handlePickFormat = (opt) => { setSelFormat(opt.raw); setActiveRound(0); };

  const handleReset = () => {
    setSelSport(null); setSelCategory(null); setSelFormat(null); setActiveRound(0);
  };

  const ready = selSport && selCategory && selFormat && eligibleTeams.length >= 2;
  const isBracket = selFormat?.id === 'bracket';
  const isDoubleBracket = selFormat?.id === 'double-bracket';
  const isDoubleLeg = selFormat?.id === 'double-rr';

  const rounds = ready && !isBracket && !isDoubleBracket
    ? generateRounds(eligibleTeams.map(t => t.name), isDoubleLeg)
    : [];
  const bracket = ready && isBracket
    ? generateBracket(eligibleTeams.map(t => t.name))
    : null;
  const doubleBracket = ready && isDoubleBracket
    ? generateDoubleBracket(eligibleTeams.map(t => t.name))
    : null;

  const totalMatches = isBracket
    ? (bracket?.totalMatches || 0)
    : isDoubleBracket
      ? (doubleBracket?.totalMatches || 0)
      : rounds.reduce((s, r) => s + r.length, 0);
  const legSize = isDoubleLeg ? rounds.length / 2 : rounds.length;

  const teamByName = (name) => eligibleTeams.find(t => t.name === name);

  /* ── Save the generated schedule ── */
  const handleSaveGenerated = async () => {
    const buildMatch = (extra) => ({
      id: uid(),
      sport: selSport.name,
      category: selCategory.label,
      format: selFormat.label,
      teamALogo: teamByName(extra.teamA)?.logo || null,
      teamBLogo: teamByName(extra.teamB)?.logo || null,
      date: '',
      time: '',
      location: '',
      status: 'scheduled',
      ...extra,
    });

    let matches;
    if (isBracket) {
      matches = bracket.stages.flatMap((stage, stageIdx) =>
        stage.matches
          .filter(m => !m.isBye) // a bye has no actual game — the team just advances
          .map(m => buildMatch({ round: stageIdx + 1, stage: stage.name, matchLabel: m.label, teamA: m.a, teamB: m.b }))
      );
    } else if (isDoubleBracket) {
      const ubMatches = doubleBracket.wbStages.flatMap((stage, stageIdx) =>
        stage.matches
          .filter(m => !m.isBye)
          .map(m => buildMatch({ round: stageIdx + 1, stage: `Upper Bracket – ${stage.name}`, matchLabel: `UB-${m.label}`, teamA: m.a, teamB: m.b }))
      );
      const lbMatches = doubleBracket.lbRounds.flatMap((round, roundIdx) =>
        round.matches
          .filter(m => m.a && m.b) // drop any bye slot that slipped through
          .map(m => buildMatch({ round: roundIdx + 1, stage: `Lower Bracket – ${round.name}`, matchLabel: m.label, teamA: m.a, teamB: m.b }))
      );
      const gfMatch = buildMatch({
        round: null,
        stage: 'Grand Final',
        matchLabel: doubleBracket.grandFinal.label,
        teamA: doubleBracket.grandFinal.a,
        teamB: doubleBracket.grandFinal.b,
      });
      matches = [...ubMatches, ...lbMatches, gfMatch];
    } else {
      matches = rounds.flatMap((pairs, roundIdx) =>
        pairs.map(([a, b]) => buildMatch({ round: roundIdx + 1, teamA: a, teamB: b }))
      );
    }

    setSavingSchedule(true);
    try {
      const merged = await saveGeneratedSchedule(level, matches);
      setSavedSchedules(merged);
      setSuccessModal({
        sport: selSport.name,
        category: selCategory.label,
        format: selFormat.label,
        teams: eligibleTeams.length,
        rounds: isBracket ? bracket.stages.length : isDoubleBracket ? doubleBracket.wbStages.length + doubleBracket.lbRounds.length + 1 : rounds.length,
        matches: totalMatches,
      });
    } catch (e) {
      console.error('Failed to save schedule:', e);
      setToast({ text: 'Could not save schedule — check your connection and try again.' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleReviewSummary = () => {
    setSuccessModal(null);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Manual "Add Schedule" ── */
  const openAddModal = () => {
    setAddForm({ sport: selSport?.name || '', date: '', time: '', location: '', pairs: [{ teamA: '', teamB: '' }] });
    setAddModalOpen(true);
  };

  const handleAddTeamRow = () => {
    setAddForm(f => ({ ...f, pairs: [...f.pairs, { teamA: '', teamB: '' }] }));
  };
  const handlePairChange = (idx, side, value) => {
    setAddForm(f => ({
      ...f,
      pairs: f.pairs.map((p, i) => (i === idx ? { ...p, [side]: value } : p)),
    }));
  };

  const handleConfirmAdd = async () => {
    const validPairs = addForm.pairs.filter(p => p.teamA && p.teamB);
    if (!addForm.sport || !addForm.date || !addForm.time || validPairs.length === 0) return;
    const pool = teamsList.filter(t => (t.sportIds || []).includes(addForm.sport));

    let merged = savedSchedules;
    for (const pair of validPairs) {
      const match = {
        id: uid(),
        sport: addForm.sport,
        category: selCategory?.label || '',
        format: selFormat?.label || '',
        round: null,
        teamA: pair.teamA,
        teamB: pair.teamB,
        teamALogo: pool.find(t => t.name === pair.teamA)?.logo || null,
        teamBLogo: pool.find(t => t.name === pair.teamB)?.logo || null,
        date: addForm.date,
        time: addForm.time,
        location: addForm.location,
        status: 'scheduled',
      };
      merged = await upsertMatchSchedule(level, match);
    }
    setSavedSchedules(merged);
    setAddModalOpen(false);
  };

  /* ── Grouped list view (by date) ── */
  const groupedByDate = savedSchedules
    .filter(m => m.date)
    .reduce((acc, m) => {
      (acc[m.date] = acc[m.date] || []).push(m);
      return acc;
    }, {});

  if (loading) return <div className="msf-loading">Loading sports & teams…</div>;

  const sportOptions = sportsList.map(s => s.name);
  const addPool = teamsList.filter(t => (t.sportIds || []).includes(addForm.sport));

  return (
    <div className="msf-wrap">
      <div className="msf-level-banner">
        <h2>{(LEVEL_LABELS[level] || level || '').toUpperCase()}</h2>
        <div className="msf-level-banner__bar" />
      </div>

      {/* ── GENERATOR CARD ── */}
      <div className="msf-card">
        <div className="msf-filters">
          <FilterDropdown
            label="SPORTS"
            value={selSport?.name}
            placeholder="Select sport"
            options={sportsList.map(s => ({ value: s.id, label: s.name, raw: s }))}
            onChange={handlePickSport}
          />
          <FilterDropdown
            label="CATEGORY/DIVISION"
            value={selCategory?.label}
            placeholder="Select category"
            options={categoryOptions.map(o => ({ value: o.value, label: o.label, raw: o }))}
            onChange={handlePickCategory}
            disabled={!selSport}
          />
          <FilterDropdown
            label="FORMAT"
            value={selFormat?.label}
            placeholder="Select format"
            options={FORMATS.map(f => ({ value: f.id, label: f.label, raw: f }))}
            onChange={handlePickFormat}
            disabled={!selCategory}
          />
          <button className="msf-reset-btn" onClick={handleReset}><FaSync /> Reset</button>
        </div>

        {!ready ? (
          <p className="msf-empty">
            {selSport && eligibleTeams.length < 2
              ? `Only ${eligibleTeams.length} team(s) assigned to ${selSport.name} — add at least 2 in Sports & Teams.`
              : sportsList.length === 0
                ? 'No sports configured yet — add sports and teams in the Sports & Teams tab first.'
                : 'Pick a sport, category and format to generate the schedule.'}
          </p>
        ) : (
          <>
            <div className="msf-result-head">
              <div>
                <h3>{selFormat.label}</h3>
                <p className="msf-muted">
                  {isBracket || isDoubleBracket
                    ? "Lose twice and you're out."
                    : `Every team plays against each other team ${isDoubleLeg ? 'twice' : 'once'}.`}
                </p>
              </div>
              <div className="msf-stats">
                <div className="msf-stat"><span>Teams</span><b>{eligibleTeams.length}</b></div>
                <div className="msf-stat">
                  <span>Total matches</span>
                  <b>{totalMatches}{isDoubleBracket ? ` (up to ${totalMatches + 1})` : ''}</b>
                </div>
              </div>
            </div>

            {isDoubleBracket ? (
              <div className="msf-dbracket">
                <p className="msf-dbracket__label">Upper Bracket (Winner's Bracket)</p>
                <LabelBracketTree
                  roundNames={doubleBracket.wbStages.map(s => s.name === 'Finals' ? "Winner's Finals" : s.name)}
                  roundsMatches={doubleBracket.wbStages.map(stage => stage.matches.map(m => ({ label: m.label, a: m.a, b: m.b })))}
                  leafLabels={doubleBracket.leaves.map(name => name || 'Bye')}
                />

                <p className="msf-dbracket__label msf-dbracket__label--lower">Lower Bracket (Loser's Bracket)</p>
                <LabelBracketTree
                  roundNames={doubleBracket.lbRounds.map(r => r.name)}
                  roundsMatches={doubleBracket.lbRounds.map(round => round.matches.map(m => ({ label: m.label, a: m.a, b: m.b })))}
                  leafLabels={doubleBracket.lbRounds[0].matches.flatMap(m => [m.a || 'Bye', m.b || 'Bye'])}
                />

                <div className="msf-dbracket__final">
                  <div className="msf-dbracket__final-row">
                    <span className="msf-lbracket-leaf__dot" /> Winner UB-F
                  </div>
                  <div className="msf-dbracket__final-row">
                    <span className="msf-lbracket-leaf__dot" /> Winner LB-F
                  </div>
                  <FaTrophy className="msf-dbracket__trophy" />
                  <span className="msf-dbracket__champion-label">Grand Final Champion</span>
                  <p className="msf-dbracket__note">
                    If the Lower Bracket team wins the Grand Final, a single reset match decides the title —
                    that's the "up to {totalMatches + 1}" match.
                  </p>
                </div>
              </div>
            ) : isBracket ? (
              <BracketTree stages={bracket.stages} leaves={bracket.leaves} teamByName={teamByName} />
            ) : (
              <>
                <TeamNetwork teams={eligibleTeams} />

                <p className="msf-selectround-title">Select Round</p>
                {isDoubleLeg ? (
                  <div className="msf-roundgroups">
                    <div className="msf-roundgroup">
                      <div className="msf-roundgroup__label">
                        First leg (1 – {legSize})
                      </div>
                      <div className="msf-roundgrid">
                        {rounds.slice(0, legSize).map((_, i) => (
                          <button
                            key={i}
                            className={`msf-roundtab ${activeRound === i ? 'msf-roundtab--active' : ''}`}
                            onClick={() => setActiveRound(i)}
                          >
                            Round {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="msf-roundgroup">
                      <div className="msf-roundgroup__label">
                        Second leg ({legSize + 1} – {rounds.length})
                      </div>
                      <div className="msf-roundgrid">
                        {rounds.slice(legSize).map((_, i) => {
                          const idx = legSize + i;
                          return (
                            <button
                              key={idx}
                              className={`msf-roundtab ${activeRound === idx ? 'msf-roundtab--active' : ''}`}
                              onClick={() => setActiveRound(idx)}
                            >
                              Round {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="msf-roundgrid msf-roundgrid--flat">
                    {rounds.map((_, i) => (
                      <button
                        key={i}
                        className={`msf-roundtab ${activeRound === i ? 'msf-roundtab--active' : ''}`}
                        onClick={() => setActiveRound(i)}
                      >
                        Round {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="msf-matchpanel">
                  <div className="msf-matchgrid-head">
                    <span>Round {activeRound + 1} matches</span>
                    <span className="msf-matchgrid-head__sep">|</span>
                    <span>{rounds[activeRound]?.length || 0} matches</span>
                  </div>

                  <div className="msf-matchgrid">
                    {rounds[activeRound]?.map(([a, b], i) => (
                      <div key={i} className="msf-matchcard">
                        <span className="msf-matchcard__num">Match{i + 1}</span>
                        <div className="msf-matchcard__body">
                          <div className="msf-teamblock">
                            <TeamBadge team={teamByName(a)} />
                            <span>{a}</span>
                          </div>
                          <span className="msf-vs">VS</span>
                          <div className="msf-teamblock">
                            <TeamBadge team={teamByName(b)} />
                            <span>{b}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="msf-savebar">
              <button className="msf-btn-primary" disabled={savingSchedule} onClick={handleSaveGenerated}>
                {savingSchedule ? 'Saving…' : 'Save Generated Schedule'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── TOURNAMENT SUMMARY + MATCH SCHEDULE SUMMARY — own card, sits below the round matches, not merged into it ── */}
      {ready && (
        <div className="msf-card msf-card--summary">
          <div className="msf-summary-layout">
            <aside className="msf-tsummary">
              <h4 className="msf-tsummary__title">Tournament Summary</h4>
              <div className="msf-tsummary__row"><span>Sport</span><b>{selSport.name.toUpperCase()}</b></div>
              <div className="msf-tsummary__row"><span>Category</span><b>{selCategory.label.toUpperCase()}</b></div>
              <div className="msf-tsummary__row"><span>Format</span><b>{selFormat.label.toUpperCase()}</b></div>
              <div className="msf-tsummary__row"><span>Total Teams</span><b>{eligibleTeams.length}</b></div>
              {isBracket ? (
                bracket.stages.map((stage, i) => (
                  <div key={i} className="msf-tsummary__row">
                    <span>{stage.name === 'Finals' ? 'Final Matches' : stage.name}</span>
                    <b>{stage.matches.filter(m => !m.isBye).length}</b>
                  </div>
                ))
              ) : isDoubleBracket ? (
                <>
                  <div className="msf-tsummary__row"><span>Upper Bracket Matches</span><b>{doubleBracket.ubMatchCount}</b></div>
                  <div className="msf-tsummary__row"><span>Lower Bracket Matches</span><b>{doubleBracket.lbMatchCount}</b></div>
                  <div className="msf-tsummary__row"><span>Grand Final</span><b>1</b></div>
                  <div className="msf-tsummary__row"><span>Possible Extra Match</span><b>1</b></div>
                </>
              ) : (
                <div className="msf-tsummary__row"><span>Rounds</span><b>{rounds.length}</b></div>
              )}
              <div className="msf-tsummary__total">
                <span>Total Matches</span>
                <b>{totalMatches}</b>
                {isDoubleBracket && <em>(up to {totalMatches + 1} if necessary)</em>}
              </div>
            </aside>

            <div className="msf-summary">
              <div className="msf-summary__filters">
                <FilterDropdown
                  label="SELECT SPORTS"
                  value={selSport?.name}
                  placeholder="Select sport"
                  options={sportsList.map(s => ({ value: s.id, label: s.name, raw: s }))}
                  onChange={handlePickSport}
                />
                <FilterDropdown
                  label="SELECT CATEGORY/DIVISION"
                  value={selCategory?.label}
                  placeholder="Select category"
                  options={categoryOptions.map(o => ({ value: o.value, label: o.label, raw: o }))}
                  onChange={handlePickCategory}
                />
                <button className="msf-reset-btn" onClick={handleReset}><FaSync /> Reset</button>
              </div>

                <h4 className="msf-summary__heading">Match Schedule Summary</h4>

                <div className="msf-summary__table">
                  {isDoubleBracket ? (
                    <>
                      <div className="msf-summary__leg">UPPER BRACKET (WINNER'S BRACKET)</div>
                      <table className="msf-bsummary">
                        <thead>
                          <tr><th>Stage</th><th>Match</th><th>Team</th><th>Vs</th><th>Team</th></tr>
                        </thead>
                        <tbody>
                          {doubleBracket.wbStages.map((stage, si) => (
                            stage.matches.map((m, mi) => (
                              <tr key={`ub-${si}-${mi}`}>
                                {mi === 0 && (
                                  <td className="msf-bsummary__stage" rowSpan={stage.matches.length}>
                                    {(stage.name === 'Finals' ? "Winner's Finals" : stage.name).toUpperCase()}
                                    <span>{stage.matches.length} {stage.matches.length === 1 ? 'Match' : 'Matches'}</span>
                                  </td>
                                )}
                                <td>UB-{m.label}</td>
                                <td className="msf-bsummary__team">{m.a ?? <em>Bye</em>}</td>
                                <td className="msf-bsummary__vs">vs</td>
                                <td className="msf-bsummary__team">{m.b ?? <em>Bye</em>}</td>
                              </tr>
                            ))
                          ))}
                        </tbody>
                      </table>

                      <div className="msf-summary__leg">LOWER BRACKET (LOSER'S BRACKET)</div>
                      <table className="msf-bsummary">
                        <thead>
                          <tr><th>Stage</th><th>Match</th><th>Team</th><th>Vs</th><th>Team</th></tr>
                        </thead>
                        <tbody>
                          {doubleBracket.lbRounds.map((round, ri) => (
                            round.matches.map((m, mi) => (
                              <tr key={`lb-${ri}-${mi}`}>
                                {mi === 0 && (
                                  <td className="msf-bsummary__stage" rowSpan={round.matches.length}>
                                    {round.name.toUpperCase()}
                                    <span>{round.matches.length} {round.matches.length === 1 ? 'Match' : 'Matches'}</span>
                                  </td>
                                )}
                                <td>{m.label}</td>
                                <td className="msf-bsummary__team">{m.a ?? <em>Bye</em>}</td>
                                <td className="msf-bsummary__vs">vs</td>
                                <td className="msf-bsummary__team">{m.b ?? <em>Bye</em>}</td>
                              </tr>
                            ))
                          ))}
                        </tbody>
                      </table>

                      <div className="msf-summary__leg">GRAND FINAL</div>
                      <table className="msf-bsummary">
                        <tbody>
                          <tr>
                            <td className="msf-bsummary__stage">
                              GRAND FINAL
                              <span>1 Match (up to 2 if necessary)</span>
                            </td>
                            <td>GF</td>
                            <td className="msf-bsummary__team">{doubleBracket.grandFinal.a}</td>
                            <td className="msf-bsummary__vs">vs</td>
                            <td className="msf-bsummary__team">{doubleBracket.grandFinal.b}</td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  ) : isBracket ? (
                    <table className="msf-bsummary">
                      <thead>
                        <tr><th>Stage</th><th>Match</th><th>Team</th><th>Vs</th><th>Team</th></tr>
                      </thead>
                      <tbody>
                        {bracket.stages.map((stage, si) => (
                          stage.matches.map((m, mi) => (
                            <tr key={`${si}-${mi}`}>
                              {mi === 0 && (
                                <td className="msf-bsummary__stage" rowSpan={stage.matches.length}>
                                  {stage.name.toUpperCase()}
                                  <span>{stage.matches.length} {stage.matches.length === 1 ? 'Match' : 'Matches'}</span>
                                </td>
                              )}
                              <td>{si === bracket.stages.length - 1 ? 'FINALS' : m.label}</td>
                              <td className="msf-bsummary__team">{m.a ?? <em>Bye</em>}</td>
                              <td className="msf-bsummary__vs">vs</td>
                              <td className="msf-bsummary__team">{m.b ?? <em>Bye</em>}</td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  ) : selFormat.id === 'double-rr' ? (
                    <>
                      <div className="msf-summary__leg">FIRST LEG (ROUND 1 TO {rounds.length / 2})</div>
                      {rounds.slice(0, rounds.length / 2).map((pairs, ri) => (
                        <div key={`leg1-${ri}`} className="msf-summary__round">
                          <div className="msf-summary__round-label">Round {ri + 1}</div>
                          {pairs.map(([a, b], i) => (
                            <div key={i} className="msf-summary__row">
                              <span className="msf-summary__num">{i + 1}</span>
                              <span className="msf-summary__team">{a}</span>
                              <span className="msf-summary__vs">vs</span>
                              <span className="msf-summary__team">{b}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="msf-summary__leg">SECOND LEG (ROUND {rounds.length / 2 + 1} TO {rounds.length})</div>
                      {rounds.slice(rounds.length / 2).map((pairs, ri) => (
                        <div key={`leg2-${ri}`} className="msf-summary__round">
                          <div className="msf-summary__round-label">Round {rounds.length / 2 + ri + 1}</div>
                          {pairs.map(([a, b], i) => (
                            <div key={i} className="msf-summary__row">
                              <span className="msf-summary__num">{i + 1}</span>
                              <span className="msf-summary__team">{a}</span>
                              <span className="msf-summary__vs">vs</span>
                              <span className="msf-summary__team">{b}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  ) : (
                    rounds.map((pairs, ri) => (
                      <div key={ri} className="msf-summary__round">
                        <div className="msf-summary__round-label">Round {ri + 1}</div>
                        {pairs.map(([a, b], i) => (
                          <div key={i} className="msf-summary__row">
                            <span className="msf-summary__num">{i + 1}</span>
                            <span className="msf-summary__team">{a}</span>
                            <span className="msf-summary__vs">vs</span>
                            <span className="msf-summary__team">{b}</span>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* ── MATCH SCHEDULES LIST — always visible, not gated behind a step ── */}
      <div className="msf-card msf-card--list" ref={listRef}>
        <div className="msf-list-head">
          <div>
            <h2>Match schedules</h2>
            <p className="msf-muted">Upcoming matches across every team and sport</p>
          </div>
          <button className="msf-btn-primary" onClick={openAddModal}><FaPlus /> Add schedule</button>
        </div>

        {Object.keys(groupedByDate).length === 0 ? (
          <p className="msf-empty">No dated matches yet. Generate a schedule above, or add one manually.</p>
        ) : (
          Object.entries(groupedByDate).map(([date, matches]) => (
            <div key={date} className="msf-daygroup">
              <div className="msf-daygroup__head">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              {matches.map(m => (
                <div key={m.id} className="msf-matchrow">
                  <div className="msf-matchrow__time">{m.time}</div>
                  <div className="msf-matchrow__mid">
                    <div className="msf-matchrow__teams">{m.teamA} vs {m.teamB}</div>
                    {m.location && <div className="msf-matchrow__loc"><FaMapMarkerAlt /> {m.location}</div>}
                  </div>
                  <span className="msf-pill-sport">{m.sport}</span>
                  <button className="msf-icon-edit"><FaEdit /></button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="msf-toast"><FaCheck /> {toast.text}</div>
      )}

      {/* ── Save success modal (animated, floats above the page) ── */}
      {successModal && (
        <div className="msf-overlay" onClick={handleReviewSummary}>
          <div className="msf-success-wrap" onClick={e => e.stopPropagation()}>
            <p className="msf-success-eyebrow">Schedule saved succesfully</p>
            <div className="msf-success-card">
              <div className="msf-success-check"><FaCheck /></div>
              <h2>Schedule saved successfully</h2>
              <p className="msf-muted">Tournament schedule has been saved</p>

              <div className="msf-success-meta">
                <div><span>SPORT</span><b>{successModal.sport}</b></div>
                <div><span>CATEGORY/DIVISION</span><b>{successModal.category}</b></div>
                <div><span>FORMAT</span><b>{successModal.format}</b></div>
              </div>

              <div className="msf-success-stats">
                <div><span>TOTAL TEAMS</span><b>{successModal.teams}</b></div>
                <div><span>TOTAL ROUNDS</span><b>{successModal.rounds}</b></div>
                <div><span>TOTAL MATCHES</span><b>{successModal.matches}</b></div>
                <div><span>STATUS</span><b className="msf-badge-saved">Saved</b></div>
              </div>

              <div className="msf-success-checklist">
                <p className="msf-success-checklist__title">What happens next?</p>
                <p><FaCheck /> Tournament structure has been saved.</p>
                <p><FaCheck /> Match pairings have been recorded.</p>
                <p><FaCheck /> Schedule summary is ready for review.</p>
                <p><FaCheck /> You may now submit the schedule.</p>
              </div>

              <button className="msf-btn-primary msf-btn-block" onClick={handleReviewSummary}>Review summary</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Schedule modal (a real overlay, not a page swap) ── */}
      {addModalOpen && (
        <div className="msf-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="msf-addwrap" onClick={e => e.stopPropagation()}>
            <p className="msf-add-eyebrow">Match Schedule (Time, Date and Venue)</p>
            <div className="msf-add-card">
              <h2 className="msf-add-card__title">Match Schedule</h2>
              <div className="msf-add-card__divider" />

              <div className="msf-form-group">
                <label>Sport</label>
                <select
                  value={addForm.sport}
                  onChange={e => setAddForm(f => ({ ...f, sport: e.target.value, pairs: [{ teamA: '', teamB: '' }] }))}
                >
                  <option value="">Select a sport</option>
                  {sportOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="msf-form-row">
                <div className="msf-form-group">
                  <label>Time</label>
                  <input type="time" value={addForm.time} onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))} />
                </div>
                <div className="msf-form-group">
                  <label>Date</label>
                  <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>

              {addForm.pairs.map((pair, idx) => {
                const isLast = idx === addForm.pairs.length - 1;
                return (
                  <div className="msf-form-row msf-form-row--vs" key={idx}>
                    <div className="msf-form-group">
                      <label>Teams</label>
                      <select value={pair.teamA} onChange={e => handlePairChange(idx, 'teamA', e.target.value)}>
                        <option value="">Select a teams</option>
                        {addPool.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <span className="msf-vs">VS</span>
                    <div className="msf-form-group">
                      <label>Teams</label>
                      <select value={pair.teamB} onChange={e => handlePairChange(idx, 'teamB', e.target.value)}>
                        <option value="">Select a teams</option>
                        {addPool.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    {isLast && (
                      <button type="button" className="msf-addteam-btn" onClick={handleAddTeamRow} disabled={!addForm.sport}>
                        <FaPlus /> Add Team
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="msf-form-group">
                <label>Venue</label>
                <input type="text" placeholder="Input Venue" value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} />
              </div>

              <div className="msf-form-actions">
                <button className="msf-btn-ghost msf-btn-block" onClick={() => setAddModalOpen(false)}>Cancel</button>
                <button className="msf-btn-primary msf-btn-block" onClick={handleConfirmAdd}>Add to Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function AdminSchedulePage() {
  const { isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [level, setLevel] = useState('highSchool');

  // Registration data
  const [summaryRows,      setSummaryRows]      = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [summaryLoading,   setSummaryLoading]   = useState(false);
  const [summaryError,     setSummaryError]     = useState('');

  // Filters
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterGrade,    setFilterGrade]    = useState('');
  const [filterSection,  setFilterSection]  = useState('');
  const [filterSport,    setFilterSport]    = useState('');
  const [filterGender,   setFilterGender]   = useState('');
  const [filterTeam,     setFilterTeam]     = useState('');

  // Student detail modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => { if (!isAdmin) navigate('/dashboard'); }, [isAdmin, navigate]);

const fetchSummary = useCallback(async () => {
  if (!db) {
    setSummaryError("Firestore not connected.");
    return;
  }

  setSummaryLoading(true);
  setSummaryError("");

  try {
    // Load player registrations
    const regSnap = await getDocs(collection(db, "registrations"));
    const registrations = regSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Load ALL registered users
    const userSnap = await getDocs(collection(db, "users"));
    const users = userSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Merge users with registration info
    const merged = users.map(user => {
      const registration = registrations.find(
        r => r.uid === user.id
      );

      if (registration) {
        return {
          ...user,
          ...registration,
        };
      }

      // User has no player registration yet
      return {
        ...user,
        fullName: user.name,
        gender: "—",
        gradeLevel: "—",
        section: "—",
        sport: "—",
        position: "—",
        teamName: "—",
      };
    });

    setAllRegistrations(merged);
    setSummaryRows(buildSummary(registrations));

  } catch (err) {
    console.error(err);
    setSummaryError("Failed to load registration data.");
  } finally {
    setSummaryLoading(false);
  }
}, []);

  useEffect(() => { if (activeTab === 0) fetchSummary(); }, [activeTab, fetchSummary]);

  const totalPlayers = summaryRows.reduce((s, r) => s + r.elementary + r.highSchool + r.college, 0);

  // Unique filter options from data
  const uniqueSections = [...new Set(allRegistrations.map(r => r.section).filter(Boolean))].sort();
  const uniqueSports   = [...new Set(allRegistrations.map(r => r.sport).filter(Boolean))].sort();
  const uniqueTeams    = [...new Set(allRegistrations.map(r => r.teamName).filter(Boolean))].sort();

  const filteredStudents = allRegistrations.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      (!q             || (r.fullName || '').toLowerCase().includes(q)) &&
      (!filterGrade   || r.gradeLevel === filterGrade) &&
      (!filterSection || r.section    === filterSection) &&
      (!filterSport   || r.sport      === filterSport) &&
      (!filterGender  || (r.gender || '').toLowerCase() === filterGender.toLowerCase()) &&
      (!filterTeam    || r.teamName   === filterTeam)
    );
  });

  const hasFilters = searchQuery || filterGrade || filterSection || filterSport || filterGender || filterTeam;
  const clearFilters = () => { setSearchQuery(''); setFilterGrade(''); setFilterSection(''); setFilterSport(''); setFilterGender(''); setFilterTeam(''); };

  const fmt = (row, level) => row[level] === 0 ? '--' : row[level];

  return (
    <div className="asp-page">

      {/* Header */}
      <header className="asp-header">
        <h1 className="asp-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
        <LevelsButton levelKey={level} onChange={setLevel} />
      </header>

      {/* Intro */}
      <div className="asp-intro">
        <h2 className="asp-intro__title">Update &amp; Edit</h2>
        <p className="asp-intro__sub">Manage registrations, sports, and match schedules</p>
      </div>

      {/* Tabs */}
      <div className="asp-tabs">
        {TABS.map((tab, i) => (
          <button key={tab} className={`asp-tab${activeTab === i ? ' asp-tab--active' : ''}`} onClick={() => setActiveTab(i)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="asp-body">

        {/* ══ TAB 0 ══ */}
        {activeTab === 0 && (
          <div className="asp-tab-content">

            {/* ── Card 1: Summary ── */}
            <div className="asp-card">
              {/* Card header row */}
              <div className="asp-card__toprow">
                <div className="asp-card__heading">
                  <FaUsers className="asp-card__icon" />
                  <span>REGISTRATION SUMMARY</span>
                </div>
                <div className="asp-card__toprow-right">
                  <button className="asp-refresh-btn" onClick={fetchSummary} disabled={summaryLoading} title="Refresh">
                    <FaSync className={summaryLoading ? 'asp-spin' : ''} />
                  </button>
                  <div className="asp-total-box">
                    <span className="asp-total-label">Total</span>
                    <span className="asp-total-num">{summaryLoading ? '…' : totalPlayers}</span>
                  </div>
                </div>
              </div>

              <p className="asp-card__subtitle">Total Registered Players</p>

              {summaryError && <div className="asp-alert asp-alert--error">{summaryError}</div>}

              <div className="asp-table-wrap">
                {summaryLoading ? (
                  <p className="asp-empty">Loading from Firestore…</p>
                ) : summaryRows.length === 0 ? (
                  <p className="asp-empty">No registrations found.</p>
                ) : (
                  <table className="asp-table">
                    <thead>
                      <tr>
                        <th>Sports</th>
                        <th>Elementary</th>
                        <th>High School</th>
                        <th>College</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map(row => {
                        const rowTotal = row.elementary + row.highSchool + row.college;
                        return (
                          <tr key={`${row.sport}-${row.gender}`}>
                            <td className="asp-td--sport">{row.sport.toUpperCase()} {row.gender.toUpperCase()}</td>
                            <td>{fmt(row, 'elementary')}</td>
                            <td>{fmt(row, 'highSchool')}</td>
                            <td>{fmt(row, 'college')}</td>
                            <td className="asp-td--total">{rowTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── Card 2: Student Details ── */}
            <div className="asp-card">
              {/* Card header row */}
              <div className="asp-card__toprow">
                <div className="asp-card__heading">
                  <FaUserGraduate className="asp-card__icon" />
                  <span>STUDENT REGISTRATION DETAILS</span>
                </div>
                <div className="asp-search-wrap">
                  <FaSearch className="asp-search-icon" />
                  <input
                    className="asp-search-input"
                    type="text"
                    placeholder="Search by name…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter pills */}
              <div className="asp-filters">
                <select className="asp-filter-pill" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                  <option value="">Grade/Year ▾</option>
                  {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="asp-filter-pill" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                  <option value="">Section ▾</option>
                  {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="asp-filter-pill" value={filterSport} onChange={e => setFilterSport(e.target.value)}>
                  <option value="">Sports ▾</option>
                  {uniqueSports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="asp-filter-pill" value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                  <option value="">Gender ▾</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Others">Others</option>
                </select>
                <select className="asp-filter-pill" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
                  <option value="">Team Name ▾</option>
                  {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {hasFilters && (
                  <button className="asp-clear-btn" onClick={clearFilters}>
                    <FaTimes /> Clear Filter
                  </button>
                )}
                <span className="asp-results-count">{filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="asp-table-wrap" style={{ marginTop: 8 }}>
                {summaryLoading ? (
                  <p className="asp-empty">Loading from Firestore…</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="asp-empty">{hasFilters ? 'No students match the selected filters.' : 'No registrations found.'}</p>
                ) : (
                  <table className="asp-table asp-table--students">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Gender</th>
                        <th>Grade/Year</th>
                        <th>Section</th>
                        <th>Sport</th>
                        <th>Position</th>
                        <th>Team Name</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((reg, idx) => (
                        <tr key={reg.id || idx}>
                          <td className="asp-td--num">{idx + 1}</td>
                          <td className="asp-td--name">
                            <span className="asp-avatar">
                              {(reg.fullName || 'U').charAt(0).toUpperCase()}
                            </span>
                            <span className="asp-name-text">
                              {reg.fullName || <em className="asp-placeholder">Last Name, First Name, Middle Name</em>}
                            </span>
                          </td>
                          <td>
                            <span className={`asp-gender-badge asp-gender--${(reg.gender || 'unknown').toLowerCase()}`}>
                              {reg.gender || '—'}
                            </span>
                          </td>
                          <td>{reg.gradeLevel || '—'}</td>
                          <td>{reg.section || '—'}</td>
                          <td className="asp-td--sport">{reg.sport || '—'}</td>
                          <td>{reg.position || '—'}</td>
                          <td>
                            <span
                              className="asp-team-badge"
                              style={{ background: TEAM_COLORS[reg.teamName] || '#334155' }}
                            >
                              {reg.teamName || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <button className="asp-btn-view" onClick={() => setSelectedStudent(reg)}>View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ══ TAB 1 ══ */}
        {activeTab === 1 && (
          <div className="asp-tab-content">
            <div className="asp-level-banner">
              <h2>{LEVELS.find(l => l.key === level)?.label.toUpperCase()}</h2>
              <div className="asp-level-banner__bar" />
            </div>
            <SportsTeamsManager level={level} />
          </div>
        )}

        {/* ══ TAB 2 ══ */}
        {activeTab === 2 && (
          <MatchScheduleFormatSection level={level} />
        )}
      </div>

      {/* ── Student Detail Modal ── */}
      {selectedStudent && (
        <div className="asp-modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="asp-modal" onClick={e => e.stopPropagation()}>
            <div className="asp-modal__header">
              <h2>Student Details</h2>
              <button className="asp-modal__close" onClick={() => setSelectedStudent(null)}><FaTimes /></button>
            </div>
            <div className="asp-modal__body">
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Full Name</label>
                  <p>{selectedStudent.fullName || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Gender</label>
                  <p>{selectedStudent.gender || '—'}</p>
                </div>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Grade / Year Level</label>
                  <p>{selectedStudent.gradeLevel || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Section</label>
                  <p>{selectedStudent.section || '—'}</p>
                </div>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Date of Birth</label>
                  <p>{selectedStudent.dob || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Age</label>
                  <p>{selectedStudent.age || '—'}</p>
                </div>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Contact Number</label>
                  <p>{selectedStudent.contactNumber || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Email</label>
                  <p>{selectedStudent.email || selectedStudent.studentEmail || '—'}</p>
                </div>
              </div>
              <div className="asp-form-group">
                <label>Address</label>
                <p>{selectedStudent.address || '—'}</p>
              </div>
              <div className="asp-form-group">
                <label>Emergency Contact</label>
                <p>{selectedStudent.emergencyContact || '—'}</p>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Sport</label>
                  <p>{selectedStudent.sport || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Position</label>
                  <p>{selectedStudent.position || '—'}</p>
                </div>
              </div>
              <div className="asp-form-group">
                <label>Team Name</label>
                <p>{selectedStudent.teamName || '—'}</p>
              </div>
              {selectedStudent.message && (
                <div className="asp-form-group">
                  <label>Message</label>
                  <p>{selectedStudent.message}</p>
                </div>
              )}
              <div className="asp-form-row">
                {selectedStudent.photoURL && (
                  <div className="asp-form-group">
                    <label>Photo</label>
                    <p><a href={selectedStudent.photoURL} target="_blank" rel="noreferrer">View photo</a></p>
                  </div>
                )}
                {selectedStudent.waiverURL && (
                  <div className="asp-form-group">
                    <label>Waiver / Consent Form</label>
                    <p><a href={selectedStudent.waiverURL} target="_blank" rel="noreferrer">View waiver</a></p>
                  </div>
                )}
              </div>
              <div className="asp-form-actions">
                <button type="button" className="asp-btn-cancel" onClick={() => setSelectedStudent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}