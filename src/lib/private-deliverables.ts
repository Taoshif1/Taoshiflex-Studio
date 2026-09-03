const bucket = "client-deliverables";
export const maxDeliverableBytes = 25 * 1024 * 1024;

export const allowedDeliverableTypes = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Private deliverable storage is not configured.");
  return { url, key };
}

function headers(contentType?: string) {
  const { key } = config();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export function safeDeliverableFilename(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return normalized || "deliverable";
}

export async function uploadDeliverableObject(path: string, file: File) {
  const { url } = config();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
    method: "POST",
    headers: { ...headers(file.type || "application/octet-stream"), "x-upsert": "false" },
    body: file,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Private deliverable upload failed.");
}

export async function removeDeliverableObject(path: string) {
  const { url } = config();
  const response = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: headers("application/json"),
    body: JSON.stringify({ prefixes: [path] }),
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) throw new Error("Private deliverable removal failed.");
}

export async function createDeliverableSignedUrl(path: string, expiresIn = 90) {
  const { url } = config();
  const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${encodeURI(path)}`, {
    method: "POST",
    headers: headers("application/json"),
    body: JSON.stringify({ expiresIn }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Private deliverable link could not be created.");
  const result = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signed = result.signedURL || result.signedUrl;
  if (!signed) throw new Error("Private deliverable link could not be created.");
  return signed.startsWith("http") ? signed : `${url}/storage/v1${signed}`;
}
