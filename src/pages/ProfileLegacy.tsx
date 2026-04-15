import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, User as UserIcon, Mail, Phone, GraduationCap, Hash, Save } from "lucide-react";
import { updateUserProfile, getUserDoc } from "@/services/user";
import { User } from "@/models/users";
import { emailPattern } from "@/lib/validation";

// Profile form schema
const profileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  rollNumber: z.string().min(1, "University roll number is required"),
  course: z.string().min(1, "Course is required"),
  branch: z.string().min(1, "Branch is required"),
  passingYear: z.coerce.number().min(2020).max(2030, "Invalid passing year"),
  email: z.string().regex(emailPattern, "Valid university email is required"),
  personalEmail: z.string().regex(emailPattern, "Valid personal email is required").optional().or(z.literal("")),
  phoneNumber: z.string().min(10, "Valid phone number is required").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For now, using placeholder - will be replaced with actual auth
  const placeholderUserId = "placeholder-student-id";
  
  // Fetch user profile (placeholder for now)
  const { data: userProfile, isLoading } = useQuery<User | null>({
    queryKey: ["user-profile", placeholderUserId],
    queryFn: () => getUserDoc(placeholderUserId),
    enabled: false, // Disabled until auth is implemented
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      rollNumber: "",
      course: "",
      branch: "",
      passingYear: new Date().getFullYear(),
      email: "",
      personalEmail: "",
      phoneNumber: "",
    },
  });

  // Update form when user profile loads
  useEffect(() => {
    if (userProfile) {
      const studentProfile = userProfile.role === "student" ? userProfile : null;
      form.reset({
        name: userProfile.name || "",
        rollNumber: studentProfile?.rollNumber || "",
        course: studentProfile?.course || "",
        branch: studentProfile?.branch || "",
        passingYear: studentProfile?.passingYear || new Date().getFullYear(),
        email: userProfile.email || "",
        personalEmail: userProfile.personalEmail || "",
        phoneNumber: userProfile.phoneNumber || "",
      });
    }
  }, [userProfile, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual user ID from auth
      await updateUserProfile(placeholderUserId, {
        name: data.name,
        rollNumber: data.rollNumber,
        course: data.course,
        branch: data.branch,
        passingYear: data.passingYear,
        email: data.email,
        personalEmail: data.personalEmail || undefined,
        phoneNumber: data.phoneNumber || undefined,
      });

      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["user-profile", placeholderUserId] });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const branches = ["CSE", "IT", "ECE", "ME", "CE", "EE", "MBA", "MCA", "BBA", "BCA"];
  const courses = ["B.Tech", "M.Tech", "BBA", "MBA", "BCA", "MCA", "B.Sc", "M.Sc"];
  const currentYear = new Date().getFullYear();
  const passingYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Navigation />
        <div className="container mx-auto px-4 py-10">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/student")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">My Profile</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Full Name *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* University Roll Number */}
                  <FormField
                    control={form.control}
                    name="rollNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          University Roll Number *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2021CSE001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Course */}
                  <FormField
                    control={form.control}
                    name="course"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Course *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your course" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {courses.map((course) => (
                              <SelectItem key={course} value={course}>
                                {course}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Branch */}
                  <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch} value={branch}>
                                {branch}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Passing Year */}
                  <FormField
                    control={form.control}
                    name="passingYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passing Year *</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select passing year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {passingYears.map((year) => (
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

                  {/* University/College Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          University/College Email *
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="student@university.edu" {...field} />
                        </FormControl>
                        <FormDescription>Your official college email address</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Personal Email */}
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
                        <FormDescription>Your personal email address (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Number */}
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
                        <FormDescription>Your contact number (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Profile
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

export default Profile;

