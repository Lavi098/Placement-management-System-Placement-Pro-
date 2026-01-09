// src/components/auth/LoginForm.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { login, signInWithGoogle } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Globe, LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDashboardRouteForRole } from "@/models/users";
import { emailPattern } from "@/lib/validation";
import { consumePlacementAdminInvite } from "@/services/placementAdmins";
import { updateUserProfile } from "@/services/user";

const loginSchema = z.object({
  email: z.string().regex(emailPattern, "Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  inviteToken?: string;
}

export const LoginForm = ({ onSuccess, inviteToken }: LoginFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoading, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const signedInUser = await login(data.email, data.password);
      if (inviteToken) {
        const placementAdminRecord = await consumePlacementAdminInvite(inviteToken, signedInUser.uid, data.email);
        await updateUserProfile(signedInUser.uid, {
          role: "placement-admin",
          status: "joined",
          collegeId: placementAdminRecord.collegeId,
          institutionAdminId: placementAdminRecord.institutionAdminId,
          placementAdminId: placementAdminRecord.id,
          employeeId: placementAdminRecord.employeeId,
        });
        await refreshUserProfile();
        toast.success("Invite accepted! Redirecting to your dashboard.");
        navigate(getDashboardRouteForRole("placement-admin"));
        return;
      }

      toast.success("Login successful!");
      // The AuthProvider will detect the change and update the user state.
      // The useEffect below will handle the redirect.
      onSuccess?.(); // Close the dialog if a callback is provided
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to log in.";
      toast.error(message);
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

  // This effect handles redirection after the user state is updated by the provider
  useEffect(() => {
    if (inviteToken) return;
    if (!isLoading && user) {
      const path = !user.role || user.status === "pending"
        ? "/onboarding"
        : getDashboardRouteForRole(user.role);
      navigate(path, { replace: true });
    }
  }, [user, isLoading, navigate, inviteToken]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
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
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : <><LogIn className="h-4 w-4 mr-2" />Login</>}
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
