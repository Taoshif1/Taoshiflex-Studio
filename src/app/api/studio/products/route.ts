import { authorizeMutation } from "@/lib/admin-security";
import { parseProduct } from "@/lib/product-contract";
import { reviewUuid } from "@/lib/review-contract";
import { supabaseRest } from "@/lib/supabase-rest";

async function save(request: Request, create: boolean) {
  const auth = await authorizeMutation(request); if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const product = parseProduct(body);
  if (!product || (!create && (typeof body.id !== "string" || !reviewUuid.test(body.id)))) return Response.json({ error: "Check required fields, URLs and publication settings. Private-source products cannot expose a repository link." }, { status: 400 });
  try {
    const rows = await supabaseRest<Array<{ id:string }>>(create ? "products?select=id" : `products?id=eq.${body.id}&select=id`, { method:create ? "POST" : "PATCH", headers:{ Prefer:"return=representation" }, body:JSON.stringify(product) }, "privileged");
    if (!rows.length) return Response.json({ error:"Product not found." }, {status:404});
    return Response.json({ ok:true,id:rows[0].id });
  } catch { return Response.json({ error:"Product could not be saved. Check that its slug is unique and the migration is applied." }, {status:409}); }
}
export async function POST(request: Request) { return save(request, true); }
export async function PATCH(request: Request) { return save(request, false); }
// Archive preserves content and uploaded media for restoration; never silently deletes assets.
export async function DELETE(request: Request) {
  const auth = await authorizeMutation(request); if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !reviewUuid.test(body.id) || typeof body.confirmName !== "string") return Response.json({error:"Product and confirmation name are required."},{status:400});
  try {
    const rows = await supabaseRest<Array<{name:string}>>(`products?id=eq.${body.id}&select=name`,{},"privileged");
    if (!rows[0] || rows[0].name !== body.confirmName) return Response.json({error:"Product name confirmation does not match."},{status:409});
    await supabaseRest(`products?id=eq.${body.id}`,{method:"PATCH",body:JSON.stringify({published:false,featured:false})},"privileged");
    return Response.json({ok:true});
  } catch { return Response.json({error:"Product could not be archived."},{status:409}); }
}
