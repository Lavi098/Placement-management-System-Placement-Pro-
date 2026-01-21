// src/services/applications.ts
import {
  addDoc,
  arrayUnion,
  increment,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Application,
  ApplicationStatus,
  ApplicationRoundStatus,
  ApplicationRoundHistoryEntry,
} from "@/models/applications";
import { getApplicationsCollectionRef, getApplicationDocRef } from "@/lib/firestorePaths";
import { getDriveById, getDriveDocumentSnapshot } from "./drives";

async function findApplicationDocById(applicationId: string) {
  const docSnap = await getDoc(getApplicationDocRef(applicationId));
  if (!docSnap.exists()) return null;
  return docSnap;
}

/**
 * Apply to a drive (student)
 */
export async function applyToDrive(params: {
  driveId: string;
  collegeId: string;
  studentId: string;
  roleId: string;
  resumeFileUrl?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  currentCgpa?: number;
  backlogCount?: number;
  rollNo?: string;
  branch?: string;
  year?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedInUrl?: string;
}): Promise<string> {
  try {
    const {
      driveId,
      collegeId,
      studentId,
      roleId,
      resumeFileUrl,
      name,
      email,
      phoneNumber,
      currentCgpa,
      backlogCount,
      rollNo,
      branch,
      year,
      portfolioUrl,
      githubUrl,
      linkedInUrl,
    } = params;

    const existingApplicationSnap = await getDocs(
      query(
        getApplicationsCollectionRef(),
        where("studentId", "==", studentId),
        where("driveId", "==", driveId),
        where("roleId", "==", roleId)
      )
    );

    if (!existingApplicationSnap.empty) {
      throw new Error("You have already applied to this role.");
    }

    const drive = await getDriveById(driveId);
    if (!drive) {
      throw new Error("Drive not found");
    }

    if (!drive.institutionAdminId || !drive.placementAdminId) {
      throw new Error("Drive is missing institution/placement metadata");
    }

    const ref = await addDoc(getApplicationsCollectionRef(), {
      driveId,
      collegeId,
      institutionAdminId: drive.institutionAdminId,
      placementAdminId: drive.placementAdminId,
      studentId,
      roleId,
      resumeFileUrl: resumeFileUrl || null,
      name: name || null,
      email: email || null,
      phoneNumber: phoneNumber || null,
      currentCgpa: currentCgpa ?? null,
      backlogCount: backlogCount ?? null,
      rollNo: rollNo || null,
      branch: branch || null,
      year: year || null,
      portfolioUrl: portfolioUrl || null,
      githubUrl: githubUrl || null,
      linkedInUrl: linkedInUrl || null,
      status: "applied" as ApplicationStatus,
      appliedOn: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const driveDocSnap = await getDriveDocumentSnapshot(driveId);
    if (driveDocSnap) {
      await updateDoc(driveDocSnap.ref, {
        totalApplications: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    return ref.id;
  } catch (error) {
    console.error("Error applying to drive:", error);
    throw error;
  }
}

/**
 * List applications of a student
 */
export async function listApplicationsByStudent(studentId: string): Promise<Application[]> {
  try {
    const snap = await getDocs(
      query(getApplicationsCollectionRef(), where("studentId", "==", studentId))
    );

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Application, "id">),
    }));
  } catch (error) {
    console.error("Error listing applications:", error);
    throw error;
  }
}

/**
 * List applications for a drive (for placement admin dashboards)
 */
export async function listApplicationsByDrive(driveId: string): Promise<Application[]> {
  try {
    const snap = await getDocs(
      query(getApplicationsCollectionRef(), where("driveId", "==", driveId))
    );

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Application, "id">),
    }));
  } catch (error) {
    console.error("Error listing applications:", error);
    throw error;
  }
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<void> {
  try {
    const docSnap = await findApplicationDocById(applicationId);
    if (!docSnap) {
      throw new Error("Application not found");
    }

    await updateDoc(docSnap.ref, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    throw error;
  }
}

export async function updateApplicationRoundStatus(params: {
  applicationId: string;
  status?: ApplicationStatus;
  roundStatus?: ApplicationRoundStatus;
  currentRoundIndex?: number | null;
  historyEntry?: Omit<ApplicationRoundHistoryEntry, "updatedAt">;
}): Promise<void> {
  try {
    const { applicationId, status, roundStatus, currentRoundIndex, historyEntry } = params;
    const docSnap = await findApplicationDocById(applicationId);
    if (!docSnap) {
      throw new Error("Application not found");
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (status) updatePayload.status = status;
    if (roundStatus) updatePayload.roundStatus = roundStatus;
    if (currentRoundIndex !== undefined) updatePayload.currentRoundIndex = currentRoundIndex;
    if (historyEntry) {
      updatePayload.roundHistory = arrayUnion({
        ...historyEntry,
        updatedAt: serverTimestamp(),
      });
    }

    await updateDoc(docSnap.ref, updatePayload);
  } catch (error) {
    console.error("Error updating application round status:", error);
    throw error;
  }
}
