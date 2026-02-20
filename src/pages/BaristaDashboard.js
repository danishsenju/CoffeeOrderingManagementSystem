// src/pages/BaristaDashboard.js
import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, BarChart2, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import OrderForm from '../components/Barista/OrderForm';
import Sales from '../components/Barista/Sales';
import './BaristaDashboard.css';
import coffeeLogo from '../images/MauKoffie-logo.png';

function BaristaDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.includes('/sales')) {
      setActiveTab('sales');
    } else {
      setActiveTab('orders');
    }
  }, [location.pathname]);

  async function handleLogout() {
    try {
      localStorage.removeItem('activeOrders');
      localStorage.removeItem('completedOrders');
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  return (
    <div className={`barista-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

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
                to="/barista/orders"
                className={activeTab === 'orders' ? 'active' : ''}
                onClick={() => setActiveTab('orders')}
              >
                <span className="nav-icon"><ShoppingCart size={18} /></span>
                <span className="nav-text">Take Orders</span>
              </Link>
            </li>
            <li>
              <Link
                to="/barista/sales"
                className={activeTab === 'sales' ? 'active' : ''}
                onClick={() => setActiveTab('sales')}
              >
                <span className="nav-icon"><BarChart2 size={18} /></span>
                <span className="nav-text">Today's Sales</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="user-section">
          <div className="user-info">
            <div className="user-avatar">
              <span>{currentUser?.email?.charAt(0).toUpperCase() || 'B'}</span>
            </div>
            <div className="user-details">
              <p className="user-name">Barista</p>
              <p className="user-email">{currentUser?.email?.split('@')[0]}</p>
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
          <h2 className="page-title">
            {activeTab === 'orders' ? 'Take Orders' : "Today's Sales"}
          </h2>
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
            <Route path="/"       element={<OrderForm />} />
            <Route path="/orders" element={<OrderForm />} />
            <Route path="/sales"  element={<Sales />} />
          </Routes>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav">
        <Link
          to="/barista/orders"
          className={`mobile-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="mobile-nav-icon"><ShoppingCart size={20} /></span>
          <span className="mobile-nav-label">Orders</span>
        </Link>
        <Link
          to="/barista/sales"
          className={`mobile-nav-item ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <span className="mobile-nav-icon"><BarChart2 size={20} /></span>
          <span className="mobile-nav-label">Sales</span>
        </Link>
        <button onClick={handleLogout} className="mobile-nav-item">
          <span className="mobile-nav-icon"><LogOut size={20} /></span>
          <span className="mobile-nav-label">Logout</span>
        </button>
      </nav>
    </div>
  );
}

export default BaristaDashboard;
