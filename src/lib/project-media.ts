import { supabaseConfig, supabaseHeaders } from "./supabase-rest";
import { PROJECT_MEDIA_BUCKET } from "./project-media-url";

export const PROJECT_MEDIA_MAX_BYTES=6*1024*1024;
export const PROJECT_MEDIA_TYPES=["image/jpeg","image/png","image/webp","image/avif"] as const;

const signatures:Record<string,(bytes:Uint8Array)=>boolean>={
  "image/jpeg":bytes=>bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff,
  "image/png":bytes=>bytes.slice(0,8).join(",")==="137,80,78,71,13,10,26,10",
  "image/webp":bytes=>new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP",
  "image/avif":bytes=>new TextDecoder().decode(bytes.slice(4,12)).includes("ftyp")&&new TextDecoder().decode(bytes.slice(8,16)).includes("avif"),
};

export function validProjectImage(file:File,bytes:Uint8Array){return PROJECT_MEDIA_TYPES.includes(file.type as typeof PROJECT_MEDIA_TYPES[number])&&file.size>0&&file.size<=PROJECT_MEDIA_MAX_BYTES&&Boolean(signatures[file.type]?.(bytes))}

export async function uploadProjectMedia(path:string,file:File){
  const {url}=supabaseConfig();if(!url)throw new Error("Supabase URL is not configured");
  const response=await fetch(`${url}/storage/v1/object/${PROJECT_MEDIA_BUCKET}/${path}`,{method:"POST",headers:supabaseHeaders("privileged",{"Content-Type":file.type,"x-upsert":"false","Cache-Control":"31536000"}),body:await file.arrayBuffer()});
  if(!response.ok)throw new Error(response.status===404?"Project media storage is not configured. Apply migration 004 first.":"Image upload failed.");
}

export async function removeProjectMedia(paths:string[]){
  if(!paths.length)return;
  const {url}=supabaseConfig();if(!url)throw new Error("Supabase URL is not configured");
  const response=await fetch(`${url}/storage/v1/object/${PROJECT_MEDIA_BUCKET}`,{method:"DELETE",headers:supabaseHeaders("privileged",{"Content-Type":"application/json"}),body:JSON.stringify({prefixes:paths})});
  if(!response.ok)throw new Error(response.status===404?"Project media storage is not configured. Apply migration 004 first.":"Stored project media could not be removed.");
}
