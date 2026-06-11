import React, { useState } from "react";
import { FaBars, FaUserCircle, FaHome } from "react-icons/fa";
import "./Sidebar.css";

function Sidebar() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      {/* ── Fixed icon rail ── */}
      <aside className="sidebar">
        {/* ALL buttons stacked at top so they line up with the slide-out panel */}
        <div className="sidebar-top">
          <button
            className="sidebar-btn"
            aria-label="Open Menu"
            onClick={() => setPanelOpen((prev) => !prev)}
          >
            <FaBars />
          </button>

          <div className="sidebar-divider" />

          <button className="sidebar-btn" aria-label="View Profile">
            <FaUserCircle />
          </button>
          <button className="sidebar-btn active" aria-label="Go to Dashboard">
            <FaHome />
          </button>
        </div>
      </aside>

      {/* ── Slide-out panel ── */}
      <div className={`sidebar-panel ${panelOpen ? "open" : ""}`}>
        <div className="panel-profile">
          <FaUserCircle className="panel-avatar" />
          <button className="panel-login-btn">Log in</button>
        </div>

        <nav className="panel-nav">
          <a href="#" className="panel-nav-item active">
            <FaHome className="panel-nav-icon" />
            <span>Home</span>
          </a>
        </nav>
      </div>

      {panelOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}

export default Sidebar;