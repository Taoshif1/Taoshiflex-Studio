import { authorizeMutation, cleanText } from "@/lib/admin-security";
import {
  allowedDeliverableTypes,
  maxDeliverableBytes,
  removeDeliverableObject,
  safeDeliverableFilename,
  uploadDeliverableObject,
} from "@/lib/private-deliverables";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeliverableRow = {
  id: string;
  project_id: string;
  storage_path: string | null;
};

export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;

  const form = await request.formData().catch(() => null);
  const projectId = cleanText(form?.get("projectId"), 40, true);
  const deliverableId = cleanText(form?.get("deliverableId"), 40, true);
  const file = form?.get("file");

  if (!projectId || !deliverableId || !uuid.test(projectId) || !uuid.test(deliverableId) || !(file instanceof File)) {
    return Response.json({ error: "Valid project, deliverable and file are required." }, { status: 400 });
  }
  if (!file.size || file.size > maxDeliverableBytes) {
    return Response.json({ error: "Deliverable files must be between 1 byte and 25 MB." }, { status: 400 });
  }
  if (!allowedDeliverableTypes.has(file.type)) {
    return Response.json({ error: "That file type is not allowed for private deliverables." }, { status: 400 });
  }

  const rows = await supabaseRest<DeliverableRow[]>(
    `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}&select=id,project_id,storage_path&limit=1`,
    {},
    "privileged",
  ).catch(() => []);
  const deliverable = rows[0];
  if (!deliverable) return Response.json({ error: "Deliverable not found." }, { status: 404 });

  const previousPath = deliverable.storage_path;
  const path = `${projectId}/${deliverableId}/${crypto.randomUUID()}-${safeDeliverableFilename(file.name)}`;

  try {
    await uploadDeliverableObject(path, file);
    await supabaseRest(
      `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ storage_path: path }),
      },
      "privileged",
    );
    if (previousPath) await removeDeliverableObject(previousPath).catch(() => undefined);
    return Response.json({ ok: true, message: "Private deliverable uploaded." });
  } catch {
    await removeDeliverableObject(path).catch(() => undefined);
    return Response.json({ error: "Private deliverable could not be uploaded." }, { status: 409 });
  }
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

  const rows = await supabaseRest<DeliverableRow[]>(
    `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}&select=id,project_id,storage_path&limit=1`,
    {},
    "privileged",
  ).catch(() => []);
  const deliverable = rows[0];
  if (!deliverable) return Response.json({ error: "Deliverable not found." }, { status: 404 });
  if (!deliverable.storage_path) return Response.json({ ok: true, message: "No private file was attached." });

  try {
    await supabaseRest(
      `project_deliverables?id=eq.${deliverableId}&project_id=eq.${projectId}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ storage_path: null }),
      },
      "privileged",
    );
    await removeDeliverableObject(deliverable.storage_path).catch(() => undefined);
    return Response.json({ ok: true, message: "Private deliverable removed." });
  } catch {
    return Response.json({ error: "Private deliverable could not be removed." }, { status: 409 });
  }
}
