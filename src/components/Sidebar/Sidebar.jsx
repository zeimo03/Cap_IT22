import React, { useContext } from "react";
import { FaBars, FaTimes, FaUserCircle, FaHome } from "react-icons/fa";
import { SidebarContext } from "../Sidebar/SidebarContext";
import { AuthContext } from "../AuthContext";
import "./Sidebar.css";

function Sidebar() {
  const { panelOpen, toggleSidebar, openSidebar } = useContext(SidebarContext);
  const { openAuthModal = () => {} } = useContext(AuthContext);

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
              onClick={openSidebar}
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
          <button className="panel-login-btn" onClick={() => openAuthModal('login')}>
            Log in
          </button>
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
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}

export default Sidebar;