import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCollegeByCode, addMemberToCollege } from "@/services/colleges";
import { updateUserProfile } from "@/services/user";
import { College } from "@/models/colleges";
import { getDashboardRouteForRole } from "@/models/users";
import { findPlacementAdminByCode } from "@/services/placementAdmins";
import Navigation from "@/components/Navigation";

const joinCollegeSchema = z.object({
  collegeCode: z
    .string()
    .min(3, "Please enter a valid college code")
    .transform((value) => value.toUpperCase().trim()),
  name: z.string().min(2, "Your name is required"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  rollNumber: z.string().min(1, "Roll number is required"),
  departmentCode: z
    .string()
    .min(3, "Department code is required")
    .transform((value) => value.toUpperCase().trim()),
});

export type JoinCollegeFormValues = z.infer<typeof joinCollegeSchema>;

export function JoinCollegeForm() {
  const [college, setCollege] = useState<College | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  const form = useForm<JoinCollegeFormValues>({
    resolver: zodResolver(joinCollegeSchema),
    defaultValues: {
      collegeCode: "",
      name: "",
      phone: "",
      rollNumber: "",
      departmentCode: "",
    },
  });

  const searchCollege = async (code: string) => {
    const normalized = code.toUpperCase().trim();
    if (!normalized) return;

    setIsSearching(true);
    try {
      const found = await getCollegeByCode(normalized);
      if (!found) {
        toast.error("We couldn't find a college with that code.");
        setCollege(null);
        return;
      }
      setCollege(found);
      toast.success(`College found: ${found.name}`);
    } catch (error) {
      console.error("Error searching college:", error);
      toast.error("Something went wrong while searching.");
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmit = async (data: JoinCollegeFormValues) => {
    if (!college) {
      toast.error("Please search and select a college before continuing.");
      return;
    }
    if (!user) {
      toast.error("You need to be logged in to continue.");
      return;
    }

    setIsSubmitting(true);
    let placementAdmin: {
      id: string;
      institutionAdminId: string;
      collegeId: string;
      department?: string;
      course?: string;
      departmentCode?: string;
      batchYear?: number;
    } | null = null;
    try {
      if (data.departmentCode) {
        const foundAdmin = await findPlacementAdminByCode({
          collegeId: college.id,
          departmentCode: data.departmentCode,
        });
        if (!foundAdmin || foundAdmin.collegeId !== college.id) {
          toast.error("Invalid department code for this college.");
          return;
        }
        placementAdmin = {
          id: foundAdmin.id,
          institutionAdminId: foundAdmin.institutionAdminId,
          collegeId: foundAdmin.collegeId,
          department: foundAdmin.department,
          course: foundAdmin.course,
          departmentCode: foundAdmin.departmentCode,
          batchYear: foundAdmin.batchYear,
        };
      }
    } catch (codeError) {
      console.error("Department code lookup failed", codeError);
      toast.error("Unable to validate department code. Try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const appliedBranch = placementAdmin?.department;
      const appliedCourse = placementAdmin?.course;
      const profileUpdates: Record<string, unknown> = {
        name: data.name,
        phoneNumber: data.phone,
        collegeId: college.id,
        role: "student",
        status: "joined",
        institutionAdminId: placementAdmin?.institutionAdminId ?? college.createdBy,
        branch: appliedBranch || undefined,
        course: appliedCourse || undefined,
        department: placementAdmin?.department || undefined,
        departmentCode: placementAdmin?.departmentCode || undefined,
        lockedAcademicProfile: placementAdmin ? true : undefined,
        rollNumber: data.rollNumber || undefined,
        passingYear: placementAdmin?.batchYear ?? undefined,
      };
      if (placementAdmin) {
        profileUpdates.placementAdminId = placementAdmin.id;
      }
      const cleaned = Object.fromEntries(
        Object.entries(profileUpdates).filter(([, value]) => value !== undefined)
      );
      await updateUserProfile(user.uid, cleaned as Parameters<typeof updateUserProfile>[1]);
      await addMemberToCollege(college.id, user.uid);
      await refreshUserProfile();
      toast.success("You're now part of the college. Redirecting...");
      navigate(getDashboardRouteForRole("student"), { replace: true });
    } catch (error) {
      console.error("Error joining college:", error);
      toast.error("Failed to join the college. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white relative isolate overflow-hidden">
      <Navigation showDashboardButton={false} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-sky-500/40 via-transparent to-transparent blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-sky-500/30 via-transparent to-transparent blur-3xl" />
      <div className="py-12 px-4">
        <div className="mx-auto max-w-4xl space-y-10 relative z-10">
          <div className="rounded-3xl border border-slate-200/40 bg-gradient-to-br from-sky-50/70 via-white to-transparent p-8 shadow-[0_25px_75px_rgba(59,130,246,0.15)] backdrop-blur dark:border-white/10 dark:bg-gradient-to-br dark:from-sky-900/30 dark:via-slate-900/80 dark:to-transparent dark:shadow-[0_25px_75px_rgba(59,130,246,0.35)]">
            <div className="flex flex-col gap-3 text-slate-900 dark:text-white">
              <p className="text-sm uppercase tracking-[0.4em] text-sky-500">College access</p>
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                Link your profile to a campus in seconds.
              </h1>
              <p className="text-base text-slate-700 dark:text-slate-200">
                Students can instantly join with the college code and department code provided by their institution.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/30 bg-white/90 p-8 shadow-[0_35px_95px_rgba(15,23,42,0.15)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_35px_95px_rgba(15,23,42,0.65)]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="collegeCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>College code</FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input placeholder="E.g. CSE1234" leftIcon={Search} {...field} />
                          </FormControl>
                          <Button type="button" onClick={() => searchCollege(field.value)} disabled={!field.value || isSearching}>
                            {isSearching ? "Searching..." : "Find college"}
                          </Button>
                        </div>
                        <FormMessage />
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Ask your institution administrator for the campus code if you don’t have it yet.
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="departmentCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department code</FormLabel>
                        <FormControl>
                          <Input placeholder="Provided by placement admin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {college && (
                    <div className="rounded-2xl border border-slate-200/40 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{college.name}</p>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Code: {college.code}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name (as per college)</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" leftIcon={User} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" leftIcon={Phone} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="rollNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll Number</FormLabel>
                          <FormControl>
                            <Input placeholder="21BCS123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200/50 pt-4 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Secure join flow</p>
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" className="text-slate-500" onClick={() => window.history.back()}>
                      Back
                    </Button>
                    <Button type="submit" disabled={!college || isSubmitting}>
                      {isSubmitting ? "Joining..." : "Join College"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
