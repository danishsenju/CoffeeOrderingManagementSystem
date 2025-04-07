// src/pages/Unauthorized.js
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Unauthorized() {
  const { userRole } = useAuth();
  
  return (
    <div className="error-page">
      <h1>Unauthorized Access</h1>
      <p>You do not have permission to view this page.</p>
      {userRole === 'admin' && (
        <Link to="/admin" className="back-link">Go to Admin Dashboard</Link>
      )}
      {userRole === 'barista' && (
        <Link to="/barista" className="back-link">Go to Barista Dashboard</Link>
      )}
      {!userRole && (
        <Link to="/login" className="back-link">Return to Login</Link>
      )}
    </div>
  );
}

export default Unauthorized;