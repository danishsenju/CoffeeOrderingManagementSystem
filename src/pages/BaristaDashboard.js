// In BaristaDashboard.js
import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

  // This useEffect ensures the active tab state stays in sync with the URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/sales')) {
      setActiveTab('sales');
    } else {
      setActiveTab('orders');
    }
  }, [location.pathname]);

  async function handleLogout() {
    try {
      // Clear localStorage when logging out to prevent data leakage
      localStorage.removeItem('activeOrders');
      localStorage.removeItem('completedOrders');
      
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Handler for tab navigation to ensure state is preserved
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className={`barista-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
                to="/barista/orders"
                className={activeTab === 'orders' ? 'active' : ''}
                onClick={() => handleTabChange('orders')}
              >
                <span className="nav-icon">🛒</span>
                <span className="nav-text">Take Orders</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/barista/sales"
                className={activeTab === 'sales' ? 'active' : ''}
                onClick={() => handleTabChange('sales')}
              >
                <span className="nav-icon">📊</span>
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
              <p className="user-email">{currentUser?.email || 'barista@coffee.com'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span className="logout-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
        
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {sidebarCollapsed ? '►' : '◄'}
        </button>
      </aside>
      
      <main className="main-content">
        <header className="content-header">
          <h2 className="page-title">
            {activeTab === 'orders' ? 'Take Orders' : 'Today\'s Sales'}
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
            <Route path="/" element={<OrderForm />} />
            <Route path="/orders" element={<OrderForm />} />
            <Route path="/sales" element={<Sales />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default BaristaDashboard;