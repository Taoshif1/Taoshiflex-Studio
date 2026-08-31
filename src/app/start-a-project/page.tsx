import type { Metadata } from "next";
import { InquiryFlow } from "@/components/inquiry/inquiry-flow";
import "./start.css";
import "./phase1c1.css";
export const metadata:Metadata={title:"Start a Project",description:"Build a clear project brief with Taoshiflex Studio.",alternates:{canonical:"/start-a-project"}};
export default function StartProject(){return <div className="start-page container"><header><p className="eyebrow">Start a project</p><h1 className="display display-md">Let’s define what’s<br/>worth building.</h1><p>Seven focused steps. No sales theatre. Your answers create a useful first brief.</p></header><InquiryFlow/></div>}
