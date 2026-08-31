export const PROJECT_MEDIA_BUCKET="project-media";
export function projectMediaPublicUrl(path:string){const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,"");return url?`${url}/storage/v1/object/public/${PROJECT_MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`:""}
