export const productStatuses = ["Live", "Beta", "In Development", "Coming Soon"] as const;
export function parseProduct(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const limits: Record<string, number> = { slug:80,name:160,tagline:200,summary:500,story:8000,problem:4000,solution:4000,roadmap:4000,category:80,accent:7,pricing_model:160 };
  const texts: Record<string,string> = {};
  for (const [key,max] of Object.entries(limits)) {
    if (typeof row[key] !== "string" || row[key].length > max) return null;
    texts[key] = row[key].trim();
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(texts.slug) || texts.name.length < 2 || !texts.category || !/^#[0-9a-f]{6}$/i.test(texts.accent) || !productStatuses.includes(row.status as typeof productStatuses[number])) return null;
  for (const key of ["published", "featured", "show_repository", "source_repository_private"]) if (typeof row[key] !== "boolean") return null;
  if (row.featured && !row.published || row.published && (texts.summary.length < 20 || texts.tagline.length < 2)) return null;
  if (!Number.isInteger(row.sort_order) || Math.abs(Number(row.sort_order)) > 100000) return null;
  const lists: Record<string, string[]> = {};
  for (const key of ["features", "technologies"]) {
    const list = row[key];
    if (!Array.isArray(list) || list.length > 30 || list.some(item => typeof item !== "string" || !item.trim() || item.length > 200)) return null;
    lists[key] = list.map(item => item.trim());
  }
  const urls: Record<string, string | null> = {};
  for (const key of ["product_url", "repository_url"]) {
    const raw = row[key];
    if (raw === "" || raw === null) { urls[key] = null; continue; }
    if (typeof raw !== "string" || raw.length > 500) return null;
    try { const url = new URL(raw); if (url.protocol !== "https:" || url.username || url.password) return null; urls[key] = url.href; } catch { return null; }
  }
  if (row.source_repository_private && (row.show_repository || urls.repository_url)) return null;
  const date = row.launch_date;
  if (date !== null && date !== "" && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) return null;
  return { ...texts, ...lists, ...urls, status:row.status, published:row.published, featured:row.featured, show_repository:row.show_repository, source_repository_private:row.source_repository_private, sort_order:row.sort_order, launch_date:date || null };
}

// Explicit public allowlist: never forward additional source metadata.
export function mapPublishedProduct(row: Omit<import("@/types/content").Product,"media">, media: import("@/types/content").ProjectMedia[]): import("@/types/content").Product {
  return {
    id: row.id, slug: row.slug, name: row.name, tagline: row.tagline,
    summary: row.summary, story: row.story, problem: row.problem,
    solution: row.solution, roadmap: row.roadmap, status: row.status,
    category: row.category, accent: row.accent, features: row.features,
    technologies: row.technologies, product_url: row.product_url,
    repository_url: row.repository_url, pricing_model: row.pricing_model,
    launch_date: row.launch_date, featured: row.featured, media,
  };
}
