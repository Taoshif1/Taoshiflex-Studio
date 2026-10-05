import DocumentShell, { siteMetadata, siteViewport } from "@/components/global/document-shell";
import { PublicAnalytics } from "@/components/analytics/public-analytics";
import { PublicNavigationScrollReset } from "@/components/global/public-navigation-scroll-reset";

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function PublicLayout({children}:{children:React.ReactNode}) {
  return <DocumentShell analytics={<PublicAnalytics/>}><PublicNavigationScrollReset/>{children}</DocumentShell>;
}
