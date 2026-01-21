import Navigation from "@/components/Navigation";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, CheckCircle, Clock, User as UserIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getStudentVisibleDrives } from "@/services/drives";
import { Drive, DriveType } from "@/models/drives";
import { useNavigate } from "react-router-dom";
import { listApplicationsByStudent } from "@/services/applications";
import { Application } from "@/models/applications";
import { useAuth } from "@/contexts/AuthContext";
import { StudentUser } from "@/models/users";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [driveTypeFilter, setDriveTypeFilter] = useState<"all" | DriveType>("all");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<
    "all" | Application["status"]
  >("all");

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
  const shortlistedApplications = applications.filter((app) => app.status === "shortlisted").length;
  const selectionsCount = applications.filter((app) => app.status === "selected").length;

  const stats = [
    {
      label: "Applications Submitted",
      value: totalApplications.toString(),
      icon: CheckCircle,
      color: "text-success",
    },
    {
      label: "Shortlisted",
      value: shortlistedApplications.toString(),
      icon: Clock,
      color: "text-accent",
    },
    {
      label: "Selections",
      value: selectionsCount.toString(),
      icon: CheckCircle,
      color: "text-primary",
    },
    {
      label: "Active Drives",
      value: activeDrives.length.toString(),
      icon: Bell,
      color: "text-muted-foreground",
    },
  ];

  const driveMatches = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return (drive: Drive) => {
      if (driveTypeFilter !== "all") {
        const normalizedType = drive.driveType === "pool" ? "pool-campus" : drive.driveType;
        if (normalizedType !== driveTypeFilter) return false;
      }
      if (!search) return true;
      const company = (drive.company ?? drive.companyName ?? "").toLowerCase();
      const location = (drive.jobLocation ?? drive.roles?.[0]?.location ?? "").toLowerCase();
      const roles = (drive.roles ?? []).map((r) => (r.title ?? "").toLowerCase()).join(" ");
      return company.includes(search) || location.includes(search) || roles.includes(search);
    };
  }, [driveTypeFilter, searchTerm]);

  const filteredUpcoming = upcomingDrives.filter(driveMatches);

  const filteredApplied = appliedDrives.filter((drive) => {
    if (!driveMatches(drive)) return false;
    if (applicationStatusFilter === "all") return true;
    const app = applications.find((a) => a.driveId === drive.id);
    return app?.status === applicationStatusFilter;
  });

  const filteredDeadlines = (() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return [...upcomingDrives, ...activeDrives]
      .filter(driveMatches)
      .filter((drive) => {
        const deadline = parseDate(drive.deadline);
        return deadline && deadline > now && deadline <= threeDaysFromNow;
      })
      .sort((a, b) => {
        const dateA = parseDate(a.deadline) || new Date(0);
        const dateB = parseDate(b.deadline) || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
  })();

  const renderDriveTable = (drivesToRender: Drive[], opts?: { showApplicationStatus?: boolean }) => {
    const showAppStatus = opts?.showApplicationStatus;

    if (!drivesToRender.length) {
      return (
        <Card className="border-2 border-slate-200 dark:border-slate-800">
          <CardContent className="p-12 text-center text-muted-foreground">
            No drives to show right now.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Role(s)</TableHead>
              <TableHead>CTC / Stipend</TableHead>
              <TableHead>Location</TableHead>
              {!showAppStatus && <TableHead>Deadline</TableHead>}
              <TableHead>Status</TableHead>
              {showAppStatus && <TableHead>Application Status</TableHead>}
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivesToRender.map((drive) => {
              const companyName = drive.company ?? drive.companyName ?? "Unknown Company";
              const firstRole = drive.roles?.[0];
              const roleTitle = firstRole?.title ||
                (drive.roles?.length ? `${drive.roles.length} roles` : "Role not specified");
              const ctc = firstRole?.ctc || "—";
              const location = firstRole?.location || drive.jobLocation || "—";
              const statusLabel = drive.status ?? "upcoming";
              const application = applications.find((app) => app.driveId === drive.id);

              return (
                <TableRow key={drive.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <TableCell className="font-semibold">
                    <div>{companyName}</div>
                    {drive.driveType && (
                      <p className="text-xs text-muted-foreground capitalize">{drive.driveType.replace("-", " ")}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{roleTitle}</TableCell>
                  <TableCell className="text-sm">{ctc}</TableCell>
                  <TableCell className="text-sm">{location}</TableCell>
                  {!showAppStatus && (
                    <TableCell className="text-sm">{formatDate(drive.deadline)}</TableCell>
                  )}
                  <TableCell>
                    <StatusBadge status={statusLabel as Drive["status"]} />
                  </TableCell>
                  {showAppStatus && (
                    <TableCell>
                      {application ? (
                        <Badge variant={application.status === "selected" ? "default" : "secondary"}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not applied</Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => navigate(`/drive/${drive.id}`)}>
                      View details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
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

        {/* Filters + Drives Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search company, role, or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:max-w-md"
            />
            <div className="flex flex-wrap gap-3">
              <Select
                value={driveTypeFilter}
                onValueChange={(value) => setDriveTypeFilter(value as "all" | DriveType)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Drive type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All drive types</SelectItem>
                  <SelectItem value="on-campus">On-campus</SelectItem>
                  <SelectItem value="off-campus">Off-campus</SelectItem>
                  <SelectItem value="pool-campus">Pool campus</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="ppo">PPO</SelectItem>
                </SelectContent>
              </Select>

              {activeTab === "applied" && (
                <Select
                  value={applicationStatusFilter}
                  onValueChange={(value) =>
                    setApplicationStatusFilter(value as "all" | Application["status"])
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Application status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700">
            <TabsTrigger
              value="upcoming"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold transition-all duration-300"
            >
              Upcoming Drives ({filteredUpcoming.length})
            </TabsTrigger>
            <TabsTrigger
              value="applied"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold transition-all duration-300"
            >
              My Applications ({filteredApplied.length})
            </TabsTrigger>
            <TabsTrigger
              value="deadlines"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold transition-all duration-300"
            >
              Upcoming Deadlines ({filteredDeadlines.length})
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
            ) : filteredUpcoming.length === 0 ? (
              renderDriveTable([])
            ) : (
              renderDriveTable(filteredUpcoming)
            )}
          </TabsContent>

          <TabsContent value="applied" className="space-y-4">
            {applicationsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading applications...</p>
              </div>
            ) : filteredApplied.length === 0 ? (
              renderDriveTable([])
            ) : (
              renderDriveTable(filteredApplied, { showApplicationStatus: true })
            )}
          </TabsContent>

          <TabsContent value="deadlines">
            {drivesLoading ? (
              <Card className="border-2 border-slate-200 dark:border-slate-800">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Loading deadlines...
                </CardContent>
              </Card>
            ) : (
              renderDriveTable(filteredDeadlines)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
