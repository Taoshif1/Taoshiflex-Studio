"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { AssistantSettings, ServicePackage } from "@/types/content";

type Message={role:"assistant"|"user";text:string};
const suggestions=["Pricing","Business website","E-commerce","Process"];
const money=(value:number)=>new Intl.NumberFormat("en-BD").format(value);
function answer(input:string,settings:AssistantSettings,packages:ServicePackage[]){
  if(settings.knowledgeCategories.includes("pricing")&&settings.showPricing&&/price|pricing|cost|budget|bdt|taka/i.test(input)){if(!packages.length)return "No public package is active right now. Use the project brief for a scope-specific conversation.";return packages.map(item=>`${item.name}: ${item.priceFrom===null?"custom quote":`from ৳${money(item.priceFrom)}`}`).join("\n")}
  if(settings.knowledgeCategories.includes("services")&&/business|website|time|long|delivery|week|start/i.test(input)){if(/business|website/i.test(input))return "A business website can combine positioning, service pages, lead capture, responsive design and an editable content foundation. Final scope follows the brief.";if(!packages.length)return "Delivery timing is confirmed after scope review.";return packages.map(item=>`${item.name}: ${item.deliveryEstimate}`).join("\n")}
  if(settings.knowledgeCategories.includes("services")&&/e-commerce|ecommerce|shop|commerce|store|payment/i.test(input))return "Commerce work can include catalog, search, cart, checkout, cash on delivery and payment setup where verified merchant accounts are available. Courier API work is separately scoped.";
  if(settings.knowledgeCategories.includes("process")&&/process|work|how/i.test(input))return "The Studio moves through discovery, direction, design, build and launch. Each stage reduces ambiguity before engineering effort compounds.";
  if(settings.knowledgeCategories.includes("projects")&&/project|portfolio|case/i.test(input))return "Selected work contains only admin-curated, published projects. In-progress work is labelled honestly and avoids unverified performance claims.";
  return "I can answer from the Studio’s approved services, active pricing, process and published-work knowledge. For a project-specific answer, send a brief.";
}

export function StudioAssistant({settings,packages}:{settings:AssistantSettings;packages:ServicePackage[]}){
  const pathname=usePathname();
  const [open,setOpen]=useState(false),[input,setInput]=useState(""),[messages,setMessages]=useState<Message[]>([{role:"assistant",text:settings.greeting}]);
  const reduce=useReducedMotion();if(!settings.enabled||pathname.startsWith("/client")||pathname.startsWith("/studio-admin"))return null;
  function send(value:string){const question=value.trim();if(!question)return;const additions:Message[]=[{role:"user",text:question},{role:"assistant",text:answer(question,settings,packages)}];setMessages(current=>[...current,...additions].slice(-(settings.maximumMessages+1)));setInput("")}
  function submit(event:FormEvent){event.preventDefault();send(input)}
  return <div className="assistant"><AnimatePresence>{open?<motion.section className="assistant-panel" role="dialog" aria-label={settings.name} initial={reduce?false:{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}><div className="assistant-geometry" aria-hidden><i/><i/></div><header><div><small>Taoshiflex / Guided scope</small><strong>{settings.name}</strong><span>Rule-based · Public studio knowledge</span></div><button type="button" onClick={()=>setOpen(false)} aria-label={`Close ${settings.name}`}>×</button></header><div className="assistant-log" aria-live="polite">{messages.map((message,index)=><div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}><small>{message.role==="assistant"?"Studio note":"Your question"}</small><p>{message.text}</p></div>)}</div><div className="assistant-suggestions" aria-label="Suggested questions">{suggestions.map(item=><button type="button" key={item} onClick={()=>send(item)}>{item}</button>)}</div><form onSubmit={submit}><label htmlFor="studio-question">Ask the Studio</label><div><input id="studio-question" value={input} maxLength={240} onChange={event=>setInput(event.target.value)} placeholder="Ask about scope or process"/><button type="submit" disabled={!input.trim()}>Send <span aria-hidden>→</span></button></div></form>{settings.leadCapture?<Link href={settings.handoffUrl}>Move from guidance to a real project brief <span aria-hidden>↗</span></Link>:null}</motion.section>:null}</AnimatePresence><button className="assistant-trigger" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open}><span aria-hidden>{open?"×":"TS"}</span>{open?"Close panel":"Ask the Studio"}</button></div>;
}
