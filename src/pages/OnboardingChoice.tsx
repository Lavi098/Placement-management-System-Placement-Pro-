// src/pages/OnboardingChoice.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

export default function OnboardingChoice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">
      <Navigation showDashboardButton={false} />
      <div className="relative isolate mt-0 px-4">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-500/30 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-indigo-500/20 to-transparent blur-3xl" />
        <div className="relative mx-auto flex flex-col items-center gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Onboarding</p>
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl text-slate-900 dark:text-white">
              Get your campus ready in two simple steps
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 mx-auto">
              Whether you are bringing a brand new college aboard or connecting to an existing campus, we guide you through onboarding with helpful prompts and role-aware workflows.
            </p>
          </div>
          <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
            <Card className="border border-slate-200/30 bg-white/90 text-slate-900 shadow-[0_15px_65px_rgba(15,23,42,0.25)] transition hover:-translate-y-1 hover:shadow-[0_25px_85px_rgba(15,23,42,0.25)] dark:border-slate-800/50 dark:bg-slate-900/60 dark:text-white">
              <CardHeader className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 border border-indigo-200/70 dark:bg-slate-800/70 dark:border-indigo-400/40">
                  <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                </div>
                <CardTitle className="text-2xl font-semibold">Register a College</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Institution admins create the college profile, upload branding assets, and invite placement admins with a single click.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  You will set the college code, compliance documents, and control who can manage drives and approvals.
                </p>
                <Button className="w-full" onClick={() => navigate("/onboarding/add-college")}>Start institution setup</Button>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/30 bg-white/90 text-slate-900 shadow-[0_15px_65px_rgba(15,23,42,0.25)] transition hover:-translate-y-1 hover:shadow-[0_25px_85px_rgba(15,23,42,0.25)] dark:border-slate-800/50 dark:bg-slate-900/60 dark:text-white">
              <CardHeader className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 border border-emerald-200/80 dark:bg-slate-800/70 dark:border-emerald-400/40">
                  <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                </div>
                <CardTitle className="text-2xl font-semibold">Join an Existing Campus</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Students can instantly join with the college code provided by their institution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Only the student role gains access to the campus dashboard and drive registry from this screen.
                </p>
                <Button variant="secondary" className="w-full" onClick={() => navigate("/onboarding/join-college")}>Link to your college</Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex w-full max-w-5xl items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-xs uppercase text-slate-500 dark:text-slate-200">
            <span>Secure onboarding</span>
            <span className="text-slate-400 dark:text-slate-300">Built for students, placement admins &amp; institutions</span>
          </div>
        </div>
      </div>
    </div>
  );
}