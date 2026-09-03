import { authorizeMutation, cleanText } from "@/lib/admin-security";
import {
  allowedDeliverableTypes,
  createDeliverableSignedUpload,
  getDeliverableObjectInfo,
  maxDeliverableBytes,
  removeDeliverableObject,
  safeDeliverableFilename,
  verifyDeliverableUploadTicket,
} from "@/lib/private-deliverables";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeliverableRow = {
  id: string;
  project_id: string;
  storage_path: string | null;
};

function storagePathFilter(path: string | null) {
  return path === null ? "is.null" : `eq.${encodeURIComponent(path)}`;
}

function isDeliverableObjectPath(path: string, projectId: string, deliverableId: string) {
  const prefix = `${projectId}/${deliverableId}/`;
  const filename = path.slice(prefix.length);
  return path.length <= 300 && path.startsWith(prefix) && Boolean(filename) && !filename.includes("/");
}

async function compareAndSetStoragePath({
  projectId,
  deliverableId,
  expectedPath,
  nextPath,
}: {
  projectId: string;
  deliverableId: string;
  expectedPath: string | null;
  nextPath: string | null;
}) {
  const rows = await supabaseRest<DeliverableRow[]>(
    `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}&storage_path=${storagePathFilter(expectedPath)}&select=id,project_id,storage_path`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ storage_path: nextPath }),
    },
    "privileged",
  );
  return rows.length === 1;
}

export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const projectId = cleanText(body?.projectId, 40, true);
  const deliverableId = cleanText(body?.deliverableId, 40, true);
  const fileName = cleanText(body?.fileName, 180, true);
  const fileType = cleanText(body?.fileType, 160, true)?.toLowerCase() ?? null;
  const fileSize = typeof body?.fileSize === "number" ? body.fileSize : 0;

  if (!projectId || !deliverableId || !fileName || !fileType || !uuid.test(projectId) || !uuid.test(deliverableId)) {
    return Response.json(
      { error: "Valid project, deliverable and file details are required." },
      { status: 400 },
    );
  }
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > maxDeliverableBytes) {
    return Response.json({ error: "Deliverable files must be between 1 byte and 25 MB." }, { status: 400 });
  }
  if (!allowedDeliverableTypes.has(fileType)) {
    return Response.json({ error: "That file type is not allowed for private deliverables." }, { status: 400 });
  }

  let deliverable: DeliverableRow | undefined;
  try {
    const rows = await supabaseRest<DeliverableRow[]>(
      `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}&select=id,project_id,storage_path&limit=1`,
      {},
      "privileged",
    );
    deliverable = rows[0];
  } catch {
    return Response.json(
      { error: "Deliverable storage could not be checked." },
      { status: 503 },
    );
  }
  if (!deliverable) return Response.json({ error: "Deliverable not found." }, { status: 404 });

  const path = `${projectId}/${deliverableId}/${crypto.randomUUID()}-${safeDeliverableFilename(fileName)}`;
  try {
    const ticket = await createDeliverableSignedUpload({
      projectId,
      deliverableId,
      path,
      previousPath: deliverable.storage_path,
      fileSize,
      fileType,
    });
    return Response.json(ticket);
  } catch {
    return Response.json(
      { error: "Private deliverable upload could not be authorized." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const ticket = verifyDeliverableUploadTicket(body?.finalizeToken);
  if (!ticket) {
    return Response.json(
      { error: "The upload authorization is invalid or expired. Upload the file again." },
      { status: 400 },
    );
  }

  const { projectId, deliverableId, path: storagePath } = ticket;

  if (
    !uuid.test(projectId) ||
    !uuid.test(deliverableId) ||
    !isDeliverableObjectPath(storagePath, projectId, deliverableId) ||
    !Number.isSafeInteger(ticket.fileSize) ||
    ticket.fileSize < 1 ||
    ticket.fileSize > maxDeliverableBytes ||
    !allowedDeliverableTypes.has(ticket.fileType)
  ) {
    return Response.json(
      { error: "Valid project, deliverable and storage path are required." },
      { status: 400 },
    );
  }

  try {
    const uploaded = await getDeliverableObjectInfo(storagePath);
    if (
      uploaded.size !== ticket.fileSize ||
      uploaded.contentType.toLowerCase() !== ticket.fileType
    ) {
      return Response.json(
        { error: "The uploaded file does not match its authorized size or type." },
        { status: 400 },
      );
    }
  } catch {
    return Response.json(
      { error: "The uploaded file could not be verified." },
      { status: 409 },
    );
  }

  let pathIsCurrent: boolean;
  try {
    pathIsCurrent = await compareAndSetStoragePath({
      projectId,
      deliverableId,
      expectedPath: ticket.previousPath,
      nextPath: storagePath,
    });
  } catch {
    return Response.json(
      { error: "Deliverable storage could not be finalized." },
      { status: 503 },
    );
  }

  if (!pathIsCurrent) {
    let current: DeliverableRow | undefined;
    try {
      const rows = await supabaseRest<DeliverableRow[]>(
        `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}&select=id,project_id,storage_path&limit=1`,
        {},
        "privileged",
      );
      current = rows[0];
    } catch {
      return Response.json(
        { error: "The deliverable changed during upload. Refresh before retrying." },
        { status: 409 },
      );
    }

    if (current?.storage_path === storagePath) {
      return Response.json({ ok: true, message: "Private deliverable uploaded." });
    }
    await removeDeliverableObject(storagePath).catch(() => undefined);
    return Response.json(
      { error: current ? "The deliverable changed during upload. Refresh before retrying." : "Deliverable not found." },
      { status: current ? 409 : 404 },
    );
  }

  if (
    ticket.previousPath &&
    ticket.previousPath !== storagePath &&
    isDeliverableObjectPath(ticket.previousPath, projectId, deliverableId)
  ) {
    await removeDeliverableObject(ticket.previousPath).catch(() => undefined);
  }
  return Response.json({ ok: true, message: "Private deliverable uploaded." });
}

export async function DELETE(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const projectId = cleanText(body?.projectId, 40, true);
  const deliverableId = cleanText(body?.deliverableId, 40, true);

  if (!projectId || !deliverableId || !uuid.test(projectId) || !uuid.test(deliverableId)) {
    return Response.json({ error: "Valid project and deliverable are required." }, { status: 400 });
  }

  let rows: DeliverableRow[];
  try {
    rows = await supabaseRest<DeliverableRow[]>(
      `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}&select=id,project_id,storage_path&limit=1`,
      {},
      "privileged",
    );
  } catch {
    return Response.json(
      { error: "Deliverable storage could not be checked." },
      { status: 503 },
    );
  }
  const deliverable = rows[0];
  if (!deliverable) return Response.json({ error: "Deliverable not found." }, { status: 404 });
  if (!deliverable.storage_path) return Response.json({ ok: true, message: "No private file was attached." });

  const storagePath = deliverable.storage_path;
  try {
    const cleared = await compareAndSetStoragePath({
      projectId,
      deliverableId,
      expectedPath: storagePath,
      nextPath: null,
    });
    if (!cleared) {
      return Response.json(
        { error: "The deliverable changed before it could be removed. Refresh and retry." },
        { status: 409 },
      );
    }

    if (isDeliverableObjectPath(storagePath, projectId, deliverableId)) {
      await removeDeliverableObject(storagePath).catch(() => undefined);
    }
    return Response.json({ ok: true, message: "Private deliverable removed." });
  } catch {
    return Response.json({ error: "Private deliverable could not be removed." }, { status: 409 });
  }
}
