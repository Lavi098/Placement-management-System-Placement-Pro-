export type DriveStatus = "upcoming" | "active" | "closed";

export type DriveType = "on-campus" | "off-campus" | "pool" | "internship" | "ppo";

export type RoundMode = "online" | "offline";

export interface DriveRound {
  id: string;
  name: string;
  dateTime: unknown;
  mode: RoundMode;
  status?: "upcoming" | "completed" | string;
  locationOrLink?: string;
}

export interface EligibilityCriteria {
  branches: string[]; // branchIds
  years: number[];
  minCgpa: number;
  maxBacklogs: number;
}

export interface Role {
  id: string;
  title: string;
  ctc: string;
  location: string;
  eligibility: EligibilityCriteria;
  description?: string; // Add for job description per role
  additionalRequirements?: string; // Optional extra conditions like hackathons/certifications
  rounds?: DriveRound[]; // Add for rounds per role
  stats?: { // Add stats per role
    totalApplicants: number;
    shortlisted: number;
    selected: number;
    offersAccepted: number;
  };
  allowBacklogs?: boolean;
  askPortfolio?: boolean;
  askGithub?: boolean;
  askLinkedIn?: boolean;
}

// Update Drive interface to remove rounds (move to Role) and add totalStats if needed
export interface Drive {
  id: string;
  collegeId: string;
  createdBy: string;
  institutionAdminId: string;
  placementAdminId: string;
  placementAdminEmail?: string;
  jdFileUrl?: string;
  jdFileName?: string;
  companyName: string;
  company?: string;
  website?: string;
  location?: string;
  roles: Role[]; // Changed from single 'role' to array for multiple roles
  driveType: DriveType;
  jobLocation: string;
  jd: string;
  deadline: unknown;
  status: DriveStatus;
  rounds: DriveRound[];
  totalApplications: number; // Added for tracking
  selectedStudents: number; // Add this
  createdAt: unknown;
  updatedAt: unknown; // Added
  totalStats?: { // Optional, for combined stats
    totalApplicants: number;
    shortlisted: number;
  };
}
