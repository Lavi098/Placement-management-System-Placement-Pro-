import Navigation from "@/components/Navigation";
import DriveCard from "@/components/DriveCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, CheckCircle, Clock, User as UserIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getStudentVisibleDrives } from "@/services/drives";
import { Drive } from "@/models/drives";
import { useNavigate } from "react-router-dom";
import { listApplicationsByStudent } from "@/services/applications";
import { Application } from "@/models/applications";
import { useAuth } from "@/contexts/AuthContext";
import { StudentUser } from "@/models/users";

// Helper to parse date strings
function parseDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  
  if (typeof dateValue === "string") {
    // Try parsing common formats
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Handle Firestore Timestamp
  if (typeof dateValue === "object" && "toDate" in dateValue) {
    return (dateValue as { toDate: () => Date }).toDate();
  }
  
  return null;
}

// Helper to format date for display
function formatDate(dateValue: unknown): string {
  const date = parseDate(dateValue);
  if (!date) return "Not specified";
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Helper to check if deadline is close
function isDeadlineClose(deadline: unknown): boolean {
  const date = parseDate(deadline);
  if (!date) return false;
  
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return date <= twoDaysFromNow;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const studentId = user?.uid;
  const collegeId = user?.collegeId;
  const placementAdminId = (user as StudentUser | null | undefined)?.placementAdminId;
  const institutionAdminId = user?.institutionAdminId;
  
  const {
    data: allDrives = [],
    isLoading: drivesLoading,
    error: drivesError,
  } = useQuery<Drive[]>({
    queryKey: ["student-drives", collegeId, placementAdminId],
    queryFn: () =>
      getStudentVisibleDrives({
        collegeId: collegeId!,
        placementAdminId: placementAdminId!,
        institutionAdminId: institutionAdminId ?? undefined,
        // No status filter: fetch all drives from this placement admin
      }),
    enabled: !!collegeId && !!placementAdminId && !authLoading,
  });

  const {
    data: applications = [],
    isLoading: applicationsLoading,
  } = useQuery<Application[]>({
    queryKey: ["student-applications", studentId],
    queryFn: () => listApplicationsByStudent(studentId!),
    enabled: !!studentId && !authLoading,
  });

  // Filter drives - show only upcoming and active (visible to students)
  const visibleDrives = allDrives.filter(
    (drive) => drive.status === "upcoming" || drive.status === "active"
  );
  
  const upcomingDrives = visibleDrives.filter((drive) => drive.status === "upcoming");
  const activeDrives = visibleDrives.filter((drive) => drive.status === "active");
  
  // Get drives that the student has applied to
  const appliedDriveIds = new Set(applications.map((app) => app.driveId));
  const appliedDrives = allDrives.filter((drive) => appliedDriveIds.has(drive.id));

  // Calculate stats from actual data
  const totalApplications = applications.length;
  const pendingApplications = applications.filter(
    (app) => app.status === "applied" || app.status === "shortlisted"
  ).length;
  const upcomingDeadlines = visibleDrives.filter((drive) => {
    const deadline = parseDate(drive.deadline);
    if (!deadline) return false;
    return deadline > new Date();
  }).length;

  const stats = [
    {
      label: "Applications Submitted",
      value: totalApplications.toString(),
      icon: CheckCircle,
      color: "text-success",
    },
    {
      label: "Pending Applications",
      value: pendingApplications.toString(),
      icon: Clock,
      color: "text-accent",
    },
    {
      label: "Upcoming Deadlines",
      value: upcomingDeadlines.toString(),
      icon: Calendar,
      color: "text-primary",
    },
    {
      label: "Active Drives",
      value: activeDrives.length.toString(),
      icon: Bell,
      color: "text-muted-foreground",
    },
  ];

  // Helper to map drive to DriveCard props
  const mapDriveToCardProps = (drive: Drive) => {
    const companyName = drive.company ?? drive.companyName ?? "Unknown Company";
    const firstRole = drive.roles?.[0];
    const roleTitle = firstRole?.title || "Multiple Roles";
    const deadline = formatDate(drive.deadline);
    const location = firstRole?.location || drive.jobLocation || "Not specified";
    const ctc = firstRole?.ctc || "Not specified";
    const description = firstRole?.description || drive.jd || "No description available";
    
    // Determine status for card
    const cardStatus: "upcoming" | "active" | "closed" = 
      drive.status === "active" ? "active" : drive.status === "upcoming" ? "upcoming" : "closed";

    return {
      company: companyName,
      role: roleTitle,
      deadline,
      status: cardStatus,
      package: ctc,
      location,
      description,
      applyLink: `/apply/${drive.id}`,
      driveId: drive.id,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />

      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-slate-900 via-primary to-accent bg-clip-text text-transparent dark:from-slate-100">
              Student Dashboard
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
              Track your applications and never miss a placement drive
            </p>
          </div>
          {/* Profile Icon Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/student/profile")}
            className="h-12 w-12 rounded-full p-0 border-2 border-slate-300 dark:border-slate-600 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 bg-white dark:bg-slate-800"
            title="View Profile"
          >
            <UserIcon className="h-6 w-6 text-slate-900 dark:text-slate-100" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="group border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`h-14 w-14 rounded-xl bg-gradient-to-br ${
                      stat.color.includes("success")
                        ? "from-success/20 to-success/10"
                        : stat.color.includes("accent")
                          ? "from-accent/20 to-accent/10"
                          : stat.color.includes("primary")
                            ? "from-primary/20 to-primary/10"
                            : "from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800"
                    } flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <stat.icon className={`h-7 w-7 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Drives Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                <TabsTrigger
                  value="upcoming"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold transition-all duration-300"
                >
                  Upcoming Drives ({upcomingDrives.length})
                </TabsTrigger>
                <TabsTrigger
                  value="applied"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold transition-all duration-300"
                >
                  My Applications ({appliedDrives.length})
                </TabsTrigger>
                <TabsTrigger
                  value="deadlines"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold transition-all duration-300"
                >
                  Upcoming Deadlines
                </TabsTrigger>
              </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {drivesLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading drives...</p>
              </div>
            ) : drivesError ? (
              <div className="text-center py-12 text-destructive">
                <p>Error loading drives. Please try again.</p>
              </div>
            ) : upcomingDrives.length === 0 ? (
              <Card className="border-2 border-slate-200 dark:border-slate-800">
                <CardContent className="p-12 text-center">
                  <p className="text-lg text-muted-foreground">
                    No upcoming drives at the moment. Check back later!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {upcomingDrives.map((drive) => {
                  const cardProps = mapDriveToCardProps(drive);
                  return (
                    <div key={drive.id}>
                      <DriveCard {...cardProps} />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applied" className="space-y-4">
            {applicationsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading applications...</p>
              </div>
            ) : appliedDrives.length === 0 ? (
              <Card className="border-2 border-slate-200 dark:border-slate-800">
                <CardContent className="p-12 text-center">
                  <p className="text-lg text-muted-foreground">
                    You haven't applied to any drives yet. Browse upcoming drives to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {appliedDrives.map((drive) => {
                  const application = applications.find((app) => app.driveId === drive.id);
                  const cardProps = mapDriveToCardProps(drive);
                  return (
                    <div key={drive.id} className="relative">
                      <DriveCard {...cardProps} />
                      {application && (
                        <div className="absolute top-2 right-2">
                          <Badge variant={application.status === "selected" ? "default" : "secondary"}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deadlines">
            <Card className="border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription className="text-base">
                  Stay on top of your application deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {drivesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading deadlines...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...upcomingDrives, ...activeDrives]
                      .filter((drive) => {
                        const deadline = parseDate(drive.deadline);
                        return deadline && deadline > new Date();
                      })
                      .sort((a, b) => {
                        const dateA = parseDate(a.deadline) || new Date(0);
                        const dateB = parseDate(b.deadline) || new Date(0);
                        return dateA.getTime() - dateB.getTime();
                      })
                      .slice(0, 10)
                      .map((drive) => {
                        const deadline = parseDate(drive.deadline);
                        const isClose = deadline ? isDeadlineClose(drive.deadline) : false;
                        const companyName = drive.company ?? drive.companyName ?? "Unknown";
                        const firstRole = drive.roles?.[0];
                        const roleTitle = firstRole?.title || "Multiple Roles";

                        return (
                          <div
                            key={drive.id}
                            className={`flex items-center justify-between p-5 rounded-xl border-2 ${
                              isClose
                                ? "border-accent/30 bg-gradient-to-r from-accent/10 to-accent/5 dark:from-accent/20 dark:to-accent/10"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
                            } hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}
                          >
                            <div>
                              <p className="font-bold text-lg text-slate-900 dark:text-slate-100">
                                {companyName}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {roleTitle}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-base font-bold ${
                                  isClose
                                    ? "text-accent"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {formatDate(drive.deadline)}
                              </p>
                              {isClose && (
                                <p className="text-xs font-semibold text-accent mt-1 flex items-center gap-1">
                                  <span>⚡</span> Urgent
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {[...upcomingDrives, ...activeDrives].filter((drive) => {
                      const deadline = parseDate(drive.deadline);
                      return deadline && deadline > new Date();
                    }).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No upcoming deadlines</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
