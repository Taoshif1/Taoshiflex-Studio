import type { Metadata } from "next";
import "./client.css";
import "@/components/notifications/notification-center.css";
export const metadata:Metadata={title:"Client Workspace",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function ClientLayout({children}:{children:React.ReactNode}){return children}
