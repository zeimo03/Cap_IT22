import React, { useState } from 'react';
import './TeamAndSportsPage.css';
import Contact from '../components/Landing/Contact/Contact';

/* ── Sample teams data (replace with Firestore later) ── */
const TEAMS_DATA = [
  {
    id: 1,
    name: 'PURPLE JAGUARS',
    year: '2ND YEAR COLLEGE',
    logo: null,
    sports: ['BASKETBALL', 'TENNIS', 'VOLLEYBALL', 'SEPAK TAKRAW', 'BADMINTON', 'CHESS', 'ARNIS'],
  },
  {
    id: 2,
    name: 'RED RHINOS',
    year: '1ST YEAR COLLEGE',
    logo: null,
    sports: ['BASKETBALL', 'CHESS', 'ATHLETICS', 'BADMINTON', 'VOLLYBALL'],
  },
  {
    id: 3,
    name: 'GREEN GATORS',
    year: '1ST YEAR COLLEGE',
    logo: null,
    sports: ['BASKETBALL', 'CHESS', 'ATHLETICS', 'BADMINTON', 'SEPAK', 'ARNIS', 'TENNIS'],
  },
  {
    id: 4,
    name: 'ORANGE BULLDOGS',
    year: '3RD YEAR COLLEGE',
    logo: null,
    sports: ['VOLLEYBALL', 'BADMINTON', 'BASKETBALL', 'BASEBALL', 'TENNIS', 'ATHLETICS'],
  },
  {
    id: 5,
    name: 'BLACK BEETLES',
    year: '2ND YEAR COLLEGE',
    logo: null,
    sports: ['BASKETBALL', 'BASEBALL', 'SWIMMING', 'CHESS', 'ARNIS'],
  },
  {
    id: 6,
    name: 'BROWN CUBS',
    year: '4TH YEAR COLLEGE',
    logo: null,
    sports: ['BASEBALL', 'TENNIS', 'VOLLEYBALL', 'ATHLETICS', 'BADMINTON'],
  },
  {
    id: 7,
    name: 'YELLOW VIPERS',
    year: '3RD YEAR COLLEGE',
    logo: null,
    sports: ['BASKETBALL', 'VOLLEYBALL', 'SEPAK TAKRAW', 'ARNIS', 'CHESS', 'ATHLETICS'],
  },
  {
    id: 8,
    name: 'MAROON OWLS',
    year: '2ND YEAR COLLEGE',
    logo: null,
    sports: ['BASKETBALL', 'TENNIS', 'BADMINTON', 'SWIMMING', 'CHESS'],
  },
];

const LEVELS = ['All Levels', 'Elementary', 'High School', 'College'];

const totalSports = [...new Set(TEAMS_DATA.flatMap(t => t.sports))].length;

/* ── Team logo placeholder ── */
function TeamLogo({ name, logo }) {
  if (logo) {
    return <img src={logo} alt={name} className="ts-team-logo" />;
  }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2);
  return (
    <div className="ts-team-logo ts-team-logo--placeholder">
      <span>{initials}</span>
    </div>
  );
}

/* ── Single team card ── */
function TeamCard({ team, index }) {
  return (
    <div className="ts-team-card" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="ts-card-sport-count">{team.sports.length} SPORTS</div>
      <div className="ts-card-top">
        <TeamLogo name={team.name} logo={team.logo} />
        <div className="ts-card-info">
          <h3 className="ts-card-name">{team.name}</h3>
          <p className="ts-card-year">{team.year}</p>
          <p className="ts-card-status">SPORTS PARTICIPATING</p>
        </div>
      </div>
      <div className="ts-sports-tags">
        {team.sports.map((sport, i) => (
          <span key={i} className="ts-sport-tag">{sport}</span>
        ))}
      </div>
    </div>
  );
}

export default function TeamsAndSportsPage() {
  const [level, setLevel] = useState('All Levels');
  const [levelOpen, setLevelOpen] = useState(false);
  const contactRef = React.useRef(null);

  return (
    <div className="ts-page">

      {/* ── Top header — same pattern as Profile & Registration ── */}
      <header className="ts-dash-header">
        <h1 className="ts-dash-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
      </header>

      {/* ── Page intro — same pattern as Profile & Registration ── */}
      <div className="ts-page-intro">
        <h2 className="ts-page-title">Team and Sports</h2>
        <p className="ts-page-subtitle">View all participating teams and their sports events</p>
      </div>

      {/* ── Scrollable body ── */}
      <div className="ts-body">

        {/* Sub-header bar */}
        <div className="ts-subheader">
          <div className="ts-subheader-stats">
            <span className="ts-stat">{TEAMS_DATA.length} TEAMS</span>
            <span className="ts-stat-divider">|</span>
            <span className="ts-stat">{totalSports} SPORTS</span>
          </div>

          {/* Levels dropdown */}
          <div className="ts-lvls-wrap">
            <button
              className="ts-lvls-btn"
              onClick={() => setLevelOpen(p => !p)}
              aria-haspopup="listbox"
              aria-expanded={levelOpen}
            >
              {level}
              <span className={`ts-lvls-arrow ${levelOpen ? 'ts-lvls-arrow--open' : ''}`}>▾</span>
            </button>
            <div className={`ts-lvls-dropdown ${levelOpen ? 'ts-lvls-dropdown--open' : ''}`} role="listbox">
              {LEVELS.map(l => (
                <button
                  key={l}
                  className="ts-lvls-item"
                  onClick={() => { setLevel(l); setLevelOpen(false); }}
                  role="option"
                  aria-selected={level === l}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section title */}
        <h2 className="ts-section-title">PARTICIPATING TEAMS</h2>

        {/* Team cards */}
        <div className="ts-cards-list">
          {TEAMS_DATA.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </div>

        {/* Contact footer — reusing existing component, no new CSS needed */}
        <Contact contactFooterRef={contactRef} />
      </div>
    </div>
  );
}