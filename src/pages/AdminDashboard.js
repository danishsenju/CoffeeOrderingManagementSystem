// src/pages/AdminDashboard.js
import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MenuManager from '../components/Admin/MenuManager';
import Statistics from '../components/Admin/Statistics';
import './AdminDashboard.css';
import '../components/Admin/Statistics.css'; // Import Statistics CSS
import coffeeLogo from '../images/MauKoffie-logo.png';

function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Function to check if a route is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand-container">
          <div className="logo">
            <img src={coffeeLogo} alt="Coffee Shop Logo" />
          </div>
          <h1 className="brand-name">Mau Koffie</h1>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link 
                to="/admin/menu" 
                className={isActive('/admin/menu') || location.pathname === '/admin' ? 'active' : ''}
              >
                <span className="nav-icon">📋</span>
                <span className="nav-text">Menu Management</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/admin/statistics" 
                className={isActive('/admin/statistics') ? 'active' : ''}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-text">Sales Statistics</span>
              </Link>
            </li>
            <li>
              <Link to="#" className="disabled">
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="user-section">
          <div className="user-info">
            <div className="user-avatar">
              <span>{currentUser?.email?.charAt(0).toUpperCase() || 'A'}</span>
            </div>
            <div className="user-details">
              <p className="user-name">Admin</p>
              <p className="user-email">{currentUser?.email || 'admin@coffee.com'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span className="logout-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
        
        {/* Add the toggle button */}
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {sidebarCollapsed ? '►' : '◄'}
        </button>
      </aside>
      
      {/* Main content */}
      <main className="main-content">
        <header className="content-header">
          <h2 className="page-title">
            {isActive('/admin/statistics') ? 'Sales Statistics' : 
             isActive('/admin/menu') || location.pathname === '/admin' ? 'Menu Management' : 'Dashboard'}
          </h2>
          <div className="header-actions">
            <div className="date-display">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </header>
        
        <div className="content-container">
          <Routes>
            <Route path="/" element={<MenuManager />} />
            <Route path="/menu" element={<MenuManager />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;