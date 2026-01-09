import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PlacementAdminManager from "@/components/InstitutionPlacementAdminManager";

const metrics = [
  { label: "Active drives", value: "04", helper: "2 starting this week", icon: Building2, color: "from-slate-200 to-slate-100 text-primary" },
  { label: "Placement admins", value: "12", helper: "3 pending invites", icon: Users, color: "from-primary/20 to-primary/5 text-primary" },
  { label: "Compliance", value: "Green", helper: "All docs uploaded", icon: ShieldCheck, color: "from-emerald-200 to-emerald-100 text-emerald-500" },
];

const InstitutionAdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />

      <div className="container mx-auto px-4 py-10 space-y-10">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">Institution Admin Dashboard</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">Lightweight control center to manage your college operations.</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Button
                variant="outline"
                onClick={() => navigate("/institution/profile")}
                className="h-16 w-16 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-primary/60 hover:bg-primary/10 transition-all duration-300 bg-white dark:bg-slate-800"
                title="Institution profile"
              >
                <Building2 className="h-7 w-7 text-slate-900 dark:text-slate-100" />
              </Button>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                View profile
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {metrics.map((metric) => (
            <Card
              key={metric.label}
              className="group border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/60 dark:from-slate-900/60 dark:to-slate-800/30 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      {metric.label}
                    </p>
                    <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                      {metric.value}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {metric.helper}
                    </p>
                  </div>
                  <div
                    className={`h-16 w-16 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105`}
                  >
                    <metric.icon className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <PlacementAdminManager />
      </div>
    </div>
  );
};

export default InstitutionAdminDashboard;
