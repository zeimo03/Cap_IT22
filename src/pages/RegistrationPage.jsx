import React, { useState, useRef } from 'react';
import './RegistrationPage.css';

const GRADE_LEVELS = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  '1st Year', '2nd Year', '3rd Year', '4th Year'];

const SECTIONS = ['Section A', 'Section B', 'Section C', 'Section D', 'Section E'];

const TEAMS = [
  'Black Beetles', 'Purple Jaguars', 'Brown Cubs', 'Orange Bulldogs',
  'Yellow Vipers', 'Maroon Owls', 'Green Gators', 'Red Rhinos',
];

const SPORTS = [
  'Basketball', 'Baseball', 'Swimming', 'Volleyball', 'Track & Field',
  'Badminton', 'Table Tennis', 'Chess',
];

const POSITIONS = [
  'Forward', 'Guard', 'Center', 'Pitcher', 'Catcher', 'Shortstop',
  'Outfield', 'Midfielder', 'Goalkeeper', 'Sprinter', 'Other',
];

const INITIAL = {
  fullName: '', dob: '', age: '',
  gender: '',
  contactNumber: '', email: '',
  address: '', emergencyContact: '',
  gradeLevel: '', section: '',
  teamName: '', sport: '', position: '',
  message: '',
};

export default function RegistrationPage() {
  const [form, setForm] = useState(INITIAL);
  const [photo, setPhoto]     = useState(null);
  const [waiver, setWaiver]   = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const photoRef  = useRef(null);
  const waiverRef = useRef(null);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleFile = (setter) => (e) => {
    const file = e.target.files?.[0];
    if (file) setter(file);
  };

  const handleReset = () => {
    setForm(INITIAL);
    setPhoto(null);
    setWaiver(null);
    setSubmitted(false);
    if (photoRef.current)  photoRef.current.value  = '';
    if (waiverRef.current) waiverRef.current.value = '';
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="reg-page">
        <div className="reg-hero">
          <h1 className="reg-hero__title">Player Registration</h1>
          <span className="reg-hero__icon">🏆</span>
        </div>
        <div className="reg-card" style={{ textAlign: 'center', padding: '48px 28px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontFamily: 'Lalezar, sans-serif', fontSize: 22, margin: '0 0 8px', color: '#001529' }}>
            Registration Submitted!
          </h2>
          <p style={{ fontSize: 13, color: '#5a6a7a', margin: '0 0 24px' }}>
            Your player registration has been received. You'll be notified once it's reviewed.
          </p>
          <button className="reg-btn-save" onClick={handleReset} style={{ margin: '0 auto' }}>
            Register Another Player
          </button>
        </div>
        <RegFooter />
      </div>
    );
  }

  return (
    <div className="reg-page">
      {/* Hero */}
      <div className="reg-hero">
        <h1 className="reg-hero__title">Player Registration</h1>
        <span className="reg-hero__icon">🏅⚽🏀</span>
      </div>

      {/* Card */}
      <div className="reg-card">
        {/* Card heading */}
        <div className="reg-card__head">
          <div className="reg-card__icon">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
          </div>
          <h2 className="reg-card__title">Player Registration</h2>
        </div>

        <form className="reg-form" onSubmit={handleSave} noValidate>
          {/* Row 1: Full Name / DOB / Age */}
          <div className="reg-row reg-row--3">
            <Field label="Full Name" required>
              <input className="reg-input" placeholder="Last Name, First Name, Middle Name"
                value={form.fullName} onChange={set('fullName')} required />
            </Field>
            <Field label="Date of Birth" required>
              <input className="reg-input" type="date"
                value={form.dob} onChange={set('dob')} required />
            </Field>
            <Field label="Age" required>
              <input className="reg-input" type="number" placeholder="Enter Age" min={5} max={40}
                value={form.age} onChange={set('age')} required />
            </Field>
          </div>

          {/* Row 2: Gender / Contact / Email */}
          <div className="reg-row reg-row--3">
            <Field label="Gender" required>
              <div className="reg-radio-group">
                {['Male', 'Female', 'Others'].map(g => (
                  <label className="reg-radio-label" key={g}>
                    <input type="radio" name="gender" value={g}
                      checked={form.gender === g} onChange={set('gender')} />
                    {g}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Contact Number" required>
              <input className="reg-input" placeholder="63+**********"
                value={form.contactNumber} onChange={set('contactNumber')} required />
            </Field>
            <Field label="Email Address">
              <input className="reg-input" type="email" placeholder="@src.edu.ph"
                value={form.email} onChange={set('email')} />
            </Field>
          </div>

          {/* Row 3: Address / Emergency */}
          <div className="reg-row reg-row--2">
            <Field label="Address" required>
              <input className="reg-input" placeholder="Complete Address"
                value={form.address} onChange={set('address')} required />
            </Field>
            <Field label="Emergency Contact" required>
              <input className="reg-input" placeholder="Name-63+**********"
                value={form.emergencyContact} onChange={set('emergencyContact')} required />
            </Field>
          </div>

          {/* Row 4: Grade / Section */}
          <div className="reg-row reg-row--2">
            <Field label="Grade / Year Level" required>
              <select className="reg-select" value={form.gradeLevel} onChange={set('gradeLevel')} required>
                <option value="">Select Grade / Year Level</option>
                {GRADE_LEVELS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Section" required>
              <select className="reg-select" value={form.section} onChange={set('section')} required>
                <option value="">Select Section</option>
                {SECTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 5: Team / Sport / Position */}
          <div className="reg-row reg-row--3eq">
            <Field label="Team Name" required>
              <select className="reg-select" value={form.teamName} onChange={set('teamName')} required>
                <option value="">Select Team</option>
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Sport / Event" required>
              <select className="reg-select" value={form.sport} onChange={set('sport')} required>
                <option value="">Select Sport / Event</option>
                {SPORTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Position" required>
              <select className="reg-select" value={form.position} onChange={set('position')} required>
                <option value="">Select Position</option>
                {POSITIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 6: Uploads + Message */}
          <div className="reg-uploads-row">
            {/* Photo upload */}
            <Field label="Upload Photo">
              <label className="reg-upload-box">
                <input type="file" accept="image/*" ref={photoRef} onChange={handleFile(setPhoto)} />
                <div className="reg-upload-icon">👤</div>
                <span className="reg-upload-caption">Click to upload photo</span>
                {photo
                  ? <span className="reg-upload-preview">{photo.name}</span>
                  : <span className="reg-upload-sub">JPG, PNG, max 5 MB</span>
                }
              </label>
            </Field>

            {/* Waiver upload */}
            <Field label={<>Upload Waiver / Consent Form <span style={{color:'#C0392B'}}>*</span></>}>
              <label className="reg-upload-box">
                <input type="file" accept=".pdf,.doc,.docx,image/*" ref={waiverRef} onChange={handleFile(setWaiver)} />
                <div className="reg-upload-icon">📄</div>
                <span className="reg-upload-caption">Click to upload waiver</span>
                {waiver
                  ? <span className="reg-upload-preview">{waiver.name}</span>
                  : <span className="reg-upload-sub">PDF, DOC, max 5 MB</span>
                }
              </label>
            </Field>

            {/* Message */}
            <Field label="Message">
              <textarea className="reg-textarea"
                placeholder="Any additional information (optional)"
                value={form.message} onChange={set('message')}
                rows={4} />
            </Field>
          </div>

          <div className="reg-divider" />

          {/* Footer */}
          <div className="reg-footer">
            <span className="reg-footer__note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#5a6a7a"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              Fields marked with <strong style={{color:'#C0392B'}}>*</strong> are required
            </span>
            <div className="reg-footer__actions">
              <button type="button" className="reg-btn-reset" onClick={handleReset}>
                Reset ↺
              </button>
              <button type="submit" className="reg-btn-save">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                Save Registration
              </button>
            </div>
          </div>
        </form>
      </div>

      <RegFooter />
    </div>
  );
}

/* ── Reusable Field wrapper ── */
function Field({ label, required, children }) {
  return (
    <div className="reg-field">
      <label className="reg-label">
        {label}{required && <span>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Shared page footer ── */
function RegFooter() {
  return (
    <>
      {/* Contact bar */}
      <div className="reg-contact-bar">
        <p className="reg-contact-bar__title">Contact Us</p>
        <div className="reg-contact-bar__links">
          <span>📍 San Jose, Santa Rita Pampanga, Philippines</span>
          <span>📞 (045) 900 0597</span>
          <a href="mailto:src_educ_ph@yahoo.com">✉ src_educ_ph@yahoo.com</a>
          <a href="https://facebook.com/santaritacollege" target="_blank" rel="noreferrer">
            🔷 facebook.com/santaritacollege
          </a>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="reg-bottom-footer">
        <div className="reg-footer-logo">🎓</div>

        <div className="reg-footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/schedule">Schedule</a></li>
            <li><a href="/registration">Registration</a></li>
            <li><a href="/rankings">Rankings</a></li>
            <li><a href="/teams">Teams and Sports</a></li>
          </ul>
        </div>

        <div className="reg-footer-counter">
          <h4>Visitor Counter</h4>
          <div className="reg-footer-counter__num">5999</div>
        </div>

        <div className="reg-bottom-footer__copy">
          © 2026 Santa Rita College of Pampanga. All rights reserved.
        </div>
      </div>
    </>
  );
}
