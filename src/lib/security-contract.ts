// Shared validation for untrusted requests and database-backed links. Text stays
// text: React escapes it at rendering sinks; this is not an HTML sanitizer.
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function safeWebUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500 || /[\u0000-\u0020\u007f\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function safeInternalPath(value: unknown, fallback = "/start-a-project") {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/u.test(value)) return fallback;
  try {
    const url = new URL(value, "https://internal.invalid");
    return url.origin === "https://internal.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}

export function sameOrigin(request: Request) {
  const raw = request.headers.get("origin");
  if (!raw || raw === "null") return false;
  try {
    const origin = new URL(raw);
    if (origin.origin !== raw || origin.username || origin.password) return false;
    // Production authority is deployment configuration, never forwarded headers.
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    const expected = configured ? new URL(configured).origin : new URL(request.url).origin;
    if (process.env.NODE_ENV === "production" && (!configured || !expected.startsWith("https://"))) return false;
    if (process.env.NODE_ENV !== "production") {
      const local = new URL(request.url);
      if (["localhost", "127.0.0.1", "[::1]"].includes(local.hostname) && local.origin === raw) return true;
    }
    return origin.origin === expected;
  } catch { return false; }
}

export function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function singleEmail(value: unknown) {
  return typeof value === "string" && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value);
}
