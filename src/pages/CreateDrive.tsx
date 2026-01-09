import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { createDrive } from "@/services/drives";
import { DriveType } from "@/models/drives";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { findPlacementAdminByUserId } from "@/services/placementAdmins";
import { useQuery } from "@tanstack/react-query";
import { uploadDriveAttachment, uploadDriveAttachmentFallback } from "@/services/storage";

const commonRounds = [
  "Aptitude Test",
  "Coding Test",
  "Group Discussion",
  "Technical Interview",
  "HR Interview",
  "Case Study",
  "Presentation",
  "Other",
];

const roundSchema = z.object({
  name: z.string().min(1, "Round name is required"),
  date: z.date({ required_error: "Date is required" }).nullable(),
  mode: z.enum(["online", "offline"], { required_error: "Mode is required" }),
});

const roleSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  offerType: z.string().min(1, "Offer type is required"),
  location: z.string().min(1, "Location is required"),
  compensation: z.string().min(1, "CTC/Stipend is required"),
  description: z.string().optional().or(z.literal("")),
  applicationLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  eligibleBranches: z.array(z.string()).min(1, "Select at least one branch"),
  eligibleYears: z.array(z.string()).min(1, "Select at least one passing year"),
  minCGPA: z.string().optional(),
  deadline: z.date({ required_error: "Deadline is required" }).nullable(),
  rounds: z.array(roundSchema).optional(),
  requireExternalLink: z.boolean().default(false),
  requireResume: z.boolean().default(false),
  askPortfolio: z.boolean().default(false),
  askGithub: z.boolean().default(false),
  askLinkedIn: z.boolean().default(false),
  allowBacklogs: z.boolean().default(false),
  additionalRequirements: z.string().optional().or(z.literal("")),
});

const driveSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  driveType: z.string().min(1, "Drive type is required"),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  generalLocation: z.string().min(1, "Primary location is required"),
  roles: z.array(roleSchema).min(1, "Add at least one role"),
});

type DriveFormValues = z.infer<typeof driveSchema>;
type RoleFormValues = z.infer<typeof roleSchema>;

type RoleCardProps = {
  index: number;
  field: { id: string };
  form: UseFormReturn<DriveFormValues>;
  branches: string[];
  years: string[];
  onRemove: (index: number) => void;
  canRemove: boolean;
};

const RoleCard = ({ index, field, form, branches, years, onRemove, canRemove }: RoleCardProps) => {
  const selectedRoleBranches = form.watch(`roles.${index}.eligibleBranches`) ?? [];
  const selectedRoleYears = form.watch(`roles.${index}.eligibleYears`) ?? [];
  const deadlineDate = form.watch(`roles.${index}.deadline`) ?? null;
  const applicationLinkValue = (form.watch(`roles.${index}.applicationLink`) ?? "").trim();
  const hasExternalLink = Boolean(applicationLinkValue);

  const { fields: roundFields, append: appendRound, remove: removeRound } = useFieldArray({
    control: form.control,
    name: `roles.${index}.rounds`,
  });

  const handleBranchToggle = (branch: string, isChecked: boolean) => {
    const current = form.getValues(`roles.${index}.eligibleBranches`) ?? [];
    const updated = isChecked ? Array.from(new Set([...current, branch])) : current.filter((b) => b !== branch);
    form.setValue(`roles.${index}.eligibleBranches`, updated, { shouldDirty: true });
  };

  const handleYearToggle = (year: string, isChecked: boolean) => {
    const current = form.getValues(`roles.${index}.eligibleYears`) ?? [];
    const updated = isChecked ? Array.from(new Set([...current, year])) : current.filter((y) => y !== year);
    form.setValue(`roles.${index}.eligibleYears`, updated, { shouldDirty: true });
  };

  useEffect(() => {
    if (!hasExternalLink && form.getValues(`roles.${index}.requireExternalLink`)) {
      form.setValue(`roles.${index}.requireExternalLink`, false, { shouldDirty: true });
    }
  }, [hasExternalLink, form, index]);

  return (
    <Card key={field.id} className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Role #{index + 1}</CardTitle>
          <CardDescription>Define everything students need to know for this profile.</CardDescription>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name={`roles.${index}.roleName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Software Engineer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`roles.${index}.offerType`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Offer Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select offer type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="ppo">PPO</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`roles.${index}.location`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Bangalore / Remote" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`roles.${index}.compensation`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>CTC / Stipend</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 45 LPA, 30k/month" {...field} />
                </FormControl>
                <FormDescription>Include perks if required.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`roles.${index}.applicationLink`}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>External Application Link (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://forms.google.com/..." {...field} />
                </FormControl>
                <FormDescription>Company portal, Google form or ATS link.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name={`roles.${index}.deadline`}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Application Deadline</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      disabled={(date: Date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`roles.${index}.minCGPA`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum CGPA / Percentage (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="e.g. 7.5 or 75" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name={`roles.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Paste or write the complete JD for this role..."
                  className="min-h-[140px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`roles.${index}.additionalRequirements`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional requirements (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Must have participated in Smart India Hackathon; AWS Cloud Practitioner certification required"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>Special conditions like hackathon participation, certifications, or mandatory skills.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name={`roles.${index}.eligibleBranches`}
            render={() => (
              <FormItem>
                <FormLabel>Eligible Branches</FormLabel>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {branches.map((branch) => (
                    <div key={`${field.id}-branch-${branch}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${field.id}-branch-${branch}`}
                        checked={selectedRoleBranches.includes(branch)}
                        onCheckedChange={(checked) => handleBranchToggle(branch, Boolean(checked))}
                      />
                      <label
                        htmlFor={`${field.id}-branch-${branch}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {branch}
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`roles.${index}.eligibleYears`}
            render={() => (
              <FormItem>
                <FormLabel>Eligible Passing Years</FormLabel>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {years.map((year) => (
                    <div key={`${field.id}-year-${year}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${field.id}-year-${year}`}
                        checked={selectedRoleYears.includes(year)}
                        onCheckedChange={(checked) => handleYearToggle(year, Boolean(checked))}
                      />
                      <label
                        htmlFor={`${field.id}-year-${year}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {year}
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Rounds / Process (Optional)</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendRound({ name: "", date: null, mode: "online" })}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Round
            </Button>
          </div>
          {roundFields.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                <div className="col-span-5">Round Name</div>
                <div className="col-span-4">Date</div>
                <div className="col-span-2">Mode</div>
                <div className="col-span-1"></div>
              </div>
              {roundFields.map((roundField, roundIndex) => {
                const roundName = form.watch(`roles.${index}.rounds.${roundIndex}.name`);
                const roundDate = form.watch(`roles.${index}.rounds.${roundIndex}.date`);
                const roundMode = form.watch(`roles.${index}.rounds.${roundIndex}.mode`);
                return (
                  <div key={roundField.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Select
                        value={roundName}
                        onValueChange={(value) => form.setValue(`roles.${index}.rounds.${roundIndex}.name`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select round" />
                        </SelectTrigger>
                        <SelectContent>
                          {commonRounds.map((round) => (
                            <SelectItem key={round} value={round}>
                              {round}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !roundDate && "text-muted-foreground"
                            )}
                          >
                            {roundDate ? (
                              format(roundDate, "PPP")
                            ) : (
                              <span>Pick date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={roundDate ?? undefined}
                            onSelect={(date) => form.setValue(`roles.${index}.rounds.${roundIndex}.date`, date)}
                            disabled={(date: Date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const minDate = deadlineDate ?? today;
                              return date < minDate;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={roundMode || ""}
                        onValueChange={(value: "online" | "offline") => form.setValue(`roles.${index}.rounds.${roundIndex}.mode`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRound(roundIndex)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <FormDescription>Add rounds with specific dates and modes for this role.</FormDescription>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <FormField
            control={form.control}
            name={`roles.${index}.allowBacklogs`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Allow backlogs (unchecked = no backlogs)</FormLabel>
                </div>
              </FormItem>
            )}
          />
          {hasExternalLink && (
            <FormField
              control={form.control}
              name={`roles.${index}.requireExternalLink`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Require visiting external link before marking applied</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name={`roles.${index}.requireResume`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ask students to upload/select resume</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`roles.${index}.askPortfolio`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ask for portfolio link</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`roles.${index}.askGithub`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ask for GitHub link</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`roles.${index}.askLinkedIn`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ask for LinkedIn link</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const CreateDrive = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingJd, setIsUploadingJd] = useState(false);
  const [jdAttachment, setJdAttachment] = useState<{ url: string; name: string } | null>(null);
  const [jdInputKey, setJdInputKey] = useState(0);
  const [jdUploadProgress, setJdUploadProgress] = useState<number | null>(null);
  const { user } = useAuth();

  const isPlacementAdmin = user?.role === "placement-admin";
  const { data: placementAdminRecord, isLoading: isLoadingPlacementAdmin } = useQuery({
    queryKey: ["placement-admin-record", user?.uid],
    queryFn: () => findPlacementAdminByUserId(user!.uid),
    enabled: Boolean(isPlacementAdmin && user?.uid),
  });

  const createEmptyRole = (): RoleFormValues => ({
    roleName: "",
    offerType: "",
    location: "",
    compensation: "",
    description: "",
    applicationLink: "",
    eligibleBranches: [],
    eligibleYears: [],
    minCGPA: "",
    deadline: null,
    rounds: [], // Changed to array of objects
    requireExternalLink: false,
    requireResume: false,
    askPortfolio: false,
    askGithub: false,
    askLinkedIn: false,
    allowBacklogs: false,
    additionalRequirements: "",
  });

  const form = useForm<DriveFormValues>({
    resolver: zodResolver(driveSchema),
    defaultValues: {
      companyName: "",
      driveType: "",
      website: "",
      generalLocation: "",
      roles: [createEmptyRole()],
    },
  });

  const { fields: roleFields, append, remove } = useFieldArray({
    control: form.control,
    name: "roles",
  });

  const placementAdminId = placementAdminRecord?.id ?? (user as { placementAdminId?: string })?.placementAdminId;
  const canSubmit = Boolean(user?.uid) && Boolean(placementAdminId) && !isSubmitting;

  const handleJdFileChange = async (file?: File | null) => {
    if (!file) {
      setJdAttachment(null);
      setJdInputKey((k) => k + 1);
      setIsUploadingJd(false);
      setJdUploadProgress(null);
      return;
    }
    const placementAdminId = placementAdminRecord?.id ?? (user as { placementAdminId?: string })?.placementAdminId;
    if (!placementAdminId) {
      toast.error("Missing placement admin context; please wait for your profile to load.");
      return;
    }
    setIsUploadingJd(true);
    setJdUploadProgress(0);
    try {
      const uploaded = await uploadDriveAttachment({
        file,
        placementAdminId,
        onProgress: (p) => setJdUploadProgress(p),
      });
      setJdAttachment(uploaded);
      toast.success("JD uploaded successfully.");
    } catch (err) {
      console.error("JD upload failed (resumable):", err);
      try {
        const fallback = await uploadDriveAttachmentFallback({ file, placementAdminId });
        setJdAttachment(fallback);
        toast.success("JD uploaded (fallback).");
      } catch (fallbackErr) {
        console.error("JD upload failed (fallback):", fallbackErr);
        const message = fallbackErr instanceof Error ? fallbackErr.message : "Upload failed.";
        toast.error(message);
        setJdAttachment(null);
        setJdUploadProgress(null);
      }
    } finally {
      setIsUploadingJd(false);
      setTimeout(() => setJdUploadProgress(null), 800);
    }
  };

  const handleJdRemove = () => {
    setJdAttachment(null);
    setIsUploadingJd(false);
    setJdUploadProgress(null);
    setJdInputKey((k) => k + 1);
  };

  const onSubmit = async (data: DriveFormValues) => {
    const placementAdminId = placementAdminRecord?.id ?? (user as { placementAdminId?: string })?.placementAdminId;
    const collegeId = placementAdminRecord?.collegeId ?? user?.collegeId;
    const institutionAdminId = placementAdminRecord?.institutionAdminId ?? user?.institutionAdminId;
    const placementAdminEmail = placementAdminRecord?.email;

    if (isUploadingJd) {
      toast.error("Please wait for the JD upload to finish before submitting.");
      return;
    }

    if (!user?.uid || !placementAdminId || !collegeId || !institutionAdminId) {
      toast.error("Missing context. Please ensure you are signed in as a placement admin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedDriveType =
        (data.driveType === "pool-campus" ? "pool" : data.driveType) as DriveType;
      const driveData = {
        collegeId,
        createdBy: user.uid,
        institutionAdminId,
        placementAdminId,
        placementAdminEmail,
        companyName: data.companyName,
        jdFileUrl: jdAttachment?.url ?? undefined,
        jdFileName: jdAttachment?.name ?? undefined,
        roles: data.roles.map((role, index) => ({
          id: `role-${index}`,
          title: role.roleName,
          ctc: role.compensation,
          location: role.location,
          eligibility: {
            branches: role.eligibleBranches,
            years: role.eligibleYears.map((y) => parseInt(y)),
            minCgpa: role.minCGPA ? parseFloat(role.minCGPA) : 0,
            maxBacklogs: role.allowBacklogs ? 10 : 0,
          },
          description: role.description?.trim() || undefined,
          additionalRequirements: role.additionalRequirements?.trim() || undefined,
          allowBacklogs: role.allowBacklogs,
          askPortfolio: role.askPortfolio,
          askGithub: role.askGithub,
          askLinkedIn: role.askLinkedIn,
          rounds: role.rounds
            ? role.rounds.map((r, roundIndex) => ({
                id: `role-${index}-round-${roundIndex}`,
                name: r.name,
                dateTime: r.date,
                mode: r.mode,
                status: "upcoming" as const,
              }))
            : [],
        })),
        driveType: normalizedDriveType,
        jobLocation: data.generalLocation,
        jd: data.roles.map((r) => r.description?.trim() || "").join("\n"),
        deadline: data.roles[0]?.deadline ? format(data.roles[0].deadline, "MMM dd, yyyy") : "",
        status: "upcoming" as const,
        rounds: [],
        totalApplications: 0,
        selectedStudents: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await createDrive(driveData);
      toast.success("Drive created successfully!");
      navigate("/admin");
    } catch (error) {
      console.error("Error creating drive:", error);
      toast.error("Failed to create drive. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const branches = ["CSE", "IT", "ECE", "ME", "CE", "EE", "MBA", "MCA"];
  const years = ["2024", "2025", "2026", "2027"];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Create New Placement Drive</h1>
          <p className="text-muted-foreground">Share all important details with your students in one place</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Company Overview</h3>
                      <p className="text-sm text-muted-foreground">Basic information about the organization</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Google, Microsoft" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="driveType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drive Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select drive type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="on-campus">On-campus</SelectItem>
                              <SelectItem value="off-campus">Off-campus</SelectItem>
                              <SelectItem value="pool-campus">Pool campus</SelectItem>
                              <SelectItem value="internship">Internship</SelectItem>
                              <SelectItem value="ppo">PPO</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Website (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://company.com/careers" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Attach JD (PDF, max 5MB)</FormLabel>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          key={jdInputKey}
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => handleJdFileChange(e.target.files?.[0])}
                          disabled={isUploadingJd}
                          className="sm:w-auto"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleJdRemove}
                        >
                          {jdAttachment ? "Remove JD" : "Clear"}
                        </Button>
                      </div>
                      {isUploadingJd && (
                        <p className="text-xs text-muted-foreground" aria-live="polite">
                          Uploading JD... {jdUploadProgress ?? 0}%
                        </p>
                      )}
                      {jdAttachment && (
                        <p className="text-sm text-muted-foreground">Uploaded: {jdAttachment.name}</p>
                      )}
                      <FormDescription>Optional upload if you want students to download the PDF JD.</FormDescription>
                    </div>

                    <FormField
                      control={form.control}
                      name="generalLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Location / HQ</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Bangalore, Remote" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Guidelines</h3>
                      <p className="text-sm text-muted-foreground">Roles can inherit these as reference values.</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground space-y-3">
                      <p>• Add one card per unique role/opening (SDE, Product, Internship, etc.).</p>
                      <p>• Each role can have its own eligibility, deadline, and process.</p>
                      <p>• You can duplicate information manually if multiple roles share the same criteria.</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Roles & Positions</h3>
                      <p className="text-sm text-muted-foreground">
                        Add every job role this company is hiring for in this drive.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => append(createEmptyRole())}
                      disabled={isLoadingPlacementAdmin || isSubmitting || !placementAdminRecord}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add another role
                    </Button>
                  </div>

                  {roleFields.map((field, index) => (
                    <RoleCard
                      key={field.id}
                      index={index}
                      field={field}
                      form={form}
                      branches={branches}
                      years={years}
                      onRemove={remove}
                      canRemove={roleFields.length > 1}
                    />
                  ))}
                </section>

                <div className="flex gap-4 justify-end pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate("/admin")}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                  >
                    {isSubmitting
                      ? "Creating..."
                      : isUploadingJd
                        ? `Uploading JD... ${jdUploadProgress ?? 0}%`
                        : "Create Drive"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateDrive;