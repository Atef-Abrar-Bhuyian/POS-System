import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Route protection wrapper component.
 * @param {React.ReactNode} children - Component to render if checks pass
 * @param {Array<string>} [allowedRoles] - Optional list of roles allowed to view page
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, initialized, checkSession } = useAuth();

  useEffect(() => {
    // Always verify session on first load if not yet initialized
    if (!initialized) {
      checkSession();
    }
  }, [initialized, checkSession]);

  // Wait until local storage credentials check finishes
  if (token && !initialized) {
    return (
      <div style={spinnerContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={{ marginTop: '10px', color: '#666' }}>Loading session...</p>
      </div>
    );
  }

  // Redirect to login if user session is absent
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to base if user does not match the page's role requirements
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Simple visual spinner styles for session checks
const spinnerContainerStyle = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f9f9f9',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  zIndex: 9999
};

const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '4px solid #ddd',
  borderTop: '4px solid #ff4d4d',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

// Inject keyframe animation dynamically
const styleSheet = document.styleSheets[0] || (() => {
  const style = document.createElement('style');
  document.head.appendChild(style);
  return style.sheet;
})();
try {
  styleSheet.insertRule('@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }', 0);
} catch (e) {
  // Silent fallback
}

export default ProtectedRoute;
