export const inquirySteps = [
  { id: "projectType", label: "What are you building?", options: ["Business Website", "E-Commerce", "Web Application", "Internal System", "Digital Product", "Something Else"] },
  { id: "stage", label: "Where are you now?", options: ["Just an idea", "Existing business", "Existing website/system", "Design ready", "Needs redesign"] },
  { id: "goals", label: "What matters most?", options: ["Increase sales", "Improve operations", "Improve customer experience", "Build online presence", "Automate work", "Launch something new"], multiple: true },
  { id: "budget", label: "What investment range are you considering?", options: ["Under $2,500", "$2,500–$5,000", "$5,000–$10,000", "$10,000–$25,000", "$25,000+"] },
  { id: "timeline", label: "When would you like to begin?", options: ["As soon as practical", "Within 1–2 months", "Within 3–4 months", "Later this year", "Still exploring"] },
] as const;
