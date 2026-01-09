import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { CheckCircle, Users, Calendar, TrendingUp, Bell, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const { user } = useAuth(); // Using auth to potentially hide buttons if logged in

  // Don't show login/signup buttons on the hero section if user is logged in
  const heroButtons = !user ? (
    <div className="flex items-center justify-center gap-4 pt-6">
      <Button size="lg" className="font-semibold text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all duration-300" onClick={() => setSignupDialogOpen(true)}>
        Get Started
      </Button>
      <Button size="lg" variant="outline" className="font-semibold text-lg px-8 py-6 border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 backdrop-blur-sm transition-all duration-300" onClick={() => setLoginDialogOpen(true)}>
        Login
      </Button>
    </div>
  ) : null;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Navigation onLoginClick={() => setLoginDialogOpen(true)} onSignupClick={() => setSignupDialogOpen(true)} />
        
        {/* Hero Section */}
<section className="relative container mx-auto px-4 pt-24 pb-20 text-center overflow-hidden">
  {/* Decorative SVG background */}
  <svg
    className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 opacity-30 dark:opacity-40"
    width="1200"
    height="400"
    viewBox="0 0 1200 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <ellipse cx="600" cy="200" rx="600" ry="200" fill="url(#hero-gradient)" />
    <defs>
      <linearGradient id="hero-gradient" x1="0" y1="0" x2="1200" y2="400" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#A21CAF" />
      </linearGradient>
    </defs>
  </svg>
  {/* Gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-white/0 to-white dark:from-primary/20 dark:to-slate-950 pointer-events-none -z-10" />

  <div className="max-w-4xl mx-auto space-y-8 relative z-10">
    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 text-primary text-base font-semibold shadow-md shadow-primary/10">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </span>
      Modern Placement Management
    </div>

    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-slate-900 via-primary to-accent bg-clip-text text-transparent dark:from-slate-100 dark:via-primary dark:to-accent drop-shadow-lg">
      Say Goodbye to <span className="block text-primary mt-2">WhatsApp Chaos</span>
    </h1>

    <p className="text-2xl md:text-3xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow">
      A complete digital platform to organize campus placements, track applications, manage deadlines, and help students land their dream jobs — all in one place.
    </p>

    {/* Login and Signup buttons that open dialogs */}
   
  </div>
</section>

        {/* Problem Statement */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <Card className="border-2 border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-red-50/50 dark:from-destructive/20 dark:via-destructive/10 dark:to-slate-900/50 backdrop-blur-sm shadow-2xl shadow-destructive/10 hover:shadow-destructive/20 transition-all duration-300">
              <CardContent className="p-10 md:p-12">
                <h3 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-destructive to-red-600 bg-clip-text text-transparent">
                  The Current Problem
                </h3>
                <div className="grid md:grid-cols-2 gap-6 text-base md:text-lg text-slate-700 dark:text-slate-300">
                  <div className="space-y-3">
                    <p className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <span>Students miss critical deadlines buried in WhatsApp</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <span>Forms get lost in message floods</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <span>No way to track application status</span>
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <span>Admins manually manage hundreds of applications</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <span>No centralized data or analytics</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <span>Hours wasted on coordination</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

                {/* Features */}
        <section className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-slate-900 via-primary to-accent bg-clip-text text-transparent dark:from-slate-100">
              Everything You Need, Nothing You Don't
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-medium">
              Built specifically for college placement cells — lightweight, powerful, and easy to use
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <Card className="group border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 dark:from-primary/10 dark:via-slate-900 dark:to-primary/5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 space-y-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Unified Dashboard</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  All upcoming drives, deadlines, and application links in one clean interface
                </p>
              </CardContent>
            </Card>

            <Card className="group border-2 border-accent/20 bg-gradient-to-br from-accent/5 via-white to-accent/5 dark:from-accent/10 dark:via-slate-900 dark:to-accent/5 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/20 transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 space-y-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg shadow-accent/30 group-hover:scale-110 transition-transform duration-300">
                  <Bell className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Smart Reminders</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Never miss a deadline with automated notifications and deadline tracking
                </p>
              </CardContent>
            </Card>

            <Card className="group border-2 border-success/20 bg-gradient-to-br from-success/5 via-white to-success/5 dark:from-success/10 dark:via-slate-900 dark:to-success/5 hover:border-success/40 hover:shadow-2xl hover:shadow-success/20 transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 space-y-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg shadow-success/30 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Application Tracking</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Track every application status from submission to placement
                </p>
              </CardContent>
            </Card>

            <Card className="group border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 dark:from-primary/10 dark:via-slate-900 dark:to-primary/5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 space-y-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Admin Control</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Create drives, manage applications, and export data in seconds
                </p>
              </CardContent>
            </Card>

            <Card className="group border-2 border-accent/20 bg-gradient-to-br from-accent/5 via-white to-accent/5 dark:from-accent/10 dark:via-slate-900 dark:to-accent/5 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/20 transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 space-y-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg shadow-accent/30 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Real-time Analytics</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Track participation rates, placement stats, and student engagement
                </p>
              </CardContent>
            </Card>

            <Card className="group border-2 border-success/20 bg-gradient-to-br from-success/5 via-white to-success/5 dark:from-success/10 dark:via-slate-900 dark:to-success/5 hover:border-success/40 hover:shadow-2xl hover:shadow-success/20 transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 space-y-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg shadow-success/30 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Scalable & Fast</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Built for universities of any size — from 100 to 10,000+ students
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="relative container mx-auto px-4 py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 dark:from-primary/20 dark:via-accent/20 dark:to-primary/20"></div>
          <div className="relative max-w-5xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-slate-900 via-primary to-accent bg-clip-text text-transparent dark:from-slate-100">
              Ready to Transform Your Placements?
            </h2>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium max-w-3xl mx-auto">
              Join modern universities already using PlacementPro to streamline their placement process
            </p>
            <div className="flex items-center justify-center gap-4 pt-6">
              <Button size="lg" className="font-bold text-lg px-10 py-7 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-2xl shadow-primary/40 hover:shadow-primary/50 transition-all duration-300 hover:scale-105">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="font-bold text-lg px-10 py-7 border-2 border-primary/40 hover:bg-primary/10 hover:border-primary/60 backdrop-blur-sm transition-all duration-300 hover:scale-105">
                Schedule Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-2 border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-base font-semibold text-slate-600 dark:text-slate-400">
              © 2024 PlacementPro. Built for students, by students.
            </p>
          </div>
        </footer>
      </div>

      {/* Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Welcome Back!</DialogTitle>
            <DialogDescription>
              Log in to your account to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <LoginForm onSuccess={() => setLoginDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Signup Dialog */}
      <Dialog open={signupDialogOpen} onOpenChange={setSignupDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create an Account</DialogTitle>
            <DialogDescription>
              Join the platform to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SignupForm onSuccess={() => setSignupDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;
