import React from 'react';
import './DashboardPage.css';

/* ══════════════════════════════════════════════════════
   TEAM IMAGE PATHS
   → Replace each `banner` value with your actual image path.
     e.g.  banner: '/assets/teams/black-beetles.png'
   ══════════════════════════════════════════════════════ */
const TEAMS = {
  blackBeetles:   { id: 'black-beetles',   label: 'BLACK BEETLES',   banner: null },
  purpleJaguars:  { id: 'purple-jaguars',  label: 'PURPLE JAGUARS',  banner: null },
  brownCubs:      { id: 'brown-cubs',      label: 'BROWN CUBS',      banner: null },
  orangeBulldogs: { id: 'orange-bulldogs', label: 'ORANGE BULLDOGS', banner: null },
  yellowVipers:   { id: 'yellow-vipers',   label: 'YELLOW VIPERS',   banner: null },
  maroonOwls:     { id: 'maroon-owls',     label: 'MAROON OWLS',     banner: null },
  greenGators:    { id: 'green-gators',    label: 'GREEN GATORS',    banner: null },
  redRhinos:      { id: 'red-rhinos',      label: 'RED RHINOS',      banner: null },
};

const ONGOING = [
  { id: 1, teamA: TEAMS.blackBeetles,  teamB: TEAMS.purpleJaguars,  sport: 'BASKETBALL', venue: 'GYM (COVERED SPORTS)',  game: 'GAME 1' },
  { id: 2, teamA: TEAMS.brownCubs,     teamB: TEAMS.orangeBulldogs, sport: 'BASEBALL',   venue: 'GYM (COVERED SPORTS)',  game: 'GAME 2' },
  { id: 3, teamA: TEAMS.yellowVipers,  teamB: TEAMS.maroonOwls,     sport: 'BASEBALL',   venue: 'GYM (COVERED SPORTS)',  game: 'GAME 3' },
  { id: 4, teamA: TEAMS.greenGators,   teamB: TEAMS.redRhinos,      sport: 'SWIMMING',   venue: 'GYM (SWIMMING POOL)',   game: 'GAME 4' },
];

const UPCOMING = [
  { id: 1, date: 'JUNE 12', teamA: TEAMS.blackBeetles, teamB: TEAMS.purpleJaguars,  sport: 'BASKETBALL' },
  { id: 2, date: 'JUNE 12', teamA: TEAMS.brownCubs,    teamB: TEAMS.orangeBulldogs, sport: 'BASEBALL'   },
  { id: 3, date: 'JUNE 15', teamA: TEAMS.greenGators,  teamB: TEAMS.redRhinos,      sport: 'SWIMMING'   },
];

/* ── Team Banner: image or placeholder ── */
function TeamBanner({ team, size }) {
  const cls = `team-banner team-banner--${size}`;
  if (team.banner) {
    return (
      <div className={cls}>
        <img src={team.banner} alt={team.label} className="team-banner__img" draggable={false} />
      </div>
    );
  }
  return (
    <div className={`${cls} team-banner--placeholder`}>
      <span className="team-banner__label">{team.label}</span>
    </div>
  );
}

/* ── Ongoing Match Card ── */
function OngoingCard({ match }) {
  return (
    <div className="ongoing-card">
      <span className="game-tag">{match.game}</span>

      <div className="oc-banners">
        <TeamBanner team={match.teamA} size="oc" />
        <TeamBanner team={match.teamB} size="oc" />
      </div>

      <div className="oc-footer">
        <div className="oc-teams-row">
          <span className="ft-label">{match.teamA.label}</span>
          <span className="ft-vs">VS</span>
          <span className="ft-label">{match.teamB.label}</span>
        </div>
        <div className="ft-venue">{match.sport} | {match.venue}</div>
      </div>
    </div>
  );
}

/* ── Upcoming Match Card ── */
function UpcomingCard({ match }) {
  return (
    <div className="upcoming-card">
      <div className="uc-banners">
        <TeamBanner team={match.teamA} size="uc" />
        {match.teamB
          ? <TeamBanner team={match.teamB} size="uc" />
          : <div className="tbd-slot" />
        }
      </div>

      <div className="uc-date-row">
        <span className="date-pill">{match.date}</span>
      </div>

      <div className="uc-teams-row">
        <span className="ft-label">{match.teamA.label}</span>
        <span className="ft-vs">VS</span>
        {match.teamB && <span className="ft-label">{match.teamB.label}</span>}
      </div>

      <div className="uc-sport-row">
        <span className="sport-pill">{match.sport}</span>
      </div>
    </div>
  );
}

/* ── Scroll Section ── */
function ScrollRow({ children, label }) {
  const ref = React.useRef(null);
  const scroll = (dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
  };
  return (
    <section className="dash-section">
      <div className="section-header">
        <h2 className="section-title">{label}</h2>
        <div className="scroll-arrows">
          <button className="arrow-btn" onClick={() => scroll(-1)} aria-label="Scroll left">&#8249;</button>
          <button className="arrow-btn" onClick={() => scroll(1)} aria-label="Scroll right">&#8250;</button>
        </div>
      </div>
      <div className="scroll-row" ref={ref}>
        {children}
      </div>
    </section>
  );
}

/* ── Main Page ── */
export default function DashboardPage() {
  return (
    <div className="user-dashboard">
      <header className="dash-header">
        <h1 className="dash-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
        <button className="levels-btn">Levels ▾</button>
      </header>

      <div className="dash-body">
        <ScrollRow label="ONGOING MATCHES">
          {ONGOING.map(m => <OngoingCard key={m.id} match={m} />)}
        </ScrollRow>

        <ScrollRow label="UPCOMING MATCHES">
          {UPCOMING.map(m => <UpcomingCard key={m.id} match={m} />)}
        </ScrollRow>
      </div>
    </div>
  );
}