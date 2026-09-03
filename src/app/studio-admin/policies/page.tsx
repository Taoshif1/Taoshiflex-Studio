import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import type { Policy } from "@/lib/policies";
import { AdminBreadcrumbs } from "../admin-breadcrumbs";
import { PolicyManager } from "./policy-manager";
import "./policies-admin.css";
import { PublishedPolicyControls } from "./published-controls";
export const metadata:Metadata={title:"Policies / Studio Admin",robots:{index:false,follow:false}};
export default async function AdminPoliciesPage(){if(!await getAdminSession())redirect("/studio-admin");const policies=await supabaseRest<Policy[]>("policies?select=id,slug,sort_order,archived_at,created_at,updated_at,policy_versions(id,policy_id,version,title,summary,content,audience,is_published,effective_date,published_at,created_at,updated_at)&order=sort_order.asc,created_at.asc",{},"privileged").catch(()=>[]);return <main className="admin-shell policy-admin"><AdminBreadcrumbs items={[{label:"Studio Admin",href:"/studio-admin"},{label:"Policies"}]}/><header className="admin-head"><div><p className="eyebrow">Governance / Versioned documents</p><h1>Policies</h1><p>Draft, review and publish audience-specific Studio policies.</p></div></header><div className="policy-manager"><PublishedPolicyControls policies={policies}/></div><PolicyManager policies={policies}/></main>}
