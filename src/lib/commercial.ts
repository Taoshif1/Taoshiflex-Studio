export const paymentMethods = ["bank_transfer", "bkash", "nagad", "other"] as const;
export type PaymentMethod = typeof paymentMethods[number];
export type ProjectBilling = { project_id:string; agreed_value_minor:number; currency:string; currency_decimals:number; allowed_methods:PaymentMethod[]; payment_instructions:string; created_at:string; updated_at:string };
export type BillingSummary = { project_id:string; agreed_value_minor:number; currency:string; currency_decimals:number; paid_minor:number; remaining_minor:number };
export type PaymentScheduleItem = { id:string; project_id:string; label:string; percentage:number|null; expected_amount_minor:number; due_date:string|null; sort_order:number; archived_at:string|null; created_at:string; updated_at:string };
export type ProjectPayment = { id:string; project_id:string; schedule_item_id:string|null; submitted_by:string|null; origin:"client_submission"|"admin_manual"|"gateway"; entry_type:"payment"|"reversal"; reversal_of:string|null; amount_minor:number; currency:string; payment_method:PaymentMethod; reference_id:string; note:string; status:"pending"|"confirmed"|"rejected"; rejection_reason:string; submitted_at:string; confirmed_by:string|null; confirmed_at:string|null; rejected_by:string|null; rejected_at:string|null };
export type CommercialData = { billing:ProjectBilling|null; summary:BillingSummary|null; schedule:PaymentScheduleItem[]; payments:ProjectPayment[] };

export function formatMoney(minor:number, currency:string, decimals:number) {
  return new Intl.NumberFormat("en-BD", { style:"currency", currency, minimumFractionDigits:decimals, maximumFractionDigits:decimals }).format(minor / 10 ** decimals);
}
export function parseMoney(value:unknown, decimals:number) {
  if (typeof value!=="string" || value.trim().length>24 || !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const [whole,fraction=""] = value.trim().split(".");
  if (fraction.length>decimals) return null;
  const amount=BigInt(whole)*BigInt(10)**BigInt(decimals)+BigInt(fraction.padEnd(decimals,"0")||"0");
  return amount>BigInt(0) && amount<=BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}
export function paymentMethodLabel(method:PaymentMethod) { return method==="bank_transfer"?"Bank Transfer":method==="bkash"?"bKash":method==="nagad"?"Nagad":"Other"; }
