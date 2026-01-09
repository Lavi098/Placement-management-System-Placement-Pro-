import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signUp, signInWithGoogle } from "@/services/auth";
import { consumePlacementAdminInvite } from "@/services/placementAdmins";
import { updateUserProfile } from "@/services/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { getDashboardRouteForRole } from "@/models/users";
import { Globe, Eye, EyeOff } from "lucide-react";
import { emailPattern } from "@/lib/validation";
import { logout } from "@/services/auth";

const signupSchema = z.object({
  email: z.string().regex(emailPattern, "Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess?: () => void;
  inviteToken?: string;
}

const SignupForm = ({ onSuccess, inviteToken }: SignupFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoading, refreshUserProfile } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogoutAndContinue = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate(`${location.pathname}${location.search}`, { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      const newUser = await signUp(data);
      let successMessage = "Account created successfully!";

      if (inviteToken) {
        const placementAdminRecord = await consumePlacementAdminInvite(inviteToken, newUser.uid, data.email);
        await updateUserProfile(newUser.uid, {
          role: "placement-admin",
          status: "joined",
          collegeId: placementAdminRecord.collegeId,
          institutionAdminId: placementAdminRecord.institutionAdminId,
          placementAdminId: placementAdminRecord.id,
          employeeId: placementAdminRecord.employeeId,
        });
        await refreshUserProfile();
        successMessage = "Account linked to your placement admin invite!";
        navigate(getDashboardRouteForRole("placement-admin"));
      }

      toast.success(successMessage);
      onSuccess?.();
    } catch (error) {
      console.error("Signup error", error);
      const message = error instanceof Error ? error.message : "Failed to create an account.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const signedInUser = await signInWithGoogle();
      toast.success("Signed in with Google");
      if (inviteToken) {
        if (!signedInUser.email) {
          throw new Error("Google account did not return an email.");
        }
        const placementAdminRecord = await consumePlacementAdminInvite(inviteToken, signedInUser.uid, signedInUser.email);
        await updateUserProfile(signedInUser.uid, {
          role: "placement-admin",
          status: "joined",
          collegeId: placementAdminRecord.collegeId,
          institutionAdminId: placementAdminRecord.institutionAdminId,
          placementAdminId: placementAdminRecord.id,
          employeeId: placementAdminRecord.employeeId,
        });
        await refreshUserProfile();
        navigate(getDashboardRouteForRole("placement-admin"));
        return;
      }
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed.";
      toast.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user && !inviteToken) {
      const path = !user.role || user.status === "pending"
        ? "/onboarding"
        : getDashboardRouteForRole(user.role);
      navigate(path, { replace: true });
    }
  }, [user, isLoading, navigate, inviteToken]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {inviteToken && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            We will link this account to the placement admin invite you received.
          </div>
        )}
        {user && inviteToken && (
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <p className="mb-2 text-[11px] text-slate-500">
              You are currently signed in ({user.email}). To accept this invite, please log out and open the link in a fresh session so the placement admin signup can complete.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="px-0 text-xs text-primary"
              onClick={handleLogoutAndContinue}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out…" : "Log out and continue"}
            </Button>
          </div>
        )}
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="you@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-12"
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute inset-y-0 right-0 px-3 text-slate-500"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
        >
          <Globe className="h-4 w-4" />
          {isGoogleLoading ? "Opening Google..." : "Continue with Google"}
        </Button>
      </form>
    </Form>
  );
};

export default SignupForm;
