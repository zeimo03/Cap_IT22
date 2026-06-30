import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminSchedulePage.css';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSync, FaSearch, FaUsers, FaUserGraduate } from 'react-icons/fa';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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
  const { userProfile, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData]   = useState({
    teamA: '', teamB: '', date: '', time: '', location: '', sport: '', status: 'scheduled',
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage,   setErrorMessage]   = useState('');

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

  useEffect(() => {
    const saved = localStorage.getItem('schedules');
    if (saved) { try { setSchedules(JSON.parse(saved)); } catch (e) {} }
  }, []);

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

  const saveToStorage = (data) => localStorage.setItem('schedules', JSON.stringify(data));
  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
  const resetForm = () => { setFormData({ teamA:'', teamB:'', date:'', time:'', location:'', sport:'', status:'scheduled' }); setEditingId(null); };

  const handleAddSchedule = () => {
    if (!formData.teamA || !formData.teamB || !formData.date || !formData.time) { setErrorMessage('Please fill in all required fields'); return; }
    const newSchedule = { id: editingId || Date.now().toString(), ...formData, createdAt: editingId ? undefined : new Date().toISOString(), createdBy: userProfile?.email };
    const updated = editingId ? schedules.map(s => s.id === editingId ? newSchedule : s) : [...schedules, newSchedule];
    setSchedules(updated); saveToStorage(updated);
    setSuccessMessage(editingId ? 'Schedule updated!' : 'Schedule created!');
    setShowModal(false); resetForm(); setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEdit = (s) => { setFormData({ teamA: s.teamA, teamB: s.teamB, date: s.date, time: s.time, location: s.location, sport: s.sport, status: s.status }); setEditingId(s.id); setShowModal(true); };
  const handleDelete = (id) => { if (window.confirm('Delete this schedule?')) { const u = schedules.filter(s => s.id !== id); setSchedules(u); saveToStorage(u); setSuccessMessage('Deleted!'); setTimeout(() => setSuccessMessage(''), 3000); } };
  const handleOpenNewModal = () => { resetForm(); setErrorMessage(''); setShowModal(true); };
  const handleCloseModal   = () => { setShowModal(false); resetForm(); setErrorMessage(''); };

  const fmt = (row, level) => row[level] === 0 ? '--' : row[level];

  return (
    <div className="asp-page">

      {/* Header */}
      <header className="asp-header">
        <h1 className="asp-header__title">SANTA RITA COLLEGE OF PAMPANGA, INC</h1>
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
          <div className="asp-card asp-card--placeholder">
            <p>Sports &amp; Teams management coming soon.</p>
          </div>
        )}

        {/* ══ TAB 2 ══ */}
        {activeTab === 2 && (
          <div className="asp-card">
            <div className="asp-sched-topbar">
              <h2 className="asp-sched-title">Active Schedules ({schedules.length})</h2>
              <button className="asp-btn-create" onClick={handleOpenNewModal}><FaPlus /> Create New Schedule</button>
            </div>

            {successMessage && <div className="asp-alert asp-alert--success">✓ {successMessage}</div>}
            {errorMessage   && <div className="asp-alert asp-alert--error">✗ {errorMessage}</div>}

            {schedules.length === 0 ? (
              <div className="asp-empty-state">
                <p>No schedules created yet.</p>
                <button className="asp-btn-create" onClick={handleOpenNewModal}><FaPlus /> Create Your First Schedule</button>
              </div>
            ) : (
              <div className="asp-table-wrap">
                <table className="asp-table">
                  <thead>
                    <tr>
                      <th>Sport</th><th>Team A vs Team B</th><th>Date</th><th>Time</th><th>Location</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(s => (
                      <tr key={s.id} className={`asp-status-row--${s.status}`}>
                        <td className="asp-td--sport">{s.sport || 'N/A'}</td>
                        <td className="asp-td--teams">
                          <span className="asp-team-a">{s.teamA}</span>
                          <span className="asp-vs">vs</span>
                          <span className="asp-team-b">{s.teamB}</span>
                        </td>
                        <td>{new Date(s.date).toLocaleDateString()}</td>
                        <td>{s.time}</td>
                        <td>{s.location || 'N/A'}</td>
                        <td><span className={`asp-status-badge asp-status--${s.status}`}>{s.status}</span></td>
                        <td className="asp-td--actions">
                          <button className="asp-btn-action asp-btn-edit" onClick={() => handleEdit(s)}><FaEdit /></button>
                          <button className="asp-btn-action asp-btn-delete" onClick={() => handleDelete(s.id)}><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="asp-modal-overlay" onClick={handleCloseModal}>
          <div className="asp-modal" onClick={e => e.stopPropagation()}>
            <div className="asp-modal__header">
              <h2>{editingId ? 'Edit Schedule' : 'Create New Schedule'}</h2>
              <button className="asp-modal__close" onClick={handleCloseModal}><FaTimes /></button>
            </div>
            <div className="asp-modal__body">
              {errorMessage && <div className="asp-alert asp-alert--error" style={{marginBottom:12}}>✗ {errorMessage}</div>}
              <div className="asp-form-group">
                <label>Sport *</label>
                <input type="text" name="sport" placeholder="e.g., Basketball, Volleyball" value={formData.sport} onChange={handleInputChange} />
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Team A *</label>
                  <input type="text" name="teamA" placeholder="First team name" value={formData.teamA} onChange={handleInputChange} />
                </div>
                <div className="asp-form-group">
                  <label>Team B *</label>
                  <input type="text" name="teamB" placeholder="Second team name" value={formData.teamB} onChange={handleInputChange} />
                </div>
              </div>
              <div className="asp-form-row">
                <div className="asp-form-group">
                  <label>Date *</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} />
                </div>
                <div className="asp-form-group">
                  <label>Time *</label>
                  <input type="time" name="time" value={formData.time} onChange={handleInputChange} />
                </div>
              </div>
              <div className="asp-form-group">
                <label>Location</label>
                <input type="text" name="location" placeholder="e.g., Gymnasium A" value={formData.location} onChange={handleInputChange} />
              </div>
              <div className="asp-form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="asp-form-actions">
                <button type="button" className="asp-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                <button type="button" className="asp-btn-submit" onClick={handleAddSchedule} disabled={loading}>
                  {editingId ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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