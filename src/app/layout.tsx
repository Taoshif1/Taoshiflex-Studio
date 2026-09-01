import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import "@/components/global/global.css";
import "./phase1c1.css";
import "./phase1c2.css";
import "./phase1d1.css";
import { SiteHeader } from "@/components/global/site-header";
import { SiteFooter } from "@/components/global/site-footer";
import { StudioAssistant } from "@/components/assistant/studio-assistant";
import { site } from "@/content/site";
import { getActivePackages, getAssistantSettings } from "@/lib/studio-data";

const sans=Instrument_Sans({subsets:["latin"],variable:"--font-sans",display:"swap"});
const display=Cormorant_Garamond({subsets:["latin"],variable:"--font-display",weight:["400","500"],display:"swap"});
export const metadata:Metadata={metadataBase:new URL(site.url),title:{default:"Taoshiflex Studio — Creative Engineering",template:"%s — Taoshiflex Studio"},description:site.description,alternates:{canonical:"/"},openGraph:{type:"website",siteName:site.name,title:"Taoshiflex Studio — Creative Engineering",description:site.description,url:"/"},twitter:{card:"summary_large_image",title:"Taoshiflex Studio",description:site.description}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#11110f",colorScheme:"dark"};
export default async function RootLayout({children}:{children:React.ReactNode}){const [assistant,packages]=await Promise.all([getAssistantSettings(),getActivePackages()]);const structured={"@context":"https://schema.org","@type":["Organization","ProfessionalService"],name:site.name,url:site.url,description:site.description,areaServed:["Bangladesh","Worldwide"],founder:{"@type":"Person",name:"Gazi Taoshif"},priceRange:"৳৳"};return <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${display.variable}`}><body><a className="skip" href="#main">Skip to content</a><SiteHeader/><main id="main">{children}</main><SiteFooter/><StudioAssistant settings={assistant} packages={packages}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/></body></html>}
