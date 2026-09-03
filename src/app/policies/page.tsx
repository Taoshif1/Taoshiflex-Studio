import type { Metadata } from "next";
import Link from "next/link";
import { currentVersion, formatPolicyDate, getPublicPolicies } from "@/lib/policies";

export const metadata:Metadata={title:"Policies",description:"Current public policies for working with Taoshiflex Studio.",alternates:{canonical:"/policies"}};
export default async function PoliciesPage(){const policies=await getPublicPolicies();return <main className="policy-shell"><header><p className="eyebrow">Governance / Public documents</p><h1>Policies</h1><p>Current terms and working policies published by Taoshiflex Studio.</p></header>{policies.length?<div className="policy-index">{policies.map(policy=>{const version=currentVersion(policy);return <Link href={`/policies/${policy.slug}`} key={policy.id}><span>Version {version.version} / Effective {formatPolicyDate(version.effective_date)}</span><h2>{version.title}</h2>{version.summary?<p>{version.summary}</p>:null}<strong>Read policy →</strong></Link>})}</div>:<section className="policy-empty"><h2>No public policies are published.</h2><p>Published documents will appear here after Studio review.</p></section>}</main>}
