import { documentId, getDocs, query, QueryConstraint, where } from "firebase/firestore";
import { getOffersCollectionRef, getUsersCollectionRef } from "@/lib/firestorePaths";
import { Offer, OfferStatus } from "@/models/offers";
import { StudentUser } from "@/models/users";

export interface PlacedStudentRecord {
  studentId: string;
  student?: StudentUser;
  offers: Offer[];
}

const DEFAULT_PLACED_STATUSES: OfferStatus[] = ["accepted", "joined"];

export async function listPlacedStudentsForPlacementAdmin(params: {
  placementAdminId: string;
  collegeId?: string;
  institutionAdminId?: string;
  statuses?: OfferStatus[];
}): Promise<PlacedStudentRecord[]> {
  const { placementAdminId, collegeId, institutionAdminId } = params;
  const statuses = params.statuses?.length ? params.statuses : DEFAULT_PLACED_STATUSES;

  const constraints: QueryConstraint[] = [where("placementAdminId", "==", placementAdminId)];
  if (collegeId) {
    constraints.push(where("collegeId", "==", collegeId));
  }
  if (institutionAdminId) {
    constraints.push(where("institutionAdminId", "==", institutionAdminId));
  }
  if (statuses && statuses.length > 0) {
    constraints.push(where("status", "in", statuses.slice(0, 10)));
  }

  const offersSnapshot = await getDocs(query(getOffersCollectionRef(), ...constraints));
  const offers = offersSnapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Offer, "id">),
    }))
    .filter((offer) => Boolean(offer.studentId));

  if (offers.length === 0) {
    return [];
  }

  const studentIds = Array.from(new Set(offers.map((offer) => offer.studentId)));
  const studentLookup = await fetchStudentsByIds(studentIds);

  const grouped = new Map<string, PlacedStudentRecord>();
  for (const offer of offers) {
    const key = offer.studentId;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        studentId: key,
        student: studentLookup.get(key),
        offers: [offer],
      });
    } else {
      existing.offers.push(offer);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const nameA = a.student?.name || "";
    const nameB = b.student?.name || "";
    return nameA.localeCompare(nameB);
  });
}

async function fetchStudentsByIds(ids: string[]): Promise<Map<string, StudentUser>> {
  const lookup = new Map<string, StudentUser>();
  if (!ids.length) return lookup;

  const chunkSize = 10;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const snapshot = await getDocs(
      query(getUsersCollectionRef(), where(documentId(), "in", chunk))
    );

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as StudentUser;
      lookup.set(docSnap.id, {
        ...data,
        uid: data.uid || docSnap.id,
      });
    });
  }

  return lookup;
}
