export type OfferType = "fulltime" | "internship" | "ppo";

export type OfferStatus = "offered" | "accepted" | "joined" | "declined";

export interface Offer {
  id: string;
  studentId: string;
  collegeId: string;
  driveId: string;
  companyName: string;
  role: string;
  ctc: string;
  offerType: OfferType;
  status: OfferStatus;
  joiningDate?: any; // Added
  createdAt: any;
  updatedAt: any; // Added
}
