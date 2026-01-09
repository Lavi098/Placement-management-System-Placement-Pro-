import { useAuth } from "@/contexts/AuthContext";import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getDriveById } from "@/services/drives";
import { applyToDrive } from "@/services/applications";
import { Drive } from "@/models/drives";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

// Application form schema
const applicationSchema = z.object({
  roleId: z.string().min(1, "Please select a role"),
  resumeFileUrl: z.string().url("Please enter a valid resume URL").optional().or(z.literal("")),
  additionalInfo: z.string().optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms to submit your application",
  }),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

const ApplyNow = () => {
  const { id: driveId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

    const { user: currentUser } = useAuth();

  // Fetch drive details
  const {
    data: drive,
    isLoading: driveLoading,
    error: driveError,
  } = useQuery<Drive | null>({
    queryKey: ["drive", driveId],
    queryFn: () => (driveId ? getDriveById(driveId) : null),
    enabled: !!driveId,
  });

  // Form setup
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      roleId: "",
      resumeFileUrl: "",
      additionalInfo: "",
      agreeToTerms: false,
    },
  });

  // Update form when role is selected
  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    form.setValue("roleId", roleId);
  };

  // Get selected role details
  const selectedRole = drive?.roles.find((r) => r.id === selectedRoleId);

  // Check if student is eligible for selected role
  const checkEligibility = () => {
    if (!selectedRole) return { eligible: false, reasons: [] };
    
    // For now, return eligible (will be checked against actual student data when auth is added)
    // TODO: Check against student's branch, year, CGPA, backlogs
    return { eligible: true, reasons: [] };
  };

  const eligibility = checkEligibility();

  // Format date for display
  const formatDate = (dateValue: unknown): string => {
    if (!dateValue) return "Not specified";
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (typeof dateValue === "string") {
      return dateValue;
    }
    return "Not specified";
  };

  // Handle form submission
  const onSubmit = async (data: ApplicationFormValues) => {
    if (!drive || !driveId) {
      toast.error("Drive information not available");
      return;
    }

    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setIsSubmitting(true);

    try {
            if (!currentUser) {
        toast.error("You must be logged in to apply.");
        setIsSubmitting(false);
        return;
      }

      await applyToDrive({
        driveId,
        collegeId: drive.collegeId,
        studentId: currentUser.uid,
        roleId: data.roleId,
        resumeFileUrl: data.resumeFileUrl || undefined,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["student-applications", currentUser.uid] });
      queryClient.invalidateQueries({ queryKey: ["student-drives"] });
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      queryClient.invalidateQueries({ queryKey: ["drive", driveId] });

      toast.success("Application submitted successfully!");
      
      // Redirect to student dashboard after successful submission
      setTimeout(() => {
        navigate("/student", { state: { applicationSubmitted: true } });
      }, 1500);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (driveLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Navigation />
        <div className="container mx-auto px-4 py-10">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Loading drive details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (driveError || !drive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Navigation />
        <div className="container mx-auto px-4 py-10">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl font-bold mb-2">Drive Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The drive you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if drive is still accepting applications
  const getDeadlineDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate();
    }
    return null;
  };

  const companyName = drive.company || drive.companyName || "Unknown Company";
  const isDriveOpen = drive.status === "upcoming" || drive.status === "active";
  const deadline = formatDate(drive.deadline);
  const deadlineDate = getDeadlineDate(drive.deadline);
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;

  if (!isDriveOpen || isDeadlinePassed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Navigation />
        <div className="container mx-auto px-4 py-10">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl font-bold mb-2">Applications Closed</h2>
              <p className="text-muted-foreground mb-6">
                {isDeadlinePassed
                  ? `The application deadline for this drive has passed (${deadline}).`
                  : "This drive is not currently accepting applications."}
              </p>
              <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/student")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Drive Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{companyName}</CardTitle>
                <CardDescription>Drive Details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={drive.status} />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Application Deadline</p>
                      <p className="text-sm text-muted-foreground">{deadline}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Drive Type</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {drive.driveType.replace("-", " ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Job Location</p>
                      <p className="text-sm text-muted-foreground">
                        {drive.jobLocation || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Role Info */}
            {selectedRole && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold">{selectedRole.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedRole.ctc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedRole.location}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium mb-2">Eligibility</p>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Branches: {selectedRole.eligibility.branches.join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Years: {selectedRole.eligibility.years.join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Min CGPA: {selectedRole.eligibility.minCgpa}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Max Backlogs: {selectedRole.eligibility.maxBacklogs}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium mb-2">Additional Requirements</p>
                    {selectedRole.additionalRequirements ? (
                      <p className="text-xs text-muted-foreground whitespace-pre-line">
                        {selectedRole.additionalRequirements}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">None specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Application Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Application Form</CardTitle>
                <CardDescription>
                  Fill in the details to apply for this drive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Role Selection */}
                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Role *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleRoleSelect(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a role to apply for" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {drive.roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{role.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {role.ctc} • {role.location}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the role you want to apply for
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Eligibility Check */}
                    {selectedRole && !eligibility.eligible && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <p className="font-medium text-destructive">Not Eligible</p>
                            <ul className="text-sm text-destructive/80 mt-1 list-disc list-inside">
                              {eligibility.reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resume URL */}
                    <FormField
                      control={form.control}
                      name="resumeFileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resume URL</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                                placeholder="https://drive.google.com/..."
                                {...field}
                              />
                              <p className="text-xs text-muted-foreground">
                                Upload your resume to Google Drive, Dropbox, or similar and paste the shareable link here
                              </p>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Provide a shareable link to your resume (PDF preferred)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Additional Information */}
                    <FormField
                      control={form.control}
                      name="additionalInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Information (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional information you'd like to share..."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Add any relevant information that might help your application
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Terms and Conditions */}
                    <FormField
                      control={form.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              I confirm that all information provided is accurate
                            </FormLabel>
                            <FormDescription>
                              By submitting this application, you agree that all information is correct and you meet the eligibility criteria.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/student")}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !eligibility.eligible}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Submit Application
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyNow;
