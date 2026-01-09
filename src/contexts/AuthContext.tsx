// src/contexts/AuthContext.tsx
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserDoc } from "@/services/user";
import { User } from "@/models/users";

// 1. Define the shape of the context data
interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUserProfile: () => Promise<void>;
}

// 2. Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_FETCH_RETRY_DELAY_MS = 400;
const PROFILE_FETCH_RETRY_ATTEMPTS = 4;

async function fetchUserProfileWithRetry(uid: string): Promise<User | null> {
  for (let attempt = 0; attempt < PROFILE_FETCH_RETRY_ATTEMPTS; attempt += 1) {
    const profile = await getUserDoc(uid);
    if (profile) {
      return profile;
    }
    if (attempt < PROFILE_FETCH_RETRY_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, PROFILE_FETCH_RETRY_DELAY_MS));
    }
  }
  return null;
}

// 3. Create the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for changes in Firebase auth state
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          // If user is logged in, fetch their profile from Firestore (retry once in case it’s being created)
          const userProfile = await fetchUserProfileWithRetry(fbUser.uid);
          if (userProfile) {
            setUser(userProfile);
            setError(null);
          } else {
            // This case can happen if the user exists in Auth but not in Firestore
            setUser(null);
            setError("User profile not found in database.");
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError("Failed to fetch user profile.");
          setUser(null);
        }
      } else {
        // User is logged out
        setUser(null);
        setError(null);
      }
      // Set loading to false once the initial check is complete
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const refreshUserProfile = async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    try {
      const profile = await fetchUserProfileWithRetry(firebaseUser.uid);
      setUser(profile);
      setError(profile ? null : "User profile not found in database.");
    } catch (err) {
      console.error("Error refreshing user profile:", err);
      setError("Failed to refresh user profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    firebaseUser,
    isLoading,
    error,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 4. Create the useAuth custom hook for easy access
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
