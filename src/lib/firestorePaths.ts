import { collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const COLLEGES_COLLECTION = "colleges";
export const USERS_COLLECTION = "users";
export const PLACEMENT_ADMINS_COLLECTION = "placementAdmins";
export const STUDENTS_COLLECTION = "students";
export const DRIVES_COLLECTION = "drives";
export const APPLICATIONS_COLLECTION = "applications";
export const OFFERS_COLLECTION = "offers";

export const getCollegeDocRef = (collegeId: string) =>
  doc(db, COLLEGES_COLLECTION, collegeId);

export const getPlacementAdminsCollectionRef = () =>
  collection(db, PLACEMENT_ADMINS_COLLECTION);

export const getPlacementAdminDocRef = (placementAdminId: string) =>
  doc(getPlacementAdminsCollectionRef(), placementAdminId);

export const getDrivesCollectionRef = () => collection(db, DRIVES_COLLECTION);

export const getDriveDocRef = (driveId: string) =>
  doc(getDrivesCollectionRef(), driveId);

export const getApplicationsCollectionRef = () =>
  collection(db, APPLICATIONS_COLLECTION);

export const getApplicationDocRef = (applicationId: string) =>
  doc(getApplicationsCollectionRef(), applicationId);

export const getStudentsCollectionRef = () =>
  collection(db, STUDENTS_COLLECTION);

export const getOffersCollectionRef = () => collection(db, OFFERS_COLLECTION);

export const getOfferDocRef = (offerId: string) =>
  doc(getOffersCollectionRef(), offerId);

export const getUsersCollectionRef = () => collection(db, USERS_COLLECTION);

export const getUserDocRef = (userId: string) => doc(getUsersCollectionRef(), userId);
