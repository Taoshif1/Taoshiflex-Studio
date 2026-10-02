import { validDeliverablePath } from "@/lib/file-contract";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { getClientAuthorization } from "@/lib/client-auth";
import { createDeliverableSignedUrl } from "@/lib/private-deliverables";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Props = { params: Promise<{ id: string }> };
type DeliverableRow = { id: string; project_id: string; storage_path: string | null };

export async function GET(_request: Request, { params }: Props) {
  const authorization = await getClientAuthorization();
  if (!authorization) return Response.json({ error: "Authentication required." }, { status: 401 });

  if(!rateLimit("download:"+authorization.user.id,30,60_000))return Response.json({error:"Too many downloads."},{status:429});
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Deliverable not found." }, { status: 404 });

  const access = { userAccessToken: authorization.token };
  let rows: DeliverableRow[];
  try {
    rows = await supabaseRest<DeliverableRow[]>(
      `project_deliverables?id=eq.${id}&select=id,project_id,storage_path&limit=1`,
      {},
      access,
    );
  } catch {
    return Response.json(
      { error: "Private file authorization could not be checked." },
      { status: 503 },
    );
  }
  const deliverable = rows[0];
  if (!deliverable?.storage_path || !validDeliverablePath(deliverable.storage_path,deliverable.project_id,deliverable.id)) return Response.json({ error: "Private file not available." }, { status: 404 });

  try {
    const signedUrl = await createDeliverableSignedUrl(deliverable.storage_path, 90);
    const response = NextResponse.redirect(signedUrl, 302);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch {
    return Response.json({ error: "Private file link could not be created." }, { status: 503 });
  }
}
