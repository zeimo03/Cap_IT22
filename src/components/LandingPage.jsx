import React, { useState } from "react";
import { FaCalendarAlt, FaTrophy, FaPaperPlane, FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";
import "./LandingPage.css";<link href="https://fonts.googleapis.com/css?family=Inter:100,200,300,regular,500,600,700,800,900,100italic,200italic,300italic,italic,500italic,600italic,700italic,800italic,900italic" rel="stylesheet" />

const LEVELS = ["Elementary", "High School", "College"];

const MATCHES = [
  {
    id: 1,
    sport: "Basketball",
    date: "June 9, 2026",
    time: "3:00 PM",
    venue: "Covered Court",
    teamA: {
      name: "Yellow Vipers",
      logo: null, // TODO: set to "/src/assets/teams/yellow-vipers.png"
      initials: "YV",
      color: "#f5a623",
    },
    teamB: {
      name: "Purple Jaguars",
      logo: null, // TODO: set to "/src/assets/teams/purple-jaguars.png"
      initials: "PJ",
      color: "#7b2d8b",
    },
  },
  {
    id: 2,
    sport: "Volleyball",
    date: "June 9, 2026",
    time: "5:00 PM",
    venue: "Main Gym",
    teamA: {
      name: "Red Eagles",
      logo: null, // TODO: set to "/src/assets/teams/red-eagles.png"
      initials: "RE",
      color: "#d0021b",
    },
    teamB: {
      name: "Blue Sharks",
      logo: null, // TODO: set to "/src/assets/teams/blue-sharks.png"
      initials: "BS",
      color: "#1a6bbd",
    },
  },
];

function TeamBadge({ team }) {
  return (
    <div className="team-badge">
      {team.logo ? (
        // Real logo — place file in src/assets/teams/ and set team.logo above
        <img src={team.logo} alt={team.name} className="team-logo-img" />
      ) : (
        // Fallback colored circle until real logos are provided
        <div className="team-logo-placeholder" style={{ background: team.color }}>
          {team.initials}
        </div>
      )}
      <span className="team-name">{team.name}</span>
    </div>
  );
}

function LandingPage() {
  const [levelOpen, setLevelOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("Levels");
  const [matchIndex, setMatchIndex] = useState(0);

  const currentMatch = MATCHES[matchIndex];
  const prevMatch = () => setMatchIndex((i) => (i - 1 + MATCHES.length) % MATCHES.length);
  const nextMatch = () => setMatchIndex((i) => (i + 1) % MATCHES.length);

  return (
    <div className="landing-wrapper">

      {/* ── Hero — full viewport, no separate navbar ── */}
      <section className="hero">
        <div className="hero-overlay" />

        {/* ── Top bar — floats inside hero ── */}
        <div className="hero-topbar">
          {/* School identity — logo + name inside hero */}

          {/* Right controls */}
          <div className="header-controls">
            {/* Level dropdown */}
            <div className="level-dropdown">
              <button
                className="level-btn"
                onClick={() => setLevelOpen((prev) => !prev)}
              >
                {selectedLevel} <FaChevronDown className="level-chevron" />
              </button>
              {levelOpen && (
                <ul className="level-menu">
                  {LEVELS.map((lvl) => (
                    <li
                      key={lvl}
                      className={`level-item ${selectedLevel === lvl ? "active" : ""}`}
                      onClick={() => { setSelectedLevel(lvl); setLevelOpen(false); }}
                    >
                      {lvl}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Message / suggestions */}
            <button
              className="icon-btn"
              aria-label="Send suggestion"
              onClick={() => (window.location.href = "/suggestions")}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>

        {/* ── Hero body ── */}
        <div className="hero-body">
          <div className="hero-left">
            <h1 className="hero-headline">
              <div className="school-identity">
            <img src="/SRCLogo.png" alt="SRC Logo" className="school-logo" />
            <div className="school-name">
              <span className="school-name-main">SANTA RITA COLLEGE OF PAMPANGA, INC.</span>

            </div>
          </div>
          <div className="hero-headline">WHERE CHAMPIONS<br />ARE MADE.</div>
              
            </h1>
            
            <div className="line"></div>
            <p className="hero-tagline">PERFORMANCE. TALENTS. SKILLS.</p>
            <p className="hero-copy">
              Sports is not just a GAME;<br />
              it is a PASSION.<br />
              it is not just a SPORT;<br />
              it is a way of LIFE.
            </p>
            <div className="hero-cta-row">
              <button className="cta-btn cta-primary">
                <FaCalendarAlt /> VIEW MATCHES
              </button>
              <button className="cta-btn cta-secondary">
                <FaTrophy /> VIEW RANKINGS
              </button>
            </div>
          </div>

          {/* Right — ongoing match card */}
          <div className="match-card">
            <p className="match-card-label">ONGOING MATCHES</p>

            <div className="match-teams">
              <TeamBadge team={currentMatch.teamA} />
              <span className="vs-label">VS</span>
              <TeamBadge team={currentMatch.teamB} />
            </div>

            <div className="match-info">
              <FaCalendarAlt className="match-info-icon" />
              <span>{currentMatch.date}</span>
              <span className="dot">·</span>
              <span>{currentMatch.time}</span>
              <span className="dot">·</span>
              <span>{currentMatch.venue}</span>
            </div>

            <div className="match-card-footer">
              <span className="match-sport">{currentMatch.sport.toUpperCase()}</span>
              <div className="match-nav-btns">
                <button className="nav-btn" onClick={prevMatch} aria-label="Previous match">
                  <FaChevronLeft />
                </button>
                <button className="nav-btn" onClick={nextMatch} aria-label="Next match">
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {levelOpen && (
        <div className="dropdown-backdrop" onClick={() => setLevelOpen(false)} />
      )}
    </div>
  );
}

export default LandingPage;