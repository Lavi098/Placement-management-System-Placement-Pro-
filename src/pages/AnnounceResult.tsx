import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Megaphone, Search, CheckCircle, XCircle, Clock, User, Mail, FileText, Upload, Image as ImageIcon, FileSpreadsheet, Copy, X } from "lucide-react";
import { getAllDrives, getDriveById } from "@/services/drives";
import { listApplicationsByDrive, updateApplicationStatus } from "@/services/applications";
import { Drive } from "@/models/drives";
import { Application, ApplicationStatus } from "@/models/applications";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";

const announceResultSchema = z.object({
  driveId: z.string().min(1, "Please select a drive"),
  announcementMessage: z.string().optional(),
});

type AnnounceResultFormValues = z.infer<typeof announceResultSchema>;

const AnnounceResult = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDriveId, setSelectedDriveId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("shortlisted");
  
  // File upload states
  const [uploadMethod, setUploadMethod] = useState<"image" | "excel" | "text" | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [extractedStudentIds, setExtractedStudentIds] = useState<string[]>([]);
  const [matchedApplications, setMatchedApplications] = useState<Map<string, Application>>(new Map());
  const [parsingStatus, setParsingStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");

  // Fetch all drives
  const { data: drives = [], isLoading: drivesLoading } = useQuery<Drive[]>({
    queryKey: ["drives"],
    queryFn: getAllDrives,
  });

  // Fetch selected drive details
  const { data: selectedDrive } = useQuery<Drive | null>({
    queryKey: ["drive", selectedDriveId],
    queryFn: () => getDriveById(selectedDriveId),
    enabled: !!selectedDriveId,
  });

  // Fetch applications for selected drive
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["drive-applications", selectedDriveId],
    queryFn: () => listApplicationsByDrive(selectedDriveId),
    enabled: !!selectedDriveId,
  });

  const form = useForm<AnnounceResultFormValues>({
    resolver: zodResolver(announceResultSchema),
    defaultValues: {
      driveId: "",
      announcementMessage: "",
    },
  });

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (searchQuery && !app.studentId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Handle drive selection
  const handleDriveChange = (driveId: string) => {
    setSelectedDriveId(driveId);
    setSelectedApplications(new Set());
    form.setValue("driveId", driveId);
  };

  // Handle individual application status update
  const handleStatusUpdate = async (applicationId: string, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      toast.success("Application status updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["drive-applications", selectedDriveId] });
      queryClient.invalidateQueries({ queryKey: ["all-applications"] });
    } catch (error) {
      console.error("Error updating application status:", error);
      toast.error("Failed to update application status");
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async () => {
    if (selectedApplications.size === 0) {
      toast.error("Please select at least one application");
      return;
    }

    try {
      const updatePromises = Array.from(selectedApplications).map((appId) =>
        updateApplicationStatus(appId, bulkStatus)
      );
      await Promise.all(updatePromises);
      toast.success(`Updated ${selectedApplications.size} application(s) to ${bulkStatus}`);
      setSelectedApplications(new Set());
      setBulkStatusDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["drive-applications", selectedDriveId] });
      queryClient.invalidateQueries({ queryKey: ["all-applications"] });
    } catch (error) {
      console.error("Error updating application statuses:", error);
      toast.error("Failed to update application statuses");
    }
  };

  // Toggle application selection
  const toggleApplicationSelection = (applicationId: string) => {
    const newSelection = new Set(selectedApplications);
    if (newSelection.has(applicationId)) {
      newSelection.delete(applicationId);
    } else {
      newSelection.add(applicationId);
    }
    setSelectedApplications(newSelection);
  };

  // Select all filtered applications
  const selectAll = () => {
    const allIds = new Set(filteredApplications.map((app) => app.id));
    setSelectedApplications(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedApplications(new Set());
  };

  // Get role name for application
  const getRoleName = (roleId: string) => {
    const role = selectedDrive?.roles.find((r) => r.id === roleId);
    return role?.title || "Unknown Role";
  };

  // Format date
  const formatDate = (dateValue: unknown): string => {
    if (!dateValue) return "N/A";
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (typeof dateValue === "object" && "toDate" in dateValue) {
      return (dateValue as { toDate: () => Date }).toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return "N/A";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-900 via-primary to-accent bg-clip-text text-transparent dark:from-slate-100">
                Announce Results
              </h1>
              <p className="text-muted-foreground mt-1">
                Update application statuses and announce placement results
              </p>
            </div>
          </div>
        </div>

        {/* Quick Upload Section - Easy as WhatsApp! */}
        {selectedDriveId && (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Quick Upload - Just Like WhatsApp!
              </CardTitle>
              <CardDescription>
                Upload a photo, screenshot, Excel file, or paste text from email/WhatsApp. We'll extract student IDs automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-24 flex-col gap-2 border-2 border-dashed hover:border-primary"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setUploadedImage(event.target?.result as string);
                            setUploadMethod("image");
                            // TODO: Add OCR processing here
                            toast.info("Image uploaded! Extracting student IDs...");
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    <ImageIcon className="h-6 w-6" />
                    <span>Upload Photo/Screenshot</span>
                  </Button>
                  {uploadedImage && (
                    <div className="relative">
                      <img src={uploadedImage} alt="Uploaded" className="w-full h-32 object-contain rounded border" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => {
                          setUploadedImage(null);
                          setUploadMethod(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Excel Upload */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-24 flex-col gap-2 border-2 border-dashed hover:border-primary"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".xlsx,.xls,.csv";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          setExcelFile(file);
                          setUploadMethod("excel");
                          // TODO: Parse Excel file
                          toast.info("Excel file uploaded! Extracting student IDs...");
                        }
                      };
                      input.click();
                    }}
                  >
                    <FileSpreadsheet className="h-6 w-6" />
                    <span>Upload Excel/CSV</span>
                  </Button>
                  {excelFile && (
                    <div className="text-sm text-muted-foreground flex items-center justify-between p-2 bg-muted rounded">
                      <span className="truncate">{excelFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExcelFile(null);
                          setUploadMethod(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Text Paste */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-24 flex-col gap-2 border-2 border-dashed hover:border-primary"
                    onClick={() => setUploadMethod("text")}
                  >
                    <Copy className="h-6 w-6" />
                    <span>Paste from Email/WhatsApp</span>
                  </Button>
                  {uploadMethod === "text" && (
                    <Textarea
                      placeholder="Paste the list here... (e.g., student IDs, roll numbers, names)"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="min-h-[100px]"
                    />
                  )}
                </div>
              </div>

              {/* Extract and Match Button */}
              {(uploadedImage || excelFile || pastedText) && (
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={async () => {
                      setParsingStatus("parsing");
                      try {
                        let studentIds: string[] = [];

                        // Extract from text (simplest case)
                        if (pastedText) {
                          // Extract student IDs/roll numbers from text
                          // Look for patterns like: "2021CSE001", "21CSE001", "001", etc.
                          const patterns = [
                            /\b\d{4}[A-Z]{2,4}\d{3,}\b/g, // 2021CSE001
                            /\b\d{2}[A-Z]{2,4}\d{3,}\b/g, // 21CSE001
                            /\b[A-Z]{2,4}\d{3,}\b/g, // CSE001
                            /\b\d{6,}\b/g, // Long numbers
                          ];

                          for (const pattern of patterns) {
                            const matches = pastedText.match(pattern);
                            if (matches) {
                              studentIds.push(...matches);
                            }
                          }

                          // Also try to extract from lines (one per line)
                          const lines = pastedText.split("\n").map((l) => l.trim()).filter(Boolean);
                          studentIds.push(...lines);
                        }

                        // TODO: Add OCR for images
                        if (uploadedImage) {
                          toast.info("OCR processing coming soon! For now, please paste the text or use Excel.");
                        }

                        // TODO: Parse Excel file
                        if (excelFile) {
                          toast.info("Excel parsing coming soon! For now, please paste the text.");
                        }

                        // Remove duplicates and clean
                        studentIds = [...new Set(studentIds.map((id) => id.trim().toUpperCase()))].filter(Boolean);

                        if (studentIds.length === 0) {
                          toast.error("Could not extract student IDs. Please check the format.");
                          setParsingStatus("error");
                          return;
                        }

                        setExtractedStudentIds(studentIds);

                        // Match to applications
                        const matched = new Map<string, Application>();
                        for (const studentId of studentIds) {
                          const app = applications.find(
                            (a) => a.studentId.toLowerCase() === studentId.toLowerCase() || 
                                  a.studentId.toLowerCase().includes(studentId.toLowerCase()) ||
                                  studentId.toLowerCase().includes(a.studentId.toLowerCase())
                          );
                          if (app) {
                            matched.set(studentId, app);
                          }
                        }

                        setMatchedApplications(matched);
                        setParsingStatus("success");
                        toast.success(`Found ${matched.size} matching application(s) out of ${studentIds.length} student ID(s)`);
                      } catch (error) {
                        console.error("Error extracting student IDs:", error);
                        toast.error("Failed to extract student IDs");
                        setParsingStatus("error");
                      }
                    }}
                    disabled={parsingStatus === "parsing"}
                    className="flex-1"
                  >
                    {parsingStatus === "parsing" ? (
                      <>Extracting...</>
                    ) : (
                      <>Extract Student IDs & Match</>
                    )}
                  </Button>
                  {(uploadedImage || excelFile || pastedText) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadedImage(null);
                        setExcelFile(null);
                        setPastedText("");
                        setUploadMethod(null);
                        setExtractedStudentIds([]);
                        setMatchedApplications(new Map());
                        setParsingStatus("idle");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              )}

              {/* Matched Applications Preview */}
              {matchedApplications.size > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">Matched {matchedApplications.size} Application(s)</p>
                      <p className="text-sm text-muted-foreground">
                        Review and select status, then click "Update All" to announce results
                      </p>
                    </div>
                    <Select
                      value={bulkStatus}
                      onValueChange={(value) => setBulkStatus(value as ApplicationStatus)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="selected">Selected</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="joined">Joined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                    {Array.from(matchedApplications.entries()).map(([studentId, app]) => (
                      <div key={app.id} className="flex items-center justify-between p-2 bg-background rounded text-sm">
                        <span className="font-medium">{studentId}</span>
                        <StatusBadge status={app.status} />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        const updatePromises = Array.from(matchedApplications.values()).map((app) =>
                          updateApplicationStatus(app.id, bulkStatus)
                        );
                        await Promise.all(updatePromises);
                        toast.success(`Updated ${matchedApplications.size} application(s) to ${bulkStatus}!`);
                        setMatchedApplications(new Map());
                        setExtractedStudentIds([]);
                        setUploadedImage(null);
                        setExcelFile(null);
                        setPastedText("");
                        setUploadMethod(null);
                        queryClient.invalidateQueries({ queryKey: ["drive-applications", selectedDriveId] });
                        queryClient.invalidateQueries({ queryKey: ["all-applications"] });
                      } catch (error) {
                        console.error("Error updating applications:", error);
                        toast.error("Failed to update applications");
                      }
                    }}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update All {matchedApplications.size} Matched Applications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Drive Selection */}
        <Card className="mb-6 border-2 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Select Drive</CardTitle>
            <CardDescription>Choose a drive to announce results for</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <FormField
                control={form.control}
                name="driveId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drive</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleDriveChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a drive" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivesLoading ? (
                          <SelectItem value="loading" disabled>Loading drives...</SelectItem>
                        ) : drives.length === 0 ? (
                          <SelectItem value="none" disabled>No drives available</SelectItem>
                        ) : (
                          drives.map((drive) => (
                            <SelectItem key={drive.id} value={drive.id}>
                              {drive.companyName} - {drive.roles.map((r) => r.title).join(", ")}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </CardContent>
        </Card>

        {/* Applications Table */}
        {selectedDriveId && (
          <Card className="border-2 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Applications - {selectedDrive?.companyName}
                  </CardTitle>
                  <CardDescription>
                    {applications.length} total application(s) | {filteredApplications.length} shown
                  </CardDescription>
                </div>
                {selectedApplications.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkStatusDialogOpen(true)}
                    >
                      Update {selectedApplications.size} Selected
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Clear Selection
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by Student ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "all")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="joined">Joined</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
              </div>

              {/* Applications Table */}
              {applicationsLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Loading applications...</p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No applications found.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedApplications.size === filteredApplications.length && filteredApplications.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) selectAll();
                              else deselectAll();
                            }}
                          />
                        </TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Applied On</TableHead>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedApplications.has(app.id)}
                              onCheckedChange={() => toggleApplicationSelection(app.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {app.studentId}
                            </div>
                          </TableCell>
                          <TableCell>{getRoleName(app.roleId)}</TableCell>
                          <TableCell>{formatDate(app.appliedOn)}</TableCell>
                          <TableCell>
                            <StatusBadge status={app.status} />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={app.status}
                              onValueChange={(value) => handleStatusUpdate(app.id, value as ApplicationStatus)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                <SelectItem value="selected">Selected</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="joined">Joined</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bulk Status Update Dialog */}
        <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Update Status</DialogTitle>
              <DialogDescription>
                Update {selectedApplications.size} selected application(s) to a new status
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">New Status</label>
                <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as ApplicationStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="joined">Joined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkStatusUpdate}>
                Update {selectedApplications.size} Application(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AnnounceResult;

