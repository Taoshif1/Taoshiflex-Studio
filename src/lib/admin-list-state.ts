export function parseAdminPage(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 1;
  return Math.max(1, Math.min(10000, Number(value)));
}

export function normalizeAdminSearch(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 80) || "";
}

export function postgrestSearchPattern(value: string) {
  const safe = value.replace(/[^\p{L}\p{N}\s@.+_-]/gu, " ").replace(/\s+/g, " ").trim();
  return safe ? `*${safe.replaceAll(" ", "*")}*` : "";
}

export function adminListHref(pathname: string, values: { page?: number; status?: string; q?: string }) {
  const query = new URLSearchParams();
  if (values.status) query.set("status", values.status);
  if (values.q) query.set("q", values.q);
  if (values.page && values.page > 1) query.set("page", String(values.page));
  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export function safeAdminReturnPath(value: string | undefined, pathname: string) {
  if (!value || value.includes("\\") || value.startsWith("//")) return pathname;
  try {
    const url = new URL(value, "https://studio.local");
    if (url.origin !== "https://studio.local" || url.pathname !== pathname) return pathname;
    const clean = new URLSearchParams();
    for (const key of ["status", "q", "page"]) {
      const item = url.searchParams.get(key);
      if (item) clean.set(key, item.slice(0, 100));
    }
    return clean.size ? `${pathname}?${clean}` : pathname;
  } catch {
    return pathname;
  }
}
