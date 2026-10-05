import { T, LanguageProvider } from "@/i18n/language-context";
import "@/i18n/language.css";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Cormorant_Garamond, Noto_Sans_Bengali, Noto_Serif_Bengali } from "next/font/google";
import "@/app/globals.css";
import "@/components/ui/loading.css";
import { ToastProvider } from "@/components/ui/toast";
import "@/components/global/global.css";
import "@/app/phase1c1.css";
import "@/app/phase1c2.css";
import "@/app/phase1d1.css";
import "@/components/assistant/studio-assistant.css";
import { SiteHeader } from "@/components/global/site-header";
import { SiteFooter } from "@/components/global/site-footer";
import { StudioAssistant } from "@/components/assistant/studio-assistant";
import { site } from "@/content/site";
import { getAssistantSettings } from "@/lib/studio-data";

const sans=Instrument_Sans({subsets:["latin"],variable:"--font-sans",display:"swap"});
const display=Cormorant_Garamond({subsets:["latin"],variable:"--font-display",weight:["400","500"],display:"swap"});
const banglaSans=Noto_Sans_Bengali({subsets:["bengali"],variable:"--font-bn-sans",display:"swap"});
const banglaDisplay=Noto_Serif_Bengali({subsets:["bengali"],variable:"--font-bn-display",weight:["400","500"],display:"swap"});
export const siteMetadata:Metadata={metadataBase:new URL(site.url),icons:{icon:[{url:"/txs-search-icon-v3.png",type:"image/png",sizes:"96x96"},{url:"/favicon.ico",type:"image/x-icon",sizes:"48x48"}],shortcut:"/favicon.ico"},title:{default:"Taoshiflex Studio — Creative Engineering",template:"%s — Taoshiflex Studio"},description:site.description,alternates:{canonical:"/"},verification:{google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION||undefined,other:process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?{"msvalidate.01":process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION}:undefined},openGraph:{type:"website",siteName:site.name,title:"Taoshiflex Studio — Creative Engineering",description:site.description,url:"/",images:[{url:"/opengraph-image",alt:site.name}]},twitter:{card:"summary_large_image",title:"Taoshiflex Studio",description:site.description,images:["/opengraph-image"]}};
export const siteViewport:Viewport={width:"device-width",initialScale:1,themeColor:"#11110f",colorScheme:"dark"};
async function Assistant() { const settings = await getAssistantSettings(); return <StudioAssistant settings={settings}/>; }
export default function DocumentShell({children,analytics}:{children:React.ReactNode;analytics?:React.ReactNode}){const structured={"@context":"https://schema.org","@type":["Organization","ProfessionalService"],name:site.name,url:site.url,description:site.description,areaServed:["Bangladesh","Worldwide"],founder:{"@type":"Person",name:"Gazi Taoshif"},logo:`${site.url}/brand/txs-mark.png`};return <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${display.variable} ${banglaSans.variable} ${banglaDisplay.variable}`}><body data-clarity-mask="true"><LanguageProvider><ToastProvider><a className="skip" href="#main"><T id="global.skipToContent"/></a><SiteHeader/><main id="main">{children}</main><SiteFooter/>{analytics}<Suspense fallback={null}><Assistant/></Suspense></ToastProvider></LanguageProvider><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify([structured,{"@context":"https://schema.org","@type":"WebSite",name:site.name,url:site.url}]).replace(/</g,"\\u003c")}}/></body></html>}
