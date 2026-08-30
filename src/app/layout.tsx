import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import "@/components/global/global.css";
import { SiteHeader } from "@/components/global/site-header";
import { SiteFooter } from "@/components/global/site-footer";
import { StudioAssistant } from "@/components/assistant/studio-assistant";
import { site } from "@/content/site";

const sans=Instrument_Sans({subsets:["latin"],variable:"--font-sans",display:"swap"});
const display=Cormorant_Garamond({subsets:["latin"],variable:"--font-display",weight:["400","500"],display:"swap"});
export const metadata:Metadata={metadataBase:new URL(site.url),title:{default:"Taoshiflex Studio — Creative Engineering",template:"%s — Taoshiflex Studio"},description:site.description,alternates:{canonical:"/"},openGraph:{type:"website",siteName:site.name,title:"Taoshiflex Studio — Creative Engineering",description:site.description,url:"/"},twitter:{card:"summary_large_image",title:"Taoshiflex Studio",description:site.description}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#11110f",colorScheme:"dark"};
export default function RootLayout({children}:{children:React.ReactNode}){const structured={"@context":"https://schema.org","@type":["Organization","ProfessionalService"],name:site.name,url:site.url,description:site.description,areaServed:["Bangladesh","Worldwide"],founder:{"@type":"Person",name:"Gazi Taoshif"},priceRange:"৳৳"};return <html lang="en" className={`${sans.variable} ${display.variable}`}><body><a className="skip" href="#main">Skip to content</a><SiteHeader/><main id="main">{children}</main><SiteFooter/><StudioAssistant/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/></body></html>}
