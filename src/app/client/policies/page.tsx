import Link from "next/link";
import { redirect } from "next/navigation";
import { PolicyContent } from "@/components/policies/policy-content";
import { getClientAuthorization } from "@/lib/client-auth";
import { currentVersion, formatPolicyDate, getClientPolicies } from "@/lib/policies";
export const metadata={title:"Policies / Client Workspace",robots:{index:false,follow:false}};
export default async function ClientPoliciesPage(){const auth=await getClientAuthorization();if(!auth)redirect("/client");const policies=await getClientPolicies(auth.token);return <main className="client-shell"><header className="client-head"><div><p className="eyebrow">Private / Governance</p><h1>Client policies</h1><p>Current policies that apply to your Studio engagement.</p></div><Link className="action" href="/client">Back to workspace</Link></header><div className="client-policy-list">{policies.map(policy=>{const version=currentVersion(policy);return <details key={policy.id}><summary><span><strong>{version.title}</strong><small>Version {version.version} / Effective {formatPolicyDate(version.effective_date)}</small></span></summary>{version.summary?<p>{version.summary}</p>:null}<PolicyContent content={version.content}/></details>})}{!policies.length?<p className="workspace-empty">No Client policies are currently published.</p>:null}</div></main>}
