export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "selected"
  | "rejected"
  | "joined";

export interface Application {
  id: string;
  driveId: string;
  collegeId: string;
  institutionAdminId?: string;
  placementAdminId?: string;
  placementAdminEmail?: string;
  studentId: string;
  roleId: string; // Added for multi-role drives
  resumeFileUrl?: string;
  status: ApplicationStatus;
  appliedOn: unknown; // Added timestamp
  createdAt: unknown;
  updatedAt: unknown; // Added
  name?: string;
  rollNo?: string;
  email?: string;
  phoneNumber?: string;
  currentCgpa?: number;
  backlogCount?: number;
  branch?: string;
  year?: string;
  resume?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedInUrl?: string;
}
