import React, { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaTimes, FaUserCircle, FaHome, FaFlag, FaEdit, FaCalendarAlt, FaMedal, FaShieldAlt } from "react-icons/fa";
import { SidebarContext } from "../Sidebar/SidebarContext";
import { AuthContext } from "../AuthContext";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { panelOpen, toggleSidebar, openSidebar } = useContext(SidebarContext);
  const { openAuthModal = () => {}, currentUser, userProfile, logout } = useContext(AuthContext);

  return (
    <>
      {/* ── Fixed icon rail ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <button
            className="sidebar-btn menu-btn"
            aria-label={panelOpen ? "Close Menu" : "Open Menu"}
            data-label={panelOpen ? "Close" : "Menu"}
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
              className={`sidebar-btn ${location.pathname === "/profile" ? "active" : ""}`}
              aria-label="Profile"
              data-label="Profile"
              onClick={() => navigate("/profile")}
            >
              <FaUserCircle />
            </button>
            <button
              className={`sidebar-btn ${location.pathname === "/dashboard" ? "active" : ""}`}
              aria-label="Home"
              data-label="Home"
              onClick={() => navigate('/dashboard')}
            >
              <FaHome />
            </button>
            <button
              className={`sidebar-btn ${location.pathname === "/registration" ? "active" : ""}`}
              aria-label="Registration"
              data-label="Registration"
              onClick={() => navigate('/registration')}
            >
              <FaEdit />
            </button>
            <button
              className="sidebar-btn"
              aria-label="Team and Sports"
              data-label="Team & Sports"
              onClick={() => navigate('/events')}
            >
              <FaFlag />
            </button>
            <button
              className="sidebar-btn"
              aria-label="Match Schedules"
              data-label="Schedules"
              onClick={() => navigate('/schedule')}
            >
              <FaCalendarAlt />
            </button>
            <button
              className="sidebar-btn"
              aria-label="Ranking"
              data-label="Ranking"
              onClick={() => navigate('/ranking')}
            >
              <FaMedal />
            </button>

            {/* Admin Panel icon — only visible to admins */}
            {userProfile?.isAdmin && (
              <button
                className={`sidebar-btn ${location.pathname === "/schedule-admin" ? "active" : ""}`}
                aria-label="Admin Panel"
                data-label="Admin"
                onClick={() => navigate('/schedule-admin')}
              >
                <FaShieldAlt />
              </button>
            )}
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
          <Link to="/profile" className={`panel-nav-item ${location.pathname === "/profile" ? "active" : ""}`}>
            <FaUserCircle className="panel-nav-icon" />
            <span>Profile</span>
          </Link>
          <Link to="/dashboard" className={`panel-nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}>
            <FaHome className="panel-nav-icon" />
            <span>Home</span>
          </Link>
          <Link to="/registration" className={`panel-nav-item ${location.pathname === "/registration" ? "active" : ""}`}>
            <FaEdit className="panel-nav-icon" />
            <span>Registration</span>
          </Link>
          <Link to="/events" className={`panel-nav-item ${location.pathname === "/events" ? "active" : ""}`}>
            <FaFlag className="panel-nav-icon" />
            <span>Team and Sports</span>
          </Link>
          <Link to="/schedule" className={`panel-nav-item ${location.pathname === "/schedule" ? "active" : ""}`}>
            <FaCalendarAlt className="panel-nav-icon" />
            <span>Match Schedules</span>
          </Link>
          <Link to="/ranking" className={`panel-nav-item ${location.pathname === "/ranking" ? "active" : ""}`}>
            <FaMedal className="panel-nav-icon" />
            <span>Ranking</span>
          </Link>

          {/* Admin Panel link — only visible to admins */}
          {userProfile?.isAdmin && (
            <Link to="/schedule-admin" className={`panel-nav-item ${location.pathname === "/schedule-admin" ? "active" : ""}`}>
              <FaShieldAlt className="panel-nav-icon" />
              <span>Admin Panel</span>
            </Link>
          )}

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