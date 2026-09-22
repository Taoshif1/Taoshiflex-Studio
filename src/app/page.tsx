import { getFeaturedProducts, getFeaturedReviews, getFeaturedProjects } from "@/lib/studio-data";
import { capabilities, processStages } from "@/content/site";
import { Hero } from "@/components/home/hero";
import { SelectedWork } from "@/components/home/selected-work";
import { CapabilitySystem } from "@/components/home/capability-system";
import { ProcessSystem } from "@/components/home/process-system";
import { Difference, FinalCta, Studio } from "@/components/home/static-sections";
import "@/components/home/home.css";
import { FeaturedProducts } from "@/components/products/featured-products";
import { ReviewMarquee } from "@/components/reviews/review-marquee";
export const dynamic="force-dynamic";
export default async function Home(){const [projects,products,reviews]=await Promise.all([getFeaturedProjects(),getFeaturedProducts(),getFeaturedReviews()]);return <><Hero/><SelectedWork projects={projects}/><FeaturedProducts products={products}/><CapabilitySystem items={capabilities}/><Difference/><ReviewMarquee reviews={reviews}/><ProcessSystem stages={processStages}/><Studio/><FinalCta/></>}
