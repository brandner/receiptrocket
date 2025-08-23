export type ReceiptData = {
  companyName: string;
  description: string;
  gst: string | null;
  pst: string | null;
  totalAmount: string;
};

export type Receipt = {
  id: string;
  image: string; // data URI
  date: string; // ISO string
} & ReceiptData;
