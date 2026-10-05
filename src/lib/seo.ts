import type { Metadata } from "next";
import { site } from "@/content/site";
export function publicMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.name, title: title + " — " + site.name, description, url: path, images: [{url:"/opengraph-image",alt:site.name}] },
    twitter: { card: "summary_large_image", title: title + " — " + site.name, description, images: ["/opengraph-image"] } };
}
