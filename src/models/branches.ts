export interface Branch {
  id: string;                 // Firestore doc id
  collegeId: string;
  name: string;               // full name, e.g. "Computer Science and Engineering"
  shortName: string;          // e.g. "CSE"
  rollPattern?: string;       // e.g. "22EJCCS" (optional)
  createdAt: any;             // Firebase Timestamp
  updatedAt: any;             // Added
}
