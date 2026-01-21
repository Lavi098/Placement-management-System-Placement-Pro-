import { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import { getDriveById, updateDriveStatus } from "@/services/drives";
import { Drive, DriveStatus } from "@/models/drives";
import { Application } from "@/models/applications";
import { hasRounds as checkHasRounds } from "@/services/drivestatusscheduler";
import { toast } from "sonner";
import {
  listApplicationsByDrive,
  listApplicationsByStudent,
  updateApplicationRoundStatus,
} from "@/services/applications";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Edit,
  Copy,
  Download,
  Search,
  Upload,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Send,
  Bell,
} from "lucide-react";
import { getDashboardRouteForRole } from "@/models/users";
import { listStudentsForPlacementAdmin, type StudentListEntry } from "@/services/user";

const DriveDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const adminRoleLabel =
    currentUser?.role === "institution-admin"
      ? "Institution Admin"
      : "Placement Admin";
  const adminDashboardRoute = getDashboardRouteForRole(currentUser?.role);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [applicantFilters, setApplicantFilters] = useState({
    branch: "all",
    year: "all",
    status: "all",
    search: "",
  });
  const [exportColumns, setExportColumns] = useState<string[]>([
    "name",
    "rollNo",
    "email",
    "phoneNumber",
    "branch",
    "year",
    "status",
    "appliedOn",
    "resumeFileUrl",
    "portfolioUrl",
    "githubUrl",
    "linkedInUrl",
  ]);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [resultUploadDialogOpen, setResultUploadDialogOpen] = useState(false);
  const [pastedResults, setPastedResults] = useState("");
  const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const fromStudentState = location.state?.fromStudent === true;
  const isStudentView = currentUser?.role === "student" || fromStudentState;
  const isAdminView = !isStudentView;

  // Fetch drive data FIRST
  const { data: drive, isLoading, error } = useQuery<Drive | null>({
    queryKey: ["drive", id],
    queryFn: () => getDriveById(id!),
    enabled: !!id,
  });

  // Fetch applications for the current student
  const { data: studentApplications = [] } = useQuery({
    queryKey: ["student-applications", currentUser?.uid],
    queryFn: () => listApplicationsByStudent(currentUser!.uid),
    enabled: !!currentUser && currentUser.role === 'student',
  });
  
  // Fetch applications for this drive to show accurate stats
  const { data: driveApplications = [] } = useQuery({
    queryKey: ["drive-applications", id],
    queryFn: () => listApplicationsByDrive(id!),
    enabled: !!id,
  });

  const { data: students = [] } = useQuery<StudentListEntry[]>({
    queryKey: ["drive-students", drive?.placementAdminId],
    queryFn: () =>
      listStudentsForPlacementAdmin({
        placementAdminId: drive!.placementAdminId,
        collegeId: drive?.collegeId,
        institutionAdminId: drive?.institutionAdminId,
      }),
    enabled: isAdminView && Boolean(drive?.placementAdminId),
  });

  const studentLookup = useMemo(() => {
    const map = new Map<string, StudentListEntry>();
    students.forEach((s) => map.set(s.uid, s));
    return map;
  }, [students]);

  // NOW conditional returns
  if (isLoading) return <div>Loading...</div>;
  if (error || !drive) return <div>Drive not found</div>;

  const canEditDrive =
    currentUser?.role === "institution-admin" ||
    (currentUser?.role === "placement-admin" && (
      currentUser.uid === drive.createdBy ||
      currentUser.uid === drive.placementAdminId ||
      (currentUser as { placementAdminId?: string })?.placementAdminId === drive.placementAdminId
    ));
  const isReadOnlyPlacementAdmin = currentUser?.role === "placement-admin" && !canEditDrive;
  // Determine which role is active (user choice or first role by default)
  const activeRoleId = selectedRoleId || drive.roles[0]?.id || "";
  const selectedRole = drive.roles.find((r) => r.id === activeRoleId) || drive.roles[0];
  const hasAppliedToSelectedRole = studentApplications.some(
    (app) => app.driveId === id && app.roleId === activeRoleId
  );
  
  // Filter applications based on filters
  const filteredApplicants = driveApplications.filter((app) => {
    const student = studentLookup.get(app.studentId);
    const branchValue = app.branch || student?.branch;
    const yearValue = app.year || (student?.passingYear ? String(student.passingYear) : undefined);
    if (activeRoleId && app.roleId !== activeRoleId) return false;
    if (applicantFilters.status !== "all" && app.status !== applicantFilters.status) return false;

    if (applicantFilters.branch !== "all" && branchValue && branchValue !== applicantFilters.branch) {
      return false;
    }
    if (applicantFilters.year !== "all" && yearValue && yearValue !== applicantFilters.year) {
      return false;
    }

    if (applicantFilters.search) {
      const term = applicantFilters.search.toLowerCase();
      const haystack = [
        app.name,
        app.rollNo,
        app.email,
        app.studentId,
        student?.name,
        student?.rollNumber,
        student?.email,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      const matches = haystack.some((v) => v.includes(term));
      if (!matches) return false;
    }

    return true;
  });

  const viewingStudent = viewingApplication ? studentLookup.get(viewingApplication.studentId) : undefined;

  const toggleApplicantSelection = (id: string) => {
    if (!canEditDrive) return;
    setSelectedApplicants((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleAllApplicants = () => {
    if (!canEditDrive) return;
    if (selectedApplicants.length === filteredApplicants.length) {
      setSelectedApplicants([]);
    } else {
      setSelectedApplicants(filteredApplicants.map((a) => a.id));
    }
  };

  // Check if drive has rounds defined
  const driveHasRounds = drive ? checkHasRounds(drive) : false;

  const formatDateValue = (value: unknown): string => {
    if (!value) return "Not specified";
    if (value instanceof Date) return value.toDateString();
    if (typeof value === "string" || typeof value === "number") return new Date(value).toDateString();
    if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate().toDateString();
    }
    return String(value);
  };

  const formattedDeadline = formatDateValue(drive.deadline);

  const exportableColumns = [
    { key: "name", label: "Name" },
    { key: "rollNo", label: "Roll No" },
    { key: "email", label: "Email" },
    { key: "phoneNumber", label: "Phone" },
    { key: "branch", label: "Branch" },
    { key: "year", label: "Year" },
    { key: "status", label: "Status" },
    { key: "appliedOn", label: "Applied On" },
    { key: "resumeFileUrl", label: "Resume" },
    { key: "portfolioUrl", label: "Portfolio" },
    { key: "githubUrl", label: "GitHub" },
    { key: "linkedInUrl", label: "LinkedIn" },
  ];

  const handleExportCsv = () => {
    if (!filteredApplicants.length) {
      toast.error("No applicants to export for this role.");
      return;
    }
    if (!exportColumns.length) {
      toast.error("Select at least one column to export.");
      return;
    }

    const escapeCsv = (value: unknown) => {
      const text = value === undefined || value === null ? "" : String(value);
      if (/[",\n]/.test(text)) {
        return '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    };

    const getValue = (col: string, app: Application) => {
      switch (col) {
        case "name":
          return (
            app.name?.trim() ||
            (app.email ? app.email.split("@")[0] : "") ||
            app.rollNo ||
            ""
          );
        case "rollNo":
          return app.rollNo || "";
        case "email":
          return app.email || "";
        case "phoneNumber":
          return app.phoneNumber || "";
        case "branch":
          return app.branch || "";
        case "year":
          return app.year || "";
        case "status":
          return app.status;
        case "appliedOn":
          return formatDateValue(app.appliedOn);
        case "resumeFileUrl":
          return app.resumeFileUrl || "";
        case "portfolioUrl":
          return app.portfolioUrl || "";
        case "githubUrl":
          return app.githubUrl || "";
        case "linkedInUrl":
          return app.linkedInUrl || "";
        default:
          return "";
      }
    };

    const headers = exportColumns.map((col) => {
      const match = exportableColumns.find((c) => c.key === col);
      return match?.label || col;
    });

    const rows = filteredApplicants.map((app) =>
      exportColumns.map((col) => escapeCsv(getValue(col, app))).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(drive.company || drive.companyName || "drive").replace(/\s+/g, "-")}-applicants.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Exported applicants to CSV.");
  };

  // Handle manual status change (only for drives without rounds)
  const handleStatusChange = async (newStatus: DriveStatus) => {
    if (!drive || !id || !canEditDrive) return;

    try {
      await updateDriveStatus(id, newStatus);
      toast.success(`Drive status updated to ${newStatus}`);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["drive", id] });
      queryClient.invalidateQueries({ queryKey: ["drives"] });
    } catch (error) {
      console.error("Error updating drive status:", error);
      toast.error("Failed to update drive status");
    }
  };

  const handleResultPaste = () => {
    if (!canEditDrive) return;
    // Parse pasted results (simple implementation)
    const lines = pastedResults.split("\n").filter((line) => line.trim());
    console.log("Parsed results:", lines);
    // In real app, match with applicants and update status
    setResultUploadDialogOpen(false);
    setPastedResults("");
  };

  const formatApplicationStatus = (app: Application) => {
    if (app.status === "shortlisted" && app.currentRoundIndex !== undefined && app.currentRoundIndex !== null) {
      return `Shortlisted (Round ${app.currentRoundIndex + 1})`;
    }
    if (app.status === "selected") return "Selected";
    if (app.status === "rejected") return "Rejected";
    if (app.status === "joined") return "Joined";
    return "Applied";
  };

  const handleBulkShortlist = async () => {
    if (!canEditDrive || selectedApplicants.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const promises = selectedApplicants.map((appId) =>
        updateApplicationRoundStatus({
          applicationId: appId,
          status: "shortlisted",
          roundStatus: "shortlisted",
          currentRoundIndex: 0,
          historyEntry: {
            roundIndex: 0,
            status: "shortlisted",
            updatedBy: currentUser?.uid,
          },
        })
      );
      await Promise.all(promises);
      toast.success("Marked as shortlisted for Round 1");
      setSelectedApplicants([]);
      queryClient.invalidateQueries({ queryKey: ["drive-applications", id] });
    } catch (error) {
      console.error("Bulk shortlist error", error);
      toast.error("Failed to update applications");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkReject = async () => {
    if (!canEditDrive || selectedApplicants.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const promises = selectedApplicants.map((appId) =>
        updateApplicationRoundStatus({
          applicationId: appId,
          status: "rejected",
          roundStatus: "failed",
          currentRoundIndex: null,
          historyEntry: {
            roundIndex: -1,
            status: "failed",
            updatedBy: currentUser?.uid,
          },
        })
      );
      await Promise.all(promises);
      toast.success("Marked as rejected");
      setSelectedApplicants([]);
      queryClient.invalidateQueries({ queryKey: ["drive-applications", id] });
    } catch (error) {
      console.error("Bulk reject error", error);
      toast.error("Failed to update applications");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(isStudentView ? "/student" : adminDashboardRoute)} 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {isStudentView ? "Student" : adminRoleLabel} Dashboard
        </Button>

        {/* Header Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-4 flex-1">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {drive.company}
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={drive.status} />
                      {/* Manual status change - only for admins */}
                      {isAdminView && (
                        <>
                          <Select
                            value={drive.status}
                            onValueChange={(value) => handleStatusChange(value as DriveStatus)}
                            disabled={!canEditDrive}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upcoming">Upcoming</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          {driveHasRounds && (
                            <span className="text-xs text-muted-foreground italic">
                              (Auto-updates by rounds, but you can override)
                            </span>
                          )}
                          {!driveHasRounds && (
                            <span className="text-xs text-muted-foreground italic">
                              (Manual control - no rounds defined)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {drive.driveType === "on-campus" ? "On-campus" : drive.driveType === "off-campus" ? "Off-campus" : "Internship"}
                    </Badge>
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                      {drive.roles.length} Role{drive.roles.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  
                  {/* Role Selector */}
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Select Role</label>
                    <Select value={activeRoleId} onValueChange={setSelectedRoleId}>
                      <SelectTrigger className="w-full md:w-[400px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {drive.roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.title} - {role.ctc} - Deadline: {formattedDeadline}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Role Info */}
                  {selectedRole && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Deadline</p>
                          <p className="text-sm font-semibold">{formattedDeadline}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Branches</p>
                        <p className="text-sm font-semibold">{selectedRole.eligibility.branches.join(", ")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Years</p>
                        <p className="text-sm font-semibold">{selectedRole.eligibility.years.join(", ")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">CTC</p>
                          <p className="text-sm font-semibold">{selectedRole.ctc}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin-only action buttons */}
              {isAdminView && canEditDrive && (
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/create-drive?editId=${drive.id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </Button>
                  {drive.status === "active" ? (
                    <Button variant="outline" size="sm" className="text-destructive">
                      Close Drive
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      Reopen Drive
                    </Button>
                  )}
                </div>
              )}
              {isReadOnlyPlacementAdmin && (
                <div className="ml-4">
                  <Badge variant="outline" className="text-muted-foreground">
                    View only (created by another admin)
                  </Badge>
                </div>
              )}
              {/* Student view - Apply button */}
              {isStudentView && (drive.status === "upcoming" || drive.status === "active") && (
                <div className="flex gap-2 ml-4">
                                    <Button 
                    size="sm"
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    onClick={() => navigate(`/apply/${drive.id}?roleId=${activeRoleId}`)}
                    disabled={hasAppliedToSelectedRole}
                  >
                    {hasAppliedToSelectedRole ? "Already Applied" : "Apply Now"}
                    {!hasAppliedToSelectedRole && <ExternalLink className="h-4 w-4 ml-2" />}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {/* Admin-only tabs */}
            {isAdminView && (
              <>
                <TabsTrigger value="applicants">
                  Applicants ({filteredApplicants.length})
                </TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="communication">Communication</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {/* Company Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Company Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                      <p className="font-semibold">{drive.company || drive.companyName || "Not specified"}</p>
                    </div>
                    {drive.website && (  // Only show if website exists
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Website</p>
                        <a href={drive.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          {drive.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {!drive.website && (  // Show message if not provided
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Website</p>
                        <p className="text-muted-foreground italic">Not provided</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Job Role / Profile</p>
                      <p className="font-semibold">{selectedRole?.title || "Not specified"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Job Location(s)</p>
                        <p className="font-semibold">{drive.location || selectedRole?.location || "Not specified"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">CTC / Stipend</p>
                        <p className="font-semibold">{selectedRole?.ctc || "Not specified"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Description */}
                <Card>
                  <CardHeader>
                    <CardTitle>Job Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {drive.jdFileUrl && (
                      <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-900/60">
                        <div>
                          <p className="text-sm font-semibold">Attached JD</p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {drive.jdFileName || "Job description file"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={drive.jdFileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              View
                            </a>
                          </Button>
                          <Button variant="secondary" size="sm" asChild>
                            <a
                              href={drive.jdFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={drive.jdFileName ?? undefined}
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {selectedRole?.description ||
                        drive.jd ||
                        (isStudentView
                          ? "Job description not provided yet."
                          : "No description available. Please provide job details in the drive creation form.")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Additional Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedRole?.additionalRequirements ? (
                      <p className="text-sm whitespace-pre-line leading-relaxed">
                        {selectedRole.additionalRequirements}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No extra conditions specified.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Eligibility */}
                <Card>
                  <CardHeader>
                    <CardTitle>Eligibility</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Branches</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRole?.eligibility.branches?.length ? (
                          selectedRole.eligibility.branches.map((branch) => (
                            <Badge key={branch} variant="outline">
                              {branch}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground italic">All branches eligible</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Passing Years</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRole?.eligibility.years?.length ? (
                          selectedRole.eligibility.years.map((year) => (
                            <Badge key={year} variant="outline">
                              {year}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground italic">All years eligible</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Minimum CGPA</p>
                      <p className="font-semibold">{selectedRole?.eligibility.minCgpa ?? "Not specified"}</p>
                    </div>
                    {selectedRole?.eligibility.maxBacklogs === 0 ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <p className="text-sm">No backlogs allowed</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Backlogs allowed (up to {selectedRole?.eligibility.maxBacklogs || "unlimited"})</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline / Process */}
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline / Process</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Application Deadline</p>
                        <p className="font-semibold">{formattedDeadline}</p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-semibold mb-2">Rounds</p>
                        {(selectedRole?.rounds || drive.rounds)?.length ? (
                          (selectedRole?.rounds || drive.rounds).map((round, index) => (
                            <div key={index} className="flex items-center gap-3 pb-3 border-b last:border-0">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${round.status === "completed" ? "bg-success/10 text-success" : round.status === "upcoming" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {round.status === "completed" ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{round.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateValue(round.dateTime)} - {round.mode || "Mode not specified"}
                                </p>
                              </div>
                              <Badge variant="outline" className={round.status === "completed" ? "bg-success/10 text-success border-success/20" : round.status === "upcoming" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                                {round.status || "Status not specified"}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground italic">No rounds specified</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Applicants (This Role)</p>
                      <p className="text-2xl font-bold">{driveApplications.filter((app) => app.roleId === activeRoleId).length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Shortlisted</p>
                      <p className="text-2xl font-bold text-primary">{driveApplications.filter((app) => app.roleId === activeRoleId && app.status === "shortlisted").length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Selected</p>
                      <p className="text-2xl font-bold text-success">{driveApplications.filter((app) => app.roleId === activeRoleId && app.status === "selected").length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Offers Accepted</p>
                      <p className="text-2xl font-bold text-success">{driveApplications.filter((app) => app.roleId === activeRoleId && app.status === "joined").length}</p>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">All Roles Combined</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Total Applicants:</span>
                          <span className="text-sm font-bold">{drive.totalApplications ?? driveApplications.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Total Shortlisted:</span>
                          <span className="text-sm font-bold text-primary">{driveApplications.filter((app) => app.status === "shortlisted").length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Total Selected:</span>
                          <span className="text-sm font-bold text-success">{driveApplications.filter((app) => app.status === "selected").length}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Applicants Tab - Admin Only */}
          {isAdminView && (
            <TabsContent value="applicants" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Applicants</CardTitle>
                    <CardDescription>Manage and track student applications</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {canEditDrive && selectedApplicants.length > 0 && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleBulkShortlist} disabled={isBulkUpdating}>
                          Mark as Shortlisted
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={handleBulkReject} disabled={isBulkUpdating}>
                          Mark as Rejected
                        </Button>
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64">
                        <DropdownMenuLabel>Select columns</DropdownMenuLabel>
                        {exportableColumns.map((col) => (
                          <DropdownMenuCheckboxItem
                            key={col.key}
                            checked={exportColumns.includes(col.key)}
                            onCheckedChange={(checked) => {
                              setExportColumns((prev) =>
                                checked
                                  ? [...prev, col.key]
                                  : prev.filter((c) => c !== col.key)
                              );
                            }}
                          >
                            {col.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setExportColumns(exportableColumns.map((c) => c.key))}>
                          Select all
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setExportColumns([])}>
                          Clear all
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleExportCsv}
                          disabled={!exportColumns.length || !filteredApplicants.length}
                        >
                          Export CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or roll no..."
                        className="pl-9"
                        value={applicantFilters.search}
                        onChange={(e) => setApplicantFilters({ ...applicantFilters, search: e.target.value })}
                      />
                    </div>
                  </div>
                  <Select value={applicantFilters.branch} onValueChange={(value) => setApplicantFilters({ ...applicantFilters, branch: value })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="ECE">ECE</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={applicantFilters.year} onValueChange={(value) => setApplicantFilters({ ...applicantFilters, year: value })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={applicantFilters.status} onValueChange={(value) => setApplicantFilters({ ...applicantFilters, status: value })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="shortlisted">Shortlisted</SelectItem>
                      <SelectItem value="selected">Selected</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedApplicants.length === filteredApplicants.length && filteredApplicants.length > 0}
                          onCheckedChange={toggleAllApplicants}
                          disabled={!canEditDrive}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Application</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplicants.map((applicant) => {
                      const student = studentLookup.get(applicant.studentId);
                      const displayName =
                        student?.name?.trim() ||
                        applicant.name?.trim() ||
                        (applicant.email ? applicant.email.split("@")[0] : null) ||
                        student?.email?.split("@")[0] ||
                        applicant.rollNo ||
                        student?.rollNumber ||
                        applicant.studentId ||
                        "Not provided";
                      const rollNumber = applicant.rollNo || student?.rollNumber || "—";
                      const email = applicant.email || student?.email || student?.personalEmail || "—";
                      const branch = applicant.branch || student?.branch || "—";
                      const year = applicant.year || (student?.passingYear ? String(student.passingYear) : "—");

                      return (
                        <TableRow key={applicant.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedApplicants.includes(applicant.id)}
                              onCheckedChange={() => toggleApplicantSelection(applicant.id)}
                              disabled={!canEditDrive}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{displayName}</TableCell>
                          <TableCell>{rollNumber}</TableCell>
                          <TableCell>{email}</TableCell>
                          <TableCell>{branch}</TableCell>
                          <TableCell>{year}</TableCell>
                          <TableCell>
                            <StatusBadge status={applicant.status} />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={applicant.status === "selected" ? "default" : "secondary"}>
                                {formatApplicationStatus(applicant)}
                              </Badge>
                              <div>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => setViewingApplication(applicant)}>
                                  <FileText className="h-4 w-4" />
                                  View application
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

            <Dialog open={!!viewingApplication} onOpenChange={(open) => !open && setViewingApplication(null)}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Application details</DialogTitle>
                  <DialogDescription>
                    Review the information submitted by the student for this drive.
                  </DialogDescription>
                </DialogHeader>
                {viewingApplication && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-semibold">{viewingStudent?.name || viewingApplication.name || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Roll No</p>
                        <p className="font-semibold">{viewingApplication.rollNo || viewingStudent?.rollNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-semibold">{viewingApplication.email || viewingStudent?.email || viewingStudent?.personalEmail || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-semibold">{viewingApplication.phoneNumber || viewingStudent?.phoneNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Branch</p>
                        <p className="font-semibold">{viewingApplication.branch || viewingStudent?.branch || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Year</p>
                        <p className="font-semibold">{viewingApplication.year || (viewingStudent?.passingYear ? String(viewingStudent.passingYear) : "Not provided")}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Links</p>
                      <div className="flex flex-col gap-2">
                        {viewingApplication.resumeFileUrl && (
                          <a className="text-primary" href={viewingApplication.resumeFileUrl} target="_blank" rel="noopener noreferrer">Resume</a>
                        )}
                        {viewingApplication.portfolioUrl && (
                          <a className="text-primary" href={viewingApplication.portfolioUrl} target="_blank" rel="noopener noreferrer">Portfolio</a>
                        )}
                        {viewingApplication.githubUrl && (
                          <a className="text-primary" href={viewingApplication.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
                        )}
                        {viewingApplication.linkedInUrl && (
                          <a className="text-primary" href={viewingApplication.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                        )}
                        {!viewingApplication.resumeFileUrl && !viewingApplication.portfolioUrl && !viewingApplication.githubUrl && !viewingApplication.linkedInUrl && (
                          <p className="text-muted-foreground text-sm">No links provided.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewingApplication(null)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </CardContent>
            </Card>
            </TabsContent>
          )}

          {/* Results Tab - Admin Only */}
          {isAdminView && (
            <TabsContent value="results" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Result Upload Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload Results</CardTitle>
                  <CardDescription>Upload results from Excel, CSV, or paste from email/WhatsApp</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full gap-2" disabled={!canEditDrive}>
                    <Upload className="h-4 w-4" />
                    Upload Excel / CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => canEditDrive && setResultUploadDialogOpen(true)}
                    disabled={!canEditDrive}
                  >
                    <FileText className="h-4 w-4" />
                    Paste List from Mail / WhatsApp
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">(PDF / Screenshot upload coming soon)</p>
                </CardContent>
              </Card>

              {/* Selected Students List */}
              <Card>
                <CardHeader>
                  <CardTitle>Selected Students</CardTitle>
                  <CardDescription>Students who have been selected for this drive</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No students selected yet</p>
                    <p className="text-xs mt-2">Upload results to see selected students here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}

          {/* Communication Tab - Admin Only */}
          {isAdminView && (
            <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Announcements</CardTitle>
                    <CardDescription>Send messages to applicants for this drive</CardDescription>
                  </div>
                  <Dialog
                    open={canEditDrive && announcementDialogOpen}
                    onOpenChange={(open) => {
                      if (!canEditDrive) return;
                      setAnnouncementDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button disabled={!canEditDrive}>
                        <Send className="h-4 w-4 mr-2" />
                        Send Announcement
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Send Announcement</DialogTitle>
                        <DialogDescription>Send a message to applicants for this drive</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Audience</label>
                          <Select defaultValue="all">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Applicants</SelectItem>
                              <SelectItem value="shortlisted">Shortlisted Only</SelectItem>
                              <SelectItem value="selected">Selected Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Title</label>
                          <Input placeholder="Announcement title" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Message</label>
                          <Textarea placeholder="Enter your message here..." rows={6} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="email" />
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Send as email
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="notification" defaultChecked />
                            <label htmlFor="notification" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Show in student notification center
                            </label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)} disabled={!canEditDrive}>
                          Cancel
                        </Button>
                        <Button onClick={() => setAnnouncementDialogOpen(false)} disabled={!canEditDrive}>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No announcements sent yet</p>
                  <p className="text-xs mt-2">Send your first announcement to communicate with applicants</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Result Paste Dialog */}
      <Dialog
        open={canEditDrive && resultUploadDialogOpen}
        onOpenChange={(open) => {
          if (!canEditDrive) return;
          setResultUploadDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paste Results</DialogTitle>
            <DialogDescription>Paste the list of selected students from email or WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Paste student names, roll numbers, or any format here..."
              rows={10}
              value={pastedResults}
              onChange={(e) => setPastedResults(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The system will automatically match students with their applications. Unmatched entries will be shown for review.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultUploadDialogOpen(false)} disabled={!canEditDrive}>
              Cancel
            </Button>
            <Button onClick={handleResultPaste} disabled={!canEditDrive}>
              Process & Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriveDetail;

