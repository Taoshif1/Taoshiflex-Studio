import type { Inquiry } from "@/types/content";

export const inquiryStatuses = ["new", "contacted", "qualified", "closed"] as const;
export type InquiryStatus = typeof inquiryStatuses[number];
export type InquiryRecord = {
  id: string;
  reference?: string;
  email: string;
  status: InquiryStatus;
  created_at: string;
  payload: Inquiry;
};

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && inquiryStatuses.includes(value as InquiryStatus);
}

export function inquiryReference(item: Pick<InquiryRecord, "reference">) {
  return item.reference || "Reference pending";
}

export function formatInquiryDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(value));
}
