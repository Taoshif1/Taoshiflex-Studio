import type { Metadata } from "next";
import { getAdminSession, isSupabasePublicConfigured, isSupabaseServerConfigured, supabaseRest } from "@/lib/supabase-rest";
import type { InquiryRecord } from "@/lib/inquiries";
import { StudioConsole } from "./studio-console";

export const metadata:Metadata={title:"Studio Admin",robots:{index:false,follow:false}};
type Row=Record<string,unknown>;
export default async function StudioAdminPage(){
  const configured=isSupabaseServerConfigured()&&isSupabasePublicConfigured();
  const user=configured?await getAdminSession():null;
  let projects:Row[]=[],inquiries:InquiryRecord[]=[],packages:Row[]=[],settings:Row[]=[];
  if(user){
    [projects,inquiries,packages,settings]=await Promise.all([
      supabaseRest<Row[]>("projects?select=*,project_media(*)&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<InquiryRecord[]>("inquiries?select=*&order=created_at.desc&limit=5",{},true).catch(()=>[]),
      supabaseRest<Row[]>("service_packages?select=*,package_features(*)&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<Row[]>("site_settings?select=key,value,public",{},true).catch(()=>[]),
    ]);
  }
  return <StudioConsole configured={configured} email={user?.email} projects={projects} inquiries={inquiries} packages={packages} settings={settings}/>;
}
