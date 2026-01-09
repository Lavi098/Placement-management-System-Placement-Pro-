import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingChoice from "./OnboardingChoice";
import { getDashboardRouteForRole } from "@/models/users";

const OnboardingChoiceWrapper = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (user.role && user.status !== "pending") {
    return <Navigate to={getDashboardRouteForRole(user.role)} replace />;
  }

  return <OnboardingChoice />;
};

export default OnboardingChoiceWrapper;