import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF9F5' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#235A43' }} />
          <p className="text-sm" style={{ color: '#63716A' }}>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF9F5' }}>
        <div className="text-center max-w-md p-8">
          <p className="text-lg font-semibold mb-2" style={{ color: '#192820' }}>Access Restricted</p>
          <p className="text-sm" style={{ color: '#63716A' }}>
            Your role ({user.role}) does not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
