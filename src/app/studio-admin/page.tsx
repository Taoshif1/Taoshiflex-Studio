import type { Metadata } from "next";
import { getAdminSession, isSupabasePublicConfigured, isSupabaseServerConfigured, supabaseRest } from "@/lib/supabase-rest";
import { StudioConsole } from "./studio-console";
import "./studio-admin.css";

export const metadata:Metadata={title:"Studio Admin",robots:{index:false,follow:false}};
type Row=Record<string,unknown>;
export default async function StudioAdminPage(){
  const configured=isSupabaseServerConfigured()&&isSupabasePublicConfigured();
  const user=configured?await getAdminSession():null;
  let projects:Row[]=[],inquiries:Row[]=[],packages:Row[]=[],settings:Row[]=[];
  if(user){
    [projects,inquiries,packages,settings]=await Promise.all([
      supabaseRest<Row[]>("projects?select=*&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<Row[]>("inquiries?select=id,email,status,created_at,payload&order=created_at.desc&limit=50",{},true).catch(()=>[]),
      supabaseRest<Row[]>("service_packages?select=*,package_features(*)&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<Row[]>("site_settings?select=key,value,public",{},true).catch(()=>[]),
    ]);
  }
  return <StudioConsole configured={configured} email={user?.email} projects={projects} inquiries={inquiries} packages={packages} settings={settings}/>;
}
