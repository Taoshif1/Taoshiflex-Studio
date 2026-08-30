import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@/content/projects";
import { ResponsiveMedia } from "@/components/ui/primitives";
import "./work.css";
export const metadata:Metadata={title:"Selected Work",description:"Selected commerce, business system and digital product work by Taoshiflex Studio.",alternates:{canonical:"/work"}};
export default function WorkPage(){return <div className="work-index container"><header><p className="eyebrow">Selected work / 2026</p><h1 className="display">Business problems,<br/>made tangible.</h1><p>A focused selection of commercial and internal product work. Outcomes are described honestly; technology stays in service of the problem.</p></header><div className="work-list">{projects.map((project,index)=><article key={project.slug} style={{"--accent":project.accent} as React.CSSProperties}><div className="work-number technical">0{index+1}</div><Link href={`/work/${project.slug}`}><ResponsiveMedia accent={project.accent} label={project.name}/></Link><div><p className="technical">{project.category} / {project.status}</p><h2><Link href={`/work/${project.slug}`}>{project.name}</Link></h2><p>{project.summary}</p><Link className="action" href={`/work/${project.slug}`}>Read case study <span aria-hidden>↗</span></Link></div></article>)}</div></div>}
