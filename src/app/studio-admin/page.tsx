import type { Metadata } from "next";
import { getAdminAuthorization, isSupabasePublicConfigured, isSupabaseServerConfigured, supabaseRest } from "@/lib/supabase-rest";
import type { InquiryRecord } from "@/lib/inquiries";
import { loadAttentionNotifications } from "@/lib/notifications";
import { StudioConsole } from "./studio-console";

export const metadata:Metadata={title:"Studio Admin",robots:{index:false,follow:false}};
type Row=Record<string,unknown>;
export default async function StudioAdminPage(){
  const configured=isSupabaseServerConfigured()&&isSupabasePublicConfigured();
  const authorization=configured?await getAdminAuthorization():null;
  const user=authorization?.user;
  let projects:Row[]=[],inquiries:InquiryRecord[]=[],packages:Row[]=[],settings:Row[]=[];
  let attention: Array<{id:string;title:string;message:string;href:string;createdAt:string;type:string}>=[];
  if(user){
    const [projectRows,inquiryRows,packageRows,settingRows,attentionRows]=await Promise.all([
      supabaseRest<Row[]>("projects?select=*,project_media(*)&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<InquiryRecord[]>("inquiries?select=*&order=created_at.desc&limit=5",{},true).catch(()=>[]),
      supabaseRest<Row[]>("service_packages?select=*,package_features(*)&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<Row[]>("site_settings?select=key,value,public",{},true).catch(()=>[]),
      authorization ? loadAttentionNotifications(user.id,{userAccessToken:authorization.token}) : [],
    ]);
    projects=projectRows;inquiries=inquiryRows;packages=packageRows;settings=settingRows;
    attention=attentionRows.map(item=>({id:item.id,title:item.title,message:item.message,href:item.href,createdAt:item.created_at,type:item.type}));
  }
  return <StudioConsole configured={configured} email={user?.email} projects={projects} inquiries={inquiries} packages={packages} settings={settings} attention={attention}/>;
}
