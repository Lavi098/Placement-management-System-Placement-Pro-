export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "selected"
  | "rejected"
  | "joined";

export type ApplicationRoundStatus = "pending" | "shortlisted" | "passed" | "failed";

export interface ApplicationRoundHistoryEntry {
  roundIndex: number;
  status: "shortlisted" | "passed" | "failed";
  updatedAt: unknown;
  updatedBy?: string;
  note?: string;
}

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
  currentRoundIndex?: number | null;
  roundStatus?: ApplicationRoundStatus;
  roundHistory?: ApplicationRoundHistoryEntry[];
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
