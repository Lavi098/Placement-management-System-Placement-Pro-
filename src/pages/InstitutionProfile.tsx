import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, ShieldCheck, Users, Calendar, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCollegeById } from "@/services/colleges";
import { College } from "@/models/colleges";

const statistics = [
  { label: "Colleges supported", value: "42", helper: "Across 12 states", icon: Building2 },
  { label: "Verified admins", value: "18", helper: "0.9 avg response time", icon: Users },
  { label: "Compliance rating", value: "98%", helper: "Docs refreshed 2 days ago", icon: ShieldCheck },
];

const keyContacts = [
  { name: "Suresh Ladda", title: "Institution Head", phone: "+91 91234 56789", email: "suresh@northwind.edu" },
  { name: "Priya Menon", title: "Placement Lead", phone: "+91 90000 12345", email: "priya@northwind.edu" },
];

const InstitutionProfile = () => {
  const { user } = useAuth();
  const [college, setCollege] = useState<College | null>(null);

  useEffect(() => {
    if (!user?.collegeId) {
      return;
    }
    let isMounted = true;
    getCollegeById(user.collegeId)
      .then((doc) => {
        if (isMounted) {
          setCollege(doc);
        }
      })
      .catch((error) => {
        console.error("Failed to load college data", error);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.collegeId]);

  const activeCollege = user?.collegeId ? college : null;
  const collegeName = activeCollege?.name ?? "Northwind Institute of Technology";
  const collegeLocation = activeCollege ? `${activeCollege.city} • ${activeCollege.state}` : "Hyderabad • Telangana";
  const collegeCode = activeCollege?.code ?? "Generating...";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />
      <div className="container mx-auto px-4 py-10 space-y-10">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/institution">
              <Button variant="ghost" className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Institution profile</p>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">{collegeName}</h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">{collegeLocation} • AICTE & UGC accredited • Tier-1 placement ecosystem</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                {collegeCode && (
                  <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                    College code: {collegeCode}
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400">{collegeLocation}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="bg-primary text-white hover:bg-primary/90">Edit profile</Button>
            <Button variant="outline" className="border-slate-300">Share profile</Button>
          </div>
        </div>
            <div className="rounded-3xl border border-slate-200 bg-white/60 shadow-2xl shadow-primary/5 p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
          <p className="text-base font-semibold">Campus brief</p>
          <p className="mt-3 leading-relaxed">
                {collegeName} is a research-driven college with deep industry ties. Each enrollment cycle is curated with guidance from placement, alumni, and academic councils, which helps us keep drive timelines crisp while keeping 48+ companies aligned.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {statistics.map((stat) => (
          <Card
            key={stat.label}
            className="group border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/70 dark:from-slate-900/60 dark:to-slate-800/30 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {stat.helper}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-2xl">Institution snapshot</CardTitle>
            <CardDescription>Keep governance, compliance, and academics in sync with shared updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-slate-600 dark:text-slate-300">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Established</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">2008</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Student body</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">6,200+</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Placement cell</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">18 members</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Next accreditation</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">Feb 2026</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Campus facilities</p>
              <ul className="list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">
                <li>Dedicated placement office with collaborative rooms.</li>
                <li>Industry-grade labs across AI/ML, Power Systems, and Robotics.</li>
                <li>24/7 helpdesk tied to compliance dashboard.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-slate-600">AICTE</Badge>
              <Badge variant="outline" className="text-slate-600">UGC</Badge>
              <Badge variant="outline" className="text-slate-600">NBA Tier-1</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-xl">Upcoming milestones</CardTitle>
            <CardDescription>Key dates that matter for the placement calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-slate-600 dark:text-slate-300">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">2025 winter review</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Dec 15</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Placement council & alumni panel meets.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Next audit</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Jan 12</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">External compliance audit (COC & data privacy).</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Placement season</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Jan 27</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">First wave of employer visits begins.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-2xl">Key contacts</CardTitle>
            <CardDescription>Available for quick reach-outs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyContacts.map((contact) => (
              <div key={contact.email} className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{contact.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{contact.title}</p>
                </div>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300 text-right">
                  <p>{contact.phone}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{contact.email}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-2xl">Compliance reports</CardTitle>
            <CardDescription>Latest uploads, verified seals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">2025 compliance dossier</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Verified • uploaded 2 days ago</p>
                </div>
                <Button size="sm" variant="ghost" className="text-primary">Download</Button>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Campus safety audit</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Drafting in progress</p>
                </div>
                <Badge className="border-slate-300 text-slate-600">In review</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <p>Next refresh scheduled for Jan 8 • notifications will be sent to placement admins.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  </div>
  );
};

export default InstitutionProfile;
