// src/services/users.ts
import { collection, doc, getDoc, getDocs, query, QueryConstraint, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from  "../lib/firebase";
import { InstitutionAdminUser, PlacementAdminUser, StudentUser, User } from "../models/users";

const USERS_COLLECTION = "users";

export async function createUserDoc(user: User): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, user.uid);
  await setDoc(ref, user);
}

export async function getUserDoc(uid: string): Promise<User | null> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data() as User;
}

/**
 * Update user profile
 */
type StudentProfileFields = Pick<
  StudentUser,
  | "branch"
  | "course"
  | "rollNumber"
  | "passingYear"
  | "department"
  | "departmentCode"
  | "lockedAcademicProfile"
  | "academicScoreType"
  | "class10Score"
  | "class12Score"
  | "currentCgpa"
  | "backlogCount"
  | "academicGapYears"
>;
type PlacementAdminProfileFields = Pick<PlacementAdminUser, "employeeId">;
type InstitutionAdminProfileFields = Pick<InstitutionAdminUser, "employeeId">;

type UserProfileUpdates =
  Partial<Omit<User, "uid" | "createdAt">>
  & Partial<StudentProfileFields>
  & Partial<PlacementAdminProfileFields>
  & Partial<InstitutionAdminProfileFields>
  & { placementAdminId?: string };

export async function updateUserProfile(
  uid: string,
  updates: UserProfileUpdates
): Promise<void> {
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    await updateDoc(ref, {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

export type StudentListEntry = StudentUser & { uid: string };

export async function listStudentsForPlacementAdmin(params: {
  placementAdminId: string;
  collegeId?: string;
  institutionAdminId?: string;
}): Promise<StudentListEntry[]> {
  const { placementAdminId, collegeId, institutionAdminId } = params;
  const constraints: QueryConstraint[] = [
    where("placementAdminId", "==", placementAdminId),
    where("role", "==", "student"),
  ];
  if (collegeId) {
    constraints.push(where("collegeId", "==", collegeId));
  }
  if (institutionAdminId) {
    constraints.push(where("institutionAdminId", "==", institutionAdminId));
  }

  const studentsQuery = query(collection(db, USERS_COLLECTION), ...constraints);
  const snapshot = await getDocs(studentsQuery);
  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as StudentUser),
    uid: docSnap.id,
  }));
}
