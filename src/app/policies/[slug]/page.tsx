import { PolicyLanguageNote, T } from "@/i18n/language-context";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PolicyContent } from "@/components/policies/policy-content";
import { currentVersion, formatPolicyDate, getPublicPolicy } from "@/lib/policies";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params,policy=await getPublicPolicy(slug);if(!policy)return {title:"Policy not found",robots:{index:false,follow:false}};const version=currentVersion(policy);return {title:version.title,description:version.summary||undefined,alternates:{canonical:`/policies/${policy.slug}`}}}
export default async function PolicyPage({params}:Props){const {slug}=await params,policy=await getPublicPolicy(slug);if(!policy)notFound();const version=currentVersion(policy);return <main className="policy-shell policy-detail"><Link href="/policies"><T id="policies.detail.allPolicies"/></Link><article><PolicyLanguageNote/><header><p className="eyebrow"><T id="policies.detail.policyVersion"/> {version.version}</p><h1 className="title-accent">{version.title}</h1>{version.summary?<p>{version.summary}</p>:null}<dl><div><dt><T id="policies.detail.effectiveDate"/></dt><dd>{formatPolicyDate(version.effective_date)}</dd></div><div><dt><T id="policies.detail.currentVersion"/></dt><dd>{version.version}</dd></div></dl></header><div lang="en"><PolicyContent content={version.content}/></div></article></main>}
