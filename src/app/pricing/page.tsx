import type { Metadata } from "next";
import { PricingContent } from "@/components/pricing/pricing-content";
import { getActivePackages } from "@/lib/studio-data";
import "./pricing.css";
import "./phase1c1.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Starting prices for custom-designed websites, commerce systems and web applications from Taoshiflex Studio.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const packages = await getActivePackages();
  return <PricingContent packages={packages} />;
}
