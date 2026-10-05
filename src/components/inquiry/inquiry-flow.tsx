"use client";
import { trackPublicEvent } from "@/lib/public-analytics";
import { PendingButton } from "@/components/ui/loading";
import { useLanguage, DynamicText, T } from "@/i18n/language-context";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { inquirySteps } from "@/lib/inquiry-config";
import { useToasts } from "@/components/ui/toast";
import type { Inquiry } from "@/types/content";

type Key = "projectType" | "stage" | "goals" | "budget" | "timeline";
type SubmitState = "idle" | "sending" | "success" | "error";
const empty: Inquiry = { projectType:"", stage:"", goals:[], budget:"", timeline:"", details:"", name:"", business:"", email:"", phone:"" };
const total = 7;

export function InquiryFlow() {
  const { text, t } = useLanguage();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(empty);
  const [touched, setTouched] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const started = useRef(false), submitting = useRef(false), previousStep = useRef(step);
  const formRef = useRef<HTMLFormElement>(null);
  const reduce = useReducedMotion();
  const { toast } = useToasts();
  const valid = step < 5 ? (step === 2 ? data.goals.length > 0 : Boolean(data[inquirySteps[step].id as Key]))
    : step === 5 ? data.details.trim().length >= 20 : Boolean(data.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email));
  function choose(key: Key, value: string, multiple?: boolean) {
    if (!started.current) { trackPublicEvent("inquiry_start"); started.current = true; }
    setTouched(false);
    setData(prev => ({ ...prev, [key]: multiple ? (prev.goals.includes(value) ? prev.goals.filter(x => x !== value) : [...prev.goals, value]) : value }));
  }
  function next() { setTouched(true); if (valid && step < total - 1) { setStep(value => value + 1); setTouched(false); } }
  function back() { if (!submitting.current) { setStep(value => Math.max(0, value - 1)); setTouched(false); setMessage(""); } }
  async function submit() {
    setTouched(true);
    if (!valid || submitting.current) return;
    submitting.current = true; setSubmitState("sending"); setMessage("");
    try {
      const response = await fetch("/api/inquiries", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
      const result = await response.json() as { error?: string; reference?: string };
      if (!response.ok || !result.reference) throw new Error(result.error || "Submission failed.");
      setReference(result.reference); setSubmitState("success");
      trackPublicEvent("inquiry_submit_success");
      toast("success", `${text("Project brief received ·")} ${result.reference}`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "We could not submit your brief.";
      setSubmitState("error"); setMessage(messageText); toast("error", text(messageText));
    } finally { submitting.current = false; }
  }
  function focusStep(node: HTMLDivElement | null) {
    if (!node || previousStep.current === step) return;
    previousStep.current = step;
    node.focus({ preventScroll: true });
    const form = formRef.current;
    if (form) {
      const top = form.getBoundingClientRect().top;
      if (top < 88 || top > window.innerHeight * .35) form.scrollIntoView({ block: "start", behavior: reduce ? "instant" : "smooth" });
    }
  }
  const validation = touched && !valid ? (step === 5 ? "Please share at least 20 characters." : step === 6 ? "Please add your name and a valid email." : "Choose at least one option to continue.") : "";
  const heading = step < 5 ? text(inquirySteps[step].label) : t(step === 5 ? "inquiry.tellUsAboutIt" : "inquiry.whoShouldWeReplyTo");
  return <div className="inquiry-layout">
    <form className="inquiry-form" ref={formRef} noValidate onSubmit={event => { event.preventDefault(); if (step === 6) void submit(); else next(); }}>
      {submitState === "success" ? <SuccessReceipt reference={reference}/> : <>
        <div className="step-head technical" aria-live="polite" aria-atomic="true">
          <span><T id="inquiry.step"/> {String(step + 1).padStart(2, "0")} / 07<span className="sr-only"> — {heading}</span></span>
          <span aria-hidden="true">{Math.round(((step + 1) / total) * 100)}%</span>
        </div>
        <div className="progress" role="progressbar" aria-label={text("Project brief progress")} aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}>
          <i style={{width:`${((step + 1) / total) * 100}%`}}/>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div ref={focusStep} tabIndex={-1} aria-labelledby="inquiry-question" key={step} className="step-panel"
            initial={reduce ? false : {opacity:0, y:10}} animate={{opacity:1, y:0}} exit={reduce ? undefined : {opacity:0, y:-6}} transition={{duration:reduce ? 0 : .2}}>
            {step < 5 ? <ChoiceStep step={step} data={data} choose={choose}/> : step === 5 ? <div>
              <p className="eyebrow"><T id="inquiry.theBrief"/></p>
              <h2 id="inquiry-question"><T id="inquiry.tellUsAboutIt"/></h2>
              <p className="step-guidance" id="context-help"><T id="inquiry.contextExample"/></p>
              <label className="field-label" htmlFor="details"><T id="inquiry.whatAreYouTryingToAchieve"/></label>
              <textarea id="details" name="details" maxLength={3000} minLength={20} required rows={6} value={data.details}
                aria-describedby="context-help context-minimum inquiry-error" aria-invalid={touched && !valid}
                onChange={event => setData({...data, details:event.target.value})}
                placeholder={text("A little context about the business, problem and desired outcome…")}/>
              <small id="context-minimum"><T id="inquiry.atLeast20CharactersClearAndSimpleIsPerfect"/></small>
            </div> : <ContactStep data={data} setData={setData} touched={touched} pending={submitState === "sending"}/>}
          </motion.div>
        </AnimatePresence>
        <div id="inquiry-error" aria-live="polite" className={`form-error ${submitState}`}><DynamicText text={message || validation}/></div>
        <Brief data={data} mobile/>
        <div className="step-actions">
          {step > 0 ? <button type="button" className="back" disabled={submitState === "sending"} onClick={back}><T id="inquiry.back"/></button> : <span/>}
          {step < 6 ? <button type="submit" className="next" disabled={!valid}><T id="inquiry.continue"/></button>
            : <PendingButton type="submit" className="next" pending={submitState === "sending"} pendingLabel={<DynamicText text="Sending…"/>}><DynamicText text="Send project brief"/></PendingButton>}
        </div>
      </>}
    </form>
    <Brief data={data}/>
  </div>;
}

function SuccessReceipt({reference}:{reference:string}) {
  const reduce = useReducedMotion();
  return <motion.section className="inquiry-receipt" initial={reduce ? false : {opacity:0,y:12}} animate={{opacity:1,y:0}} aria-labelledby="receipt-title">
    <span className="receipt-mark" aria-hidden>✓</span><p className="eyebrow"><T id="inquiry.submittedNotYetAccepted"/></p>
    <h2 id="receipt-title"><T id="inquiry.projectBriefReceived"/></h2><p><T id="inquiry.weLlReviewTheBriefAndReplyUsingThe"/></p>
    <dl><dt><T id="inquiry.submissionReference"/></dt><dd>{reference}</dd></dl>
    <p className="receipt-note"><T id="inquiry.keepThisReferenceIfYouNeedToContactThe"/></p>
    <div className="receipt-actions"><Link className="action action-solid" href="/"><T id="inquiry.returnHome"/></Link><Link className="action" href="/work"><T id="inquiry.exploreWork"/> <span aria-hidden>↗</span></Link></div>
  </motion.section>;
}
function ChoiceStep({step,data,choose}:{step:number;data:Inquiry;choose:(key:Key,value:string,multiple?:boolean)=>void}) {
  const current = inquirySteps[step], key = current.id as Key, multiple = key === "goals";
  return <fieldset className="choice-step" aria-describedby="choice-help">
    <legend className="sr-only"><DynamicText text={current.label}/></legend>
    <p className="eyebrow"><T id="inquiry.projectQualifier"/></p>
    <h2 id="inquiry-question"><DynamicText text={current.label}/></h2>
    <p className="step-guidance" id="choice-help"><T id={multiple ? "inquiry.selectMultiple" : "inquiry.selectOne"}/></p>
    <div className="choice-grid">{current.options.map(option => {
      const selected = multiple ? data.goals.includes(option) : data[key] === option;
      return <label className="choice-card" key={option}>
        <input type={multiple ? "checkbox" : "radio"} name={key} value={option} checked={selected} onChange={() => choose(key, option, multiple)}/>
        <span className="choice-mark" aria-hidden="true">{multiple ? "✓" : ""}</span>
        <span><DynamicText text={option}/></span>
      </label>;
    })}</div>
    {step === 0 ? <p className="choice-note"><T id="inquiry.unsureType"/></p> : null}
  </fieldset>;
}
function ContactStep({data,setData,touched,pending}:{data:Inquiry;setData:(data:Inquiry)=>void;touched:boolean;pending:boolean}) {
  return <div>
    <p className="eyebrow"><T id="inquiry.lastStep"/></p><h2 id="inquiry-question"><T id="inquiry.whoShouldWeReplyTo"/></h2>
    <p className="step-guidance" id="contact-reassurance"><T id="inquiry.emailReassurance"/></p>
    <fieldset className="fields" disabled={pending}>
      <legend className="sr-only"><T id="inquiry.whoShouldWeReplyTo"/></legend>
      <label className="field-label"><span className="field-title"><T id="inquiry.contactName"/><small><T id="inquiry.required"/></small></span>
        <input name="name" maxLength={120} required value={data.name} autoComplete="name" aria-invalid={touched && !data.name.trim()} aria-describedby="inquiry-error" onChange={event => setData({...data,name:event.target.value})}/></label>
      <label className="field-label"><span className="field-title"><T id="inquiry.business"/><small><T id="inquiry.optional"/></small></span>
        <input name="business" maxLength={160} value={data.business} autoComplete="organization" onChange={event => setData({...data,business:event.target.value})}/></label>
      <label className="field-label"><span className="field-title"><T id="inquiry.contactEmail"/><small><T id="inquiry.required"/></small></span>
        <input name="email" maxLength={254} required type="email" inputMode="email" value={data.email} autoComplete="email" autoCapitalize="none" spellCheck={false}
          aria-invalid={touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)} aria-describedby="contact-reassurance inquiry-error" onChange={event => setData({...data,email:event.target.value})}/></label>
      <label className="field-label"><span className="field-title"><T id="inquiry.phoneWhatsApp"/><small><T id="inquiry.optional"/></small></span>
        <input name="phone" maxLength={40} type="tel" inputMode="tel" value={data.phone} autoComplete="tel" onChange={event => setData({...data,phone:event.target.value})}/></label>
    </fieldset>
  </div>;
}
function Brief({data,mobile=false}:{data:Inquiry;mobile?:boolean}) {
  const {text, t} = useLanguage();
  const rows = [["Project",data.projectType],["Stage",data.stage],["Goal",data.goals.map(value => text(value)).join(", ")],["Client budget",data.budget],["Timeline",data.timeline]];
  const answered = rows.filter(([,value]) => Boolean(value)).length;
  const progress = t("inquiry.answeredCount").replace("{count}", String(answered));
  const content = <><p className="brief-progress">{progress}</p><dl>{rows.map(([label,value]) => <div key={label} className={value ? "answered" : "unanswered"}>
    <dt><DynamicText text={label}/></dt><dd>{value ? <DynamicText text={value}/> : <><span aria-hidden="true">—</span><span className="sr-only"><DynamicText text="Not answered yet"/></span></>}</dd>
  </div>)}</dl></>;
  if (mobile) return <details className="brief-mobile">
    <summary><span className="brief-summary-heading"><span><T id="inquiry.yourBrief"/></span><span aria-label={progress}>{answered} / 5</span></span>
      <span className="brief-preview">{[data.projectType,data.stage].filter(Boolean).map(value => text(value)).join(" · ") || t("inquiry.briefEmpty")}</span>
      <span className="brief-disclosure-label"><span className="when-closed"><T id="inquiry.viewSummary"/> ↓</span><span className="when-open"><T id="inquiry.collapseSummary"/> ↑</span></span>
    </summary><div className="brief-details">{content}</div>
  </details>;
  return <aside className="live-brief" aria-label={t("inquiry.liveProjectBrief")}>
    <div className="brief-heading"><p className="technical"><T id="inquiry.liveProjectBrief"/></p><span className="brief-x" aria-hidden="true">×</span></div>{content}
  </aside>;
}