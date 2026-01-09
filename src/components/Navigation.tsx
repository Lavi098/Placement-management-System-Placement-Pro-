import { Link, useNavigate } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { GraduationCap, LogOut, LayoutDashboard, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/auth";
import { getDashboardRouteForRole } from "@/models/users";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { ReactNode } from "react";

interface NavigationProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  centerContent?: ReactNode;
  showDashboardButton?: boolean;
}

const Navigation = ({ onLoginClick, onSignupClick, centerContent, showDashboardButton = true }: NavigationProps) => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch {
      toast.error("Failed to log out");
    }
  };

  const getDashboardPath = () => {
    if (!user) return "/";
    return getDashboardRouteForRole(user.role);
  };

  const { theme, toggleTheme } = useTheme();
  
  return (
    <nav className="border-b-2 border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-950/60 sticky top-0 z-50 shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl md:text-2xl group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-slate-900 via-primary to-accent bg-clip-text text-transparent dark:from-slate-100 dark:via-white/75 dark:to-slate-200">
            PlacementPro
          </span>
        </Link>
        {centerContent && (
          <div className="flex flex-1 justify-center text-xs font-semibold tracking-[0.25em] uppercase text-slate-900 dark:text-slate-200">
            {centerContent}
          </div>
        )}
        
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <Button variant="ghost" onClick={toggleTheme} aria-label="Toggle color mode" className="px-3 py-2 gap-2">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          ) : user ? (
            <>
              {showDashboardButton && (
                <Button
                  variant="ghost"
                  onClick={() => navigate(getDashboardPath())}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => onLoginClick ? onLoginClick() : navigate("/login")}
                className={buttonVariants({ variant: "ghost" })}
              >
                Login
              </Button>
              <Button
                onClick={() => onSignupClick ? onSignupClick() : navigate("/signup")}
                className={
                  buttonVariants({ variant: "default" }) +
                  " bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 font-semibold"
                }
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

