
export type ReceiptData = {
  companyName: string;
  description: string;
  gst: string | null;
  pst: string | null;
  totalAmount: string;
};

export type Receipt = {
  id: string;
  image?: string; // data URI - now optional
  date: string; // ISO string
  userId: string;
} & ReceiptData;
