export const studioPresencePlatforms = [
  "facebook",
  "whatsapp",
  "behance",
  "linkedin",
  "github",
  "instagram",
  "x",
  "youtube",
  "dribbble",
  "custom",
] as const;

export type StudioPresencePlatform =
  (typeof studioPresencePlatforms)[number];

export type StudioSocialLink = {
  id: string;
  platform: StudioPresencePlatform;
  label: string;
  url: string;
  enabled: boolean;
  sortOrder: number;
};

export type StudioPresence = {
  email: string;
  location: string;
  availability: string;
  bookingUrl: string;
  bookingEnabled: boolean;
  socialLinks: StudioSocialLink[];
};

export const studioPresencePlatformLabels: Record<
  StudioPresencePlatform,
  string
> = {
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  behance: "Behance",
  linkedin: "LinkedIn",
  github: "GitHub",
  instagram: "Instagram",
  x: "X / Twitter",
  youtube: "YouTube",
  dribbble: "Dribbble",
  custom: "Custom",
};

export const studioPresenceDefaults: StudioPresence = {
  email: "taoshif2@gmail.com",
  location: "Dhaka, Bangladesh",
  availability: "Available for remote collaboration",
  bookingUrl: "",
  bookingEnabled: false,
  socialLinks: [],
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const idPattern = /^[a-zA-Z0-9_-]{8,80}$/;
const unsafeTextPattern = /[<>]|[\u0000-\u001f\u007f]/;
const whatsappHosts = new Set([
  "wa.me",
  "api.whatsapp.com",
  "chat.whatsapp.com",
  "www.whatsapp.com",
]);

function plainText(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if (!result || result.length > maximum || unsafeTextPattern.test(result)) {
    return null;
  }
  return result;
}

function safeHttpsUrl(value: unknown, platform?: StudioPresencePlatform) {
  if (typeof value !== "string" || !value || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }
    if (
      platform === "whatsapp" &&
      !whatsappHosts.has(url.hostname.toLowerCase())
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function parseStudioPresence(value: unknown): StudioPresence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const email = plainText(input.email, 254);
  const location = plainText(input.location, 120);
  const availability = plainText(input.availability, 160);
  const bookingUrl =
    input.bookingUrl === "" ? "" : safeHttpsUrl(input.bookingUrl);

  if (
    !email ||
    !emailPattern.test(email) ||
    !location ||
    !availability ||
    bookingUrl === null ||
    typeof input.bookingEnabled !== "boolean" ||
    (input.bookingEnabled && !bookingUrl) ||
    !Array.isArray(input.socialLinks) ||
    input.socialLinks.length > 12
  ) {
    return null;
  }

  const ids = new Set<string>();
  const socialLinks: StudioSocialLink[] = [];
  for (const item of input.socialLinks) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const link = item as Record<string, unknown>;
    const id = typeof link.id === "string" ? link.id : "";
    const platform = link.platform as StudioPresencePlatform;
    const label = plainText(link.label, 80);
    const url = safeHttpsUrl(link.url, platform);
    const sortOrder = Number(link.sortOrder);

    if (
      !idPattern.test(id) ||
      ids.has(id) ||
      !studioPresencePlatforms.includes(platform) ||
      !label ||
      !url ||
      typeof link.enabled !== "boolean" ||
      !Number.isInteger(sortOrder) ||
      sortOrder < -10000 ||
      sortOrder > 10000
    ) {
      return null;
    }

    ids.add(id);
    socialLinks.push({
      id,
      platform,
      label,
      url,
      enabled: link.enabled,
      sortOrder,
    });
  }

  socialLinks.sort((left, right) => left.sortOrder - right.sortOrder);
  return {
    email: email.toLowerCase(),
    location,
    availability,
    bookingUrl,
    bookingEnabled: input.bookingEnabled,
    socialLinks,
  };
}

export function normalizeStudioPresence(value: unknown): StudioPresence {
  return parseStudioPresence(value) ?? {
    ...studioPresenceDefaults,
    socialLinks: [],
  };
}
