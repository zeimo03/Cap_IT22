import React, { useState, useMemo } from 'react';
import './MatchSchedulesPage.css';
import Contact from '../components/Landing/Contact/Contact';
import { FaSearch, FaTrophy } from 'react-icons/fa';

/* ═══════════════════════════════════════════════════════════
   DATA STRUCTURE — Admin enters this via your admin panel
   
   Each match record:
   {
     id: string,
     round: number,        // 1 = outermost (most teams), increases inward
     matchNumber: number,  // position within round, 1-based
     teamA: string | null,
     teamB: string | null,
     winner: string | null,
     nextMatchId: string | null,
   }
   
   The bracket auto-generates from this flat list!
   ═══════════════════════════════════════════════════════════ */

/* ── Sample bracket data (replace with Firestore) ── */
const BRACKET_DATA = {
  'Basketball Men': [
    // LEFT SIDE — Round 1 (outermost)
    { id: 'bm-l-r1-m1', round: 1, matchNumber: 1, side: 'left', teamA: 'RED RHINOS', teamB: null, winner: null, nextMatchId: 'bm-l-r2-m1' },
    { id: 'bm-l-r1-m2', round: 1, matchNumber: 2, side: 'left', teamA: 'BROWN CUBS', teamB: null, winner: null, nextMatchId: 'bm-l-r2-m1' },
    { id: 'bm-l-r1-m3', round: 1, matchNumber: 3, side: 'left', teamA: 'YELLOW VIPERS', teamB: null, winner: null, nextMatchId: 'bm-l-r2-m2' },
    { id: 'bm-l-r1-m4', round: 1, matchNumber: 4, side: 'left', teamA: 'GREEN GATORS', teamB: null, winner: null, nextMatchId: 'bm-l-r2-m2' },
    // LEFT SIDE — Round 2
    { id: 'bm-l-r2-m1', round: 2, matchNumber: 1, side: 'left', teamA: null, teamB: null, winner: null, nextMatchId: 'bm-l-r3-m1' },
    { id: 'bm-l-r2-m2', round: 2, matchNumber: 2, side: 'left', teamA: null, teamB: null, winner: null, nextMatchId: 'bm-l-r3-m1' },
    // LEFT SIDE — Round 3 (feeds into final)
    { id: 'bm-l-r3-m1', round: 3, matchNumber: 1, side: 'left', teamA: null, teamB: null, winner: null, nextMatchId: 'bm-final' },

    // RIGHT SIDE — Round 1 (outermost)
    { id: 'bm-r-r1-m1', round: 1, matchNumber: 1, side: 'right', teamA: 'PURPLE JAGUARS', teamB: null, winner: null, nextMatchId: 'bm-r-r2-m1' },
    { id: 'bm-r-r1-m2', round: 1, matchNumber: 2, side: 'right', teamA: 'ORANGE BULLDOGS', teamB: null, winner: null, nextMatchId: 'bm-r-r2-m1' },
    { id: 'bm-r-r1-m3', round: 1, matchNumber: 3, side: 'right', teamA: 'MAROON OWLS', teamB: null, winner: null, nextMatchId: 'bm-r-r2-m2' },
    { id: 'bm-r-r1-m4', round: 1, matchNumber: 4, side: 'right', teamA: 'BLACK BEETLES', teamB: null, winner: null, nextMatchId: 'bm-r-r2-m2' },
    // RIGHT SIDE — Round 2
    { id: 'bm-r-r2-m1', round: 2, matchNumber: 1, side: 'right', teamA: null, teamB: null, winner: null, nextMatchId: 'bm-r-r3-m1' },
    { id: 'bm-r-r2-m2', round: 2, matchNumber: 2, side: 'right', teamA: null, teamB: null, winner: null, nextMatchId: 'bm-r-r3-m1' },
    // RIGHT SIDE — Round 3 (feeds into final)
    { id: 'bm-r-r3-m1', round: 3, matchNumber: 1, side: 'right', teamA: null, teamB: null, winner: null, nextMatchId: 'bm-final' },

    // FINAL (center)
    { id: 'bm-final', round: 4, matchNumber: 1, side: 'center', teamA: null, teamB: null, winner: null, nextMatchId: null },
  ],
};

const CATEGORIES = Object.keys(BRACKET_DATA);

/* ── Team avatar/color mapping ── */
const TEAM_COLORS = {
  'RED RHINOS': '#c0392b',
  'BROWN CUBS': '#8d6e63',
  'YELLOW VIPERS': '#f1c40f',
  'GREEN GATORS': '#27ae60',
  'PURPLE JAGUARS': '#8e44ad',
  'ORANGE BULLDOGS': '#e67e22',
  'MAROON OWLS': '#800000',
  'BLACK BEETLES': '#2c3e50',
};

function getTeamColor(name) {
  return TEAM_COLORS[name] || '#95a5a6';
}

/* ── Sample schedule data ── */
const SCHEDULE_DATA = [
  {
    day: 'THURSDAY, JUN 11',
    matches: [
      { time: '7:00–9:00 AM', sport: 'Basketball Men', venue: 'Gym', teamA: 'Purple Jaguars', teamB: 'Brown Cubs' },
      { time: '9:30–11:30 AM', sport: 'Volleyball Women', venue: 'Gym', teamA: 'Orange Bulldogs', teamB: 'Maroon Owls' },
      { time: '1:00–3:00 PM', sport: 'Chess', venue: 'AVR', teamA: 'Purple Jaguars', teamB: 'Green Gators' },
    ],
  },
  {
    day: 'FRIDAY, JUN 12',
    matches: [
      { time: '7:00–9:00 AM', sport: 'Basketball Men', venue: 'Gym', teamA: 'Orange Bulldogs', teamB: 'Red Rhinos' },
      { time: '9:30–11:30 AM', sport: 'Volleyball Men', venue: 'Gym', teamA: 'Purple Jaguars', teamB: 'Black Beetles' },
      { time: '1:00–3:00 PM', sport: 'Badminton', venue: 'Court 2', teamA: 'Green Gators', teamB: 'Yellow Vipers' },
    ],
  },
  {
    day: 'SATURDAY, JUN 13',
    matches: [
      { time: '7:00–9:00 AM', sport: 'Basketball Men', venue: 'Gym', teamA: 'Green Gators', teamB: 'Maroon Owls' },
      { time: '9:30–11:30 AM', sport: 'Volleyball Women', venue: 'Gym', teamA: 'Purple Jaguars', teamB: 'Red Rhinos' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   TEAM ROW — Single team pill with avatar + name + status dot
   ═══════════════════════════════════════════════════════════ */
function TeamRow({ teamName, isWinner, isTBD }) {
  if (isTBD) {
    return (
      <div className="ms-bracket-team-row ms-bracket-team-row--tbd">
        <div className="ms-bracket-team-avatar" style={{ background: '#eee' }}>
          <span>?</span>
        </div>
        <span className="ms-bracket-team-name ms-bracket-team-name--tbd">TBD</span>
        <span className="ms-bracket-team-status ms-bracket-team-status--pending" />
      </div>
    );
  }

  return (
    <div className={`ms-bracket-team-row ${isWinner ? 'ms-bracket-team-row--winner' : ''}`}>
      <div 
        className="ms-bracket-team-avatar" 
        style={{ background: getTeamColor(teamName) }}
      >
        <span style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>
          {teamName.charAt(0)}
        </span>
      </div>
      <span className="ms-bracket-team-name">{teamName}</span>
      <span className={`ms-bracket-team-status ${isWinner ? 'ms-bracket-team-status--winner' : ''}`} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPACT MATCH BOX — For round 2+ with TBD teams
   ═══════════════════════════════════════════════════════════ */
function CompactMatchBox({ match }) {
  const hasTeams = match.teamA || match.teamB;
  
  if (!hasTeams) {
    return (
      <div className="ms-bracket-match-compact ms-bracket-match-compact--tbd">
        <span className="ms-bracket-match-compact-dot" style={{ background: '#ccc' }} />
        <span className="ms-bracket-match-compact-text">?</span>
      </div>
    );
  }

  return (
    <div className="ms-bracket-match-compact">
      <span 
        className="ms-bracket-match-compact-dot" 
        style={{ background: match.winner ? '#001529' : '#666' }} 
      />
      <span className="ms-bracket-match-compact-text" style={{ color: '#001529' }}>
        {match.teamA || 'TBD'}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BRACKET SIDE — Left or right half of the bracket
   ═══════════════════════════════════════════════════════════ */
function BracketSide({ matches, side }) {
  // Group by round
  const rounds = useMemo(() => {
    const roundMap = new Map();
    matches.forEach(m => {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round).push(m);
    });
    const sorted = [];
    const nums = Array.from(roundMap.keys()).sort((a, b) => a - b);
    nums.forEach(r => {
      sorted.push(roundMap.get(r).sort((a, b) => a.matchNumber - b.matchNumber));
    });
    return sorted;
  }, [matches]);

  // Calculate gap between matches in a round based on round number
  // Round 1: large gap, Round 2: smaller gap, etc.
  const getMatchGap = (roundIndex) => {
    const baseGap = 16;
    const multiplier = Math.pow(2, rounds.length - roundIndex - 1);
    return baseGap * multiplier;
  };

  return (
    <div className={`ms-bracket-side ms-bracket-side--${side}`}>
      {rounds.map((roundMatches, roundIndex) => {
        const isFirstRound = roundIndex === 0;
        const gap = getMatchGap(roundIndex);
        
        return (
          <div 
            key={roundIndex} 
            className="ms-bracket-round"
            style={{ gap: `${gap}px` }}
          >
            {roundMatches.map((match, matchIdx) => {
              // Determine if this match is part of a pair (has sibling feeding same parent)
              const isPairTop = matchIdx % 2 === 0 && roundMatches.length > 1;
              const isPairBottom = matchIdx % 2 === 1;
              const isSingle = roundMatches.length === 1;
              
              // Calculate connector height based on gap
              const connectorHeight = gap / 2 + 20;

              return (
                <div
                  key={match.id}
                  className={`ms-bracket-match-wrapper 
                    ${isPairTop ? 'ms-bracket-match-wrapper--pair-top' : ''} 
                    ${isPairBottom ? 'ms-bracket-match-wrapper--pair-bottom' : ''} 
                    ${isSingle ? 'ms-bracket-match-wrapper--single' : ''}`}
                  style={{ '--connector-height': `${connectorHeight}px` }}
                >
                  {isFirstRound ? (
                    // Round 1: Show individual team rows
                    <TeamRow 
                      teamName={match.teamA} 
                      isWinner={match.winner === match.teamA}
                      isTBD={!match.teamA}
                    />
                  ) : (
                    // Round 2+: Show compact match boxes
                    <CompactMatchBox match={match} />
                  )}
                  
                  {/* Connector line to next round */}
                  {roundIndex < rounds.length - 1 && (
                    <div className="ms-bracket-connector" />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHAMPION CENTER — Trophy + champion display
   ═══════════════════════════════════════════════════════════ */
function ChampionCenter({ finalMatch }) {
  const hasWinner = finalMatch?.winner;

  return (
    <div className="ms-bracket-center">
      <FaTrophy className="ms-bracket-trophy" />
      <span className="ms-bracket-champion-label">CHAMPION</span>
      <div className="ms-bracket-champion-box">
        {hasWinner ? (
          <span className="ms-bracket-champion-name">{finalMatch.winner}</span>
        ) : (
          <span className="ms-bracket-champion-placeholder">?</span>
        )}
      </div>
    </div>
  );
}

/* ── Schedule table for a single day ── */
function ScheduleDayTable({ day, matches }) {
  return (
    <div className="ms-day-card">
      <div className="ms-day-header">{day}</div>
      <div className="ms-table-wrap" role="table">
        <div className="ms-row ms-row--head" role="row">
          <div className="ms-cell ms-cell-time" role="columnheader">TIME</div>
          <div className="ms-cell ms-cell-sport" role="columnheader">SPORTS</div>
          <div className="ms-cell ms-cell-venue" role="columnheader">VENUE</div>
          <div className="ms-cell ms-cell-team" role="columnheader">TEAM</div>
        </div>
        {matches.map((m, i) => (
          <div className="ms-row" role="row" key={i}>
            <div className="ms-cell ms-cell-time" role="cell">{m.time}</div>
            <div className="ms-cell ms-cell-sport" role="cell">{m.sport}</div>
            <div className="ms-cell ms-cell-venue" role="cell">{m.venue}</div>
            <div className="ms-cell ms-cell-team ms-cell-team--body" role="cell">
              <span>{m.teamA}</span>
              <span className="ms-team-vs">vs</span>
              <span>{m.teamB}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchSchedulesPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [search, setSearch] = useState('');
  const contactRef = React.useRef(null);

  // Get all matches for selected category
  const allMatches = BRACKET_DATA[category] || [];
  
  // Split into left, right, and final
  const leftMatches = allMatches.filter(m => m.side === 'left');
  const rightMatches = allMatches.filter(m => m.side === 'right');
  const finalMatch = allMatches.find(m => m.side === 'center');

  // Filter schedule data
  const filteredSchedule = SCHEDULE_DATA.map(day => ({
    ...day,
    matches: day.matches.filter(m => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.teamA.toLowerCase().includes(q) ||
        m.teamB.toLowerCase().includes(q) ||
        m.sport.toLowerCase().includes(q) ||
        m.venue.toLowerCase().includes(q)
      );
    }),
  })).filter(day => day.matches.length > 0);

  const hasBracket = leftMatches.length > 0 || rightMatches.length > 0;

  return (
    <div className="ms-page">

      {/* ── Top header ── */}
      <header className="ms-dash-header">
        <h1 className="ms-dash-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
      </header>

      {/* ── Page intro ── */}
      <div className="ms-page-intro">
        <h2 className="ms-page-title">Game Schedules</h2>
        <p className="ms-page-subtitle">Stay updated with real-time schedules. Follow every game from start to finish.</p>
      </div>

      {/* ── Scrollable body ── */}
      <div className="ms-body">

        {/* Category selector + search */}
        <div className="ms-toolbar">
          <div className="ms-category-tabs">
            {CATEGORIES.map(c => (
              <button
                key={c}
                className={`ms-category-tab ${category === c ? 'ms-category-tab--active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ms-search-wrap">
            <FaSearch className="ms-search-icon" />
            <input
              type="text"
              className="ms-search-input"
              placeholder="Search team, sport, or venue"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Bracket section */}
        <div className="ms-bracket-card">
          <h3 className="ms-bracket-title">{category}</h3>
          {hasBracket ? (
            <div className="ms-bracket-tree">
              <BracketSide matches={leftMatches} side="left" />
              <ChampionCenter finalMatch={finalMatch} />
              <BracketSide matches={rightMatches} side="right" />
            </div>
          ) : (
            <p className="ms-bracket-empty">Bracket not yet available for {category}.</p>
          )}
        </div>

        {/* Section title */}
        <h2 className="ms-section-title">MATCH SCHEDULES</h2>

        {/* Schedule tables grouped by day */}
        <div className="ms-schedule-list">
          {filteredSchedule.length > 0 ? (
            filteredSchedule.map(day => (
              <ScheduleDayTable key={day.day} day={day.day} matches={day.matches} />
            ))
          ) : (
            <p className="ms-schedule-empty">No matches found for "{search}".</p>
          )}
        </div>

        {/* Contact footer */}
        <Contact contactFooterRef={contactRef} />
      </div>
    </div>
  );
}