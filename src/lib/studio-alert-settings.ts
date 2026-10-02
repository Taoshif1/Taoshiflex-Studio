import { singleEmail } from "./security-contract";
export type StudioAlertSettings = {
  emailEnabled: boolean;
  emailTo: string;
};

export const studioAlertDefaults: StudioAlertSettings = {
  emailEnabled: true,
  emailTo: "taoshif2@gmail.com",
};



export function normalizeAlertEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (
    !email ||
    email.length > 254 ||
    /[\r\n]/.test(email) ||
    !singleEmail(email)
  ) {
    return null;
  }
  return email;
}

export function parseStudioAlertSettings(
  value: unknown,
): StudioAlertSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if(Object.keys(input).some(key=>!["emailEnabled","emailTo"].includes(key)))return null;
  const emailTo = normalizeAlertEmail(input.emailTo);
  if (typeof input.emailEnabled !== "boolean" || !emailTo) return null;
  return { emailEnabled: input.emailEnabled, emailTo };
}

export function normalizeStudioAlertSettings(value: unknown) {
  return parseStudioAlertSettings(value) ?? { ...studioAlertDefaults };
}
