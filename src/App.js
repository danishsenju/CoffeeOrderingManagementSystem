// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext'; // Import the OrderProvider
import { PrivateRoute } from './components/Auth/PrivateRoute';
import Login from './components/Auth/Login';
import AdminDashboard from './pages/AdminDashboard';
import BaristaDashboard from './pages/BaristaDashboard';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <OrderProvider> {/* Add the OrderProvider */}
        <Router>
          <div className="app">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" />} />
              
              {/* Protected routes */}
              <Route 
                path="/admin/*" 
                element={
                  <PrivateRoute requiredRole="admin">
                    <AdminDashboard />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="/barista/*" 
                element={
                  <PrivateRoute requiredRole="barista">
                    <BaristaDashboard />
                  </PrivateRoute>
                } 
              />
              
              {/* Error routes */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Router>
      </OrderProvider>
    </AuthProvider>
  );
}

export default App;
