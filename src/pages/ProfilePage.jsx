import React from 'react';
import { useContext } from 'react';
import './ProfilePage.css';
import {
  FaUserCircle,
  FaTrophy,
  FaMedal,
  FaClipboardList,
  FaChevronRight,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaFacebookF,
  FaUserGraduate,
  FaUsers,
  FaBasketballBall,
  FaUserTag,
  FaKey,
  FaClock,
  FaHashtag,
  FaEdit,
} from 'react-icons/fa';
import { AuthContext } from "../components/AuthContext";
import HeaderWithLines from "../components/Landing/HeaderWithLines";

/* ── Contact items (same as LandingPage) ── */
const CONTACT_ITEMS = [
  {
    icon: FaMapMarkerAlt,
    text: 'San Jose, Santa Rita Pampanga, Philippines',
    href: 'https://www.google.com/maps/place/Santa+Rita+College/@14.9989285,120.6178094,18.6z',
  },
  {
    icon: FaPhoneAlt,
    text: '(045) 900 0557',
    href: 'tel:+0459000557',
  },
  {
    icon: FaEnvelope,
    text: 'src_educ_ph@yahoo.com',
    href: 'mailto:src_educ_ph@yahoo.com',
  },
  {
    icon: FaFacebookF,
    text: 'facebook.com/santaritacollege',
    href: 'https://facebook.com/santaritacollege',
  },
];

/* ── Info row item ── */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-icon">
        <Icon />
      </span>
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value || '—'}</span>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon, count, label, arrow }) {
  return (
    <div className="profile-stat-card">
      <div className="profile-stat-icon-wrap">{icon}</div>
      <div className="profile-stat-body">
        <span className="profile-stat-label">{label}</span>
        <span className="profile-stat-count">{count}</span>
        <span className="profile-stat-sublabel">Total {label}</span>
      </div>
      {arrow && (
        <button className="profile-stat-arrow" aria-label={`View ${label}`}>
          <FaChevronRight />
        </button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, userProfile } = useContext(AuthContext);

  const displayName =
    userProfile?.fullName ||
    currentUser?.displayName ||
    'JUAN C DELA CRUZ';

  const studentNumber = userProfile?.studentNumber || '***********';
  const role = userProfile?.role || 'Player';
  const gradeLevel = userProfile?.gradeLevel || 'Grade 12';
  const section = userProfile?.section || 'STEM A';
  const teamName = userProfile?.teamName || 'Red Rhinos';
  const sport = userProfile?.sport || 'BASKETBALL';
  const position = userProfile?.position || 'PLAYER';
  const email = currentUser?.email || '@rc_ldelas_ph';
  const lastUpdate = userProfile?.lastUpdate || 'May 29, 2026 – 07:56 PM';

  return (
    <div className="profile-page">

      {/* ── Top header (same as DashboardPage) ── */}
      <header className="dash-header">
        <h1 className="dash-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
      </header>

      {/* ── Page title ── */}
      <div className="profile-page-intro">
        <h2 className="profile-page-title">Profile</h2>
        <p className="profile-page-subtitle">Manage your account information and security settings</p>
      </div>

      {/* ── Scrollable body ── */}
      <div className="profile-body">

        {/* ── Identity card ── */}
        <div className="profile-identity-card">
          <div className="profile-identity-left">
            <h2 className="profile-full-name">{displayName.toUpperCase()}</h2>
            <p className="profile-student-number">
              Student Number &nbsp;<span className="profile-dots">{studentNumber}</span>
            </p>
            <span className="profile-role-badge">
              <FaUserTag className="profile-role-icon" /> Role: {role}
            </span>
          </div>

          <div className="profile-identity-divider" />

          <div className="profile-identity-right">
            <div className="profile-identity-detail">
              <FaUserGraduate className="profile-detail-icon" />
              <span className="profile-detail-label">Grade/Year Level</span>
              <span className="profile-detail-value">{gradeLevel}</span>
            </div>
            <div className="profile-identity-detail">
              <FaUsers className="profile-detail-icon" />
              <span className="profile-detail-label">Section</span>
              <span className="profile-detail-value">{section}</span>
            </div>
            <div className="profile-identity-detail">
              <FaUsers className="profile-detail-icon" />
              <span className="profile-detail-label">Team Name</span>
              <span className="profile-detail-value">{teamName}</span>
            </div>
          </div>
        </div>

        {/* ── Stat cards row ── */}
        <div className="profile-stats-row">
          <StatCard
            icon={<FaTrophy className="stat-icon-trophy" />}
            count={3}
            label="Events Joined"
            arrow
          />
          <StatCard
            icon={<FaMedal className="stat-icon-medal" />}
            count={3}
            label="Awards"
            arrow
          />
          <StatCard
            icon={<FaClipboardList className="stat-icon-reg" />}
            count={3}
            label="Submitted Registrations"
            arrow
          />
        </div>

        {/* ── Info + Security row ── */}
        <div className="profile-details-grid">

          {/* My Information */}
          <div className="profile-card">
            <div className="profile-card-header">
              <span className="profile-card-title">My Information</span>
              <button className="profile-card-action profile-card-action--edit">
                <FaEdit /> Edit Profile
              </button>
            </div>
            <div className="profile-card-body">
              <InfoRow icon={FaHashtag}        label="Student Number"    value={studentNumber} />
              <InfoRow icon={FaUserCircle}      label="Full Name"         value={displayName} />
              <InfoRow icon={FaEnvelope}        label="Email Address"     value={email} />
              <InfoRow icon={FaUserGraduate}    label="Grade/Year Level"  value={gradeLevel} />
              <InfoRow icon={FaUsers}           label="Section"           value={section} />
              <InfoRow icon={FaBasketballBall}  label="Sports"            value={sport} />
              <InfoRow icon={FaUserTag}         label="Role"              value={position} />
              <InfoRow icon={FaEdit}            label="Position"          value={position} />
              <InfoRow icon={FaUsers}           label="Team Name"         value={teamName} />
            </div>
          </div>

          {/* Security Settings */}
          <div className="profile-card">
            <div className="profile-card-header">
              <span className="profile-card-title">Security Settings</span>
              <button className="profile-card-action profile-card-action--change">
                Change Password
              </button>
            </div>
            <div className="profile-card-body">
              <InfoRow icon={FaKey}   label="Password"     value="••••••••••••" />
              <InfoRow icon={FaClock} label="Last Update"  value={lastUpdate} />
            </div>
          </div>

        </div>

        {/* ── Contact footer (reused from LandingPage) ── */}
        <footer className="contact-footer profile-contact-footer">
          <HeaderWithLines text="CONTACT US" className="contact-footer-header" />
          <div className="contact-footer-row">
            {CONTACT_ITEMS.map((item, i) => (
              <React.Fragment key={item.text}>
                <a
                  href={item.href}
                  className="contact-item contact-item-link"
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <span className="contact-icon-circle">
                    <item.icon />
                  </span>
                  <span className="contact-text">{item.text}</span>
                </a>
                {i < CONTACT_ITEMS.length - 1 && <span className="contact-divider" />}
              </React.Fragment>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
}