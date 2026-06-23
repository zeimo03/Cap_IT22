import React, { useState, useContext, useRef } from "react";
import { FaCalendarAlt, FaTrophy, FaPaperPlane, FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";
import "./LandingPage.css";
import HeaderWithLines from './HeaderWithLines';
import HighlightsBanner from './HighlightsBanner';
import ImageCarousel from './ImageCarousel';
import { AuthContext } from '../AuthContext';
import { FaArrowRightLong } from "react-icons/fa6";

/* ── NEW — additional icons for the scrollable content sections ── */
import {
  FaArrowRight,
  FaBullseye,
  FaUsers,
  FaUserFriends,
  FaRunning,
  FaChess,
  FaBasketballBall,
  FaVolleyballBall,
  FaGamepad,
  FaClipboardList,
  FaFileSignature,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaFacebookF,
} from "react-icons/fa";
import { GiShuttlecock, GiPingPongBat } from "react-icons/gi";

/* ── NEW — contact details shown in the footer strip ── */
const CONTACT_ITEMS = [
  {
    icon: FaMapMarkerAlt,
    text: "San Jose, Santa Rita Pampanga, Philippines",
    // EDIT HERE: update this URL if the school's Google Maps location changes.
    // To get a new link — go to Google Maps, search the correct place,
    // click "Share" > "Copy link", and paste it below.
    href: "https://www.google.com/maps/place/Santa+Rita+College/@14.9989285,120.6178094,18.6z/data=!4m14!1m7!3m6!1s0x339658b934844e19:0x7ba727f39f0709df!2sSanta+Rita+College+Of+Pampanga,Inc.+Annex-1!8m2!3d14.9763355!4d120.6370981!16s%2Fg%2F11h0mw9qvh!3m5!1s0x3396f5ffca98627b:0xd9691231b874272b!8m2!3d14.9993667!4d120.6182403!16s%2Fg%2F1q5bm6dg_?entry=ttu&g_ep=EgoyMDI2MDYxNi4wIKXMDSoASAFQAw%3D%3D",
  },
  {
    icon: FaPhoneAlt,
    text: "(045) 900 0557",
    href: "tel:+0459000557",
  },
  {
    icon: FaEnvelope,
    text: "src_educ_ph@yahoo.com",
    href: "mailto:src_educ_ph@yahoo.com",
  },
  {
    icon: FaFacebookF,
    text: "facebook.com/santaritacollege",
    href: "https://facebook.com/santaritacollege",
  },
];

const LEVELS = ["Elementary", "High School", "College"];

/* ── NEW — data for the scrollable content sections ── */
const INFO_CARDS = [
  {
    title: "Choose Your Sport",
    desc: "Pick the sport that you love the most. Start your journey and join the competition by registering to secure your spot and showcase your talent.",
  },
  {
    title: "Browse Schedules",
    desc: "Check upcoming matches, ongoing matches, finished matches, and event details. Don't miss a game — stay informed.",
    featured: true,
  },
  {
    title: "Browse Rankings",
    desc: "Explore the latest rankings and see the teams' medal tally standing. Track performance and stay updated with the ultimate showcase of talents.",
  },
];

const STATS = [
  { icon: FaTrophy, value: 120, label: "Total Matches" },
  { icon: FaBullseye, value: 9, label: "Sports" },
  { icon: FaUsers, value: 15, label: "Teams" },
  { icon: FaUserFriends, value: 350, label: "Players" },
];

const SPORTS = [
  { name: "Athletics", icon: FaRunning },
  { name: "Badminton", icon: GiShuttlecock },
  { name: "Basketball", icon: FaBasketballBall },
  { name: "Chess", icon: FaChess },
  { name: "Mobile Legends", icon: FaGamepad },
  { name: "Sepak Takraw", icon: FaVolleyballBall },
  { name: "Table Tennis", icon: GiPingPongBat },
  { name: "Volleyball", icon: FaVolleyballBall },
];

const STEPS = [
  { number: 1, title: "Register", desc: "Fill out the registration form online.", icon: FaFileSignature },
  { number: 2, title: "Approval", desc: "Wait for the approval of your registration.", icon: FaClipboardList },
  { number: 3, title: "Compete", desc: "Participate, enjoy, and give your best!", icon: FaCheckCircle },
];

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
  const [matchDirection, setMatchDirection] = useState("next");
  const [matchAnimKey, setMatchAnimKey] = useState(0);

  const { openAuthModal } = useContext(AuthContext);
  const contactFooterRef = useRef(null);

  const currentMatch = MATCHES[matchIndex];
  const prevMatch = () => {
    setMatchDirection("prev");
    setMatchIndex((i) => (i - 1 + MATCHES.length) % MATCHES.length);
    setMatchAnimKey((k) => k + 1);
  };
  const nextMatch = () => {
    setMatchDirection("next");
    setMatchIndex((i) => (i + 1) % MATCHES.length);
    setMatchAnimKey((k) => k + 1);
  };

  const handleInfoCardArrowClick = () => {
    openAuthModal('login');
  };

  const handleCtaButtonClick = () => {
    openAuthModal('login');
  };

  const handleSendButtonClick = () => {
    if (contactFooterRef.current) {
      contactFooterRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

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
                {selectedLevel} <FaChevronDown className={`level-chevron ${levelOpen ? "open" : ""}`} />
              </button>
              <ul className={`level-menu ${levelOpen ? "open" : ""}`}>
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
            </div>

            {/* Message / suggestions */}
            <button
              className="icon-btn"
              aria-label="Send suggestion"
              onClick={handleSendButtonClick}
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
              <span className="school-name-main">SANTA RITA COLLEGE
                <br />
                 OF PAMPANGA, INC.</span>

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
              <button className="cta-btn cta-primary" onClick={handleCtaButtonClick}>
                <FaCalendarAlt /> VIEW MATCHES
              </button>
              <button className="cta-btn cta-secondary" onClick={handleCtaButtonClick}>
                <FaTrophy /> VIEW RANKINGS
              </button>
            </div>
          </div>

          {/* Right — ongoing match card */}
          <div className="match-card">
            <p className="match-card-label">ONGOING MATCHES</p>

            <div
              className={`match-card-body match-anim-${matchDirection}`}
              key={matchAnimKey}
            >
              <div className="match-teams">
                <TeamBadge team={currentMatch.teamA} />
                <span className="vs-label">VS</span>
                <TeamBadge team={currentMatch.teamB} />
              </div>
                <div className="linespace">
                  
                </div>
              <div className="match-info">
                <FaCalendarAlt className="match-info-icon" />
                <span>{currentMatch.date}</span>
                <span className="dot">·</span>
                <span>{currentMatch.time}</span>
                <span className="dot">·</span>
                <span>{currentMatch.venue}</span>
              </div>
            </div>

            <div className="match-card-footer">
              <span
                className={`match-sport match-anim-${matchDirection}`}
                key={`sport-${matchAnimKey}`}
              >
                {currentMatch.sport.toUpperCase()}
              </span>
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

      {/* ══════════════════════════════════════════════
          NEW — Scrollable content below the hero
          ══════════════════════════════════════════════ */}
      <div className="content-section">

        {/* ── Info cards ── */}
        <div className="info-cards-row">
          {INFO_CARDS.map((card) => (
            <div
              key={card.title}
              className={`info-card ${card.featured ? "featured" : ""}`}
            >
              <h3 className="info-card-title">{card.title}</h3>
              <p className="info-card-desc">{card.desc}</p>
              <button className="info-card-arrow" aria-label={`Go to ${card.title}`} onClick={handleInfoCardArrowClick}>
                <FaArrowRight />
              </button>
            </div>
          ))}
        </div>

        {/* ── Sports statistics ── */}
        <div className="section-heading">
          <span className="heading-line" />
          <h2 className="heading-text">Sports Statistics</h2>
          <span className="heading-line" />
        </div>

        <div className="stats-row">
          {STATS.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <div className="stat-item">
                <div className="stat-icon-circle">
                  <stat.icon />
                </div>
                <div className="stat-text">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label.toUpperCase()}</span>
                </div>
              </div>
              {i < STATS.length - 1 && <span className="stat-divider" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Sports available ── */}
        <div className="section-heading">
          <span className="heading-line" />
          <h2 className="heading-text">Sports Available</h2>
          <span className="heading-line" />
        </div>

        <div className="sports-row">
          {SPORTS.map((sport) => (
            <div key={sport.name} className="sport-tile">
              <sport.icon className="sport-tile-icon" />
              <span className="sport-tile-name">{sport.name.toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* ── How to join as a player ── */}
        <div className="section-heading">
          <span className="heading-line" />
          <h2 className="heading-text">How to Join as a Player</h2>
          <span className="heading-line" />
        </div>

        <div className="steps-row">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.number}>
              <div className="step-item">
                <div className="step-icon-circle">
                  <span className="step-number">{step.number}</span>
                  <step.icon className="step-icon" />
                </div>
                <span className="step-title">{step.title.toUpperCase()}</span>
                <p className="step-desc">{step.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <FaArrowRightLong className="step-arrow" aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Sports Moments — highlights carousel ── */}
        <div style={{ marginTop: '2.25rem' }}>
          <div className="sports-moments">
            <div className="linegroup1">
            <div className="line1"></div>
            <div className="line2"></div>
            <div className="line5"></div>
            </div>
            <HeaderWithLines text="SPORTS MOMENTS" />
            <div className="linegroup2">
              <div className="line3"></div>
              <div className="line4"></div>
              <div className="line6"></div>
            </div>
          </div>
          <div className="carousel-stage">
            <HighlightsBanner />
            <ImageCarousel
              // Add your actual carousel images by placing them in public/images.
              // For example: public/images/highlight1.jpg, highlight2.jpg, ... highlight8.jpg
              // Then use those file names here as the image array.
              images={[
                'src/components/img/hi-1.jpg',
                'src/components/img/hi-2.jpg',
                'src/components/img/hi-3.jpg',
                'src/components/img/hi-4.jpg',
                'src/components/img/hi-5.jpg',
                'src/components/img/hi-6.jpg',
                'src/components/img/hi-7.jpg',
                'src/components/img/hi-8.jpg'
              ]}
              duration={20} // loop duration in seconds (smaller = faster)
            />
          </div>
        </div>

        {/* ── Contact us footer strip ── */}
        <footer className="contact-footer" ref={contactFooterRef}>
          <HeaderWithLines text="CONTACT US" className="contact-footer-header" />
          <div className="contact-footer-row">
            {CONTACT_ITEMS.map((item, i) => {
              const content = (
                <>
                  <span className="contact-icon-circle">
                    <item.icon />
                  </span>
                  <span className="contact-text">{item.text}</span>
                </>
              );
              return (
                <React.Fragment key={item.text}>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="contact-item contact-item-link"
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {content}
                    </a>
                  ) : (
                    <span className="contact-item">{content}</span>
                  )}
                  {i < CONTACT_ITEMS.length - 1 && (
                    <span className="contact-divider" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </footer>

      </div>
    </div>
  );
}

export default LandingPage;