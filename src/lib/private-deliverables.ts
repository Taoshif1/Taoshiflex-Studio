import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const bucket = "client-deliverables";
const uploadTicketLifetimeMs = 15 * 60 * 1000;
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

type DeliverableUploadAuthorization = {
  projectId: string;
  deliverableId: string;
  path: string;
  previousPath: string | null;
  fileSize: number;
  fileType: string;
};

export type DeliverableUploadTicket = DeliverableUploadAuthorization & {
  expiresAt: number;
  version: 1;
};

function storageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Private deliverable storage is not configured.");
  return { key, url };
}

function storage() {
  const { key, url } = storageConfig();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }).storage.from(bucket);
}

function signUploadTicket(payload: string) {
  return createHmac("sha256", storageConfig().key).update(payload).digest("base64url");
}

function isUploadTicket(value: unknown): value is DeliverableUploadTicket {
  if (!value || typeof value !== "object") return false;
  const ticket = value as Record<string, unknown>;
  return (
    ticket.version === 1 &&
    typeof ticket.projectId === "string" &&
    typeof ticket.deliverableId === "string" &&
    typeof ticket.path === "string" &&
    (ticket.previousPath === null || typeof ticket.previousPath === "string") &&
    Number.isSafeInteger(ticket.fileSize) &&
    typeof ticket.fileType === "string" &&
    typeof ticket.expiresAt === "number" &&
    Number.isSafeInteger(ticket.expiresAt)
  );
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

export async function createDeliverableSignedUpload(
  authorization: DeliverableUploadAuthorization,
) {
  const { data, error } = await storage().createSignedUploadUrl(authorization.path, {
    upsert: false,
  });
  if (error || !data?.token) {
    throw new Error("Private deliverable upload could not be authorized.", {
      cause: error,
    });
  }
  const ticket: DeliverableUploadTicket = {
    ...authorization,
    expiresAt: Date.now() + uploadTicketLifetimeMs,
    version: 1,
  };
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return {
    finalizeToken: `${payload}.${signUploadTicket(payload)}`,
    path: authorization.path,
    token: data.token,
  };
}

export function verifyDeliverableUploadTicket(value: unknown) {
  if (typeof value !== "string" || value.length > 2_000) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;

  const expected = Buffer.from(signUploadTicket(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const ticket = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!isUploadTicket(ticket) || ticket.expiresAt < Date.now()) return null;
    return ticket;
  } catch {
    return null;
  }
}

export async function getDeliverableObjectInfo(path: string) {
  const { data, error } = await storage().info(path);
  if (error || !data) {
    throw new Error("Private deliverable upload could not be verified.", {
      cause: error,
    });
  }
  return {
    size: Number.isFinite(data.size) ? Number(data.size) : 0,
    contentType: typeof data.contentType === "string" ? data.contentType : "",
  };
}

export async function removeDeliverableObject(path: string) {
  const { error } = await storage().remove([path]);
  if (error) throw new Error("Private deliverable removal failed.", { cause: error });
}

export async function createDeliverableSignedUrl(path: string, expiresIn = 90) {
  const { data, error } = await storage().createSignedUrl(path, expiresIn, {
    download: true,
  });
  if (error || !data?.signedUrl) {
    throw new Error("Private deliverable link could not be created.", {
      cause: error,
    });
  }
  return data.signedUrl;
}
