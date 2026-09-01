import { getFeaturedProjects } from "@/lib/studio-data";
import { capabilities, processStages } from "@/content/site";
import { Hero } from "@/components/home/hero";
import { SelectedWork } from "@/components/home/selected-work";
import { CapabilitySystem } from "@/components/home/capability-system";
import { ProcessSystem } from "@/components/home/process-system";
import { Difference, FinalCta, Studio } from "@/components/home/static-sections";
import { ClientAuthFragmentBridge } from "@/components/auth/client-auth-fragment-bridge";
import "@/components/home/home.css";
export const dynamic="force-dynamic";
export default async function Home(){const projects=await getFeaturedProjects();return <><ClientAuthFragmentBridge/><Hero/><SelectedWork projects={projects}/><CapabilitySystem items={capabilities}/><Difference/><ProcessSystem stages={processStages}/><Studio/><FinalCta/></>}
