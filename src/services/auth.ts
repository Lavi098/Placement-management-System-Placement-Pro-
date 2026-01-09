// src/services/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { serverTimestamp, Timestamp } from "firebase/firestore";

import { auth } from "../lib/firebase"; // Fixed path
import { createUserDoc, getUserDoc } from "./user";
import { User } from "../models/users";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// 👉 helper to build a minimal User object for Firestore
function buildUserObject(params: {
  uid: string;
  email: string;
}): User {
  return {
    uid: params.uid,
    email: params.email,
    status: "pending",
    isActive: true,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };
}

// A lightweight signup input (email + password only)
export type SignUpInput = {
  email: string;
  password: string;
};

/**
 * Sign up a new user (student, placement admin, or institution admin):
 * - create Firebase Auth user
 * - create Firestore users/{uid} doc
 */
export async function signUp(input: SignUpInput): Promise<User> {
  try {
    const { email, password } = input;

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const user = buildUserObject({ uid, email });
    await createUserDoc(user);
    return user;
  } catch (error) {
    console.error("Error signing up user:", error);
    throw error;
  }
}

/**
 * Login with email/password
 */
export async function login(email: string, password: string): Promise<FirebaseUser> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const uid = result.user.uid;
    const email = result.user.email;

    if (!email) {
      throw new Error("Google account is missing an email address.");
    }

    const existing = await getUserDoc(uid);
    if (existing) {
      return existing;
    }

    const newUser = buildUserObject({ uid, email });
    newUser.name = result.user.displayName ?? undefined;
    newUser.personalEmail = email;
    await createUserDoc(newUser);
    return newUser;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Get current user's profile from Firestore
 */
export async function getCurrentUserProfile(): Promise<User | null> {
  const current = auth.currentUser;
  if (!current) return null;

  return await getUserDoc(current.uid);
}
