import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Download,
  Users,
  Building2,
  TrendingUp,
  CheckCircle,
  SlidersHorizontal,
  Megaphone,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import StatusBadge from "@/components/StatusBadge";
import { listDrivesForPlacementAdmin, updateDriveStatus, type Drive } from "@/services/drives";
import { listStudentsForPlacementAdmin, type StudentListEntry } from "@/services/user";
import { findPlacementAdminByUserId } from "@/services/placementAdmins";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DriveStatus } from "@/models/drives";
import { toast } from "sonner";
import { listApplicationsByDrive } from "@/services/applications";
import { Application } from "@/models/applications";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [driveStatusFilter, setDriveStatusFilter] = useState<
    "all" | "active" | "upcoming" | "closed"
  >("all");

  const isPlacementAdmin = user?.role === "placement-admin";
  const {
    data: placementAdminRecord,
    isLoading: isLoadingPlacementAdmin,
    error: placementAdminError,
  } = useQuery({
    queryKey: ["placement-admin-record", user?.uid],
    queryFn: () => findPlacementAdminByUserId(user!.uid),
    enabled: Boolean(isPlacementAdmin && user?.uid),
  });

  const driveQueryKey = ["placement-admin-drives", placementAdminRecord?.id];
  const {
    data: drives = [],
    isLoading,
    error,
  } = useQuery<Drive[]>(
    {
      queryKey: driveQueryKey,
      queryFn: () =>
        listDrivesForPlacementAdmin({
          collegeId: placementAdminRecord!.collegeId,
          institutionAdminId: placementAdminRecord!.institutionAdminId,
          placementAdminId: placementAdminRecord!.id,
        }),
      enabled: Boolean(placementAdminRecord?.id),
    }
  );

  // Fetch all applications for all drives to show in applications tab
  const { data: allApplications = [] } = useQuery<Application[]>({
    queryKey: ["all-applications"],
    queryFn: async () => {
      // Get applications for all drives
      const driveIds = drives.map((d) => d.id);
      const applicationPromises = driveIds.map((driveId) => listApplicationsByDrive(driveId));
      const applicationArrays = await Promise.all(applicationPromises);
      return applicationArrays.flat();
    },
    enabled: drives.length > 0,
  });

  const {
    data: students = [],
    isLoading: isLoadingStudents,
    error: studentsError,
  } = useQuery<StudentListEntry[]>({
    queryKey: ["placement-admin-students", placementAdminRecord?.id],
    queryFn: () =>
      listStudentsForPlacementAdmin({
        placementAdminId: placementAdminRecord!.id,
        collegeId: placementAdminRecord?.collegeId,
        institutionAdminId: placementAdminRecord?.institutionAdminId,
      }),
    enabled: Boolean(placementAdminRecord?.id),
  });

  const studentLookup = useMemo(() => {
    const map = new Map<string, StudentListEntry>();
    students.forEach((s) => map.set(s.uid, s));
    return map;
  }, [students]);

  const formatStudentDate = (value?: StudentListEntry["createdAt"]) => {
    if (!value) return "—";
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate?: () => Date }).toDate === "function"
    ) {
      return (value as { toDate: () => Date })
        .toDate()
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
    }
    const parsed = new Date(value as unknown as string | number);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDriveDeadline = (value: unknown) => {
    if (!value) return "—";
    if (typeof value === "string") {
      return value;
    }
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate?: () => Date }).toDate === "function"
    ) {
      return (value as { toDate: () => Date })
        .toDate()
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
    }
    return String(value);
  };

  const resolveStudentStatus = (status?: StudentListEntry["status"]) =>
    status === "joined" ? "joined" : "pending";

  const renderStudentSection = () => {
    if (!isPlacementAdmin) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>You need to be signed in as a placement admin to view this list.</p>
        </div>
      );
    }

    if (isLoadingPlacementAdmin) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Loading placement-admin assignment...</p>
        </div>
      );
    }

    if (placementAdminError) {
      return (
        <div className="text-center py-12 text-destructive">
          <p>Unable to resolve your placement admin profile.</p>
        </div>
      );
    }

    if (!placementAdminRecord) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Your account isn’t linked to a placement-admin record yet.</p>
        </div>
      );
    }

    if (isLoadingStudents) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Loading students...</p>
        </div>
      );
    }

    if (studentsError) {
      return (
        <div className="text-center py-12 text-destructive">
          <p>Failed to load your students. Please try again in a moment.</p>
        </div>
      );
    }

    if (students.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No students are linked to your department yet.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Passing Year</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow
              key={student.uid}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/admin/students/${student.uid}`)}
            >
              <TableCell className="font-medium">
                {student.name || `Student ${student.uid.slice(0, 6)}`}
                {student.departmentCode && (
                  <p className="text-xs text-muted-foreground">
                    Department code: {student.departmentCode}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {student.email}
              </TableCell>
              <TableCell>{student.course || "—"}</TableCell>
              <TableCell>
                <div>
                  <p>{student.branch || "—"}</p>
                  {student.lockedAcademicProfile && (
                    <p className="text-xs text-slate-500">Locked</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{student.passingYear || "—"}</TableCell>
              <TableCell>
                <StatusBadge status={resolveStudentStatus(student.status)} />
              </TableCell>
              <TableCell>{formatStudentDate(student.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Handle manual status change
  const handleStatusChange = async (driveId: string, newStatus: DriveStatus) => {
    try {
      await updateDriveStatus(driveId, newStatus);
      toast.success(`Drive status updated to ${newStatus}`);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: driveQueryKey });
    } catch (error) {
      console.error("Error updating drive status:", error);
      toast.error("Failed to update drive status");
    }
  };

  // Calculate stats from actual data
  const totalPlaced = drives.reduce<number>(
    (sum, drive) =>
      sum +
      drive.roles.reduce<number>(
        (roleSum, role) => roleSum + (role.stats?.selected || 0),
        0,
      ),
    0,
  );

  const totalDrives = drives.length;
  const activeDrivesCount = drives.filter((d) => d.status === "active").length;

  const totalApplicantsAcrossRoles = drives.reduce<number>(
    (sum, drive) =>
      sum +
      drive.roles.reduce<number>(
        (roleSum, role) => roleSum + (role.stats?.totalApplicants || 0),
        0,
      ),
    0,
  );

  const placementRate =
    totalApplicantsAcrossRoles > 0
      ? `${Math.round((totalPlaced / totalApplicantsAcrossRoles) * 100)}%`
      : "0%";

  const stats = [
    {
      label: "All Drives",
      value: totalDrives.toString(),
      icon: Building2,
      color: "text-primary",
    },
    {
      label: "Active Drives",
      value: activeDrivesCount.toString(),
      icon: Megaphone,
      color: "text-accent",
    },
    {
      label: "Students Placed",
      value: totalPlaced.toString(),
      icon: CheckCircle,
      color: "text-success",
    },
    {
      label: "Placement Rate",
      value: placementRate,
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  // Transform drives for table display
  const recentDrives = drives.map((drive) => ({
    id: drive.id || "",
    company: drive.companyName || drive.company || "Unknown",
    roles: drive.roles.map((r) => r.title || "Unknown Role"),
    totalApplications: drive.totalApplications || 0, // Use drive-level totalApplications
    deadline: drive.deadline, // Use drive.deadline instead of roles[0].deadline
    status: drive.status,
  }));

  const driveStatusOrder: Record<string, number> = {
    active: 0,
    upcoming: 1,
    closed: 2,
  };

  const orderedDrives = [...recentDrives].sort(
    (a, b) =>
      (driveStatusOrder[a.status] ?? Number.MAX_SAFE_INTEGER) -
      (driveStatusOrder[b.status] ?? Number.MAX_SAFE_INTEGER),
  );

  const visibleDrives = orderedDrives.filter((drive) =>
    driveStatusFilter === "all" ? true : drive.status === driveStatusFilter,
  );

  // Format applications for display with drive and user info
  const recentApplications = allApplications
    .map((app) => {
      const driveForApp = drives.find((d) => d.id === app.driveId);
      const role = driveForApp?.roles.find((r) => r.id === app.roleId);
      const studentInfo = studentLookup.get(app.studentId);
      const studentName = studentInfo?.name || (app as any)?.name || `Student ${app.studentId.slice(0, 8)}...`;
      const studentEmail = studentInfo?.email || (app as any)?.email || "—";
      
      // Format appliedOn date
      let appliedOnDate = "N/A";
      if (app.appliedOn) {
        if (typeof app.appliedOn === "object" && "toDate" in app.appliedOn) {
          appliedOnDate = (app.appliedOn as { toDate: () => Date }).toDate().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        } else if (app.appliedOn instanceof Date) {
          appliedOnDate = app.appliedOn.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        }
      }

      return {
        id: app.id,
        studentId: app.studentId,
        student: studentName,
        email: studentEmail,
        company: driveForApp?.companyName || "Unknown",
        role: role?.title || "Unknown Role",
        status: app.status,
        appliedOn: appliedOnDate,
        driveId: app.driveId,
      };
    })
    .sort((a, b) => {
      // Sort by appliedOn date (most recent first)
      return new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime();
    })
    .slice(0, 50); // Show most recent 50 applications

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage placement drives and track student applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-12 rounded-full p-0 border-2 border-slate-200 hover:border-primary/60 hover:bg-primary/10"
              onClick={() => navigate("/admin/profile")}
              title="View profile"
            >
              <UserIcon className="h-6 w-6 text-slate-900" />
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/placed-students")}
              >
                View Placed Students
              </Button>
              <Button
                className="gap-2"
                onClick={() => navigate("/admin/announce-result")}
              >
                <Megaphone className="h-4 w-4" />
                Announce Result
              </Button>
              <Button
                className="gap-2"
                onClick={() => navigate("/admin/create-drive")}
              >
                <Plus className="h-4 w-4" />
                Create New Drive
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="drives" className="space-y-6">
          <TabsList>
            <TabsTrigger value="drives">Placement Drives</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          {/* DRIVES TAB */}
          <TabsContent value="drives">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Placement Drives</CardTitle>
                  <CardDescription>
                    Manage and track all placement drives
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isLoading && (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  )}
                  {error && (
                    <p className="text-sm text-destructive">
                      Error loading drives
                    </p>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        {driveStatusFilter === "all"
                          ? "Filter"
                          : `Filter: ${driveStatusFilter}`}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {["all", "active", "upcoming", "closed"].map(
                        (status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() =>
                              setDriveStatusFilter(
                                status as typeof driveStatusFilter,
                              )
                            }
                          >
                            {status === "all"
                              ? "Show all"
                              : `${status
                                  .charAt(0)
                                  .toUpperCase()}${status.slice(1)}`}
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Loading drives...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-destructive">
                    <p>
                      Error loading drives. Please check your Firebase
                      configuration.
                    </p>
                  </div>
                ) : visibleDrives.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No drives found. Create your first drive to get started!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Applications</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleDrives.map((drive) => (
                        <TableRow key={drive.id}>
                          <TableCell className="font-medium">
                            {drive.company || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {drive.roles.length > 1 ? (
                                <>
                                  <span className="text-sm">
                                    {drive.roles[0]}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    +{drive.roles.length - 1} more
                                  </Badge>
                                </>
                              ) : (
                                <span className="text-sm">
                                  {drive.roles[0]}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{drive.totalApplications}</TableCell>
                          <TableCell>{formatDriveDeadline(drive.deadline)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={drive.status} />
                              <Select
                                value={drive.status}
                                onValueChange={(value) => handleStatusChange(drive.id, value as DriveStatus)}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="upcoming">Upcoming</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/admin/drive/${drive.id}`)
                              }
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPLICATIONS TAB */}
          <TabsContent value="applications">
            <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Applications</CardTitle>
                  <CardDescription>
                    Track student applications across all drives
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Applied On</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No applications yet. Applications will appear here once students start applying.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">
                            {app.student}
                          </TableCell>
                          <TableCell>{app.email}</TableCell>
                          <TableCell>{app.company}</TableCell>
                          <TableCell>{app.role}</TableCell>
                          <TableCell>{app.appliedOn}</TableCell>
                          <TableCell>
                            <StatusBadge status={app.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STUDENTS TAB */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Student Management</CardTitle>
                <CardDescription>
                  View and manage registered students
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderStudentSection()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
