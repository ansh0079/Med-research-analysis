import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleRoute: React.FC<Props> = ({ children, allowedRoles, fallback }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user?.role || '')) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
