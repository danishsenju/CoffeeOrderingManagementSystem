// src/components/Auth/PrivateRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Component for routes that require authentication with a specific role
export function PrivateRoute({ children, requiredRole }) {
  const { currentUser, userRole } = useAuth();
  
  if (!currentUser) {
    // Not logged in, redirect to login
    return <Navigate to="/login" />;
  }
  
  // If a specific role is required
  if (requiredRole && userRole !== requiredRole) {
    // User doesn't have the required role
    return <Navigate to="/unauthorized" />;
  }
  
  // User is authenticated with the correct role
  return children;
}