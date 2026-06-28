import React, { useState, useMemo } from 'react';
import './RankingPage.css';
import { FaSearch, FaCrown, FaMedal } from 'react-icons/fa';
import { FiChevronDown } from 'react-icons/fi';
import Contact from '../components/Landing/Contact/Contact';

/* ── Sport filter tabs (shared by both tables) ── */
const SPORTS = ['All Sports', 'Basketball', 'Volleyball', 'Tennis', 'Chess', 'Badminton'];
const LEVELS = ['Levels', 'Elementary', 'High School', 'College'];

/* ── Sample standings data (replace with Firestore later) ──
   wins / losses feed the rating + win-loss columns directly,
   so the numbers always stay consistent with each other. */
const STANDINGS_DATA = [
  { id: 1, team: 'YELLOW VIPERS',  color: '#FCBF19', wins: 8, losses: 1 },
  { id: 2, team: 'GREEN GATORS',   color: '#3FA34D', wins: 6, losses: 3 },
  { id: 3, team: 'RED RHINOS',     color: '#D43A2F', wins: 5, losses: 4 },
  { id: 4, team: 'BROWN CUBS',     color: '#8D6E47', wins: 4, losses: 5 },
];

/* ── Sample medal tally data (replace with Firestore later) ── */
const MEDAL_DATA = [
  { id: 1, team: 'YELLOW VIPERS',  color: '#FCBF19', gold: 121, silver: 81,  bronze: 60 },
  { id: 2, team: 'PURPLE JAGUARS', color: '#7B4FA0', gold: 73,  silver: 32,  bronze: 46 },
  { id: 3, team: 'MAROON OWLS',    color: '#800000', gold: 54,  silver: 46,  bronze: 62 },
  { id: 4, team: 'BROWN CUBS',     color: '#8D6E47', gold: 54,  silver: 46,  bronze: 52 },
];

/* ── Team logo placeholder (initials chip, swap for real logos later) ── */
function TeamLogo({ team, color }) {
  const initials = team.split(' ').map(w => w[0]).join('').slice(0, 2);
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
function LevelsButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('Levels');
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
            onClick={() => { setSelected(level); setOpen(false); }}
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
    () => [...data].sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses)),
    [data]
  );

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
        const rating = 1000 + (t.wins - t.losses) * 80;
        const rankClass = rank <= 3 ? `rk-row--rank-${rank}` : '';
        return (
          <div className={`rk-row ${rankClass}`} role="row" key={t.id}>
            <div className="rk-cell rk-cell-rank" role="cell">
              {rank === 1 ? <FaCrown className="rk-crown" /> : rank}
            </div>
            <div className="rk-cell rk-cell-logo" role="cell"><TeamLogo team={t.team} color={t.color} /></div>
            <div className="rk-cell rk-cell-team" role="cell">{t.team}</div>
            <div className="rk-cell rk-cell-num" role="cell">{rating}</div>
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
  const [championSport, setChampionSport] = useState('All Sports');
  const [medalSport, setMedalSport] = useState('All Sports');
  const [search, setSearch] = useState('');
  const contactRef = React.useRef(null);

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
          <LevelsButton />
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="rk-body">

        {/* Page intro */}
        <div className="rk-page-intro">
          <h2 className="rk-page-title">Top Rankings</h2>
          <p className="rk-page-subtitle">Ranked by performance, not by chance. Every game counts. Every rank matters.</p>
        </div>

        {/* Potential Champion */}
        <section className="rk-section">
          <div className="rk-section-header">
            <h3 className="rk-section-title">Potential Champion</h3>
            <p className="rk-section-subtitle">Performance based</p>
          </div>
          <SportTabs active={championSport} onChange={setChampionSport} />
          <div className="rk-card">
            <ChampionTable data={STANDINGS_DATA} />
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