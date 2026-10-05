import DocumentShell, { siteMetadata, siteViewport } from "@/components/global/document-shell";
import type { Metadata } from "next";
import "./client.css";
import "./account-recovery.css";
import "@/components/notifications/notification-center.css";

export const metadata: Metadata = {
  ...siteMetadata,
  title: "Client Workspace",
  alternates: undefined,
  robots: { index: false, follow: false },
};

export const viewport = siteViewport;

export const dynamic = "force-dynamic";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell>{children}</DocumentShell>;
}
