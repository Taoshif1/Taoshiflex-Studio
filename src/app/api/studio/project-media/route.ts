import { randomUUID } from "node:crypto";
import { authorizeMutation, cleanText } from "@/lib/admin-security";
import { PROJECT_MEDIA_MAX_BYTES, PROJECT_MEDIA_TYPES, removeProjectMedia, uploadProjectMedia, validProjectImage } from "@/lib/project-media";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
type MediaRow={id:string;project_id:string;storage_path:string;role:"cover"|"gallery";sort_order:number};

export async function POST(request:Request){
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const form=await request.formData().catch(()=>null);const projectId=cleanText(form?.get("projectId"),80,true),alt=cleanText(form?.get("alt"),240,true),role=form?.get("role"),file=form?.get("file");
  if(!projectId||!uuid.test(projectId)||!alt||(role!=="cover"&&role!=="gallery")||!(file instanceof File))return Response.json({error:"Choose a valid image, role, and descriptive alt text."},{status:400});
  if(file.size>PROJECT_MEDIA_MAX_BYTES||!PROJECT_MEDIA_TYPES.includes(file.type as typeof PROJECT_MEDIA_TYPES[number]))return Response.json({error:"Use a JPEG, PNG, WebP, or AVIF image no larger than 6 MB."},{status:413});
  const bytes=new Uint8Array(await file.arrayBuffer());if(!validProjectImage(file,bytes))return Response.json({error:"The file content does not match a supported image format."},{status:415});
  const projects=await supabaseRest<Array<{id:string}>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id&limit=1`,{},true);if(!projects.length)return Response.json({error:"Project not found."},{status:404});
  const path=`projects/${projectId}/${randomUUID()}.${extensions[file.type]}`;
  try{
    await uploadProjectMedia(path,file);
    const existing=role==="cover"?await supabaseRest<MediaRow[]>(`project_media?project_id=eq.${encodeURIComponent(projectId)}&role=eq.cover&select=id,project_id,storage_path,role,sort_order&limit=1`,{},true):[];
    if(existing[0]){
      await supabaseRest(`project_media?id=eq.${encodeURIComponent(existing[0].id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({storage_path:path,alt,kind:"image",metadata:{mime:file.type,size:file.size}})},true);
      await removeProjectMedia([existing[0].storage_path]).catch(()=>undefined);
    }else{
      const last=await supabaseRest<Array<{sort_order:number}>>(`project_media?project_id=eq.${encodeURIComponent(projectId)}&role=eq.gallery&select=sort_order&order=sort_order.desc&limit=1`,{},true);
      await supabaseRest("project_media",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({project_id:projectId,kind:"image",role,storage_path:path,alt,metadata:{mime:file.type,size:file.size},sort_order:role==="cover"?0:Number(last[0]?.sort_order??-1)+1})},true);
    }
    return Response.json({ok:true});
  }catch(error){await removeProjectMedia([path]).catch(()=>undefined);return Response.json({error:error instanceof Error&&error.message.startsWith("Supabase request failed")?"Project media requires migration 004.":error instanceof Error?error.message:"Image could not be uploaded."},{status:409})}
}

export async function PATCH(request:Request){
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as {projectId?:unknown;orderedIds?:unknown;setCoverId?:unknown}|null;const projectId=cleanText(body?.projectId,80,true);
  if(!projectId||!uuid.test(projectId))return Response.json({error:"Valid project id is required."},{status:400});
  if(typeof body?.setCoverId==="string"&&uuid.test(body.setCoverId)){try{const target=await supabaseRest<MediaRow[]>(`project_media?id=eq.${encodeURIComponent(body.setCoverId)}&project_id=eq.${encodeURIComponent(projectId)}&select=id,project_id,storage_path,role,sort_order&limit=1`,{},true),cover=await supabaseRest<MediaRow[]>(`project_media?project_id=eq.${encodeURIComponent(projectId)}&role=eq.cover&select=id,project_id,storage_path,role,sort_order&limit=1`,{},true);if(!target.length)return Response.json({error:"Gallery image not found."},{status:404});if(cover[0])await supabaseRest(`project_media?id=eq.${encodeURIComponent(cover[0].id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({role:"gallery",sort_order:target[0].sort_order})},true);await supabaseRest(`project_media?id=eq.${encodeURIComponent(target[0].id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({role:"cover",sort_order:0})},true);return Response.json({ok:true})}catch{return Response.json({error:"Media roles require migration 004 before they can be changed."},{status:409})}}
  if(!Array.isArray(body?.orderedIds)||body.orderedIds.length>50||body.orderedIds.some(id=>typeof id!=="string"||!uuid.test(id)))return Response.json({error:"Invalid gallery order."},{status:400});
  const ids=[...new Set(body.orderedIds as string[])];try{const rows=await supabaseRest<Array<{id:string}>>(`project_media?project_id=eq.${encodeURIComponent(projectId)}&role=eq.gallery&select=id`,{},true);if(rows.length!==ids.length||rows.some(row=>!ids.includes(row.id)))return Response.json({error:"Gallery changed. Refresh and try again."},{status:409});await Promise.all(ids.map((id,sort_order)=>supabaseRest(`project_media?id=eq.${encodeURIComponent(id)}&project_id=eq.${encodeURIComponent(projectId)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({sort_order})},true)));return Response.json({ok:true})}catch{return Response.json({error:"Gallery ordering requires migration 004."},{status:409})}
}

export async function DELETE(request:Request){
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as {id?:unknown}|null;const id=cleanText(body?.id,80,true);if(!id||!uuid.test(id))return Response.json({error:"Valid media id is required."},{status:400});
  let rows:MediaRow[];try{rows=await supabaseRest<MediaRow[]>(`project_media?id=eq.${encodeURIComponent(id)}&select=id,project_id,storage_path,role,sort_order&limit=1`,{},true)}catch{return Response.json({error:"Project media requires migration 004."},{status:409})}if(!rows.length)return Response.json({error:"Media not found."},{status:404});
  try{await removeProjectMedia([rows[0].storage_path]);await supabaseRest(`project_media?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}},true);return Response.json({ok:true})}catch(error){return Response.json({error:error instanceof Error?error.message:"Media could not be removed."},{status:409})}
}
