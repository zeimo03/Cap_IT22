import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminSchedulePage.css';
import { FaTimes, FaSync, FaSearch, FaUsers, FaUserGraduate, FaChevronDown } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import SportsTeamsManager from './SportsTeamsManager';
import MatchSchedulesPage from './MatchSchedulesPage';

const LEVELS = [
  { key: 'elementary', label: 'Elementary' },
  { key: 'highSchool',  label: 'High School' },
  { key: 'college',     label: 'College' },
];

/* Levels dropdown — same interaction pattern as the Home Dashboard's LevelsButton */
function LevelsButton({ levelKey, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LEVELS.find(l => l.key === levelKey) || LEVELS[1];

  return (
    <div ref={wrapRef} className="lvls-wrap">
      <button className="lvls-btn" onClick={() => setOpen(p => !p)} aria-haspopup="listbox" aria-expanded={open}>
        {current.label}
        <span className={`lvls-btn__arrow ${open ? 'lvls-btn__arrow--open' : ''}`}><FaChevronDown /></span>
      </button>
      <div className={`lvls-dropdown ${open ? 'lvls-dropdown--open' : ''}`} role="listbox">
        {LEVELS.map((l) => (
          <button key={l.key} className="lvls-dropdown__item" onClick={() => { onChange(l.key); setOpen(false); }} role="option" aria-selected={levelKey === l.key}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Grade-level bucketing ───────────────────────── */
const ELEMENTARY_GRADES = new Set(['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6']);
const HIGH_SCHOOL_GRADES = new Set(['Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']);
const COLLEGE_GRADES = new Set(['1st Year','2nd Year','3rd Year','4th Year']);

const ALL_GRADES = [
  'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6',
  'Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12',
  '1st Year','2nd Year','3rd Year','4th Year',
];

function getSchoolLevel(gradeLevel) {
  if (!gradeLevel) return null;
  if (ELEMENTARY_GRADES.has(gradeLevel)) return 'elementary';
  if (HIGH_SCHOOL_GRADES.has(gradeLevel)) return 'highSchool';
  if (COLLEGE_GRADES.has(gradeLevel)) return 'college';
  return null;
}

function buildSummary(registrations) {
  const map = {};
  registrations.forEach(({ sport, gender, gradeLevel }) => {
    if (!sport) return;
    const level = getSchoolLevel(gradeLevel);
    const g     = (gender || '').toLowerCase();
    const label = g === 'female' ? 'Women' : g === 'male' ? 'Men' : 'Mixed';
    const key   = `${sport.trim()}||${label}`;
    if (!map[key]) map[key] = { sport: sport.trim(), gender: label, elementary: 0, highSchool: 0, college: 0 };
    if (level) map[key][level]++;
  });
  return Object.values(map).sort((a, b) => {
    const sc = a.sport.localeCompare(b.sport);
    return sc !== 0 ? sc : a.gender.localeCompare(b.gender);
  });
}

const TEAM_COLORS = {
  'Black Beetles':   '#1a1a1a',
  'Purple Jaguars':  '#6d28d9',
  'Brown Cubs':      '#92400e',
  'Orange Bulldogs': '#ea580c',
  'Yellow Vipers':   '#b45309',
  'Maroon Owls':     '#9f1239',
  'Green Gators':    '#15803d',
  'Red Rhinos':      '#dc2626',
};

const TABS = ['Registration', 'Sports & Teams', 'Match Schedules Format'];

export default function AdminSchedulePage() {
  const { isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [level, setLevel] = useState('highSchool');

  // Registration data
  const [summaryRows,      setSummaryRows]      = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [summaryLoading,   setSummaryLoading]   = useState(false);
  const [summaryError,     setSummaryError]     = useState('');

  // Filters
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterGrade,    setFilterGrade]    = useState('');
  const [filterSection,  setFilterSection]  = useState('');
  const [filterSport,    setFilterSport]    = useState('');
  const [filterGender,   setFilterGender]   = useState('');
  const [filterTeam,     setFilterTeam]     = useState('');

  // Student detail modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => { if (!isAdmin) navigate('/dashboard'); }, [isAdmin, navigate]);

const fetchSummary = useCallback(async () => {
  if (!db) {
    setSummaryError("Firestore not connected.");
    return;
  }

  setSummaryLoading(true);
  setSummaryError("");

  try {
    // Load player registrations
    const regSnap = await getDocs(collection(db, "registrations"));
    const registrations = regSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Load ALL registered users
    const userSnap = await getDocs(collection(db, "users"));
    const users = userSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Merge users with registration info
    const merged = users.map(user => {
      const registration = registrations.find(
        r => r.uid === user.id
      );

      if (registration) {
        return {
          ...user,
          ...registration,
        };
      }

      // User has no player registration yet
      return {
        ...user,
        fullName: user.name,
        gender: "—",
        gradeLevel: "—",
        section: "—",
        sport: "—",
        position: "—",
        teamName: "—",
      };
    });

    setAllRegistrations(merged);
    setSummaryRows(buildSummary(registrations));

  } catch (err) {
    console.error(err);
    setSummaryError("Failed to load registration data.");
  } finally {
    setSummaryLoading(false);
  }
}, []);

  useEffect(() => { if (activeTab === 0) fetchSummary(); }, [activeTab, fetchSummary]);

  const totalPlayers = summaryRows.reduce((s, r) => s + r.elementary + r.highSchool + r.college, 0);

  // Unique filter options from data
  const uniqueSections = [...new Set(allRegistrations.map(r => r.section).filter(Boolean))].sort();
  const uniqueSports   = [...new Set(allRegistrations.map(r => r.sport).filter(Boolean))].sort();
  const uniqueTeams    = [...new Set(allRegistrations.map(r => r.teamName).filter(Boolean))].sort();

  const filteredStudents = allRegistrations.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      (!q             || (r.fullName || '').toLowerCase().includes(q)) &&
      (!filterGrade   || r.gradeLevel === filterGrade) &&
      (!filterSection || r.section    === filterSection) &&
      (!filterSport   || r.sport      === filterSport) &&
      (!filterGender  || (r.gender || '').toLowerCase() === filterGender.toLowerCase()) &&
      (!filterTeam    || r.teamName   === filterTeam)
    );
  });

  const hasFilters = searchQuery || filterGrade || filterSection || filterSport || filterGender || filterTeam;
  const clearFilters = () => { setSearchQuery(''); setFilterGrade(''); setFilterSection(''); setFilterSport(''); setFilterGender(''); setFilterTeam(''); };

  const fmt = (row, level) => row[level] === 0 ? '--' : row[level];

  return (
    <div className="asp-page">

      {/* Header */}
      <header className="asp-header">
        <h1 className="asp-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
        <LevelsButton levelKey={level} onChange={setLevel} />
      </header>

      {/* Intro */}
      <div className="asp-intro">
        <h2 className="asp-intro__title">Update &amp; Edit</h2>
        <p className="asp-intro__sub">Manage registrations, sports, and match schedules</p>
      </div>

      {/* Tabs */}
      <div className="asp-tabs">
        {TABS.map((tab, i) => (
          <button key={tab} className={`asp-tab${activeTab === i ? ' asp-tab--active' : ''}`} onClick={() => setActiveTab(i)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="asp-body">

        {/* ══ TAB 0 ══ */}
        {activeTab === 0 && (
          <div className="asp-tab-content">

            {/* ── Card 1: Summary ── */}
            <div className="asp-card">
              {/* Card header row */}
              <div className="asp-card__toprow">
                <div className="asp-card__heading">
                  <FaUsers className="asp-card__icon" />
                  <span>REGISTRATION SUMMARY</span>
                </div>
                <div className="asp-card__toprow-right">
                  <button className="asp-refresh-btn" onClick={fetchSummary} disabled={summaryLoading} title="Refresh">
                    <FaSync className={summaryLoading ? 'asp-spin' : ''} />
                  </button>
                  <div className="asp-total-box">
                    <span className="asp-total-label">Total</span>
                    <span className="asp-total-num">{summaryLoading ? '…' : totalPlayers}</span>
                  </div>
                </div>
              </div>

              <p className="asp-card__subtitle">Total Registered Players</p>

              {summaryError && <div className="asp-alert asp-alert--error">{summaryError}</div>}

              <div className="asp-table-wrap">
                {summaryLoading ? (
                  <p className="asp-empty">Loading from Firestore…</p>
                ) : summaryRows.length === 0 ? (
                  <p className="asp-empty">No registrations found.</p>
                ) : (
                  <table className="asp-table">
                    <thead>
                      <tr>
                        <th>Sports</th>
                        <th>Elementary</th>
                        <th>High School</th>
                        <th>College</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map(row => {
                        const rowTotal = row.elementary + row.highSchool + row.college;
                        return (
                          <tr key={`${row.sport}-${row.gender}`}>
                            <td className="asp-td--sport">{row.sport.toUpperCase()} {row.gender.toUpperCase()}</td>
                            <td>{fmt(row, 'elementary')}</td>
                            <td>{fmt(row, 'highSchool')}</td>
                            <td>{fmt(row, 'college')}</td>
                            <td className="asp-td--total">{rowTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── Card 2: Student Details ── */}
            <div className="asp-card">
              {/* Card header row */}
              <div className="asp-card__toprow">
                <div className="asp-card__heading">
                  <FaUserGraduate className="asp-card__icon" />
                  <span>STUDENT REGISTRATION DETAILS</span>
                </div>
                <div className="asp-search-wrap">
                  <FaSearch className="asp-search-icon" />
                  <input
                    className="asp-search-input"
                    type="text"
                    placeholder="Search by name…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter pills */}
              <div className="asp-filters">
                <select className="asp-filter-pill" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                  <option value="">Grade/Year ▾</option>
                  {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="asp-filter-pill" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                  <option value="">Section ▾</option>
                  {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="asp-filter-pill" value={filterSport} onChange={e => setFilterSport(e.target.value)}>
                  <option value="">Sports ▾</option>
                  {uniqueSports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="asp-filter-pill" value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                  <option value="">Gender ▾</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Others">Others</option>
                </select>
                <select className="asp-filter-pill" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
                  <option value="">Team Name ▾</option>
                  {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {hasFilters && (
                  <button className="asp-clear-btn" onClick={clearFilters}>
                    <FaTimes /> Clear Filter
                  </button>
                )}
                <span className="asp-results-count">{filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="asp-table-wrap" style={{ marginTop: 8 }}>
                {summaryLoading ? (
                  <p className="asp-empty">Loading from Firestore…</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="asp-empty">{hasFilters ? 'No students match the selected filters.' : 'No registrations found.'}</p>
                ) : (
                  <table className="asp-table asp-table--students">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Gender</th>
                        <th>Grade/Year</th>
                        <th>Section</th>
                        <th>Sport</th>
                        <th>Position</th>
                        <th>Team Name</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((reg, idx) => (
                        <tr key={reg.id || idx}>
                          <td className="asp-td--num">{idx + 1}</td>
                          <td className="asp-td--name">
                            <span className="asp-avatar">
                              {(reg.fullName || 'U').charAt(0).toUpperCase()}
                            </span>
                            <span className="asp-name-text">
                              {reg.fullName || <em className="asp-placeholder">Last Name, First Name, Middle Name</em>}
                            </span>
                          </td>
                          <td>
                            <span className={`asp-gender-badge asp-gender--${(reg.gender || 'unknown').toLowerCase()}`}>
                              {reg.gender || '—'}
                            </span>
                          </td>
                          <td>{reg.gradeLevel || '—'}</td>
                          <td>{reg.section || '—'}</td>
                          <td className="asp-td--sport">{reg.sport || '—'}</td>
                          <td>{reg.position || '—'}</td>
                          <td>
                            <span
                              className="asp-team-badge"
                              style={{ background: TEAM_COLORS[reg.teamName] || '#334155' }}
                            >
                              {reg.teamName || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <button className="asp-btn-view" onClick={() => setSelectedStudent(reg)}>View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ══ TAB 1 ══ */}
        {activeTab === 1 && (
          <div className="asp-tab-content">
            <div className="asp-level-banner">
              <h2>{LEVELS.find(l => l.key === level)?.label.toUpperCase()}</h2>
              <div className="asp-level-banner__bar" />
            </div>
            <SportsTeamsManager level={level} />
          </div>
        )}

        {/* ══ TAB 2 ══ */}
        {activeTab === 2 && (
          <MatchSchedulesPage level={level} />
        )}
      </div>

      {/* ── Student Detail Modal ── */}
      {selectedStudent && (
        <div className="asp-modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="asp-modal" onClick={e => e.stopPropagation()}>
            <div className="asp-modal__header">
              <h2>Student Details</h2>
              <button className="asp-modal__close" onClick={() => setSelectedStudent(null)}><FaTimes /></button>
            </div>
            <div className="asp-modal__body">
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Full Name</label>
                  <p>{selectedStudent.fullName || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Gender</label>
                  <p>{selectedStudent.gender || '—'}</p>
                </div>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Grade / Year Level</label>
                  <p>{selectedStudent.gradeLevel || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Section</label>
                  <p>{selectedStudent.section || '—'}</p>
                </div>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Date of Birth</label>
                  <p>{selectedStudent.dob || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Age</label>
                  <p>{selectedStudent.age || '—'}</p>
                </div>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Contact Number</label>
                  <p>{selectedStudent.contactNumber || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Email</label>
                  <p>{selectedStudent.email || selectedStudent.studentEmail || '—'}</p>
                </div>
              </div>
              <div className="asp-form-group">
                <label>Address</label>
                <p>{selectedStudent.address || '—'}</p>
              </div>
              <div className="asp-form-group">
                <label>Emergency Contact</label>
                <p>{selectedStudent.emergencyContact || '—'}</p>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Sport</label>
                  <p>{selectedStudent.sport || '—'}</p>
                </div>
                <div className="asp-form-group">
                  <label>Position</label>
                  <p>{selectedStudent.position || '—'}</p>
                </div>
              </div>
              <div className="asp-form-group">
                <label>Team Name</label>
                <p>{selectedStudent.teamName || '—'}</p>
              </div>
              {selectedStudent.message && (
                <div className="asp-form-group">
                  <label>Message</label>
                  <p>{selectedStudent.message}</p>
                </div>
              )}
              <div className="asp-form-row">
                {selectedStudent.photoURL && (
                  <div className="asp-form-group">
                    <label>Photo</label>
                    <p><a href={selectedStudent.photoURL} target="_blank" rel="noreferrer">View photo</a></p>
                  </div>
                )}
                {selectedStudent.waiverURL && (
                  <div className="asp-form-group">
                    <label>Waiver / Consent Form</label>
                    <p><a href={selectedStudent.waiverURL} target="_blank" rel="noreferrer">View waiver</a></p>
                  </div>
                )}
              </div>
              <div className="asp-form-actions">
                <button type="button" className="asp-btn-cancel" onClick={() => setSelectedStudent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}