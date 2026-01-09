import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link, useLocation } from "react-router-dom";

const Login = () => {
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get("inviteToken") ?? undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-md border border-slate-200 dark:border-slate-800">
        <CardContent className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h1>
            <p className="text-sm text-slate-500">Log in to continue to PlacementPro</p>
          </div>
          <LoginForm inviteToken={inviteToken} />
          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account? <Link to="/signup" className="text-primary font-semibold">Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;