import React, { useState, useContext } from 'react';
import './ProfilePage.css';
import Contact from '../components/Landing/Contact/Contact';
import EventsJoinedModal from '../components/EventsJoinedModal/EventsJoinedModal';
import AwardsModal from '../components/AwardsModal/AwardsModal';
import SubmittedRegistrationsModal from '../components/SubmittedRegistrationsModal/SubmittedRegistrationsModal';
import ChangePasswordModal from '../components/ChangePasswordModal/ChangePasswordModal';
import {
  FaUserCircle, FaTrophy, FaMedal, FaClipboardList, FaChevronRight,
  FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaFacebookF,
  FaUserGraduate, FaUsers, FaBasketballBall, FaUserTag,
  FaKey, FaClock, FaHashtag, FaEdit,
} from 'react-icons/fa';
import { AuthContext } from '../components/AuthContext';

/* ── Sample data (replace with real Firestore data later) ── */
const SAMPLE_EVENTS = [
  { name: 'Basketball Intramurals 2025', date: 'Aug 15 – Aug 17, 2025', venue: 'Gymnasium', status: 'Completed' },
  { name: 'Sportsfest Basketball 2026',  date: 'Mar 1 – Mar 3, 2026',   venue: 'Gymnasium', status: 'Completed' },
  { name: 'Basketball Intramurals 2026', date: 'Aug 20 – Aug 3, 2025',  venue: 'Gymnasium', status: 'Completed' },
];

const SAMPLE_AWARDS = [
  { name: 'MVP - Basketball Intramurals 2025',             description: 'Awarded for being the Most Valuable Player', event: 'Basketball Intramurals 2025', date: 'Aug 17, 2026' },
  { name: 'Champion - Basketball Intramurals 2025',        description: 'Awarded for champion in the tournament',     event: 'Basketball Intramurals 2025', date: 'Aug 17, 2026' },
  { name: 'Bronze Finished - Basketball Intramurals 2026', description: 'Awarded for earning Bronze Finished',        event: 'Basketball Intramurals 2026', date: 'Aug 23, 2026' },
];

const SAMPLE_REGISTRATIONS = [
  { name: 'Basketball Intramurals 2025', date: 'Aug 15 – Aug 17, 2025', status: 'Approved', submittedDate: 'Aug 15, 2025' },
  { name: 'Sportsfest Basketball 2026',  date: 'Mar 1 – Mar 3, 2026',   status: 'Pending',  submittedDate: 'Aug 15, 2025' },
  { name: 'Basketball Intramurals 2026', date: 'Aug 20 – Aug 3, 2025',  status: 'Approved', submittedDate: 'Aug 15, 2025' },
];

const CONTACT_ITEMS = [
  { icon: FaMapMarkerAlt, text: 'San Jose, Santa Rita Pampanga, Philippines', href: 'https://www.google.com/maps/place/Santa+Rita+College/@14.9989285,120.6178094,18.6z' },
  { icon: FaPhoneAlt,     text: '(045) 900 0557',                             href: 'tel:+0459000557' },
  { icon: FaEnvelope,     text: 'src_educ_ph@yahoo.com',                      href: 'mailto:src_educ_ph@yahoo.com' },
  { icon: FaFacebookF,    text: 'facebook.com/santaritacollege',               href: 'https://facebook.com/santaritacollege' },
];

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-icon"><Icon /></span>
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value || '—'}</span>
    </div>
  );
}

function StatCard({ icon, count, label, arrow, onClick }) {
  return (
    <div
      className={`profile-stat-card ${onClick ? 'profile-stat-card--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="profile-stat-icon-wrap">{icon}</div>
      <div className="profile-stat-body">
        <span className="profile-stat-label">{label}</span>
        <span className="profile-stat-count">{count}</span>
        <span className="profile-stat-sublabel">Total {label}</span>
      </div>
      {arrow && (
        <button className="profile-stat-arrow" aria-label={`View ${label}`} tabIndex={-1}>
          <FaChevronRight />
        </button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, userProfile, updatePassword } = useContext(AuthContext);

  /* ── All modal states ── */
  const [eventsModalOpen,        setEventsModalOpen]        = useState(false);
  const [awardsModalOpen,        setAwardsModalOpen]        = useState(false);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [changePassModalOpen,    setChangePassModalOpen]    = useState(false);

  const contactFooterRef = React.useRef(null);

  const displayName   = userProfile?.fullName      || currentUser?.displayName || 'JUAN C DELA CRUZ';
  const studentNumber = userProfile?.studentNumber || '***********';
  const role          = userProfile?.role          || 'Player';
  const gradeLevel    = userProfile?.gradeLevel    || 'Grade 12';
  const section       = userProfile?.section       || 'STEM A';
  const teamName      = userProfile?.teamName      || 'Red Rhinos';
  const sport         = userProfile?.sport         || 'BASKETBALL';
  const position      = userProfile?.position      || 'PLAYER';
  const email         = currentUser?.email         || '@rc_ldelas_ph';
  const lastUpdate    = userProfile?.lastUpdate    || 'May 29, 2026 – 07:56 PM';

  const eventsJoined  = userProfile?.eventsJoined  || SAMPLE_EVENTS;
  const awards        = userProfile?.awards        || SAMPLE_AWARDS;
  const registrations = userProfile?.registrations || SAMPLE_REGISTRATIONS;

  /* ── Handle password save via AuthContext ── */
  const handlePasswordSave = async (currentPassword, newPassword) => {
    if (updatePassword) {
      await updatePassword(newPassword);
    }
  };

  return (
    <div className="profile-page">

      <header className="dash-header">
        <h1 className="dash-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
      </header>

      <div className="profile-page-intro">
        <h2 className="profile-page-title">Profile</h2>
        <p className="profile-page-subtitle">Manage your account information and security settings</p>
      </div>

      <div className="profile-body">

        {/* Identity card */}
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

        {/* Stat cards — all three clickable */}
        <div className="profile-stats-row">
          <StatCard
            icon={<FaTrophy className="stat-icon-trophy" />}
            count={eventsJoined.length}
            label="Events Joined"
            arrow
            onClick={() => setEventsModalOpen(true)}
          />
          <StatCard
            icon={<FaMedal className="stat-icon-medal" />}
            count={awards.length}
            label="Awards"
            arrow
            onClick={() => setAwardsModalOpen(true)}
          />
          <StatCard
            icon={<FaClipboardList className="stat-icon-reg" />}
            count={registrations.length}
            label="Submitted Registrations"
            arrow
            onClick={() => setRegistrationsModalOpen(true)}
          />
        </div>

        {/* Info + Security */}
        <div className="profile-details-grid">

          <div className="profile-card">
            <div className="profile-card-header">
              <span className="profile-card-title">My Information</span>
              <button className="profile-card-action profile-card-action--edit">
                <FaEdit /> Edit Profile
              </button>
            </div>
            <div className="profile-card-body">
              <InfoRow icon={FaHashtag}       label="Student Number"   value={studentNumber} />
              <InfoRow icon={FaUserCircle}     label="Full Name"        value={displayName} />
              <InfoRow icon={FaEnvelope}       label="Email Address"    value={email} />
              <InfoRow icon={FaUserGraduate}   label="Grade/Year Level" value={gradeLevel} />
              <InfoRow icon={FaUsers}          label="Section"          value={section} />
              <InfoRow icon={FaBasketballBall} label="Sports"           value={sport} />
              <InfoRow icon={FaUserTag}        label="Role"             value={position} />
              <InfoRow icon={FaEdit}           label="Position"         value={position} />
              <InfoRow icon={FaUsers}          label="Team Name"        value={teamName} />
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-card-header">
              <span className="profile-card-title">Security Settings</span>
              {/* ── Change Password button now opens the modal ── */}
              <button
                className="profile-card-action profile-card-action--change"
                onClick={() => setChangePassModalOpen(true)}
              >
                Change Password
              </button>
            </div>
            <div className="profile-card-body">
              <InfoRow icon={FaKey}   label="Password"    value="••••••••••••" />
              <InfoRow icon={FaClock} label="Last Update" value={lastUpdate} />
            </div>
          </div>
        </div>

        <Contact items={CONTACT_ITEMS} contactFooterRef={contactFooterRef} />
      </div>

      {/* ── All modals ── */}
      <EventsJoinedModal
        isOpen={eventsModalOpen}
        onClose={() => setEventsModalOpen(false)}
        events={eventsJoined}
      />
      <AwardsModal
        isOpen={awardsModalOpen}
        onClose={() => setAwardsModalOpen(false)}
        awards={awards}
      />
      <SubmittedRegistrationsModal
        isOpen={registrationsModalOpen}
        onClose={() => setRegistrationsModalOpen(false)}
        registrations={registrations}
      />
      <ChangePasswordModal
        isOpen={changePassModalOpen}
        onClose={() => setChangePassModalOpen(false)}
        onSave={handlePasswordSave}
      />

    </div>
  );
}