import type { Metadata } from "next";
import { getAdminAuthorization, isSupabasePublicConfigured, isSupabaseServerConfigured, supabaseRest } from "@/lib/supabase-rest";
import type { InquiryRecord } from "@/lib/inquiries";
import { loadAttentionNotifications } from "@/lib/notifications";
import { StudioConsole } from "./studio-console";
import { getStudioAlertReadiness } from "@/lib/inquiry-alerts";
import {
  buildStudioDashboard,
  type DashboardBillingRow,
  type DashboardInquiryRow,
  type DashboardMembershipRow,
  type DashboardPaymentRow,
  type DashboardProjectRow,
  type StudioDashboardViewModel,
} from "@/lib/studio-dashboard";
import { StudioDashboard } from "./studio-dashboard";

export const metadata:Metadata={title:"Studio Admin",robots:{index:false,follow:false}};
type Row=Record<string,unknown>;
export default async function StudioAdminPage(){
  const configured=isSupabaseServerConfigured()&&isSupabasePublicConfigured();
  const authorization=configured?await getAdminAuthorization():null;
  const user=authorization?.user;
  let projects:Row[]=[],inquiries:InquiryRecord[]=[],packages:Row[]=[],settings:Row[]=[];
  let attention: Array<{id:string;title:string;message:string;href:string;createdAt:string;type:string}>=[];
  let dashboard:StudioDashboardViewModel|null=null;
  if(user){
    const [projectRows,inquiryRows,packageRows,settingRows,attentionRows,dashboardRows]=await Promise.all([
      supabaseRest<Row[]>("projects?select=*,project_media(*)&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<InquiryRecord[]>("inquiries?select=*&order=created_at.desc&limit=5",{},true).catch(()=>[]),
      supabaseRest<Row[]>("service_packages?select=*,package_features(*)&order=sort_order.asc",{},true).catch(()=>[]),
      supabaseRest<Row[]>("site_settings?select=key,value,public",{},true).catch(()=>[]),
      authorization ? loadAttentionNotifications(user.id,{userAccessToken:authorization.token}) : [],
      Promise.all([
        supabaseRest<DashboardProjectRow[]>(
          "client_projects?select=id,status,target_date&limit=5000",
          {},
          "privileged",
        ),
        supabaseRest<DashboardMembershipRow[]>(
          "client_project_members?select=user_id,role&limit=5000",
          {},
          "privileged",
        ),
        supabaseRest<DashboardBillingRow[]>(
          "project_billing?select=project_id,agreed_value_minor,currency,currency_decimals&limit=5000",
          {},
          "privileged",
        ),
        supabaseRest<DashboardPaymentRow[]>(
          "project_payments?select=project_id,entry_type,amount_minor,currency,status,confirmed_at&limit=5000",
          {},
          "privileged",
        ),
        supabaseRest<DashboardInquiryRow[]>(
          "inquiries?select=status,created_at&limit=5000",
          {},
          "privileged",
        ),
      ]).catch(()=>null),
    ]);
    projects=projectRows;inquiries=inquiryRows;packages=packageRows;settings=settingRows;
    attention=attentionRows.map(item=>({id:item.id,title:item.title,message:item.message,href:item.href,createdAt:item.created_at,type:item.type}));
    if(dashboardRows){
      const [clientProjects,memberships,billing,payments,dashboardInquiries]=dashboardRows;
      dashboard=buildStudioDashboard({clientProjects,memberships,billing,payments,inquiries:dashboardInquiries});
    }
  }
  const alertReadiness=user?getStudioAlertReadiness():{email:false};
  return <StudioConsole configured={configured} email={user?.email} projects={projects} inquiries={inquiries} packages={packages} settings={settings} attention={attention} alertReadiness={alertReadiness} dashboard={user?<StudioDashboard data={dashboard}/>:undefined}/>;
}
