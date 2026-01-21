import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  Phone,
  GraduationCap,
  Hash,
  CheckCircle2,
  BookOpen,
  BookMarked,
  TrendingUp,
  ListChecks,
  Clock3,
} from "lucide-react";
import { updateUserProfile } from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import FullScreenLoader from "@/components/ui/full-screen-loader";
import { PlacementAdminUser, StudentUser } from "@/models/users";
import { emailPattern } from "@/lib/validation";

const studentProfileSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    rollNumber: z.string().min(1, "University roll number is required"),
    course: z.string().min(1, "Course is required"),
    branch: z.string().min(1, "Branch is required"),
    passingYear: z.coerce.number().min(2020).max(2035, "Invalid passing year"),
    academicScoreType: z.enum(["cgpa", "percentage"]),
    class10Score: z.coerce.number().min(0),
    class12Score: z.coerce.number().min(0),
    currentCgpa: z.coerce.number().min(0),
    backlogCount: z.coerce.number().min(0).max(50, "Enter backlogs between 0 and 50"),
    academicGapYears: z.coerce.number().min(0).max(10, "Enter gap between 0 and 10 years"),
    personalEmail: z.string().regex(emailPattern, "Valid personal email is required").optional().or(z.literal("")),
    phoneNumber: z.string().min(10, "Valid phone number is required").optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const maxScore = data.academicScoreType === "percentage" ? 100 : 10;
    if (data.class10Score > maxScore) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["class10Score"], message: `Must be <= ${maxScore}` });
    }
    if (data.class12Score > maxScore) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["class12Score"], message: `Must be <= ${maxScore}` });
    }
    if (data.currentCgpa > maxScore) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["currentCgpa"], message: `Must be <= ${maxScore}` });
    }
  });

type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;

const placementAdminProfileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  personalEmail: z.string().regex(emailPattern, "Valid personal email is required").optional().or(z.literal("")),
  phoneNumber: z.string().min(10, "Valid phone number is required").optional().or(z.literal("")),
});

type PlacementAdminProfileFormValues = z.infer<typeof placementAdminProfileSchema>;

const branches = ["CSE", "IT", "ECE", "ME", "CE", "EE", "MBA", "MCA", "BBA", "BCA"];
const courses = ["B.Tech", "M.Tech", "BBA", "MBA", "BCA", "MCA", "B.Sc", "M.Sc"];
const currentYear = new Date().getFullYear();
const passingYearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

interface StudentProfileFormProps {
  user: StudentUser;
  onProfileRefresh: () => Promise<void>;
}

const StudentProfileForm = ({ user, onProfileRefresh }: StudentProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAcademicsEditable = false; // academic details are placement-admin managed
  const form = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      name: user.name || "",
      rollNumber: user.rollNumber || "",
      course: user.course || "",
      branch: user.branch || "",
      passingYear: user.passingYear || currentYear,
      academicScoreType: user.academicScoreType || "cgpa",
      class10Score: user.class10Score ?? 0,
      class12Score: user.class12Score ?? 0,
      currentCgpa: user.currentCgpa ?? 0,
      backlogCount: user.backlogCount ?? 0,
      academicGapYears: user.academicGapYears ?? 0,
      personalEmail: user.personalEmail || "",
      phoneNumber: user.phoneNumber || "",
    },
  });

  const isAcademicsLocked = Boolean(user.lockedAcademicProfile || !isAcademicsEditable);
  const scoreType = form.watch("academicScoreType") || "cgpa";
  const scoreMax = scoreType === "percentage" ? 100 : 10;
  const scoreStep = scoreType === "percentage" ? 0.1 : 0.01;
  const extendedCourseOptions = useMemo(() => {
    if (!user.course) return [...courses];
    const base = [...courses];
    if (!base.includes(user.course)) {
      base.push(user.course);
    }
    return base;
  }, [user.course]);
  const extendedBranchOptions = useMemo(() => {
    if (!user.branch) return [...branches];
    const base = [...branches];
    if (!base.includes(user.branch)) {
      base.push(user.branch);
    }
    return base;
  }, [user.branch]);

  useEffect(() => {
    form.reset({
      name: user.name || "",
      rollNumber: user.rollNumber || "",
      course: user.course || "",
      branch: user.branch || "",
      passingYear: user.passingYear || currentYear,
      academicScoreType: user.academicScoreType || "cgpa",
      class10Score: user.class10Score ?? 0,
      class12Score: user.class12Score ?? 0,
      currentCgpa: user.currentCgpa ?? 0,
      backlogCount: user.backlogCount ?? 0,
      academicGapYears: user.academicGapYears ?? 0,
      personalEmail: user.personalEmail || "",
      phoneNumber: user.phoneNumber || "",
    });
  }, [form, user]);

  const onSubmit = async (data: StudentProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await updateUserProfile(user.uid, {
        name: data.name,
        rollNumber: data.rollNumber,
        course: data.course,
        branch: data.branch,
        passingYear: data.passingYear,
        academicScoreType: data.academicScoreType,
        class10Score: data.class10Score,
        class12Score: data.class12Score,
        currentCgpa: data.currentCgpa,
        backlogCount: data.backlogCount,
        academicGapYears: data.academicGapYears,
        personalEmail: data.personalEmail || undefined,
        phoneNumber: data.phoneNumber || undefined,
      });
      await onProfileRefresh();
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Full Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rollNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  University Roll Number
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 2021CSE001" {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="course"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Course
                </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value}
                    disabled={isAcademicsLocked}
                  >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your course" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {extendedCourseOptions.map((courseOption) => (
                      <SelectItem key={courseOption} value={courseOption}>
                        {courseOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAcademicsLocked && (
                  <p className="text-xs text-slate-500">Your course is locked by the invite code provided by your institution admin.</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="branch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value)}
                  value={field.value}
                  disabled={isAcademicsLocked}
                  >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {extendedBranchOptions.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAcademicsLocked && (
                  <p className="text-xs text-slate-500">Your branch is locked by the invite code provided by your institution admin.</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passingYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passing Year</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                  disabled={isAcademicsLocked}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select passing year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {passingYearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAcademicsLocked && (
                  <p className="text-xs text-slate-500">Your passing year is locked by the invite code provided by your institution admin.</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="academicScoreType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Score Format
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cgpa">CGPA (out of 10)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="class10Score"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Class 10 / SSC / Matric (X) %
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={scoreStep}
                    min="0"
                    max={scoreMax}
                    placeholder={scoreType === "percentage" ? "e.g., 85.5" : "e.g., 8.5"}
                    {...field}
                    disabled
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="class12Score"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4" />
                  Class 12 / HSC / PUC / Intermediate (XII) %
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={scoreStep}
                    min="0"
                    max={scoreMax}
                    placeholder={scoreType === "percentage" ? "e.g., 88.0" : "e.g., 8.8"}
                    {...field}
                    disabled
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currentCgpa"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  College Score (CGPA or %)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={scoreStep}
                    min="0"
                    max={scoreMax}
                    placeholder={scoreType === "percentage" ? "e.g., 82.5" : "e.g., 8.25"}
                    {...field}
                    disabled
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="backlogCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Active Backlogs (count)
                </FormLabel>
                <FormControl>
                  <Input type="number" step="1" min="0" max="50" placeholder="0" {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="academicGapYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Academic Gap (years)
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.5" min="0" max="10" placeholder="0" {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Academic records</p>
          <p className="text-slate-500">These academic details are managed by your placement admin. If anything looks wrong, please contact your placement cell to update them.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="personalEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Personal Email
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="yourname@gmail.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+91 9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

interface PlacementAdminProfileFormProps {
  user: PlacementAdminUser;
  onProfileRefresh: () => Promise<void>;
}

const PlacementAdminProfileForm = ({ user, onProfileRefresh }: PlacementAdminProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<PlacementAdminProfileFormValues>({
    resolver: zodResolver(placementAdminProfileSchema),
    defaultValues: {
      name: user.name || "",
      employeeId: user.employeeId || "",
      personalEmail: user.personalEmail || "",
      phoneNumber: user.phoneNumber || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: user.name || "",
      employeeId: user.employeeId || "",
      personalEmail: user.personalEmail || "",
      phoneNumber: user.phoneNumber || "",
    });
  }, [form, user]);

  const onSubmit = async (data: PlacementAdminProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await updateUserProfile(user.uid, {
        name: data.name,
        employeeId: data.employeeId,
        personalEmail: data.personalEmail || undefined,
        phoneNumber: data.phoneNumber || undefined,
      });
      await onProfileRefresh();
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Full Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Employee ID
                </FormLabel>
                <FormControl>
                  <Input placeholder="PA-123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="personalEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Personal Email
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="yourname@gmail.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+91 9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Department assignment</p>
          <p className="text-slate-500">
            Your department and college mapping is locked from the invite and is managed by your institution administrator.
          </p>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

const ProfilePage = () => {
  const { user, isLoading, refreshUserProfile } = useAuth();

  if (isLoading) {
    return <FullScreenLoader message="Loading profile..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Unable to load profile. Please sign in again.</p>
        </div>
      </div>
    );
  }

  const isPlacementAdmin = user.role === "placement-admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Card className="border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">My Profile</CardTitle>
                <CardDescription>
                  {isPlacementAdmin
                    ? "Keep your placement admin info current. Your department assignment cannot be changed here."
                    : "Manage your academic details so placement admins have the latest info."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isPlacementAdmin ? (
              <PlacementAdminProfileForm user={user as PlacementAdminUser} onProfileRefresh={refreshUserProfile} />
            ) : (
              <StudentProfileForm user={user as StudentUser} onProfileRefresh={refreshUserProfile} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
