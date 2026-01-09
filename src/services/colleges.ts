import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { College } from "../models/colleges";

const COLLEGES_COLLECTION = "colleges";

const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCollegeCode(length = 6) {
  return Array.from({ length })
    .map(() => CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)])
    .join("");
}

export async function createCollege(payload: {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  createdBy: string;
}): Promise<College> {
  const code = generateCollegeCode();
  const docRef = await addDoc(collection(db, COLLEGES_COLLECTION), {
    name: payload.name,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    phone: payload.phone,
    email: payload.email,
    website: payload.website || "",
    createdBy: payload.createdBy,
    code,
    members: [payload.createdBy],
    isActive: true,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });

  return {
    id: docRef.id,
    name: payload.name,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    phone: payload.phone,
    email: payload.email,
    website: payload.website,
    createdBy: payload.createdBy,
    code,
    members: [payload.createdBy],
    isActive: true,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  } as College;
}

export async function getCollegeByCode(code: string): Promise<College | null> {
  const q = query(
    collection(db, COLLEGES_COLLECTION),
    where("code", "==", code.toUpperCase())
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<College, "id">),
  };
}

export async function addMemberToCollege(collegeId: string, userId: string): Promise<void> {
  const ref = doc(db, COLLEGES_COLLECTION, collegeId);
  await updateDoc(ref, {
    members: arrayUnion(userId),
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });
}

export async function getCollegeById(id: string): Promise<College | null> {
  const ref = doc(db, COLLEGES_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...(snap.data() as Omit<College, "id">),
  };
}