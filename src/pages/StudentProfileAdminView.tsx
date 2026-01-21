import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  ArrowLeft,
} from "lucide-react";
import { getUserDoc, updateUserProfile } from "@/services/user";
import { StudentUser } from "@/models/users";
import { emailPattern } from "@/lib/validation";
import FullScreenLoader from "@/components/ui/full-screen-loader";

const studentAdminSchema = z
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

type StudentAdminFormValues = z.infer<typeof studentAdminSchema>;

const branches = ["CSE", "IT", "ECE", "ME", "CE", "EE", "MBA", "MCA", "BBA", "BCA"];
const courses = ["B.Tech", "M.Tech", "BBA", "MBA", "BCA", "MCA", "B.Sc", "M.Sc"];
const currentYear = new Date().getFullYear();
const passingYearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

const StudentProfileAdminView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<StudentAdminFormValues>({
    resolver: zodResolver(studentAdminSchema),
    defaultValues: {
      name: "",
      rollNumber: "",
      course: "",
      branch: "",
      passingYear: currentYear,
      academicScoreType: "cgpa",
      class10Score: 0,
      class12Score: 0,
      currentCgpa: 0,
      backlogCount: 0,
      academicGapYears: 0,
      personalEmail: "",
      phoneNumber: "",
    },
  });

  const scoreType = form.watch("academicScoreType") || "cgpa";
  const scoreMax = scoreType === "percentage" ? 100 : 10;
  const scoreStep = scoreType === "percentage" ? 0.1 : 0.01;

  const { data: student, isLoading, error } = useQuery<StudentUser | null>({
    queryKey: ["student-admin-profile", id],
    queryFn: async () => {
      if (!id) return null;
      const user = await getUserDoc(id);
      if (!user || user.role !== "student") return null;
      return user as StudentUser;
    },
    enabled: Boolean(id),
  });

  const extendedCourseOptions = useMemo(() => {
    if (!student?.course) return [...courses];
    const base = [...courses];
    if (!base.includes(student.course)) base.push(student.course);
    return base;
  }, [student?.course]);

  const extendedBranchOptions = useMemo(() => {
    if (!student?.branch) return [...branches];
    const base = [...branches];
    if (!base.includes(student.branch)) base.push(student.branch);
    return base;
  }, [student?.branch]);

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name || "",
        rollNumber: student.rollNumber || "",
        course: student.course || "",
        branch: student.branch || "",
        passingYear: student.passingYear || currentYear,
        academicScoreType: student.academicScoreType || "cgpa",
        class10Score: student.class10Score ?? 0,
        class12Score: student.class12Score ?? 0,
        currentCgpa: student.currentCgpa ?? 0,
        backlogCount: student.backlogCount ?? 0,
        academicGapYears: student.academicGapYears ?? 0,
        personalEmail: student.personalEmail || "",
        phoneNumber: student.phoneNumber || "",
      });
    }
  }, [form, student]);

  const onSubmit = async (data: StudentAdminFormValues) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await updateUserProfile(id, {
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
      await queryClient.invalidateQueries({ queryKey: ["placement-admin-students"] });
      await queryClient.invalidateQueries({ queryKey: ["student-admin-profile", id] });
      toast.success("Student profile updated");
    } catch (err) {
      console.error("Error updating student profile:", err);
      toast.error("Failed to update student profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FullScreenLoader message="Loading student profile..." />;
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Unable to load student profile.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Students
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Edit Student Profile</CardTitle>
                <CardDescription>Update academic details for {student.name || "this student"}.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                          <Input placeholder="Enter full name" {...field} />
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
                          <Input placeholder="e.g., 2021CSE001" {...field} />
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
                        <Select onValueChange={(value) => field.onChange(value)} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {extendedCourseOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={(value) => field.onChange(value)} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {extendedBranchOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                          <Input type="number" step="1" min="0" max="50" placeholder="0" {...field} />
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
                          <Input type="number" step="0.5" min="0" max="10" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        Save Changes
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
  );
};

export default StudentProfileAdminView;
