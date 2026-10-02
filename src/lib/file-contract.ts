import sharp from "sharp";

export const deliverableExtensions: Record<string, readonly string[]> = {
 "application/pdf":["pdf"],"application/zip":["zip"],"application/x-zip-compressed":["zip"],
 "image/png":["png"],"image/jpeg":["jpg","jpeg"],"image/webp":["webp"],"text/plain":["txt"],
 "application/msword":["doc"],"application/vnd.ms-excel":["xls"],
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document":["docx"],
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":["xlsx"],
};
export function validDeliverableExtension(name: string, type: string) {
 return Boolean(deliverableExtensions[type]?.includes(name.split(".").pop()?.toLowerCase() ?? ""));
}
export function validDeliverableContent(type: string, bytes: Uint8Array) {
 if (!bytes.length) return false;
 const starts=(prefix:number[])=>prefix.every((n,i)=>bytes[i]===n);
 if(type==="application/pdf")return starts([37,80,68,70,45]);
 if(type==="image/png")return starts([137,80,78,71,13,10,26,10]);
 if(type==="image/jpeg")return starts([255,216,255]);
 if(type==="image/webp")return new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
 if(type==="application/msword"||type==="application/vnd.ms-excel")return starts([208,207,17,224,161,177,26,225]);
 if(type==="text/plain"){try{const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);return !text.includes("\u0000");}catch{return false;}}
 if(deliverableExtensions[type])return starts([80,75,3,4])||starts([80,75,5,6]);
 return false;
}
export function validDeliverablePath(path:string,projectId:string,deliverableId:string) {
 const prefix=projectId+"/"+deliverableId+"/";
 return path.startsWith(prefix)&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,160}$/.test(path.slice(prefix.length));
}

// Private images are decoded with the same pixel ceiling as public media.
export async function validDeliverableImage(type: string, bytes: Uint8Array) {
 if (!validDeliverableContent(type, bytes)) return false;
 try {
  const decoder = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
  const info = await decoder.metadata();
  if (!info.width || !info.height || (info.pages ?? 1) > 1) return false;
  await decoder.toBuffer();
  return true;
 } catch { return false; }
}
