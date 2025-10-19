import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check if user has that role
  if (requiredRole && userRole !== requiredRole) {
    // Redirect based on user's actual role
    switch (userRole) {
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      case 'employer':
        return <Navigate to="/employer-dashboard" replace />;
      case 'employee':
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
