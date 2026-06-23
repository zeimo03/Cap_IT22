import React from 'react';
import './DashboardPage.css';

export default function DashboardPage() {
  return (
    <div className="user-dashboard">
      <header className="dashboard-hero">
        <div className="hero-inner">
          <h1>Santa Rita College Dashboard</h1>
          <p className="hero-sub">Welcome — here are your upcoming matches and activity.</p>
        </div>
      </header>

      <section className="dashboard-section ongoing">
        <h2>Ongoing Matches</h2>
        <div className="card-row">
          <div className="match-card">Placeholder match card</div>
          <div className="match-card">Placeholder match card</div>
          <div className="match-card">Placeholder match card</div>
        </div>
      </section>

      <section className="dashboard-section upcoming">
        <h2>Upcoming Matches</h2>
        <div className="card-row">
          <div className="upcoming-card">Upcoming match placeholder</div>
          <div className="upcoming-card">Upcoming match placeholder</div>
        </div>
      </section>

      <section className="dashboard-section stats">
        <h2>Your Stats</h2>
        <div className="stats-grid">
          <div className="stat">Matches: <strong>0</strong></div>
          <div className="stat">Teams: <strong>0</strong></div>
          <div className="stat">Points: <strong>0</strong></div>
        </div>
      </section>

      <footer className="dashboard-footer">Contact your school coordinator for more details.</footer>
    </div>
  );
}
