import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiAward, FiAlertTriangle, FiChevronDown, FiChevronLeft, FiChevronRight, FiStar, FiTrendingUp, FiZap } from 'react-icons/fi';
import './DashboardPage.css';
import Contact from '../components/Landing/Contact/Contact';

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
  { id: 1, date: 'JUNE 12', teamA: TEAMS.blackBeetles,  teamB: TEAMS.purpleJaguars,  sport: 'BASKETBALL', venue: 'GYM (COVERED SPORTS)',  game: 'GAME 1' },
  { id: 2, date: 'JUNE 12', teamA: TEAMS.brownCubs,     teamB: TEAMS.orangeBulldogs, sport: 'BASEBALL',   venue: 'GYM (COVERED SPORTS)',  game: 'GAME 2' },
  { id: 3, date: 'JUNE 12', teamA: TEAMS.yellowVipers,  teamB: TEAMS.maroonOwls,     sport: 'BASEBALL',   venue: 'GYM (COVERED SPORTS)',  game: 'GAME 3' },
  { id: 4, date: 'JUNE 12', teamA: TEAMS.greenGators,   teamB: TEAMS.redRhinos,      sport: 'SWIMMING',   venue: 'GYM (SWIMMING POOL)',   game: 'GAME 4' },
];

const UPCOMING = [
  { id: 1, date: 'JUNE 12', teamA: TEAMS.blackBeetles, teamB: TEAMS.purpleJaguars,  sport: 'BASKETBALL' },
  { id: 2, date: 'JUNE 12', teamA: TEAMS.brownCubs,    teamB: TEAMS.orangeBulldogs, sport: 'BASEBALL'   },
  { id: 3, date: 'JUNE 15', teamA: TEAMS.greenGators,  teamB: TEAMS.redRhinos,      sport: 'SWIMMING'   },
];

const FINISHED = [
  {
    id: 1,
    sport: 'BASKETBALL', gender: 'WOMEN', date: 'January 17, 2025 • Monday',
    teamA: TEAMS.blackBeetles, teamB: TEAMS.purpleJaguars, winner: 'A',
    teamAStats: { eloPoints: 1026, mvpScore: 18, violation: 2, matchResult: 10, totalPoints: 28 },
    teamBStats: { eloPoints: 1010, mvpScore: 20, violation: 0, matchResult: 10, totalPoints: 10 },
  },
  {
    id: 2,
    sport: 'BASEBALL', gender: 'MEN', date: 'January 18, 2025 • Tuesday',
    teamA: TEAMS.brownCubs, teamB: TEAMS.orangeBulldogs, winner: 'B',
    teamAStats: { eloPoints: 998,  mvpScore: 15, violation: 1, matchResult: 5,  totalPoints: 15 },
    teamBStats: { eloPoints: 1015, mvpScore: 22, violation: 0, matchResult: 15, totalPoints: 35 },
  },
  {
    id: 3,
    sport: 'SWIMMING', gender: 'WOMEN', date: 'January 19, 2025 • Wednesday',
    teamA: TEAMS.greenGators, teamB: TEAMS.redRhinos, winner: 'A',
    teamAStats: { eloPoints: 1040, mvpScore: 25, violation: 0, matchResult: 20, totalPoints: 45 },
    teamBStats: { eloPoints: 995,  mvpScore: 14, violation: 3, matchResult: 5,  totalPoints: 10 },
  },
  {
    id: 4,
    sport: 'BASKETBALL', gender: 'WOMEN', date: 'January 20, 2025 • Thursday',
    teamA: TEAMS.yellowVipers, teamB: TEAMS.maroonOwls, winner: 'B',
    teamAStats: { eloPoints: 1005, mvpScore: 17, violation: 1, matchResult: 8,  totalPoints: 20 },
    teamBStats: { eloPoints: 1020, mvpScore: 21, violation: 0, matchResult: 12, totalPoints: 32 },
  },
  {
    id: 5,
    sport: 'BASEBALL', gender: 'MEN', date: 'January 21, 2025 • Friday',
    teamA: TEAMS.blackBeetles, teamB: TEAMS.redRhinos, winner: 'A',
    teamAStats: { eloPoints: 1035, mvpScore: 24, violation: 0, matchResult: 18, totalPoints: 42 },
    teamBStats: { eloPoints: 990,  mvpScore: 12, violation: 2, matchResult: 2,  totalPoints: 8  },
  },
];

const LEVELS = ['Elementary', 'High School', 'College'];

const CARD_W = 400;
const GAP    = 24;
const STEP   = CARD_W + GAP; // 424px per position slot

// Visual config per position index (-2 … +2)
const POS_STYLE = {
  '-2': { scale: 0.72, opacity: 0.20, brightness: 0.40, grayscale: 0.50, z: 1  },
  '-1': { scale: 0.82, opacity: 0.40, brightness: 0.55, grayscale: 0.30, z: 5  },
   '0': { scale: 1.00, opacity: 1.00, brightness: 1.00, grayscale: 0.00, z: 10 },
   '1': { scale: 0.82, opacity: 0.40, brightness: 0.55, grayscale: 0.30, z: 5  },
   '2': { scale: 0.72, opacity: 0.20, brightness: 0.40, grayscale: 0.50, z: 1  },
};

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

function OngoingCard({ match }) {
  return (
    <div className="ongoing-card">
      <div className="oc-banners">
        <TeamBanner team={match.teamA} size="oc" />
        <TeamBanner team={match.teamB} size="oc" />
      </div>
      <div className="oc-footer">
        <div className="oc-date-row"><span className="date-pill">{match.date}</span></div>
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

function UpcomingCard({ match }) {
  return (
    <div className="upcoming-card">
      <div className="uc-banners">
        <TeamBanner team={match.teamA} size="uc" />
        {match.teamB ? <TeamBanner team={match.teamB} size="uc" /> : <div className="tbd-slot" />}
      </div>
      <div className="uc-date-row"><span className="date-pill">{match.date}</span></div>
      <div className="uc-teams-row">
        <span className="ft-label">{match.teamA.label}</span>
        <span className="ft-vs">VS</span>
        {match.teamB && <span className="ft-label">{match.teamB.label}</span>}
      </div>
      <div className="uc-sport-row"><span className="sport-pill">{match.sport}</span></div>
    </div>
  );
}

function FinishedCard({ match, isActive }) {
  const winnerA = match.winner === 'A';
  const winnerB = match.winner === 'B';

  const StatRow = ({ label, icon: Icon, aVal, bVal, aWin, bWin }) => (
    <div className="fc-stat-row">
      <span className={`fc-stat-val ${aWin ? 'fc-stat-val--win' : ''}`}>{aVal}</span>
      <span className="fc-stat-label"><span className="fc-stat-icon"><Icon /></span>{label}</span>
      <span className={`fc-stat-val ${bWin ? 'fc-stat-val--win' : ''}`}>{bVal}</span>
    </div>
  );

  return (
    <div className={`finished-card ${isActive ? 'finished-card--active' : 'finished-card--side'}`}>
      <div className="fc-header">
        <div className="fc-sport">{match.sport} {match.gender}</div>
        <div className="fc-date">{match.date}</div>
      </div>
      <div className="fc-match">
        <div className="fc-team">
          <TeamBanner team={match.teamA} size={isActive ? 'fc' : 'fc-small'} />
          <span className="fc-team-name">{match.teamA.label}</span>
          <span className={`fc-result ${winnerA ? 'fc-result--win' : 'fc-result--lose'}`}>{winnerA ? 'WIN' : 'LOSE'}</span>
        </div>
        <div className="fc-vs">VS</div>
        <div className="fc-team">
          <TeamBanner team={match.teamB} size={isActive ? 'fc' : 'fc-small'} />
          <span className="fc-team-name">{match.teamB.label}</span>
          <span className={`fc-result ${winnerB ? 'fc-result--win' : 'fc-result--lose'}`}>{winnerB ? 'WIN' : 'LOSE'}</span>
        </div>
      </div>
      <div className="fc-stats">
        <StatRow label="Elo Points"   icon={FiZap}          aVal={match.teamAStats.eloPoints}         bVal={match.teamBStats.eloPoints}         aWin={winnerA} bWin={winnerB} />
        <StatRow label="MVP Score"    icon={FiStar}         aVal={match.teamAStats.mvpScore}          bVal={match.teamBStats.mvpScore}          aWin={winnerA} bWin={winnerB} />
        <StatRow label="Violation"    icon={FiAlertTriangle} aVal={match.teamAStats.violation}         bVal={match.teamBStats.violation}         aWin={winnerA} bWin={winnerB} />
        <StatRow label="Match Result" icon={FiTrendingUp}    aVal={`+${match.teamAStats.matchResult}`} bVal={`+${match.teamBStats.matchResult}`} aWin={winnerA} bWin={winnerB} />
        <StatRow label="Total Points" icon={FiAward}        aVal={`+${match.teamAStats.totalPoints}`} bVal={`+${match.teamBStats.totalPoints}`} aWin={winnerA} bWin={winnerB} />
      </div>
    </div>
  );
}

function FinishedCarousel({ matches }) {
  const total = matches.length;
  // `center` is the displayed active index (can be fractional during anim — we use it as integer)
  const [center, setCenter] = useState(0);
  const lockRef = useRef(false);
  const prevCenterRef = useRef(center);

  const wrapIdx = useCallback((i) => ((i % total) + total) % total, [total]);
  const wrapSigned = useCallback((i) => {
    const wrapped = ((i % total) + total) % total;
    return wrapped > total / 2 ? wrapped - total : wrapped;
  }, [total]);

  const go = useCallback((dir) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setCenter(prev => {
      prevCenterRef.current = prev;
      return wrapIdx(prev + dir);
    });
    setTimeout(() => { lockRef.current = false; }, 420);
  }, [wrapIdx]);

  return (
    <section className="dash-section dash-section--finished">
      <div className="section-header">
        <h2 className="section-title">FINISHED MATCHES</h2>
        <div className="scroll-arrows">
          <button className="arrow-btn" onClick={() => go(-1)} aria-label="Scroll left"><FiChevronLeft /></button>
          <button className="arrow-btn" onClick={() => go(1)}  aria-label="Scroll right"><FiChevronRight /></button>
        </div>
      </div>

      <div className="finished-carousel">
        <div className="finished-carousel__track">
          {matches.map((match, matchIdx) => {
            const pos = wrapSigned(matchIdx - center);
            const ps = POS_STYLE[String(pos)];
            const tx = pos * STEP;
            const prevPos = wrapSigned(matchIdx - prevCenterRef.current);
            const isWrapped = Math.abs(pos - prevPos) > 2;

            const style = {
              transform: `translateX(${tx}px) scale(${ps.scale})`,
              opacity:   ps.opacity,
              filter:    `brightness(${ps.brightness}) grayscale(${ps.grayscale})`,
              zIndex:    ps.z,
              transition: isWrapped ? 'none' : undefined,
            };

            return (
              <div
                key={`slide-${match.id}`}
                className="finished-carousel__slide"
                style={style}
              >
                <FinishedCard
                  match={match}
                  isActive={matchIdx === center}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ScrollRow({ children, label, variant }) {
  const ref = React.useRef(null);
  const scroll = (dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
  };
  return (
    <section className={`dash-section dash-section--${variant}`}>
      <div className="section-header">
        <h2 className="section-title">{label}</h2>
        <div className="scroll-arrows">
          <button className="arrow-btn" onClick={() => scroll(-1)} aria-label="Scroll left">&#8249;</button>
          <button className="arrow-btn" onClick={() => scroll(1)}  aria-label="Scroll right">&#8250;</button>
        </div>
      </div>
      <div className="scroll-row" ref={ref}>{children}</div>
    </section>
  );
}

function LevelsButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('Levels');
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePick = (level) => { setSelected(level); setOpen(false); };

  return (
    <div ref={wrapRef} className="lvls-wrap">
      <button className="lvls-btn" onClick={() => setOpen(p => !p)} aria-haspopup="listbox" aria-expanded={open}>
        {selected}
        <span className={`lvls-btn__arrow ${open ? 'lvls-btn__arrow--open' : ''}`}><FiChevronDown /></span>
      </button>
      <div className={`lvls-dropdown ${open ? 'lvls-dropdown--open' : ''}`} role="listbox">
        {LEVELS.map((level) => (
          <button key={level} className="lvls-dropdown__item" onClick={() => handlePick(level)} role="option" aria-selected={selected === level}>
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const contactFooterRef = useRef(null);

  return (
    <div className="user-dashboard">
      <header className="dash-header">
        <h1 className="dash-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
        <LevelsButton />
      </header>
      <div className="profile-page-intro">
        <h2 className="profile-page-title">Home</h2>
        <p className="profile-page-subtitle">Browse for matches informations</p>
      </div>
      <div className="dash-body">
        <ScrollRow label="ONGOING MATCHES" variant="ongoing">
          {ONGOING.map(m => <OngoingCard key={m.id} match={m} />)}
        </ScrollRow>
        <ScrollRow label="UPCOMING MATCHES" variant="upcoming">
          {UPCOMING.map(m => <UpcomingCard key={m.id} match={m} />)}
        </ScrollRow>
        <FinishedCarousel matches={FINISHED} />
        <Contact contactFooterRef={contactFooterRef} />
      </div>
    </div>
  );
}