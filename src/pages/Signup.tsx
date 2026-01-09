import { Card, CardContent } from "@/components/ui/card";
import SignupForm from "@/components/auth/SignupForm";
import { Link, useLocation } from "react-router-dom";

const Signup = () => {
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get("inviteToken") ?? undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800">
        <CardContent className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Create an account</h1>
            <p className="text-sm text-slate-500">Start tracking placements with PlacementPro</p>
          </div>
          <SignupForm inviteToken={inviteToken} />
          <p className="text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-primary font-semibold">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
