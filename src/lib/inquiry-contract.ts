import { inquirySteps } from "./inquiry-config";
import { singleEmail } from "./security-contract";
import type { Inquiry } from "../types/content";
export function parseInquiry(value: unknown): Inquiry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const limits = { projectType:80, stage:80, budget:80, timeline:80, details:3000, name:120, business:160, email:254, phone:40 };
  if (Object.keys(row).some(key => key !== "goals" && !Object.hasOwn(limits, key))) return null;
  for (const [key, max] of Object.entries(limits)) if (typeof row[key] !== "string" || row[key].length > max) return null;
  for (const step of inquirySteps) {
    const values = step.id === "goals" ? row.goals : [row[step.id]];
    if (!Array.isArray(values) || !values.length || values.length > step.options.length || values.some(item => typeof item !== "string" || !(step.options as readonly string[]).includes(item))) return null;
  }
  const text = (key: keyof typeof limits) => (row[key] as string).trim();
  if (!text("name") || text("details").length < 20 || !singleEmail(text("email"))) return null;
  return { projectType:text("projectType"), stage:text("stage"), budget:text("budget"), timeline:text("timeline"), details:text("details"), name:text("name"), business:text("business"), email:text("email").toLowerCase(), phone:text("phone"), goals:[...new Set(row.goals as string[])] };
}
