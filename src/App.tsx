import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/PlacementAdminDashboard";
import CreateDrive from "./pages/CreateDrive";
import PlacedStudents from "./pages/PlacedStudents";
import DriveDetail from "./pages/DriveDetail";
import ApplyNow from "./pages/ApplyNow";
import ProfilePage from "./pages/ProfilePage";
import StudentProfileAdminView from "./pages/StudentProfileAdminView";
import AnnounceResult from "./pages/AnnounceResult";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { startPeriodicStatusUpdate } from "./services/drivestatusscheduler";
import OnboardingChoiceWrapper from "@/pages/OnboardingChoiceWrapper";
import { AddCollegeForm } from "@/components/Onboarding/AddCollegeForm";
import { JoinCollegeForm } from "@/components/Onboarding/JoinCollegeForm";
import { getDashboardRouteForRole } from "@/models/users";
import InstitutionAdminDashboard from "./pages/InstitutionAdminDashboard";
import InstitutionProfile from "./pages/InstitutionProfile";
import FullScreenLoader from "./components/ui/full-screen-loader";

// A component to handle redirection for logged-in users from the home page
const Home = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader message="Checking your session" />;

  if (user) {
    if (!user.role || user.status === "pending") {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to={getDashboardRouteForRole(user.role)} replace />;
  }
  return <Index />;
};


const App = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Start the drive status scheduler
    const stopScheduler = startPeriodicStatusUpdate(60, (results) => {
      if (results.updated > 0) {
        console.log(
          `[App] Drive statuses updated: ${results.updated} drives changed status`
        );
        queryClient.invalidateQueries({ queryKey: ["drives"] });
      }
    });

    // Cleanup on unmount
    return () => stopScheduler();
  }, [queryClient]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* Onboarding Routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingChoiceWrapper />
            </ProtectedRoute>
          } />
          <Route path="/onboarding/add-college" element={
            <ProtectedRoute>
              <AddCollegeForm />
            </ProtectedRoute>
          } />
          <Route path="/onboarding/join-college" element={
            <ProtectedRoute>
              <JoinCollegeForm />
            </ProtectedRoute>
          } />

          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/apply/:id" element={<ProtectedRoute><ApplyNow /></ProtectedRoute>} />
          <Route path="/drive/:id" element={<ProtectedRoute><DriveDetail /></ProtectedRoute>} />

          {/* Placement Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['placement-admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['placement-admin']}><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin/students/:id" element={<ProtectedRoute allowedRoles={['placement-admin']}><StudentProfileAdminView /></ProtectedRoute>} />
          <Route path="/admin/create-drive" element={<ProtectedRoute allowedRoles={['placement-admin']}><CreateDrive /></ProtectedRoute>} />
          <Route path="/admin/announce-result" element={<ProtectedRoute allowedRoles={['placement-admin']}><AnnounceResult /></ProtectedRoute>} />
          <Route path="/admin/placed-students" element={<ProtectedRoute allowedRoles={['placement-admin']}><PlacedStudents /></ProtectedRoute>} />
          
          {/* This route is viewed by both students and admins, so we just protect it. */}
          {/* The component itself handles the different views based on user role. */}
          <Route path="/admin/drive/:id" element={<ProtectedRoute allowedRoles={['placement-admin', 'institution-admin']}><DriveDetail /></ProtectedRoute>} />

          {/* Institution Admin Routes */}
          <Route path="/institution" element={<ProtectedRoute allowedRoles={['institution-admin']}><InstitutionAdminDashboard /></ProtectedRoute>} />
          <Route path="/institution/profile" element={<ProtectedRoute allowedRoles={['institution-admin']}><InstitutionProfile /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>

    </TooltipProvider>
  );
};

export default App;