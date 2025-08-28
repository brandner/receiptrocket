
export type ReceiptData = {
  companyName: string;
  description: string;
  gst: string | null;
  pst: string | null;
  totalAmount: string;
};

export type Receipt = {
  id: string;
  image: string; // public URL for the image in Firebase Storage
  imagePath?: string | null; // direct path to image in Firebase Storage bucket
  date: string; // ISO string
  userId: string;
} & ReceiptData;

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};
