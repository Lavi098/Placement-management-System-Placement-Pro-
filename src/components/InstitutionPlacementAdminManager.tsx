import { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { createPlacementAdminDraft, getPlacementAdminsForCollege, PlacementAdminRecord } from "@/services/placementAdmins";
import { emailPattern, namePattern, employeeIdPattern, batchYearPattern } from "@/lib/validation";

interface PlacementAdminEntry {
  id: string;
  name: string;
  email: string; // official college email
  employeeId?: string;
  course?: string;
  department?: string;
  status: "Active" | "Invited";
  lastActive: string;
  departmentCode?: string;
  inviteToken?: string;
  inviteExpiresAt?: Timestamp;
  batchYear?: number;
  createdByCurrentAdmin?: boolean;
}

const courseOptions = ["B.Tech", "M.Tech", "BBA", "MBA", "BCA", "MCA", "B.Sc", "M.Sc"];
const departmentOptionsByCourse: Record<string, string[]> = {
  "B.Tech": [
    "Computer Science",
    "Information Technology",
    "Electrical",
    "Electronics & Communication",
    "Mechanical",
    "Civil",
    "Chemical",
    "Aerospace",
    "Biomedical",
    "Metallurgical",
    "Production",
    "Industrial",
    "Environmental",
    "Instrumentation",
  ],
  "M.Tech": [
    "Computer Science",
    "Power Systems",
    "VLSI",
    "Thermal Engineering",
    "Control Systems",
    "Signal Processing",
    "Structural Engineering",
    "Data Science",
  ],
};

type PlacementFormState = {
  name: string;
  email: string;
  employeeId: string;
  department: string;
  course: string;
  batchYear: string;
};

const defaultFormState: PlacementFormState = {
  name: "",
  email: "",
  employeeId: "",
  department: "",
  course: "",
  batchYear: "",
};

type FieldValidationResult = {
  field: keyof PlacementFormState;
  message: string;
} | null;

const validatePlacementAdminInput = (
  formValues: PlacementFormState,
  availableDepartments: string[],
  currentYear: number
): FieldValidationResult => {
  if (!namePattern.test(formValues.name.trim())) {
    return {
      field: "name",
      message: "Name should only contain letters, spaces, periods, apostrophes, or hyphens.",
    };
  }
  if (!emailPattern.test(formValues.email.trim())) {
    return { field: "email", message: "Please enter a valid email address." };
  }
  const employeeId = formValues.employeeId.trim();
  if (employeeId && !employeeIdPattern.test(employeeId)) {
    return {
      field: "employeeId",
      message: "Employee ID should only include letters, numbers, or hyphens.",
    };
  }
  if (!courseOptions.includes(formValues.course)) {
    return { field: "course", message: "Please choose a valid course." };
  }
  if (availableDepartments.length > 0 && !availableDepartments.includes(formValues.department)) {
    return { field: "department", message: "Select a department from the provided list." };
  }
  if (!batchYearPattern.test(formValues.batchYear)) {
    return { field: "batchYear", message: "Batch year must be a four-digit number." };
  }
  const batchYearNumber = Number(formValues.batchYear);
  if (batchYearNumber < currentYear || batchYearNumber > currentYear + 5) {
    return {
      field: "batchYear",
      message: "Batch year should fall within the next five years.",
    };
  }
  return null;
};

const PlacementAdminManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<PlacementAdminEntry[]>([]);
  const [form, setForm] = useState<PlacementFormState>(defaultFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PlacementFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const collegeId = user?.collegeId;
  const institutionAdminId = user?.institutionAdminId ?? user?.uid;

  const activeCount = useMemo(() => admins.filter((admin) => admin.status === "Active").length, [admins]);
  const pendingCount = useMemo(() => admins.filter((admin) => admin.status === "Invited").length, [admins]);

  const handleChange = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const availableDepartments = departmentOptionsByCourse[form.course] ?? [];
  const requiresDepartment = availableDepartments.length > 0;
  const currentYear = new Date().getFullYear();
  const batchYearOptions = Array.from({ length: 6 }, (_, idx) => currentYear + idx);

  useEffect(() => {
    if (!collegeId) {
      setAdmins([]);
      return;
    }

    let canceled = false;

    const loadAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const records: PlacementAdminRecord[] = await getPlacementAdminsForCollege(collegeId, institutionAdminId);
        records.sort((a, b) => {
          const aMillis = a.createdAt?.seconds ?? 0;
          const bMillis = b.createdAt?.seconds ?? 0;
          return bMillis - aMillis;
        });
        if (canceled) return;
        setAdmins(
          records.map((record) => ({
            id: record.id,
            name: record.name,
            email: record.email,
            employeeId: record.employeeId,
            course: record.course,
            department: record.department,
            departmentCode: record.departmentCode,
            inviteToken: record.inviteToken,
            inviteExpiresAt: record.inviteExpiresAt,
            status: record.status === "active" ? "Active" : "Invited",
            lastActive: record.status === "active" ? "Active just now" : "Invited just now",
            batchYear: record.batchYear,
            createdByCurrentAdmin: record.institutionAdminId === institutionAdminId,
          }))
        );
      } catch (error) {
        console.error("Failed to load placement admins", error);
        toast({
          title: "Unable to load admins",
          description: "We couldn’t fetch placement admins. Try refreshing in a bit.",
        });
      } finally {
        if (!canceled) {
          setLoadingAdmins(false);
        }
      }
    };

    loadAdmins();

    return () => {
      canceled = true;
    };
  }, [collegeId, institutionAdminId, toast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.course.trim() ||
      (requiresDepartment && !form.department.trim()) ||
      !form.batchYear.trim()
    ) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields before inviting.",
      });
      return;
    }

    const formatError = validatePlacementAdminInput(form, availableDepartments, currentYear);
    if (formatError) {
      setFieldErrors({ [formatError.field]: formatError.message });
      toast({ title: "Invalid input", description: formatError.message });
      return;
    }

    if (!collegeId) {
      toast({
        title: "Missing context",
        description: "Your institution context is still loading. Please try again in a moment.",
      });
      return;
    }

    if (!institutionAdminId) {
      toast({
        title: "Missing admin context",
        description: "Institution admin data is still resolving. Please refresh and try again.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const record = await createPlacementAdminDraft({
        collegeId: collegeId,
        institutionAdminId,
        name: form.name.trim(),
        email: form.email.trim(),
        course: form.course.trim(),
        department: form.department.trim() || "Placement",
        employeeId: form.employeeId.trim() || undefined,
        batchYear: Number(form.batchYear) || undefined,
        status: "invited",
      });

      const newAdmin: PlacementAdminEntry = {
        id: record.id,
        name: record.name,
        email: record.email,
        employeeId: record.employeeId ?? (form.employeeId.trim() || undefined),
        course: record.course,
        department: record.department,
        departmentCode: record.departmentCode,
        inviteToken: record.inviteToken,
        inviteExpiresAt: record.inviteExpiresAt,
        status: "Invited",
        lastActive: "Invited just now",
        batchYear: record.batchYear,
        createdByCurrentAdmin: true,
      };

      setAdmins((prev) => [newAdmin, ...prev]);
      setForm({
        name: "",
        email: "",
        employeeId: "",
        department: "",
        course: "",
        batchYear: "",
      });

      toast({
        title: "Admin added",
        description: `${newAdmin.name} is now queued for onboarding.`,
      });
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create placement admin", error);
      const alreadyExists = error instanceof Error && error.message.includes("already exists");
      toast({
        title: alreadyExists ? "Admin already exists" : "Failed to add admin",
        description: alreadyExists
          ? "An admin with that email is already registered. Check the list above or use a different email."
          : "We couldn’t save this admin to the database. Try again or contact support.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: "",
      email: "",
      employeeId: "",
      department: "",
      course: "",
      batchYear: "",
    });
    setSubmitting(false);
  };

  const copyInviteLink = async (token: string) => {
    if (!token) return;
    const inviteUrl = `${window.location.origin}/signup?inviteToken=${encodeURIComponent(token)}`;
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({
        title: "Copy unavailable",
        description: "Clipboard access is not available. Please copy the invite link manually:",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Invite link copied",
        description: "Send it to the placement admin so they can finish sign-up.",
      });
    } catch (error) {
      console.error("Failed to copy invite link", error);
      toast({
        title: "Copy failed",
        description: "Could not copy the link. Please copy it manually:",
      });
    }
  };

  return (
    <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Placement admins</CardTitle>
            <CardDescription>Manage all admins that represent your institution on placement drives.</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Badge className="border-slate-200 text-slate-600 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">Active {activeCount}</Badge>
            <Badge className="border-slate-200 text-primary bg-white/70 dark:border-slate-800 dark:bg-slate-900/60">Pending {pendingCount}</Badge>
          </div>
        </div>
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) {
              handleCancel();
            }
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">Add admin</Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[1400px] max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Add placement admin</DialogTitle>
                <DialogDescription>Provide the name, program, and department to queue them for onboarding.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="max-h-[70vh] overflow-y-auto rounded-3xl border-2 border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_24px_55px_rgba(15,23,42,0.20)] dark:border-slate-800/60 dark:from-slate-900/70 dark:to-slate-950/80">
                  <div className="grid gap-6 pr-1 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="placement-name">Name</Label>
                      <Input
                        id="placement-name"
                        value={form.name}
                        onChange={handleChange("name")}
                        placeholder="Ex: Neha Jose"
                        className="h-12"
                        aria-invalid={!!fieldErrors.name}
                      />
                      {fieldErrors.name && (
                        <p className="text-xs text-destructive" role="alert">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placement-email">Official college email</Label>
                      <Input
                        id="placement-email"
                        type="email"
                        value={form.email}
                        onChange={handleChange("email")}
                        placeholder="placement@college.edu"
                        className="h-12"
                        aria-invalid={!!fieldErrors.email}
                      />
                      {fieldErrors.email && (
                        <p className="text-xs text-destructive" role="alert">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placement-employee">Employee ID</Label>
                      <Input id="placement-employee" value={form.employeeId} onChange={handleChange("employeeId")} placeholder="Optional" className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placement-course">Course / Program</Label>
                      <Select
                        value={form.course}
                        onValueChange={(value) => {
                          const nextDepartments = departmentOptionsByCourse[value] ?? [];
                          setForm((prev) => ({
                            ...prev,
                            course: value,
                            department: nextDepartments.includes(prev.department) ? prev.department : "",
                          }));
                        }}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courseOptions.map((course) => (
                            <SelectItem key={course} value={course}>
                              {course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {availableDepartments.length > 0 && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="placement-department">Department</Label>
                        <Select
                          value={form.department}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, department: value }))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent position="popper" side="bottom" sideOffset={8} align="start">
                            {availableDepartments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="placement-batch-year">Batch Year</Label>
                      <Select
                        value={form.batchYear}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, batchYear: value }))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select batch year" />
                        </SelectTrigger>
                        <SelectContent>
                          {batchYearOptions.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="submit"
                    className="bg-primary text-white hover:bg-primary/90 flex items-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? "Creating admin..." : "Create admin"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {loadingAdmins ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading placement admins…</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No placement admins yet. Add one to get started.</p>
          ) : (
            admins.map((admin) => {
              const inviteToken = admin.inviteToken;
              return (
                <div
                  key={admin.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{admin.name}</p>
                      {admin.createdByCurrentAdmin && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-[0.3em]">
                          Created by you
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{admin.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Employee ID: {admin.employeeId}</p>
                    {admin.course && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Course: {admin.course}</p>
                    )}
                    {admin.batchYear && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Batch: {admin.batchYear}</p>
                    )}
                    {admin.departmentCode && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Department code: {admin.departmentCode}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">Department: {admin.department ?? "Placement Cell"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <Badge
                      variant="outline"
                      className={
                        admin.status === "Active"
                          ? "border-emerald-500 text-emerald-500"
                          : "border-primary text-primary"
                      }
                    >
                      {admin.status}
                    </Badge>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{admin.lastActive}</p>
                    {admin.status === "Invited" && (
                      <div className="flex flex-col items-end gap-1">
                        <Button variant="ghost" className="text-primary text-[12px] font-semibold">
                          Remind invite
                        </Button>
                        {inviteToken && (
                          <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <p>
                              Invite expires {admin.inviteExpiresAt ? admin.inviteExpiresAt.toDate().toLocaleString() : "soon"}
                            </p>
                            <Button
                              variant="outline"
                              className="text-[12px] font-semibold"
                              onClick={() => copyInviteLink(inviteToken)}
                            >
                              Copy invite link
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlacementAdminManager;
