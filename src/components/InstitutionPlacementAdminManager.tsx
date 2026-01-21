import { useEffect, useMemo, useState, FormEvent } from "react";
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
import { getCollegeById } from "@/services/colleges";
import { sendEmailViaFunction } from "@/services/email/client";
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

type RowValidationResult =
  | { type: "course" | "department"; message: string }
  | { type: "row"; index: number; field: keyof PlacementAdminRow; message: string }
  | null;

const validatePlacementAdminRow = (
  row: PlacementAdminRow,
  availableDepartments: string[],
  currentYear: number,
  course: string,
  department: string,
  index: number
): RowValidationResult => {
  if (!courseOptions.includes(course)) {
    return { type: "course", message: "Please choose a valid course." };
  }
  if (availableDepartments.length > 0 && !availableDepartments.includes(department)) {
    return { type: "department", message: "Select a department from the provided list." };
  }
  if (!namePattern.test(row.name.trim())) {
    return {
      type: "row",
      index,
      field: "name",
      message: "Name should only contain letters, spaces, periods, apostrophes, or hyphens.",
    };
  }
  if (!emailPattern.test(row.email.trim())) {
    return { type: "row", index, field: "email", message: "Please enter a valid email address." };
  }
  const employeeId = row.employeeId.trim();
  if (employeeId && !employeeIdPattern.test(employeeId)) {
    return {
      type: "row",
      index,
      field: "employeeId",
      message: "Employee ID should only include letters, numbers, or hyphens.",
    };
  }
  if (!batchYearPattern.test(row.batchYear)) {
    return { type: "row", index, field: "batchYear", message: "Batch year must be a four-digit number." };
  }
  const batchYearNumber = Number(row.batchYear);
  if (batchYearNumber < currentYear || batchYearNumber > currentYear + 5) {
    return {
      type: "row",
      index,
      field: "batchYear",
      message: "Batch year should fall within the next five years.",
    };
  }
  return null;
};

type PlacementAdminRow = {
  name: string;
  email: string;
  employeeId: string;
  batchYear: string;
};

type PlacementFormState = {
  course: string;
  department: string;
  admins: PlacementAdminRow[];
};

const defaultAdminRow: PlacementAdminRow = {
  name: "",
  email: "",
  employeeId: "",
  batchYear: "",
};

const createDefaultFormState = (): PlacementFormState => ({
  course: "",
  department: "",
  admins: [{ ...defaultAdminRow }],
});

type PlacementFieldErrors = {
  course?: string;
  department?: string;
  adminRows: Record<number, Partial<Record<keyof PlacementAdminRow, string>>>;
};

const PlacementAdminManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<PlacementAdminEntry[]>([]);
  const [form, setForm] = useState<PlacementFormState>(createDefaultFormState());
  const [fieldErrors, setFieldErrors] = useState<PlacementFieldErrors>({ adminRows: {} });
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [collegeName, setCollegeName] = useState<string | undefined>();
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const collegeId = user?.collegeId;
  const institutionAdminId = user?.institutionAdminId ?? user?.uid;

  const activeCount = useMemo(() => admins.filter((admin) => admin.status === "Active").length, [admins]);
  const pendingCount = useMemo(() => admins.filter((admin) => admin.status === "Invited").length, [admins]);

  const availableDepartments = departmentOptionsByCourse[form.course] ?? [];
  const requiresDepartment = availableDepartments.length > 0;
  const currentYear = new Date().getFullYear();
  const batchYearOptions = Array.from({ length: 6 }, (_, idx) => currentYear + idx);

  const resetFieldErrors = () => setFieldErrors({ course: undefined, department: undefined, adminRows: {} });

  const updateAdminRow = (index: number, field: keyof PlacementAdminRow, value: string) => {
    setForm((prev) => {
      const nextAdmins = prev.admins.map((row, idx) => (idx === index ? { ...row, [field]: value } : row));
      return { ...prev, admins: nextAdmins };
    });
    setFieldErrors((prev) => {
      const next = { ...prev.adminRows };
      if (next[index]) {
        const updatedRowErrors = { ...next[index] };
        delete updatedRowErrors[field];
        next[index] = updatedRowErrors;
      }
      return { ...prev, adminRows: next };
    });
  };

  const addAdminRow = () => {
    setForm((prev) => ({ ...prev, admins: [...prev.admins, { ...defaultAdminRow }] }));
  };

  const removeAdminRow = (index: number) => {
    if (form.admins.length <= 1) return;
    setForm((prev) => ({ ...prev, admins: prev.admins.filter((_, idx) => idx !== index) }));
    setFieldErrors((prev) => {
      const next = { ...prev.adminRows };
      delete next[index];
      return { ...prev, adminRows: next };
    });
  };

  const handleCourseChange = (value: string) => {
    setForm((prev) => ({ ...prev, course: value, department: "" }));
    resetFieldErrors();
  };

  const handleDepartmentChange = (value: string) => {
    setForm((prev) => ({ ...prev, department: value }));
    setFieldErrors((prev) => ({ ...prev, department: undefined }));
  };

  useEffect(() => {
    let canceled = false;
    const loadCollege = async () => {
      if (!collegeId) {
        setCollegeName(undefined);
        return;
      }
      try {
        const college = await getCollegeById(collegeId);
        if (!canceled) {
          setCollegeName(college?.name);
        }
      } catch (error) {
        console.error("Failed to load college info", error);
        if (!canceled) {
          setCollegeName(undefined);
        }
      }
    };
    loadCollege();
    return () => {
      canceled = true;
    };
  }, [collegeId]);

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
    resetFieldErrors();

    const errors: PlacementFieldErrors = { adminRows: {} };
    let firstErrorMessage: string | undefined;

    if (!collegeId) {
      toast({ title: "Missing context", description: "College is still loading. Please try again in a moment." });
      return;
    }

    if (!institutionAdminId) {
      toast({ title: "Missing admin context", description: "Institution admin data is still resolving. Please refresh." });
      return;
    }

    if (!form.course) {
      errors.course = "Please choose a course.";
      firstErrorMessage = firstErrorMessage ?? errors.course;
    }

    if (requiresDepartment && !form.department.trim()) {
      errors.department = "Select a department.";
      firstErrorMessage = firstErrorMessage ?? errors.department;
    }

    form.admins.forEach((row, idx) => {
      const validation = validatePlacementAdminRow(
        row,
        availableDepartments,
        currentYear,
        form.course,
        form.department,
        idx
      );

      if (validation) {
        if (validation.type === "row") {
          errors.adminRows[idx] = {
            ...errors.adminRows[idx],
            [validation.field]: validation.message,
          };
          firstErrorMessage = firstErrorMessage ?? validation.message;
        }
        if (validation.type === "course") {
          errors.course = validation.message;
          firstErrorMessage = firstErrorMessage ?? validation.message;
        }
        if (validation.type === "department") {
          errors.department = validation.message;
          firstErrorMessage = firstErrorMessage ?? validation.message;
        }
      }
    });

    if (firstErrorMessage) {
      setFieldErrors(errors);
      toast({ title: "Check details", description: firstErrorMessage });
      return;
    }

    setSubmitting(true);
    try {
      const creationResults = await Promise.allSettled(
        form.admins.map((row) =>
          createPlacementAdminDraft({
            collegeId,
            institutionAdminId,
            name: row.name.trim(),
            email: row.email.trim(),
            course: form.course.trim(),
            department: form.department.trim() || "Placement",
            employeeId: row.employeeId.trim() || undefined,
            batchYear: Number(row.batchYear) || undefined,
            status: "invited",
          })
        )
      );

      const newlyCreated: PlacementAdminEntry[] = [];
      const creationErrors: string[] = [];

      creationResults.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          const record = result.value;
          const sourceRow = form.admins[idx];
          newlyCreated.push({
            id: record.id,
            name: record.name,
            email: record.email,
            employeeId: record.employeeId ?? (sourceRow?.employeeId || undefined),
            course: record.course,
            department: record.department,
            departmentCode: record.departmentCode,
            inviteToken: record.inviteToken,
            inviteExpiresAt: record.inviteExpiresAt,
            status: "Invited",
            lastActive: "Invited just now",
            batchYear: record.batchYear,
            createdByCurrentAdmin: true,
          });
        } else {
          const row = form.admins[idx];
          const label = row.email || row.name || `Admin ${idx + 1}`;
          const message = result.reason instanceof Error ? result.reason.message : "Failed to create admin.";
          creationErrors.push(`${label}: ${message}`);
        }
      });

      if (newlyCreated.length > 0) {
        setAdmins((prev) => [...newlyCreated, ...prev]);
        await Promise.allSettled(newlyCreated.map((admin) => sendInviteEmail(admin, { skipSuccessToast: true })));
        toast({
          title: newlyCreated.length > 1 ? "Invites sent" : "Invite sent",
          description: `Sent invite to ${newlyCreated.length} admin${newlyCreated.length > 1 ? "s" : ""}.`,
        });
        setForm(createDefaultFormState());
        setDialogOpen(false);
      }

      if (creationErrors.length > 0) {
        toast({
          title: "Some admins not added",
          description: creationErrors.join(" | "),
        });
      }
    } catch (error) {
      console.error("Failed to create placement admins", error);
      toast({
        title: "Failed to add admins",
        description: "We couldn’t save these admins. Try again or contact support.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForm(createDefaultFormState());
    resetFieldErrors();
    setSubmitting(false);
  };

  const getInviteLink = (token: string) => `${window.location.origin}/signup?inviteToken=${encodeURIComponent(token)}`;

  const sendInviteEmail = async (
    admin: PlacementAdminEntry,
    options?: { asReminder?: boolean; skipSuccessToast?: boolean }
  ) => {
    const token = admin.inviteToken;
    if (!token) {
      toast({
        title: "Invite link not ready",
        description: "Please refresh and try again, or copy the link manually.",
      });
      return;
    }

    const inviteLink = getInviteLink(token);
    const expiresAtString = admin.inviteExpiresAt?.toDate().toLocaleString();

    if (options?.asReminder) {
      setSendingInviteId(admin.id);
    }

    try {
      await sendEmailViaFunction({
        to: admin.email,
        template: "invite",
        vars: {
          adminName: admin.name,
          inviteLink,
          collegeName,
          expiresAt: expiresAtString,
        },
      });

      if (!options?.skipSuccessToast) {
        toast({
          title: options?.asReminder ? "Reminder sent" : "Invite sent",
          description: `We emailed ${admin.email} with their invite link.`,
        });
      }
    } catch (error) {
      console.error("Failed to send placement admin invite email", error);
      toast({
        title: "Email not sent",
        description: "We could not send the invite email. You can copy the link and share it manually.",
      });
    } finally {
      if (options?.asReminder) {
        setSendingInviteId(null);
      }
    }
  };

  const copyInviteLink = async (token: string) => {
    if (!token) return;
    const inviteUrl = getInviteLink(token);
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
                      <Label htmlFor="placement-course">Course / Program</Label>
                      <Select value={form.course} onValueChange={handleCourseChange}>
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
                      {fieldErrors.course && (
                        <p className="text-xs text-destructive" role="alert">
                          {fieldErrors.course}
                        </p>
                      )}
                    </div>

                    {availableDepartments.length > 0 && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="placement-department">Department</Label>
                        <Select value={form.department} onValueChange={handleDepartmentChange}>
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
                        {fieldErrors.department && (
                          <p className="text-xs text-destructive" role="alert">
                            {fieldErrors.department}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-4">
                    {form.admins.map((adminRow, index) => {
                      const rowErrors = fieldErrors.adminRows[index] || {};
                      return (
                        <div
                          key={`admin-row-${index}`}
                          className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span>
                              <span>Placement admin</span>
                            </div>
                            {index > 0 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeAdminRow(index)}>
                                Remove
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={adminRow.name}
                                onChange={(e) => updateAdminRow(index, "name", e.target.value)}
                                placeholder="Ex: Neha Jose"
                                className="h-12"
                                aria-invalid={!!rowErrors.name}
                              />
                              {rowErrors.name && (
                                <p className="text-xs text-destructive" role="alert">
                                  {rowErrors.name}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Official college email</Label>
                              <Input
                                type="email"
                                value={adminRow.email}
                                onChange={(e) => updateAdminRow(index, "email", e.target.value)}
                                placeholder="placement@college.edu"
                                className="h-12"
                                aria-invalid={!!rowErrors.email}
                              />
                              {rowErrors.email && (
                                <p className="text-xs text-destructive" role="alert">
                                  {rowErrors.email}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Employee ID</Label>
                              <Input
                                value={adminRow.employeeId}
                                onChange={(e) => updateAdminRow(index, "employeeId", e.target.value)}
                                placeholder="Optional"
                                className="h-12"
                                aria-invalid={!!rowErrors.employeeId}
                              />
                              {rowErrors.employeeId && (
                                <p className="text-xs text-destructive" role="alert">
                                  {rowErrors.employeeId}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Batch Year</Label>
                              <Select
                                value={adminRow.batchYear}
                                onValueChange={(value) => updateAdminRow(index, "batchYear", value)}
                              >
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select batch year" />
                                </SelectTrigger>
                                <SelectContent>
                                  {batchYearOptions.map((year) => (
                                    <SelectItem key={`${year}-${index}`} value={year.toString()}>
                                      {year}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {rowErrors.batchYear && (
                                <p className="text-xs text-destructive" role="alert">
                                  {rowErrors.batchYear}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button type="button" variant="secondary" onClick={addAdminRow} className="w-full md:w-auto">
                      Add another admin
                    </Button>
                  </div>
                </div>
                <DialogFooter className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="submit"
                    className="bg-primary text-white hover:bg-primary/90 flex items-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? "Sending invite..." : "Send invite"}
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
                        <Button
                          variant="ghost"
                          className="text-primary text-[12px] font-semibold"
                          onClick={() => sendInviteEmail(admin, { asReminder: true })}
                          disabled={sendingInviteId === admin.id}
                        >
                          {sendingInviteId === admin.id ? "Sending..." : "Remind invite"}
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
