import React, { useState, useMemo, useEffect } from 'react';
import './RankingPage.css';
import { FaSearch, FaCrown, FaMedal } from 'react-icons/fa';
import { FiChevronDown } from 'react-icons/fi';
import Contact from '../components/Landing/Contact/Contact';
import { getSportsTeamsConfig, getTeamRankings, getMatchRecords } from '../services/firestoreService';

/* ── Sport filter tabs (shared by both tables) ── */
const SPORTS = ['All Sports', 'Basketball', 'Volleyball', 'Tennis', 'Chess', 'Badminton'];
const LEVELS = ['Elementary', 'High School', 'College'];
const LEVEL_KEY_BY_LABEL = { 'Elementary': 'elementary', 'High School': 'highSchool', 'College': 'college' };
const DEFAULT_POINTS = 1000;

function norm(str) {
  return (str || '').trim().toLowerCase();
}

/* Same flattening/labeling logic Admin's Sports & Teams and Moderator
   use — one row per division, group label (e.g. "MEN") prefixed onto
   the division name when they differ, so "MEN 5v5" / "WOMEN 5v5" stay
   distinguishable here too, matching how they're actually scored. */
function flatDivisions(sport) {
  return (sport?.categoryGroups || []).flatMap((g) => {
    const divs = g.divisions || [];
    if (divs.length === 0) return [{ id: `${g.id}_lbl`, name: g.label, groupLabel: g.label }];
    return divs.map((d) => ({ ...d, name: d.name || g.label, groupLabel: g.label }));
  });
}
function divisionOptionsForSport(sport) {
  if (!sport) return [];
  return flatDivisions(sport).map((d) => {
    const name = (d.name || '').trim();
    const group = (d.groupLabel || '').trim();
    const label = (group && norm(group) !== norm(name)) ? `${group} ${name}`.trim() : name;
    return { key: d.id, label };
  });
}
/* Tolerant match for divisions saved before the group-label prefix
   existed (a bare old "5v5" is treated as matching "MEN 5v5" etc). */
function categoriesMatch(a, b) {
  const x = norm(a), y = norm(b);
  if (x === y) return true;
  if (!x || !y) return false;
  return x.endsWith(` ${y}`) || y.endsWith(` ${x}`);
}

/* ── Sample medal tally data — no real data source for this exists yet
   anywhere in Firestore (no per-tournament placement/medal tracking is
   recorded by Admin or Moderator), so this stays mock until that's
   decided. See RankingPage's export default for the flagged TODO. ── */
const MEDAL_DATA = [
  { id: 1, team: 'YELLOW VIPERS',  color: '#FCBF19', gold: 121, silver: 81,  bronze: 60 },
  { id: 2, team: 'PURPLE JAGUARS', color: '#7B4FA0', gold: 73,  silver: 32,  bronze: 46 },
  { id: 3, team: 'MAROON OWLS',    color: '#800000', gold: 54,  silver: 46,  bronze: 62 },
  { id: 4, team: 'BROWN CUBS',     color: '#8D6E47', gold: 54,  silver: 46,  bronze: 52 },
];

/* Deterministic fallback color per team name, since real teams (unlike
   the old mock data) don't carry a stored `color` field — keeps each
   team's initials chip visually stable across reloads without needing
   a new Firestore field. */
const FALLBACK_PALETTE = ['#FCBF19', '#3FA34D', '#D43A2F', '#8D6E47', '#7B4FA0', '#2F6FD4', '#1A9457', '#C2410C'];
function colorForTeam(name) {
  const str = name || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

/* ── Team logo placeholder (real logo if the team has one, initials chip otherwise) ── */
function TeamLogo({ team, color, logo }) {
  const initials = team.split(' ').map(w => w[0]).join('').slice(0, 2);
  if (logo) {
    return (
      <span className="rk-team-logo rk-team-logo--img">
        <img src={logo} alt="" />
      </span>
    );
  }
  return (
    <span className="rk-team-logo" style={{ background: color }}>
      {initials}
    </span>
  );
}

/* ── Sport tab row, reused by both tables ── */
function SportTabs({ active, onChange }) {
  return (
    <div className="rk-sport-tabs">
      {SPORTS.map(s => (
        <button
          key={s}
          className={`rk-sport-tab ${active === s ? 'rk-sport-tab--active' : ''}`}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ── Levels dropdown (top-right of header, same pattern as Dashboard) ── */
function LevelsButton({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="rk-lvls-wrap">
      <button className="rk-lvls-btn" onClick={() => setOpen(p => !p)} aria-haspopup="listbox" aria-expanded={open}>
        {selected}
        <span className={`rk-lvls-arrow ${open ? 'rk-lvls-arrow--open' : ''}`}><FiChevronDown /></span>
      </button>
      <div className={`rk-lvls-dropdown ${open ? 'rk-lvls-dropdown--open' : ''}`} role="listbox">
        {LEVELS.map(level => (
          <button
            key={level}
            className="rk-lvls-item"
            onClick={() => { onChange(level); setOpen(false); }}
            role="option"
            aria-selected={selected === level}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Potential Champion table ── */
function ChampionTable({ data }) {
  const ranked = useMemo(
    () => [...data].sort((a, b) => b.rating - a.rating || (b.wins - b.losses) - (a.wins - a.losses)),
    [data]
  );

  if (ranked.length === 0) {
    return <div className="rk-table-empty">No teams found for this sport/level yet.</div>;
  }

  return (
    <div className="rk-table-wrap" role="table">
      <div className="rk-row rk-row--head" role="row">
        <div className="rk-cell rk-cell-rank" role="columnheader">RANK</div>
        <div className="rk-cell rk-cell-logo" role="columnheader">LOGO</div>
        <div className="rk-cell rk-cell-team" role="columnheader">TEAMS</div>
        <div className="rk-cell rk-cell-num" role="columnheader">RATING</div>
        <div className="rk-cell rk-cell-num" role="columnheader">WIN-LOSS</div>
      </div>
      {ranked.map((t, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rk-row--rank-${rank}` : '';
        return (
          <div className={`rk-row ${rankClass}`} role="row" key={t.id}>
            <div className="rk-cell rk-cell-rank" role="cell">
              {rank === 1 ? <FaCrown className="rk-crown" /> : rank}
            </div>
            <div className="rk-cell rk-cell-logo" role="cell"><TeamLogo team={t.team} color={t.color} logo={t.logo} /></div>
            <div className="rk-cell rk-cell-team" role="cell">{t.team}</div>
            <div className="rk-cell rk-cell-num" role="cell">{t.rating}</div>
            <div className="rk-cell rk-cell-num" role="cell">{t.wins}-{t.losses}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Medal Tally table ── */
function MedalTable({ data }) {
  const ranked = useMemo(
    () => [...data]
      .map(t => ({ ...t, total: t.gold + t.silver + t.bronze }))
      .sort((a, b) => b.gold - a.gold || b.total - a.total),
    [data]
  );

  return (
    <div className="rk-table-wrap" role="table">
      <div className="rk-row rk-row--head rk-row--medal" role="row">
        <div className="rk-cell rk-cell-rank" role="columnheader">RANK</div>
        <div className="rk-cell rk-cell-logo" role="columnheader">LOGO</div>
        <div className="rk-cell rk-cell-team" role="columnheader">TEAMS</div>
        <div className="rk-cell rk-cell-num">GOLD &darr;</div>
        <div className="rk-cell rk-cell-num">SILVER</div>
        <div className="rk-cell rk-cell-num">BRONZE</div>
        <div className="rk-cell rk-cell-num">TOTAL</div>
      </div>
      {ranked.map((t, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rk-row--rank-${rank}` : '';
        return (
          <div className={`rk-row rk-row--medal ${rankClass}`} role="row" key={t.id}>
            <div className="rk-cell rk-cell-rank" role="cell">{rank}</div>
            <div className="rk-cell rk-cell-logo" role="cell"><TeamLogo team={t.team} color={t.color} /></div>
            <div className="rk-cell rk-cell-team" role="cell">{t.team}</div>
            <div className="rk-cell rk-cell-num" role="cell">{t.gold}</div>
            <div className="rk-cell rk-cell-num" role="cell">{t.silver}</div>
            <div className="rk-cell rk-cell-num" role="cell">{t.bronze}</div>
            <div className="rk-cell rk-cell-num rk-cell-total" role="cell">{t.total}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function RankingPage() {
  const [levelLabel, setLevelLabel] = useState('High School');
  const [championSport, setChampionSport] = useState('All Sports');
  const [medalSport, setMedalSport] = useState('All Sports');
  const [search, setSearch] = useState('');
  const contactRef = React.useRef(null);

  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [rankingPoints, setRankingPoints] = useState({}); // { [scopeKey]: { [teamName]: points } }
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [championDivision, setChampionDivision] = useState('All Divisions');

  const levelKey = LEVEL_KEY_BY_LABEL[levelLabel] || 'highSchool';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      const [configR, ranksR, recsR] = await Promise.allSettled([
        getSportsTeamsConfig(levelKey),
        getTeamRankings(levelKey),
        getMatchRecords(levelKey),
      ]);
      if (cancelled) return;

      if (configR.status === 'fulfilled') {
        setTeams(configR.value.teams || []);
        setSports(configR.value.sports || []);
      } else {
        console.error('Failed to load teams:', configR.reason);
        setTeams([]);
        setSports([]);
      }
      if (ranksR.status === 'fulfilled') {
        setRankingPoints(ranksR.value || {});
      } else {
        console.error('Failed to load team rankings:', ranksR.reason);
        setRankingPoints({});
      }
      if (recsR.status === 'fulfilled') {
        setRecords(recsR.value || []);
      } else {
        console.error('Failed to load match records:', recsR.reason);
        setRecords([]);
      }

      if ([configR, ranksR, recsR].some(r => r.status === 'rejected')) {
        setLoadError("Couldn't load some ranking data — check your connection and try refreshing.");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [levelKey]);

  /* Divisions available for the currently selected sport tab — hidden
     entirely under "All Sports", since a division only means something
     within one specific sport. Resets to "All Divisions" whenever the
     sport changes, so you're never stuck on a division that doesn't
     exist for the newly selected sport. */
  const championDivisionOptions = useMemo(() => {
    if (championSport === 'All Sports') return [];
    const sport = sports.find(s => norm(s.name) === norm(championSport));
    return divisionOptionsForSport(sport);
  }, [sports, championSport]);

  useEffect(() => {
    setChampionDivision('All Divisions');
  }, [championSport]);

  /* Every team registered for this level, deduplicated by name (Admin's
     Sports & Teams roster is the source of truth for who even exists —
     a team shows up here with default rating/0-0 record even before its
     first match is recorded, same as Moderator's default-1000 baseline). */
  const championData = useMemo(() => {
    const bySport = championSport === 'All Sports'
      ? teams
      : teams.filter(t => (t.sportIds || []).some(s => norm(s) === norm(championSport)));

    const searched = search.trim()
      ? bySport.filter(t => norm(t.name).includes(norm(search)))
      : bySport;

    const divisionPicked = championSport !== 'All Sports' && championDivision !== 'All Divisions';

    return searched.map((t) => {
      // Rating: if a specific division is picked, read that scope
      // directly. Otherwise average across whatever sport+division
      // scopes this team has actually been scored in (narrowed to the
      // selected sport tab) — not a sum, so a team with several
      // divisions doesn't get an inflated rating just for existing in
      // more of them.
      const scopedPoints = [];
      Object.entries(rankingPoints).forEach(([scopeKey, teamMap]) => {
        if (championSport !== 'All Sports' && !scopeKey.startsWith(`${norm(championSport)}::`)) return;
        if (divisionPicked) {
          const [, scopeCategory] = scopeKey.split('::');
          if (!categoriesMatch(scopeCategory, championDivision)) return;
        }
        if (teamMap[t.name] != null) scopedPoints.push(teamMap[t.name]);
      });
      const rating = scopedPoints.length
        ? Math.round(scopedPoints.reduce((a, b) => a + b, 0) / scopedPoints.length)
        : DEFAULT_POINTS;

      // Win/loss: count from actual saved match records for this team,
      // narrowed to the selected sport tab and division (if chosen).
      let wins = 0, losses = 0;
      records.forEach((r) => {
        if (championSport !== 'All Sports' && norm(r.sportName) !== norm(championSport)) return;
        if (divisionPicked && !categoriesMatch(r.category, championDivision)) return;
        const isA = norm(r.teamA?.name) === norm(t.name);
        const isB = norm(r.teamB?.name) === norm(t.name);
        if (!isA && !isB) return;
        const won = (isA && r.winner === 'A') || (isB && r.winner === 'B');
        if (won) wins++; else losses++;
      });

      return {
        id: t.id, team: (t.name || '').toUpperCase(), logo: t.logo || null,
        color: colorForTeam(t.name), rating, wins, losses,
      };
    });
  }, [teams, rankingPoints, records, championSport, championDivision, search]);

  return (
    <div className="rk-page">

      {/* ── Top header ── */}
      <header className="rk-dash-header">
        <h1 className="rk-dash-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
        <div className="rk-header-right">
          <div className="rk-search-wrap">
            <FaSearch className="rk-search-icon" />
            <input
              type="text"
              className="rk-search-input"
              placeholder="Search team"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <LevelsButton selected={levelLabel} onChange={setLevelLabel} />
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="rk-body">

        {/* Page intro */}
        <div className="rk-page-intro">
          <h2 className="rk-page-title">Top Rankings</h2>
          <p className="rk-page-subtitle">Ranked by performance, not by chance. Every game counts. Every rank matters.</p>
        </div>

        {loadError && <p className="rk-load-error">{loadError}</p>}

        {/* Potential Champion */}
        <section className="rk-section">
          <div className="rk-section-header">
            <h3 className="rk-section-title">Potential Champion</h3>
            <p className="rk-section-subtitle">Performance based</p>
          </div>
          <SportTabs active={championSport} onChange={setChampionSport} />
          {championDivisionOptions.length > 0 && (
            <div className="rk-division-row">
              <label className="rk-division-label">Division</label>
              <select
                className="rk-division-select"
                value={championDivision}
                onChange={(e) => setChampionDivision(e.target.value)}
              >
                <option value="All Divisions">All Divisions</option>
                {championDivisionOptions.map(d => (
                  <option key={d.key} value={d.label}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="rk-card">
            {loading ? (
              <div className="rk-table-empty">Loading…</div>
            ) : (
              <ChampionTable data={championData} />
            )}
          </div>
        </section>

        {/* Medal Tally */}
        <section className="rk-section">
          <div className="rk-section-header">
            <h3 className="rk-section-title"><FaMedal className="rk-section-icon" /> Medal Tally</h3>
            <p className="rk-section-subtitle">Win and Loss</p>
          </div>
          <SportTabs active={medalSport} onChange={setMedalSport} />
          <div className="rk-card rk-card--light">
            <MedalTable data={MEDAL_DATA} />
          </div>
        </section>

        {/* Contact footer */}
        <Contact contactFooterRef={contactRef} />
      </div>
    </div>
  );
}