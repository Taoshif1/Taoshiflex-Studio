import { randomUUID } from "node:crypto";
import { authorizeMutation, cleanText } from "@/lib/admin-security";
import { PROJECT_MEDIA_MAX_BYTES, PROJECT_MEDIA_TYPES, removeProjectMedia, uploadProjectMedia, validProjectImage } from "@/lib/project-media";
import { reviewUuid } from "@/lib/review-contract";
import { supabaseRest } from "@/lib/supabase-rest";
type Media = {id:string;product_id:string;storage_path:string;role:string};
const extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
export async function POST(request:Request) {
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const form=await request.formData().catch(()=>null);
  const productId=form?.get("productId"),role=form?.get("role"),alt=cleanText(form?.get("alt"),240,true),file=form?.get("file"),replaceId=form?.get("replaceId");
  if(typeof productId!=="string"||!reviewUuid.test(productId)||!alt||!['cover','gallery'].includes(String(role))||!(file instanceof File)||(replaceId && (typeof replaceId!=="string"||!reviewUuid.test(replaceId))))return Response.json({error:"Choose an image, role and descriptive alt text."},{status:400});
  if(file.size>PROJECT_MEDIA_MAX_BYTES||!PROJECT_MEDIA_TYPES.includes(file.type as typeof PROJECT_MEDIA_TYPES[number]))return Response.json({error:"Use JPEG, PNG, WebP or AVIF, up to 6 MB."},{status:413});
  if(!validProjectImage(file,new Uint8Array(await file.arrayBuffer())))return Response.json({error:"Unsupported image content."},{status:415});
  const path=`products/${productId}/${randomUUID()}.${extensions[file.type]}`;
  let attached=false;
  try {
    const products=await supabaseRest<Array<{id:string}>>(`products?id=eq.${productId}&select=id`,{},"privileged");if(!products.length)return Response.json({error:"Product not found."},{status:404});
    const previous=replaceId||role==='cover'?await supabaseRest<Media[]>(`product_media?product_id=eq.${productId}&${replaceId?`id=eq.${replaceId}`:'role=eq.cover'}&select=id,product_id,storage_path,role&limit=1`,{},"privileged"):[];
    if(replaceId&&!previous.length)return Response.json({error:"Image not found."},{status:404});
    if(previous[0]&&!previous[0].storage_path.startsWith(`products/${productId}/`))throw new Error("Unsafe path");
    await uploadProjectMedia(path,file);
    const payload={product_id:productId,role:previous[0]?.role??role,storage_path:path,alt,metadata:{mime:file.type,size:file.size}};
    const last=previous[0]?[]:await supabaseRest<Array<{sort_order:number}>>(`product_media?product_id=eq.${productId}&order=sort_order.desc&select=sort_order&limit=1`,{},"privileged");
    const orderedPayload=previous[0]?payload:{...payload,sort_order:Number(last[0]?.sort_order??-1)+1};
    await supabaseRest(previous[0]?`product_media?id=eq.${previous[0].id}`:'product_media',{method:previous[0]?'PATCH':'POST',body:JSON.stringify(orderedPayload)},"privileged");attached=true;
    if(previous[0]) {
      try { await removeProjectMedia([previous[0].storage_path]); }
      catch { return Response.json({ok:true,warning:"Image replaced. The previous Storage object could not be removed; Studio should retry cleanup.",cleanupPath:previous[0].storage_path}); }
    }
    return Response.json({ok:true});
  } catch {
    if(!attached)await removeProjectMedia([path]).catch(()=>undefined);
    return Response.json({error:"Image could not be saved. Please retry."},{status:409});
  }
}
export async function PATCH(request:Request) {
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null),alt=cleanText(body?.alt,240,true);
  if(typeof body?.id!=="string"||!reviewUuid.test(body.id)||!alt||!Number.isInteger(body.sort_order)||Math.abs(body.sort_order)>100000)return Response.json({error:"Valid image, alt text and order are required."},{status:400});
  try {const rows=await supabaseRest<Array<{id:string}>>(`product_media?id=eq.${body.id}&select=id`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({alt,sort_order:body.sort_order})},"privileged");if(!rows.length)return Response.json({error:"Image not found."},{status:404});return Response.json({ok:true});}catch{return Response.json({error:"Image details could not be saved."},{status:409});}
}
export async function DELETE(request:Request) {
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null);
  if(typeof body?.id!=="string"||!reviewUuid.test(body.id))return Response.json({error:"Valid image is required."},{status:400});
  try {
    const rows=await supabaseRest<Media[]>(`product_media?id=eq.${body.id}&select=id,product_id,storage_path,role`,{},"privileged");
    if(!rows[0])return Response.json({error:"Image not found."},{status:404});
    if(!rows[0].storage_path.startsWith(`products/${rows[0].product_id}/`))throw new Error('Unsafe path');
    await removeProjectMedia([rows[0].storage_path]);
    await supabaseRest(`product_media?id=eq.${body.id}`,{method:"DELETE"},"privileged");return Response.json({ok:true});
  }catch{return Response.json({error:"Image removal could not be completed. Retry to finish cleanup."},{status:409});}
}
