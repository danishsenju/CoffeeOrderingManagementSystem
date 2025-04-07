// src/pages/NotFound.js
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="error-page">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/login" className="back-link">Return to Login</Link>
    </div>
  );
}

export default NotFound;