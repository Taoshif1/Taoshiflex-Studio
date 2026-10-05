import DocumentShell, { siteMetadata, siteViewport } from "@/components/global/document-shell";
import { PublicAnalytics } from "@/components/analytics/public-analytics";
export const metadata = siteMetadata;
export const viewport = siteViewport;
export default function PublicLayout({children}:{children:React.ReactNode}) {
  return <DocumentShell analytics={<PublicAnalytics/>}>{children}</DocumentShell>;
}
