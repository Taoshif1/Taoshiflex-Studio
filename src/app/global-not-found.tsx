import DocumentShell, { siteMetadata } from "@/components/global/document-shell";
import NotFound from "./(public)/not-found";
export const metadata = { metadataBase: siteMetadata.metadataBase, title: "Page not found", robots: {index:false,follow:false} };
export default function GlobalNotFound() { return <DocumentShell><NotFound/></DocumentShell>; }
