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
import { Building2, MapPin, Mail, Phone, Globe } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createCollege } from "@/services/colleges";
import { updateUserProfile } from "@/services/user";
import { getDashboardRouteForRole } from "@/models/users";
import { emailPattern } from "@/lib/validation";
import Navigation from "@/components/Navigation";

const collegeFormSchema = z.object({
  name: z.string().min(3, "College name must be at least 3 characters"),
  address: z.string().min(10, "Please enter a valid address"),
  city: z.string().min(2, "Please enter a valid city"),
  state: z.string().min(2, "Please enter a valid state"),
  pincode: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit pincode"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().regex(emailPattern, "Please enter a valid email"),
  website: z.string().url("Please enter a valid URL").or(z.literal("")),
});

type CollegeFormValues = z.infer<typeof collegeFormSchema>;

export function AddCollegeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  const form = useForm<CollegeFormValues>({
    resolver: zodResolver(collegeFormSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      website: "",
    },
  });

  const onSubmit = async (data: CollegeFormValues) => {
    if (!user) {
      toast.error("You need to be logged in to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const college = await createCollege({
        ...data,
        createdBy: user.uid,
        address: data.address.trim(),
      });
      await updateUserProfile(user.uid, {
        collegeId: college.id,
        role: "institution-admin",
        status: "created",
        institutionAdminId: user.uid,
      });
      await refreshUserProfile();
      toast.success(`College created. Your invite code: ${college.code}`);
      navigate(getDashboardRouteForRole("institution-admin"), { replace: true });
    } catch (error) {
      console.error("Error creating college:", error);
      toast.error("Failed to create college. Please try again.");
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
          <div className="rounded-3xl border border-slate-200/40 bg-gradient-to-br from-sky-50/70 via-white to-transparent p-8 shadow-[0_25px_65px_rgba(56,189,248,0.2)] backdrop-blur dark:border-white/10 dark:bg-gradient-to-br dark:from-sky-900/40 dark:via-slate-900/70 dark:to-transparent dark:shadow-[0_25px_65px_rgba(37,99,235,0.7)]">
            <p className="text-xs uppercase tracking-[0.4em] text-sky-500">Institution launch</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl text-slate-900 dark:text-white">
              Add your college so students can join faster.
            </h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              Define your campus details once and share the invite code with placement admins and students.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/30 bg-white/90 p-8 shadow-[0_35px_65px_rgba(15,23,42,0.15)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_35px_95px_rgba(15,23,42,0.65)]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>College Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter college name" leftIcon={Building2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="college@example.com" leftIcon={Mail} {...field} />
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
                            <Input type="tel" placeholder="+91 9876543210" leftIcon={Phone} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full address" leftIcon={MapPin} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode</FormLabel>
                          <FormControl>
                            <Input placeholder="Pincode" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (Optional)</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://college.edu" leftIcon={Globe} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200/50 pt-4 text-sm text-slate-600 dark:text-slate-300 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Invite-ready campus</p>
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" className="text-slate-500" onClick={() => window.history.back()}>
                      Back
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create College"}
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
