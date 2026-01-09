import { Timestamp } from "firebase/firestore";

export type PrimaryUserRole = "student" | "placement-admin" | "institution-admin";
export type UserRole = PrimaryUserRole;

export type UserStatus = "pending" | "joined" | "created";

export const getDashboardRouteForRole = (role?: UserRole) => {
  switch (role) {
    case "student":
      return "/student";
    case "placement-admin":
      return "/admin";
    case "institution-admin":
      return "/institution";
    default:
      return "/";
  }
};

interface UserBase {
  uid: string;
  email: string;
  personalEmail?: string;
  role?: PrimaryUserRole;
  status: UserStatus;
  collegeId?: string;
  institutionAdminId?: string;
  pendingRole?: PrimaryUserRole;
  isActive: boolean;
  name?: string;
  phoneNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentUser extends UserBase {
  role: "student";
  branch?: string;
  course?: string;
  rollNumber?: string;
  passingYear?: number;
  department?: string;
  departmentCode?: string;
  lockedAcademicProfile?: boolean;
  placementAdminId?: string;
}

export interface PlacementAdminUser extends UserBase {
  role: "placement-admin";
  employeeId?: string;
}

export interface InstitutionAdminUser extends UserBase {
  role: "institution-admin";
  employeeId?: string;
}

interface PendingUser extends UserBase {
  role?: undefined;
}

export type User = StudentUser | PlacementAdminUser | InstitutionAdminUser | PendingUser;
