import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Taoshiflex Studio",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#11110f",
    theme_color: "#11110f",
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
