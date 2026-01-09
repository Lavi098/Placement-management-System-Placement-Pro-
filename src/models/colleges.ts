import { Timestamp } from "firebase/firestore";

export interface College {
  id: string;                 // Firestore doc id
  name: string;
  code: string;               // unique college join code
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  createdBy: string;
  members: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
