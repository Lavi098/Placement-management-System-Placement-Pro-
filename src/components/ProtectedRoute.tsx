// src/components/ProtectedRoute.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole, getDashboardRouteForRole } from "@/models/users";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // 1. While the auth state is being checked, show a loading indicator.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // 2. If the user is not logged in, redirect them to the login page.
  //    Pass the current location so they can be redirected back after logging in.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If the route requires specific roles and the user's role is not allowed,
  //    redirect them to their default dashboard.
  const userRole = user.role;
  const isAuthorized = allowedRoles
    ? userRole
      ? allowedRoles.includes(userRole)
      : false
    : true;
  
  if (!isAuthorized) {
    // Redirect to a default page or a "Not Authorized" page.
    // For now, redirecting to their role-specific dashboard is a safe default.
    const redirectTo = getDashboardRouteForRole(user.role);
    return <Navigate to={redirectTo} replace />;
  }

  // 4. If the user is logged in and authorized, render the requested component.
  return children;
};

export default ProtectedRoute;
