import { publicMetadata } from "@/lib/seo";
import { PricingContent } from "@/components/pricing/pricing-content";
import { getActivePackages } from "@/lib/studio-data";
import "./pricing.css";
import "./phase1c1.css";

export const metadata = publicMetadata("Pricing", "Starting prices for custom-designed websites, commerce systems and web applications from Taoshiflex Studio.", "/pricing");

export default async function PricingPage() {
  const packages = await getActivePackages();
  return <PricingContent packages={packages} />;
}
