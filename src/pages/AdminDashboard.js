// src/pages/AdminDashboard.js
import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, BarChart2, QrCode, Users, LogOut, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import MenuManager from '../components/Admin/MenuManager';
import Statistics from '../components/Admin/Statistics';
import SalesCalendar from '../components/Admin/SalesCalendar';
import QRUpload from '../components/Admin/QRUpload';
import BaristaManager from '../components/Admin/BaristaManager';
import './AdminDashboard.css';
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

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const getPageTitle = () => {
    if (isActive('/admin/statistics')) return 'Sales Analytics Dashboard';
    if (isActive('/admin/calendar'))   return 'Sales Calendar';
    if (isActive('/admin/qr'))         return 'QR Payment';
    if (isActive('/admin/baristas'))   return 'Manage Baristas';
    return 'Menu Management';
  };

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="sidebar">
        <div className="brand-container">
          <div className="logo">
            <img src={coffeeLogo} alt="MauKoffie" />
          </div>
          <span className="brand-name">Matchalalu</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
                        <li>
              <Link
                to="/admin/statistics"
                className={isActive('/admin/statistics') ? 'active' : ''}
              >
                <span className="nav-icon"><BarChart2 size={18} /></span>
                <span className="nav-text">Statistics</span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin/calendar"
                className={isActive('/admin/calendar') ? 'active' : ''}
              >
                <span className="nav-icon"><CalendarDays size={18} /></span>
                <span className="nav-text">Calendar</span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin/menu"
                className={isActive('/admin/menu') || location.pathname === '/admin' ? 'active' : ''}
              >
                <span className="nav-icon"><ClipboardList size={18} /></span>
                <span className="nav-text">Menu</span>
              </Link>
            </li>

            <li>
              <Link
                to="/admin/qr"
                className={isActive('/admin/qr') ? 'active' : ''}
              >
                <span className="nav-icon"><QrCode size={18} /></span>
                <span className="nav-text">QR Payment</span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin/baristas"
                className={isActive('/admin/baristas') ? 'active' : ''}
              >
                <span className="nav-icon"><Users size={18} /></span>
                <span className="nav-text">Baristas</span>
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
              <p className="user-email">{currentUser?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span className="logout-icon"><LogOut size={18} /></span>
            <span>Logout</span>
          </button>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        <header className="content-header">
          <h2 className="page-title">{getPageTitle()}</h2>
          <div className="header-actions">
            <div className="date-display">
              {new Date().toLocaleDateString('en-MY', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
              })}
            </div>
          </div>
        </header>

        <div className="content-container">
          <Routes>
            <Route path="/"           element={<MenuManager />} />
            <Route path="/menu"       element={<MenuManager />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/calendar"   element={<SalesCalendar />} />
            <Route path="/qr"         element={<QRUpload />} />
            <Route path="/baristas"   element={<BaristaManager />} />
          </Routes>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav">
        <Link
          to="/admin/menu"
          className={`mobile-nav-item ${(isActive('/admin/menu') || location.pathname === '/admin') ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon"><ClipboardList size={20} /></span>
          <span className="mobile-nav-label">Menu</span>
        </Link>
        <Link
          to="/admin/statistics"
          className={`mobile-nav-item ${isActive('/admin/statistics') ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon"><BarChart2 size={20} /></span>
          <span className="mobile-nav-label">Stats</span>
        </Link>
        <Link
          to="/admin/calendar"
          className={`mobile-nav-item ${isActive('/admin/calendar') ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon"><CalendarDays size={20} /></span>
          <span className="mobile-nav-label">Calendar</span>
        </Link>
        <Link
          to="/admin/qr"
          className={`mobile-nav-item ${isActive('/admin/qr') ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon"><QrCode size={20} /></span>
          <span className="mobile-nav-label">QR</span>
        </Link>
        <Link
          to="/admin/baristas"
          className={`mobile-nav-item ${isActive('/admin/baristas') ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon"><Users size={20} /></span>
          <span className="mobile-nav-label">Baristas</span>
        </Link>
        <button onClick={handleLogout} className="mobile-nav-item">
          <span className="mobile-nav-icon"><LogOut size={20} /></span>
          <span className="mobile-nav-label">Logout</span>
        </button>
      </nav>
    </div>
  );
}

export default AdminDashboard;
