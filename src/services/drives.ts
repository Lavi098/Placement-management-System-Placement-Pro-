// src/services/drives.ts
import {
  addDoc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { Drive, DriveStatus } from "../models/drives";
import { getDriveDocRef, getDrivesCollectionRef } from "@/lib/firestorePaths";

export async function getDriveDocumentSnapshot(driveId: string) {
  const docSnap = await getDoc(getDriveDocRef(driveId));
  if (!docSnap.exists()) return null;
  return docSnap;
}

/**
 * Create a new drive
 */
export async function createDrive(
  driveData: Omit<Drive, "id" | "createdAt">
): Promise<string> {
  try {
    const ref = await addDoc(getDrivesCollectionRef(), {
      ...driveData,
      status: driveData.status ?? "upcoming",
      totalApplications: driveData.totalApplications ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  } catch (error) {
    console.error("Error creating drive:", error);
    throw error;
  }
}

/**
 * Get a single drive by id
 */
export async function getDriveById(id: string): Promise<Drive | null> {
  try {
    const docSnap = await getDriveDocumentSnapshot(id);
    if (!docSnap) return null;

    return {
      id: docSnap.id,
      ...(docSnap.data() as Omit<Drive, "id">),
    };
  } catch (error) {
    console.error("Error getting drive:", error);
    throw error;
  }
}

/**
 * List active drives for a college (for student dashboard)
 */
export async function listActiveDrivesByCollege(
  collegeId: string
): Promise<Drive[]> {
  const snap = await getDocs(
    query(
      getDrivesCollectionRef(),
      where("collegeId", "==", collegeId),
      where("status", "==", "active")
    )
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Drive, "id">),
  }));
}

/**
 * Get all drives (for admin dashboard)
 */
export async function getAllDrives(): Promise<Drive[]> {
  try {
    const snap = await getDocs(getDrivesCollectionRef());
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Drive, "id">),
    }));
  } catch (error) {
    console.error("Error fetching all drives:", error);
    throw error;
  }
}


export async function listDrivesForPlacementAdmin(params: {
  collegeId: string;
  institutionAdminId: string;
  placementAdminId: string;
}): Promise<Drive[]> {
  const { collegeId, institutionAdminId, placementAdminId } = params;
  const snap = await getDocs(
    query(
      getDrivesCollectionRef(),
      where("collegeId", "==", collegeId),
      where("institutionAdminId", "==", institutionAdminId),
      where("placementAdminId", "==", placementAdminId)
    )
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Drive, "id">),
  }));
}


export async function listUpcomingDrivesByCollege(
  collegeId: string
): Promise<Drive[]> {
  const snap = await getDocs(
    query(
      getDrivesCollectionRef(),
      where("collegeId", "==", collegeId),
      where("status", "==", "upcoming")
    )
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Drive, "id">),
  }));
}

export async function findPotentialDuplicateDrives(params: {
  collegeId: string;
  companyName: string;
  driveType?: string;
  statuses?: DriveStatus[];
  limitCount?: number;
}): Promise<Drive[]> {
  const { collegeId, companyName, driveType, statuses = ["upcoming", "active"], limitCount = 3 } = params;

  const constraints: QueryConstraint[] = [where("collegeId", "==", collegeId)];
  if (statuses.length > 0) {
    constraints.push(where("status", "in", statuses.slice(0, 10)));
  }
  if (driveType) {
    constraints.push(where("driveType", "==", driveType));
  }

  const snap = await getDocs(query(getDrivesCollectionRef(), ...constraints));

  const normalize = (value?: string) => (value || "").trim().toLowerCase();
  const target = normalize(companyName);

  const matches = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Drive, "id">) }))
    .filter((drive) => normalize(drive.companyName) === target)
    .slice(0, limitCount);

  return matches;
}

export async function updateDrive(
  driveId: string,
  data: Partial<Omit<Drive, "id">>
): Promise<void> {
  try {
    const docSnap = await getDriveDocumentSnapshot(driveId);
    if (!docSnap) throw new Error("Drive not found");

    await updateDoc(docSnap.ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating drive:", error);
    throw error;
  }
}

/**
 * Get drives visible to students (upcoming and active, filtered by college)
 */
export async function getStudentVisibleDrives(params: {
  collegeId: string;
  placementAdminId: string;
  institutionAdminId?: string;
  statuses?: DriveStatus[];
}): Promise<Drive[]> {
  try {
    const { collegeId, placementAdminId, institutionAdminId, statuses } = params;
    const constraints = [
      where("collegeId", "==", collegeId),
      where("placementAdminId", "==", placementAdminId),
    ];
    if (institutionAdminId) {
      constraints.push(where("institutionAdminId", "==", institutionAdminId));
    }
    if (statuses && statuses.length > 0) {
      constraints.push(where("status", "in", statuses));
    }

    const snap = await getDocs(query(getDrivesCollectionRef(), ...constraints));

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Drive, "id">),
    }));
  } catch (error) {
    console.error("Error fetching student visible drives:", error);
    throw error;
  }
}

/**
 * Update drive status
 */
export async function updateDriveStatus(
  driveId: string,
  status: DriveStatus
): Promise<void> {
  try {
    const docSnap = await getDriveDocumentSnapshot(driveId);
    if (!docSnap) throw new Error("Drive not found");

    await updateDoc(docSnap.ref, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating drive status:", error);
    throw error;
  }
}

/**
 * Update drive application stats from actual application data
 * This ensures the drive's totalApplications matches the actual count
 */
export async function updateDriveApplicationStats(
  driveId: string
): Promise<void> {
  try {
    // Import here to avoid circular dependency
    const { listApplicationsByDrive } = await import("./applications");
    
    const applications = await listApplicationsByDrive(driveId);
    const totalApplications = applications.length;

    const docSnap = await getDriveDocumentSnapshot(driveId);
    if (!docSnap) throw new Error("Drive not found");

    await updateDoc(docSnap.ref, {
      totalApplications,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating drive application stats:", error);
    throw error;
  }
}

export type { Drive, DriveStatus } from "../models/drives";