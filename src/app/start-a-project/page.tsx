import { T } from "@/i18n/language-context";
import { publicMetadata } from "@/lib/seo";
import { InquiryFlow } from "@/components/inquiry/inquiry-flow";
import "./start.css";
import "./phase1c1.css";
export const metadata = publicMetadata("Start a Project", "Share your goals and requirements for a custom website, ecommerce system or software project with Taoshiflex Studio.", "/start-a-project");
export default function StartProject(){return <div className="start-page container"><header><p className="eyebrow"><T id="inquiry.startAProject"/></p><h1 className="display display-md"><T id="inquiry.letSDefineWhatS"/><br/><span className="title-accent"><T id="inquiry.worthBuilding"/></span></h1><p><T id="inquiry.sevenFocusedStepsNoSalesTheatreYourAnswersCreate"/></p></header><InquiryFlow/></div>}
