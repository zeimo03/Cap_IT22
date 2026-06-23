import React, { useContext } from "react";
import { Link } from 'react-router-dom';
import { FaBars, FaTimes, FaUserCircle, FaHome } from "react-icons/fa";
import { SidebarContext } from "../Sidebar/SidebarContext";
import { AuthContext } from "../AuthContext";
import "./Sidebar.css";

function Sidebar() {
  const { panelOpen, toggleSidebar, openSidebar } = useContext(SidebarContext);
  const { openAuthModal = () => {}, currentUser, userProfile, logout } = useContext(AuthContext);

  return (
    <>
      {/* ── Fixed icon rail ── */}
      <aside className="sidebar">
        {/* ALL buttons stacked at top so they line up with the slide-out panel */}
        <div className="sidebar-top">
          <button
            className="sidebar-btn menu-btn"
            aria-label={panelOpen ? "Close Menu" : "Open Menu"}
            onClick={toggleSidebar}
          >
            <span className={`menu-icon ${panelOpen ? "open" : ""}`}>
              <FaBars className="menu-icon-bars" />
              <FaTimes className="menu-icon-close" />
            </span>
          </button>

          <div className={`sidebar-extra ${panelOpen ? "collapsed" : ""}`}>
            <div className="sidebar-divider" />
            <button
              className="sidebar-btn"
              aria-label="View Profile"
              onClick={openSidebar}
            >
              <FaUserCircle />
            </button>
            <button
              className="sidebar-btn active"
              aria-label="Go to Dashboard"
              onClick={() => { openSidebar(); navigate('/dashboard'); }}
            >
              <FaHome />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Slide-out panel ── */}
      <div className={`sidebar-panel ${panelOpen ? "open" : ""}`}>
        <div className="panel-profile">
          <FaUserCircle className="panel-avatar" />
          {currentUser ? (
            <button className="panel-login-btn" onClick={logout}>
              Sign out
            </button>
          ) : (
            <button className="panel-login-btn" onClick={() => openAuthModal('login')}>
              Log in
            </button>
          )}
        </div>

        <nav className="panel-nav">
          <Link to="/dashboard" className="panel-nav-item active">
            <FaHome className="panel-nav-icon" />
            <span>Dashboard</span>
          </Link>
          <Link to="/profile" className="panel-nav-item">
            <FaUserCircle className="panel-nav-icon" />
            <span>Profile</span>
          </Link>
          {['admin', 'superadmin'].includes(userProfile?.role) && (
            <Link to="/admin" className="panel-nav-item">
              <FaUserCircle className="panel-nav-icon" />
              <span>Admin</span>
            </Link>
          )}
          {['moderator', 'admin', 'superadmin'].includes(userProfile?.role) && (
            <Link to="/moderator" className="panel-nav-item">
              <FaUserCircle className="panel-nav-icon" />
              <span>Moderator</span>
            </Link>
          )}
          {userProfile?.role === 'superadmin' && (
            <Link to="/superadmin" className="panel-nav-item">
              <FaUserCircle className="panel-nav-icon" />
              <span>Super Admin</span>
            </Link>
          )}
        </nav>
      </div>

      {panelOpen && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}

export default Sidebar;