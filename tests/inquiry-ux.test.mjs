import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./security-loader.mjs";
const source = path => readFileSync(path, "utf8");
const { LoadingShell, PendingButton } = loadTs("src/components/ui/loading.tsx");
const { translate, translateText } = loadTs("src/i18n/helpers.ts");
const { inquirySteps } = loadTs("src/lib/inquiry-config.ts");

test("route loader retains an announced label and structured skeletons without an image dependency", () => {
  const html = renderToStaticMarkup(React.createElement(LoadingShell, { label:"Loading project details…" }));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /brand-loader--lg/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /Loading project details…/);
  assert.match(html, /skeleton-grid/);
  assert.doesNotMatch(html, /<img|<svg[^>]+src|\.png/);
});
test("pending button uses only the compact loader, retains its label and blocks repeat submission", () => {
  const html = renderToStaticMarkup(React.createElement(PendingButton, {pending:true,pendingLabel:"Sending…"}, "Send"));
  assert.match(html, /disabled=""/); assert.match(html, /aria-busy="true"/);
  assert.match(html, /brand-loader--sm/); assert.doesNotMatch(html, /brand-loader--lg/);
  assert.match(html, /Sending…/);
  const idle = renderToStaticMarkup(React.createElement(PendingButton, {pending:false,disabled:true}, "Send"));
  assert.match(idle, /disabled=""/); assert.doesNotMatch(idle, /brand-loader/);
});
test("reduced motion stops every animated loader part and compact geometry stays about one em", () => {
  const css = source("src/components/ui/loading.css");
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.brand-loader::before,\.brand-loader-orbit,\.skeleton\{animation:none/);
  assert.match(css, /brand-loader--sm\{[^}]*width:1\.05em;height:1\.05em/);
  assert.doesNotMatch(css, /url\(/);
  assert.doesNotMatch(css.match(/\.brand-loader-mark\{[^}]+\}/)[0], /animation|transform/);
});
function motionElement(tag) {
  return function MotionElement(props) {
    const dom = {...props};
    for (const key of ["initial","animate","exit","transition"]) delete dom[key];
    return React.createElement(tag, dom);
  };
}
function harness(language = "en", fetcher = async () => Response.json({ reference:"TEST-ONLY" })) {
  const states = [], refs = [], events = [], requests = [];
  let stateIndex = 0, refIndex = 0;
  const lang = {t:key=>translate(language,key),text:value=>translateText(language,value)};
  const { InquiryFlow } = loadTs("src/components/inquiry/inquiry-flow.tsx", {
    react: {...React,
      useState(initial) { const i=stateIndex++; if(!(i in states))states[i]=initial; return [states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value;}]; },
      useRef(initial) { const i=refIndex++; return refs[i] ??= {current:initial}; },
    },
    "next/link": {default:"a"},
    "motion/react": {AnimatePresence:({children})=>children,motion:{div:motionElement("div"),section:motionElement("section")},useReducedMotion:()=>true},
    "@/components/ui/toast": {useToasts:()=>({toast(){}})},
    "@/lib/public-analytics": {trackPublicEvent:(...args)=>events.push(args)},
    "@/i18n/language-context": {useLanguage:()=>lang,T:({id})=>lang.t(id),DynamicText:({text})=>lang.text(text)},
    __fetch:async(url,options)=>{requests.push({url,...options});return fetcher();},
  });
  function expand(node, all=[]) {
    if(Array.isArray(node)){node.forEach(child=>expand(child,all));return all;}
    if(!node || typeof node!=="object")return all;
    if(typeof node.type==="function")return expand(node.type(node.props),all);
    all.push(node);expand(node.props?.children,all);return all;
  }
  function render(){stateIndex=0;refIndex=0;return InquiryFlow();}
  const nodes=()=>expand(render());
  const find=(type,predicate=()=>true)=>nodes().find(n=>n.type===type&&predicate(n.props));
  return {render,nodes,find,events,requests,states,choose(value){find("input",p=>p.value===value).props.onChange();},
    next(){find("form").props.onSubmit({preventDefault(){}});},
    fill(name,value){find(name==="details"?"textarea":"input",p=>p.name===name).props.onChange({target:{value}});}};
}
test("inquiry retains all stable backend choice values", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(inquirySteps.map(({id,options})=>[id,options]))), [
    ["projectType",["Business Website","E-Commerce","Web Application","Internal System","Digital Product","Something Else"]],
    ["stage",["Just an idea","Existing business","Existing website/system","Design ready","Needs redesign"]],
    ["goals",["Increase sales","Improve operations","Improve customer experience","Build online presence","Automate work","Launch something new"]],
    ["budget",["Under ৳30,000","৳30,000–৳50,000","৳50,000–৳80,000","৳80,000–৳150,000","৳150,000+","Not sure yet"]],
    ["timeline",["As soon as practical","Within 1–2 months","Within 3–4 months","Later this year","Still exploring"]],
  ]);
});
test("single and multiple choices expose native input semantics and never auto-advance", () => {
  const h=harness();
  assert.ok(h.find("fieldset",p=>p["aria-describedby"]==="choice-help"));
  assert.ok(h.find("legend"));
  assert.ok(h.find("input",p=>p.type==="radio"));
  assert.equal(h.find("button",p=>p.type==="submit").props.disabled,true);
  h.choose("Business Website"); h.choose("Something Else");
  assert.equal(h.states[0],0); assert.equal(h.states[1].projectType,"Something Else");
  h.next(); h.choose("Just an idea"); h.next();
  assert.ok(h.find("input",p=>p.type==="checkbox"));
  h.choose("Increase sales");h.choose("Automate work");h.choose("Increase sales");
  assert.equal(JSON.stringify(h.states[1].goals),'["Automate work"]');
  assert.equal(h.states[0],2);
  assert.equal(JSON.stringify(h.events),'[["inquiry_start"]]');
});
test("guidance, required/optional fields and compact brief are translated and update live", () => {
  for(const language of ["en","bn"]) {
    const h=harness(language);
    let html=renderToStaticMarkup(h.render());
    assert.ok(html.includes(translate(language,"inquiry.selectOne")));
    assert.ok(html.includes(translate(language,"inquiry.unsureType")));
    assert.ok(h.find("details")); assert.equal(h.find("details").props.open,undefined);
    h.choose("Business Website");
    html=renderToStaticMarkup(h.render());
    assert.ok(html.includes(translate(language,"inquiry.answeredCount").replace("{count}","1")));
    h.next();h.choose("Just an idea");h.next();
    assert.ok(renderToStaticMarkup(h.render()).includes(translate(language,"inquiry.selectMultiple")));
    h.choose("Automate work");h.next();h.choose("Not sure yet");h.next();h.choose("Still exploring");h.next();
    assert.ok(renderToStaticMarkup(h.render()).includes(translate(language,"inquiry.contextExample")));
    h.fill("details","short");h.next();assert.equal(h.states[0],5);
    h.fill("details","A sufficiently detailed test project context.");h.next();
    assert.equal(h.find("input",p=>p.name==="name").props.required,true);
    assert.equal(h.find("input",p=>p.name==="email").props.type,"email");
    assert.equal(h.find("input",p=>p.name==="phone").props.type,"tel");
    assert.equal(h.find("input",p=>p.name==="business").props.required,undefined);
    assert.ok(renderToStaticMarkup(h.render()).includes(translate(language,"inquiry.emailReassurance")));
  }
});
test("submission keeps exactly the original request keys and sends no answer or PII analytics", async () => {
  let resolveResponse;
  const h=harness("bn",()=>new Promise(resolve=>{resolveResponse=resolve;}));
  h.choose("Something Else");h.next();h.choose("Just an idea");h.next();h.choose("Automate work");h.next();
  h.choose("Not sure yet");h.next();h.choose("Still exploring");h.next();
  h.fill("details","Private test details that must never reach analytics.");h.next();
  h.next(); assert.equal(h.requests.length,0);
  for(const [key,value] of Object.entries({name:"Test Person",business:"Private Business",email:"test@example.com",phone:"+880123456789"})) h.fill(key,value);
  h.next();h.next();
  assert.equal(h.requests.length,1);
  assert.ok(h.find("button",p=>p["aria-busy"]===true&&p.disabled));
  assert.equal(h.requests[0].url,"/api/inquiries");assert.equal(h.requests[0].method,"POST");
  assert.deepEqual(Object.keys(JSON.parse(h.requests[0].body)).sort(),["projectType","stage","goals","budget","timeline","details","name","business","email","phone"].sort());
  assert.equal(JSON.parse(h.requests[0].body).projectType,"Something Else");
  assert.equal(JSON.stringify(h.events),'[["inquiry_start"]]');
  resolveResponse(Response.json({reference:"TEST-ONLY"}));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(JSON.stringify(h.events),'[["inquiry_start"],["inquiry_submit_success"]]');
});
test("responsive brief and action styles replace the oversized mobile panel and respect safe areas", () => {
  const css=source("src/app/start-a-project/start.css");
  assert.match(css,/\.live-brief\{position:sticky/);
  const mobile=css.slice(css.indexOf("@media(max-width:1100px)"));
  assert.match(mobile,/\.live-brief\{display:none\}/);
  assert.match(mobile,/\.brief-mobile\{display:block/);
  assert.match(mobile,/\.step-actions\{position:sticky;bottom:0/);
  assert.match(mobile,/env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(css,/min-height:26rem/);
});
test("all new inquiry copy has distinct Bangla translations", () => {
  const {en}=loadTs("src/i18n/translations/en.ts");
  for(const key of ["selectOne","selectMultiple","unsureType","contextExample","emailReassurance","contactName","contactEmail","required","yourBrief","answeredCount","briefEmpty","viewSummary","collapseSummary"]) {
    assert.notEqual(translate("bn","inquiry."+key),en["inquiry."+key],key);
  }
});

test("all public and private route loading entry points render the central Signal and skeletons", () => {
  for (const path of ["src/app/(public)/loading.tsx","src/app/(public)/work/loading.tsx","src/app/(public)/products/loading.tsx","src/app/client/loading.tsx","src/app/studio-admin/loading.tsx","src/app/client/projects/[id]/loading.tsx"]) {
    const {default:Loading} = loadTs(path, {"@/i18n/language-context":{T:()=> "Loading system…"}});
    const html = renderToStaticMarkup(React.createElement(Loading));
    assert.match(html,/brand-loader--lg/,path);
    assert.match(html,/skeleton-grid/,path);
    assert.match(html,/role="status"/,path);
  }
});