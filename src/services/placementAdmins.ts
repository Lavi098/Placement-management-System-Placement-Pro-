import {
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getCollegeDocRef,
  getPlacementAdminDocRef,
  getPlacementAdminsCollectionRef,
} from "@/lib/firestorePaths";
import { addMemberToCollege } from "@/services/colleges";

const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generatePlacementAdminCode = (length = 6) =>
  Array.from({ length })
    .map(() => CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)])
    .join("");

const generateDepartmentCode = (department?: string, course?: string) => {
  const source = (department ?? course ?? "PLACEMENT")
    .toString()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const prefix = (source.slice(0, 3) || "PLC").padEnd(3, "X");
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}${suffix}`;
};

const INVITE_TOKEN_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const INVITE_TOKEN_LENGTH = 48;
const INVITE_TTL_HOURS = 72;

const randomValues = (length: number) => {
  const array = new Uint8Array(length);
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
};

const generateInviteToken = (length = INVITE_TOKEN_LENGTH) =>
  Array.from(randomValues(length))
    .map((value) => INVITE_TOKEN_CHARACTERS[value % INVITE_TOKEN_CHARACTERS.length])
    .join("");

export interface PlacementAdminDraft {
  name: string;
  email: string;
  collegeId: string;
  institutionAdminId: string;
  department?: string;
  course?: string;
  employeeId?: string;
  status?: "pending" | "invited" | "active";
  code?: string;
  departmentCode?: string;
  inviteToken?: string;
  inviteExpiresAt?: Timestamp;
  inviteClaimedAt?: Timestamp;
  userId?: string;
  batchYear?: number;
}

interface PlacementAdminDocument extends PlacementAdminDraft {
  batchYear?: number;
  code: string;
  departmentCode: string;
  inviteToken: string;
  inviteExpiresAt: Timestamp;
}

export interface PlacementAdminRecord extends PlacementAdminDocument {
  batchYear?: number;
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function createPlacementAdminDraft(
  payload: PlacementAdminDraft
): Promise<PlacementAdminRecord> {
  const normalizedEmail = payload.email.trim();
  if (!normalizedEmail) {
    throw new Error("Email is required to create a placement admin.");
  }

  const adminCollectionRef = getPlacementAdminsCollectionRef();
  const existingAdminSnapshot = await getDocs(
    query(adminCollectionRef, where("email", "==", normalizedEmail))
  );
  if (!existingAdminSnapshot.empty) {
    throw new Error("A placement admin with that email already exists.");
  }

  const adminDocRef = doc(adminCollectionRef);
  const batch = writeBatch(db);
  const code = payload.code ?? generatePlacementAdminCode();
  const inviteToken = payload.inviteToken?.trim() || generateInviteToken();
  const inviteExpiresAt =
    payload.inviteExpiresAt ??
    Timestamp.fromDate(new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000));
  const docPayload: PlacementAdminDocument = {
    ...payload,
    departmentCode:
      payload.departmentCode?.trim() || generateDepartmentCode(payload.department, payload.course),
    status: payload.status ?? "invited",
    batchYear: payload.batchYear ?? new Date().getFullYear(),
    code,
    inviteToken,
    inviteExpiresAt,
  };

  const sanitizedPayload = Object.fromEntries(
    Object.entries(docPayload).filter(([, value]) => value !== undefined)
  ) as PlacementAdminDocument;

  const issuedAt = Timestamp.fromDate(new Date());

  batch.set(adminDocRef, {
    ...sanitizedPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(
    getCollegeDocRef(payload.collegeId),
    {
      meta: {
        placementAdminCount: increment(1),
      },
    },
    { merge: true }
  );

  await batch.commit();

  return {
    id: adminDocRef.id,
    ...docPayload,
    createdAt: issuedAt,
    updatedAt: issuedAt,
  };
}

export async function getPlacementAdminsForInstitutionAdmin(
  collegeId: string,
  institutionAdminId: string
): Promise<PlacementAdminRecord[]> {
  return getPlacementAdminsForCollege(collegeId, institutionAdminId);
}

export async function getPlacementAdminsForCollege(
  collegeId: string,
  institutionAdminId?: string
): Promise<PlacementAdminRecord[]> {
  const adminCollection = getPlacementAdminsCollectionRef();
  const constraints = [where("collegeId", "==", collegeId)];
  if (institutionAdminId) {
    constraints.push(where("institutionAdminId", "==", institutionAdminId));
  }
  const adminsQuery = query(adminCollection, ...constraints, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(adminsQuery);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<PlacementAdminRecord, "id">),
  }));
}

export async function findPlacementAdminByCode(params: {
  collegeId: string;
  departmentCode: string;
  placementAdminId?: string;
}): Promise<PlacementAdminRecord | null> {
  const normalizedCode = params.departmentCode.toUpperCase().trim();
  const constraints = [
    where("collegeId", "==", params.collegeId),
    where("departmentCode", "==", normalizedCode),
  ];
  if (params.placementAdminId) {
    constraints.push(where(documentId(), "==", params.placementAdminId));
  }

  const snapshot = await getDocs(query(getPlacementAdminsCollectionRef(), ...constraints, limit(1)));
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<PlacementAdminRecord, "id">),
  };
}

export async function findPlacementAdminByUserId(uid: string): Promise<PlacementAdminRecord | null> {
  const normalized = uid?.trim();
  if (!normalized) return null;
  const snapshot = await getDocs(
    query(getPlacementAdminsCollectionRef(), where("userId", "==", normalized), limit(1))
  );
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<PlacementAdminRecord, "id">),
  };
}

export async function consumePlacementAdminInvite(
  token: string,
  uid: string,
  email: string
): Promise<PlacementAdminRecord> {
  const normalizedToken = token?.trim();
  if (!normalizedToken) {
    throw new Error("Invite token is missing.");
  }

  const snapshot = await getDocs(
    query(getPlacementAdminsCollectionRef(), where("inviteToken", "==", normalizedToken), limit(1))
  );
  if (snapshot.empty) {
    throw new Error("Invalid invite token.");
  }

  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as Omit<PlacementAdminRecord, "id">;
  const now = Date.now();

  if (data.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error("This invite token is registered for a different email.");
  }

  if (data.inviteExpiresAt && data.inviteExpiresAt.toMillis() < now) {
    throw new Error("This invite has expired.");
  }

  if (data.status === "active" && data.userId) {
    throw new Error("This invite has already been claimed.");
  }

  const placementRef = getPlacementAdminDocRef(docSnap.id);
  await updateDoc(placementRef, {
    status: "active",
    userId: uid,
    inviteClaimedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const finalSnapshot = await getDoc(placementRef);
  if (!finalSnapshot.exists()) {
    throw new Error("Invite could not be resolved after claiming.");
  }

  const finalData = finalSnapshot.data() as Omit<PlacementAdminRecord, "id">;
  if (finalData.collegeId) {
    await addMemberToCollege(finalData.collegeId, uid);
  }

  return {
    id: finalSnapshot.id,
    ...finalData,
  };
}
